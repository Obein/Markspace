import { UserRole } from '../../interfaces/IApiClient';

export interface FloatingStatusCapsuleProps {
  username: string | null;
  role: UserRole | null;
  isVaultUnlocked: boolean;
  hasActiveFile?: boolean;
  onOpenProfile: () => void;
  onOpenAdmin?: () => void;
  onOpenUnlockModal: () => void;
  wordCount: number;
  charCount: number;
  selectedWordCount?: number;
  selectedCharCount?: number;
  isPreview: boolean;
  onTogglePreview: () => void;
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isSaving: boolean;
  isSaveFailed?: boolean;
  onRetrySave?: () => void;
  onDownloadCurrentFile?: () => void;
  onDeleteCurrentFile?: () => void;
  onOpenHistory?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}
