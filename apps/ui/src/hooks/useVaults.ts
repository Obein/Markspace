import { useMemo, useCallback } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useApp } from '../context/AppContext';
import { UserMasterKeyService } from '../crypto/UserMasterKeyService';
import { MnemonicService } from '../crypto/MnemonicService';
import { TranslationKey } from '../i18n/i18nContext';
import { VaultInfo } from '../interfaces/INoteModels';
import { UserVaultItem } from '../interfaces/IApiClient';
import { VaultStorageConfig } from '../services/storage/ThirdPartyStorageTypes';

interface UseVaultsOptions {
  username: string | null;
  t: (key: TranslationKey) => string;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
  onDeleteVaultNodes?: (vaultId: string) => Promise<void>;
  onVaultDeleted?: (deletedVaultId: string, nextVaultId: string) => void;
}

const WEBAUTHN_PRF_SALT = new TextEncoder().encode('markspace-passkey-prf-v1');

export function useVaults({
  username,
  t,
  showToast,
  onDeleteVaultNodes,
  onVaultDeleted,
}: UseVaultsOptions) {
  const {
    cryptoService,
    apiClient,
    umk,
    userVaults,
    setUserVaults,
    unlockAllVaultsWithUmk,
    setVaultKey,
    activeVaultId,
    setActiveVaultId,
  } = useApp();

  // Map D1 UserVaultItem to UI VaultInfo
  const vaults: VaultInfo[] = useMemo(() => {
    return userVaults.map((uv: UserVaultItem) => ({
      id: uv.id,
      name: uv.name,
      salt: uv.salt,
      wrappedVmkByPasskey: uv.wrappedVmk,
      createdAt: uv.createdAt || Date.now(),
    }));
  }, [userVaults]);

  const activeVault = useMemo(() => {
    return vaults.find((v) => v.id === activeVaultId) || vaults[0];
  }, [vaults, activeVaultId]);

  const handleCreateVault = useCallback(
    async (
      name: string,
      _customRecoveryKey?: string,
      _providedPasskeyKey?: CryptoKey,
      initialStorageConfig?: VaultStorageConfig
    ): Promise<{ vault: VaultInfo; recoveryKey: string; vmk: CryptoKey }> => {
      if (!umk) {
        throw new Error('User Master Key (UMK) is locked. Please authenticate with Passkey to create a vault.');
      }

      const salt = UserMasterKeyService.generateSalt();
      const vmk = await cryptoService.generateVMK();
      const wrappedVmk = await UserMasterKeyService.wrapVMK(vmk, umk);

      const createdItem = await apiClient.createUserVault({
        name: name.trim() || t('untitledNote'),
        salt,
        wrappedVmk,
        encryptedStorageConfig: initialStorageConfig ? JSON.stringify(initialStorageConfig) : null,
        isDefault: userVaults.length === 0,
      });

      setUserVaults((prev) => [...prev, createdItem]);
      setVaultKey(createdItem.id, vmk);

      if (!activeVaultId) {
        setActiveVaultId(createdItem.id);
      }

      showToast(t('createVault'), 'success');

      const newVaultInfo: VaultInfo = {
        id: createdItem.id,
        name: createdItem.name,
        salt: createdItem.salt,
        wrappedVmkByPasskey: createdItem.wrappedVmk,
        storageConfig: initialStorageConfig,
        createdAt: createdItem.createdAt || Date.now(),
      };

      return { vault: newVaultInfo, recoveryKey: '', vmk };
    },
    [umk, cryptoService, apiClient, t, userVaults.length, setUserVaults, setVaultKey, activeVaultId, setActiveVaultId, showToast]
  );

  const handleUnlockVaultWithPasskey = useCallback(
    async (_vaultId: string): Promise<CryptoKey> => {
      const options = await apiClient.passkeyLoginOptions(username || undefined);

      (options as any).extensions = {
        prf: {
          eval: {
            first: WEBAUTHN_PRF_SALT,
          },
        },
      };

      const authResponse = await startAuthentication({ optionsJSON: options });
      const prfFirst = (authResponse as any).clientExtensionResults?.prf?.results?.first;

      if (!prfFirst || !(prfFirst instanceof ArrayBuffer)) {
        throw new Error('This authenticator does not support WebAuthn PRF. Please unlock with your 12-word Recovery Phrase.');
      }

      const keysRes = await apiClient.getUserCryptoKeys();
      if (!keysRes?.userCryptoKeys?.wrappedUmkByPrf) {
        throw new Error('No Passkey PRF envelope found on your account. Please unlock with your 12-word Recovery Phrase.');
      }

      const uek = await UserMasterKeyService.deriveUEKFromPrf(
        new Uint8Array(prfFirst),
        keysRes.userCryptoKeys.recoverySalt
      );
      const unlockedUmk = await UserMasterKeyService.unwrapUMK(
        keysRes.userCryptoKeys.wrappedUmkByPrf,
        uek
      );

      await unlockAllVaultsWithUmk(unlockedUmk, keysRes.vaults);
      showToast('All vaults unlocked with Passkey', 'success');

      // Return current active VMK
      const currentVault = keysRes.vaults.find((v) => v.id === activeVaultId) || keysRes.vaults[0];
      return UserMasterKeyService.unwrapVMK(currentVault.wrappedVmk, unlockedUmk);
    },
    [apiClient, username, activeVaultId, unlockAllVaultsWithUmk, showToast]
  );

  const handleUnlockVaultWithRecovery = useCallback(
    async (_vaultId: string, mnemonic: string): Promise<CryptoKey> => {
      const normalized = MnemonicService.normalizeMnemonic(mnemonic);
      const words = normalized.split(/\s+/).filter(Boolean);
      if (words.length !== 12) {
        throw new Error('Please enter a valid 12-word BIP-39 recovery phrase.');
      }

      const keysRes = await apiClient.getUserCryptoKeys();
      if (!keysRes?.userCryptoKeys?.wrappedUmkByRecovery) {
        throw new Error('User cryptographic envelope not found.');
      }

      const rek = await UserMasterKeyService.deriveREKFromMnemonic(
        normalized,
        keysRes.userCryptoKeys.recoverySalt
      );
      const unlockedUmk = await UserMasterKeyService.unwrapUMK(
        keysRes.userCryptoKeys.wrappedUmkByRecovery,
        rek
      );

      await unlockAllVaultsWithUmk(unlockedUmk, keysRes.vaults);
      showToast('All vaults unlocked with Recovery Phrase', 'success');

      const currentVault = keysRes.vaults.find((v) => v.id === activeVaultId) || keysRes.vaults[0];
      return UserMasterKeyService.unwrapVMK(currentVault.wrappedVmk, unlockedUmk);
    },
    [apiClient, activeVaultId, unlockAllVaultsWithUmk, showToast]
  );

  const handleRenameVault = useCallback(
    async (vaultId: string, newName: string) => {
      if (!newName.trim()) return;
      await apiClient.updateUserVault(vaultId, { name: newName.trim() });
      setUserVaults((prev) =>
        prev.map((v) => (v.id === vaultId ? { ...v, name: newName.trim() } : v))
      );
      showToast(t('saved'), 'success');
    },
    [apiClient, setUserVaults, showToast, t]
  );

  const handleDeleteVault = useCallback(
    async (vaultId: string) => {
      await apiClient.deleteUserVault(vaultId);

      if (onDeleteVaultNodes) {
        await onDeleteVaultNodes(vaultId);
      }

      const updatedVaults = userVaults.filter((v) => v.id !== vaultId);
      setUserVaults(updatedVaults);

      const nextVaultId = updatedVaults.length > 0
        ? (activeVaultId === vaultId ? updatedVaults[0].id : activeVaultId)
        : '';
      setActiveVaultId(nextVaultId);
      setVaultKey(vaultId, null);

      if (onVaultDeleted) {
        onVaultDeleted(vaultId, nextVaultId);
      }
      showToast(t('deleteVault'), 'success');
    },
    [apiClient, onDeleteVaultNodes, userVaults, setUserVaults, activeVaultId, setActiveVaultId, setVaultKey, onVaultDeleted, showToast, t]
  );

  const handleUpdateVaultStorageConfig = useCallback(
    async (vaultId: string, storageConfig: VaultStorageConfig) => {
      const configStr = JSON.stringify(storageConfig);
      await apiClient.updateUserVault(vaultId, { encryptedStorageConfig: configStr });
      setUserVaults((prev) =>
        prev.map((v) => (v.id === vaultId ? { ...v, encryptedStorageConfig: configStr } : v))
      );
    },
    [apiClient, setUserVaults]
  );

  return {
    vaults,
    setVaults: setUserVaults as any,
    activeVaultId,
    setActiveVaultId,
    activeVault,
    handleCreateVault,
    handleUnlockVaultWithPasskey,
    handleUnlockVaultWithRecovery,
    handleRenameVault,
    handleDeleteVault,
    handleUpdateVaultStorageConfig,
  };
}
