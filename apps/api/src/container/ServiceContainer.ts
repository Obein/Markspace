import { AdminController } from '../controllers/AdminController';
import { AuthController } from '../controllers/AuthController';
import { MediaController } from '../controllers/MediaController';
import { NoteController } from '../controllers/NoteController';
import { VaultController } from '../controllers/VaultController';
import { D1AuditLogRepository } from '../infrastructure/D1AuditLogRepository';
import { D1MediaRepository } from '../infrastructure/D1MediaRepository';
import { D1NoteRepository } from '../infrastructure/D1NoteRepository';
import { D1UserRepository } from '../infrastructure/D1UserRepository';
import { JwtTokenService } from '../infrastructure/JwtTokenService';
import { R2ObjectStorageService } from '../infrastructure/R2ObjectStorageService';
import { R2StorageService } from '../infrastructure/R2StorageService';
import { VaultNodeRepository } from '../infrastructure/VaultNodeRepository';
import { WebCryptoHasher } from '../infrastructure/WebCryptoHasher';
import { AuthService } from '../services/AuthService';
import { MediaService } from '../services/MediaService';
import { NonceService } from '../services/NonceService';
import { NoteService } from '../services/NoteService';
import { VaultService } from '../services/VaultService';
import { Env } from '../types/env';

export class ServiceContainer {
  public readonly authController: AuthController;
  public readonly noteController: NoteController;
  public readonly mediaController: MediaController;
  public readonly vaultController: VaultController;
  public readonly adminController: AdminController;
  public readonly tokenService: JwtTokenService;
  public readonly nonceService: NonceService;
  public readonly auditLogRepository: D1AuditLogRepository;

  constructor(env: Env) {
    const userRepository = new D1UserRepository(env.DB);
    const noteRepository = new D1NoteRepository(env.DB);
    const mediaRepository = new D1MediaRepository(env.DB);
    const vaultNodeRepository = new VaultNodeRepository(env.DB);
    this.auditLogRepository = new D1AuditLogRepository(env.DB);

    const storageService = new R2StorageService(env.BUCKET);
    const objectStorageService = new R2ObjectStorageService(env.BUCKET);
    const passwordHasher = new WebCryptoHasher();
    this.tokenService = new JwtTokenService();
    this.nonceService = new NonceService();

    const authService = new AuthService(userRepository, passwordHasher, this.tokenService);
    const noteService = new NoteService(noteRepository, mediaRepository, storageService);
    const mediaService = new MediaService(mediaRepository, storageService);
    const vaultService = new VaultService(vaultNodeRepository, objectStorageService);

    this.authController = new AuthController(authService, this.nonceService, this.auditLogRepository);
    this.noteController = new NoteController(noteService);
    this.mediaController = new MediaController(mediaService);
    this.vaultController = new VaultController(vaultService);
    this.adminController = new AdminController(userRepository);
  }
}
