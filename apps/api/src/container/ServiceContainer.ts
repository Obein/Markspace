import { AdminController } from '../controllers/AdminController';
import { AuthController } from '../controllers/AuthController';
import { MediaController } from '../controllers/MediaController';
import { NoteController } from '../controllers/NoteController';
import { D1MediaRepository } from '../infrastructure/D1MediaRepository';
import { D1NoteRepository } from '../infrastructure/D1NoteRepository';
import { D1UserRepository } from '../infrastructure/D1UserRepository';
import { JwtTokenService } from '../infrastructure/JwtTokenService';
import { R2StorageService } from '../infrastructure/R2StorageService';
import { WebCryptoHasher } from '../infrastructure/WebCryptoHasher';
import { AuthService } from '../services/AuthService';
import { MediaService } from '../services/MediaService';
import { NoteService } from '../services/NoteService';
import { Env } from '../types/env';

export class ServiceContainer {
  public readonly authController: AuthController;
  public readonly noteController: NoteController;
  public readonly mediaController: MediaController;
  public readonly adminController: AdminController;
  public readonly tokenService: JwtTokenService;

  constructor(env: Env) {
    const userRepository = new D1UserRepository(env.DB);
    const noteRepository = new D1NoteRepository(env.DB);
    const mediaRepository = new D1MediaRepository(env.DB);
    const storageService = new R2StorageService(env.BUCKET);
    const passwordHasher = new WebCryptoHasher();
    this.tokenService = new JwtTokenService();

    const authService = new AuthService(userRepository, passwordHasher, this.tokenService);
    const noteService = new NoteService(noteRepository, mediaRepository, storageService);
    const mediaService = new MediaService(mediaRepository, storageService);

    this.authController = new AuthController(authService);
    this.noteController = new NoteController(noteService);
    this.mediaController = new MediaController(mediaService);
    this.adminController = new AdminController(userRepository);
  }
}
