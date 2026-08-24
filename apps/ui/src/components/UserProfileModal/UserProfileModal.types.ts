import { AccentColor } from '../../hooks/useTheme';
import { AutoLockAction } from '../../hooks/useAutoLock';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoLockEnabled?: boolean;
  onToggleAutoLock?: (enabled: boolean) => void;
  autoLockMinutes?: number;
  onChangeAutoLockMinutes?: (minutes: number) => void;
  autoLockAction?: AutoLockAction;
  onChangeAutoLockAction?: (action: AutoLockAction) => void;
  accentColor?: AccentColor;
  onSelectAccentColor?: (color: AccentColor) => void;
  customHex?: string;
  onSelectCustomHex?: (hex: string) => void;
}
