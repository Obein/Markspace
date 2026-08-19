import { VaultInfo } from '../../interfaces/INoteModels';

export interface UnlockModalProps {
  vaults: VaultInfo[];
  activeVaultId: string;
  onSelectVault: (id: string) => void;
  onOpenProfile?: () => void;
  onDeleteVault?: (id: string) => void;
  onCreateVault: (
    name: string,
    customRecoveryKey?: string,
    providedPasskeyKey?: CryptoKey
  ) => Promise<{ vault: VaultInfo; recoveryKey: string; vmk: CryptoKey }>;
  onUnlockVaultWithPasskey?: (vaultId: string) => Promise<CryptoKey>;
  onUnlockVaultWithRecovery?: (vaultId: string, mnemonic: string) => Promise<CryptoKey>;
}
