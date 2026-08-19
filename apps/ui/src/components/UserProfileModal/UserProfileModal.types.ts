import { AccentColor } from '../../hooks/useTheme';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoLockEnabled?: boolean;
  onToggleAutoLock?: (enabled: boolean) => void;
  autoLockMinutes?: number;
  onChangeAutoLockMinutes?: (minutes: number) => void;
  accentColor?: AccentColor;
  onSelectAccentColor?: (color: AccentColor) => void;
  customHex?: string;
  onSelectCustomHex?: (hex: string) => void;
}

