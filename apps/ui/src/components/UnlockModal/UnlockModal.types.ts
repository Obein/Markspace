import { VaultInfo } from '../../interfaces/INoteModels';

export interface UnlockModalProps {
  vaults?: VaultInfo[];
  activeVaultId?: string;
  onSelectVault?: (id: string) => void;
  onOpenProfile?: () => void;
}
