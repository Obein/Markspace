import { VaultInfo } from '../../interfaces/INoteModels';
import { VaultStorageConfig } from '../../services/storage/ThirdPartyStorageTypes';

export interface UnlockModalProps {
  vaults: VaultInfo[];
  activeVaultId: string;
  onSelectVault: (id: string) => void;
  onOpenProfile?: () => void;
  onDeleteVault?: (id: string) => void;
  onCreateVault: (
    name: string,
    customRecoveryKey?: string,
    providedPasskeyKey?: CryptoKey,
    initialStorageConfig?: VaultStorageConfig
  ) => Promise<{ vault: VaultInfo; recoveryKey: string; vmk: CryptoKey }>;
  onUnlockVaultWithPasskey?: (vaultId: string) => Promise<CryptoKey>;
  onUnlockVaultWithRecovery?: (vaultId: string, mnemonic: string) => Promise<CryptoKey>;
  onUpdateVaultStorageConfig?: (vaultId: string, config: VaultStorageConfig) => void;
}
