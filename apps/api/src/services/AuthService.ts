import { IPasswordHasher } from '../interfaces/IPasswordHasher';
import { ITokenService } from '../interfaces/ITokenService';
import { IUserRepository } from '../interfaces/IUserRepository';
import { LoginDTO, RegisterDTO, User, UserRole } from '../types/domain';

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService
  ) {}

  async register(
    dto: RegisterDTO,
    jwtSecret: string
  ): Promise<{ token: string; user: { id: string; username: string; role: UserRole } }> {
    if (!dto.username || dto.username.trim().length === 0) {
      throw new Error('USERNAME_REQUIRED: Username cannot be empty');
    }

    if (!dto.authToken || dto.authToken.trim().length === 0) {
      throw new Error('AUTH_TOKEN_REQUIRED: Authentication token cannot be empty');
    }

    const exists = await this.userRepository.existsByUsername(dto.username);
    if (exists) {
      throw new Error('USER_EXISTS: Username is already registered');
    }

    // Check if this is the first registered user
    const totalUsers = await this.userRepository.countTotalUsers();
    // First user is automatically assigned 'admin' role, subsequent users are assigned 'user'
    const role: UserRole = totalUsers === 0 ? 'admin' : 'user';

    const userId = crypto.randomUUID();
    const salt = this.passwordHasher.generateSalt();
    const authTokenHash = await this.passwordHasher.hash(dto.authToken, salt);
    const now = Date.now();

    const user: User = {
      id: userId,
      username: dto.username,
      authTokenHash,
      salt,
      role,
      createdAt: now,
      updatedAt: now,
    };

    await this.userRepository.create(user);

    const token = await this.tokenService.generateToken(
      { userId: user.id, username: user.username, role: user.role },
      jwtSecret
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async login(
    dto: LoginDTO,
    jwtSecret: string
  ): Promise<{ token: string; user: { id: string; username: string; role: UserRole } }> {
    if (!dto.username || !dto.authToken) {
      throw new Error('INVALID_CREDENTIALS: Username and Auth Token are required');
    }

    const user = await this.userRepository.findByUsername(dto.username);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS: Invalid username or password');
    }

    const isValid = await this.passwordHasher.verify(dto.authToken, user.authTokenHash, user.salt);
    if (!isValid) {
      throw new Error('INVALID_CREDENTIALS: Invalid username or password');
    }

    const token = await this.tokenService.generateToken(
      { userId: user.id, username: user.username, role: user.role },
      jwtSecret
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }
}
