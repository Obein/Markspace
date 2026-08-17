import { VaultInfo } from '../../interfaces/INoteModels';

export interface UnlockModalProps {
  vaults: VaultInfo[];
  activeVaultId: string;
  onSelectVault: (id: string) => void;
  onOpenProfile?: () => void;
  onCreateVault: (
    name: string,
    pin: string,
    recoveryKey?: string
  ) => Promise<{ vault: VaultInfo; recoveryKey: string }>;
}
