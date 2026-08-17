import { VaultFileItem } from '../../interfaces/INoteModels';

export interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: VaultFileItem | null;
  onRevertSuccess: (revertedFile: VaultFileItem, newContent: string) => void;
}
