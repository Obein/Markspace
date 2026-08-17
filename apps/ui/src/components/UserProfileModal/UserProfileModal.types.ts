export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoLockEnabled?: boolean;
  onToggleAutoLock?: (enabled: boolean) => void;
  autoLockMinutes?: number;
  onChangeAutoLockMinutes?: (minutes: number) => void;
}

