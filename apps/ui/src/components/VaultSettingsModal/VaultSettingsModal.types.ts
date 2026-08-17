import { NoteItem, VaultInfo } from '../../interfaces/INoteModels';

export interface VaultSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaults: VaultInfo[];
  activeVaultId: string;
  onSelectVault: (id: string) => void;
  onCreateVault: (
    name: string,
    pin: string,
    recoveryKey?: string
  ) => Promise<{ vault: VaultInfo; recoveryKey: string; vmk: CryptoKey }>;
  onRenameVault?: (vaultId: string, newName: string) => void;
  onDeleteVault?: (vaultId: string) => void;
  activeVaultNotes: NoteItem[];
}
