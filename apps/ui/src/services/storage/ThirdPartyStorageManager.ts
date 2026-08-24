import {
  VaultStorageConfig,
  StorageProviderType,
  StorageTestResult,
  S3Config,
  CloudDriveConfig,
  WebDAVConfig,
} from './ThirdPartyStorageTypes';
import { S3StorageAdapter } from './adapters/S3StorageAdapter';
import { WebDAVStorageAdapter } from './adapters/WebDAVStorageAdapter';
import { CloudDriveStorageAdapter } from './adapters/CloudDriveStorageAdapter';

import { StorageConfigCrypto } from '../../crypto/StorageConfigCrypto';
import { IApiClient } from '../../interfaces/IApiClient';

const STORAGE_PREFIX = 'markspace_vault_storage';

export class ThirdPartyStorageManager {
  /**
   * Loads the storage configuration for a specific vault and user from local cache.
   */
  public static getVaultStorageConfig(username: string | null, vaultId: string): VaultStorageConfig {
    const defaultR2Config: VaultStorageConfig = {
      vaultId,
      provider: 'r2',
      updatedAt: Date.now(),
    };

    if (!username || !vaultId) return defaultR2Config;

    try {
      const key = `${STORAGE_PREFIX}_${username}_${vaultId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...defaultR2Config,
          ...parsed,
          vaultId,
        };
      }

      // Check inside user's vaults array in localStorage
      const userVaultsRaw = localStorage.getItem(`markspace_vaults_${username}`);
      if (userVaultsRaw) {
        const userVaults = JSON.parse(userVaultsRaw);
        if (Array.isArray(userVaults)) {
          const target = userVaults.find((v: any) => v.id === vaultId);
          if (target && target.storageConfig) {
            return {
              ...defaultR2Config,
              ...target.storageConfig,
              vaultId,
            };
          }
        }
      }
    } catch (_) {}

    return defaultR2Config;
  }

  /**
   * Fetches, decrypts, and synchronizes storage configuration from remote D1 database.
   */
  public static async syncFromRemote(
    apiClient: IApiClient | null | undefined,
    username: string | null,
    vaultId: string,
    vmk?: CryptoKey | null
  ): Promise<VaultStorageConfig | null> {
    if (!apiClient || !username || !vaultId) return null;

    try {
      const remote = await apiClient.getVaultStorageConfig(vaultId);
      if (!remote) return null;

      const provider = (remote.provider as StorageProviderType) || 'r2';
      let decryptedDetails: Partial<VaultStorageConfig> = {};

      if (remote.encryptedConfig && remote.iv) {
        const key = vmk || (await StorageConfigCrypto.deriveFallbackKey(username, vaultId));
        decryptedDetails = await StorageConfigCrypto.decryptConfig(
          remote.encryptedConfig,
          remote.iv,
          key
        );
      }

      const merged: VaultStorageConfig = {
        ...this.getVaultStorageConfig(username, vaultId),
        ...decryptedDetails,
        provider,
        vaultId,
        updatedAt: Date.now(),
      };

      this.saveVaultStorageConfig(username, vaultId, merged);
      return merged;
    } catch (err) {
      console.warn('Failed to sync or decrypt remote storage config:', err);
      return null;
    }
  }

  /**
   * Saves the storage configuration for a specific vault and user locally.
   */
  public static saveVaultStorageConfig(
    username: string | null,
    vaultId: string,
    config: Partial<VaultStorageConfig>
  ): VaultStorageConfig {
    const current = this.getVaultStorageConfig(username, vaultId);
    const updated: VaultStorageConfig = {
      ...current,
      ...config,
      vaultId,
      updatedAt: Date.now(),
    };

    if (username && vaultId) {
      try {
        const key = `${STORAGE_PREFIX}_${username}_${vaultId}`;
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (_) {}
    }

    return updated;
  }

  /**
   * Encrypts and persists the storage configuration to both local storage and remote D1 database.
   */
  public static async saveVaultStorageConfigEncrypted(
    apiClient: IApiClient | null | undefined,
    username: string | null,
    vaultId: string,
    config: Partial<VaultStorageConfig>,
    vmk?: CryptoKey | null
  ): Promise<VaultStorageConfig> {
    const updated = this.saveVaultStorageConfig(username, vaultId, config);

    if (apiClient && username && vaultId) {
      try {
        const key = vmk || (await StorageConfigCrypto.deriveFallbackKey(username, vaultId));
        const payloadToEncrypt = {
          s3: updated.s3,
          cloudDrive: updated.cloudDrive,
          webdav: updated.webdav,
        };

        const { encryptedConfig, iv } = await StorageConfigCrypto.encryptConfig(
          payloadToEncrypt,
          key
        );

        await apiClient.putVaultStorageConfig(vaultId, {
          provider: updated.provider,
          encryptedConfig,
          iv,
        });
      } catch (err) {
        console.error('Failed to persist encrypted storage config to database:', err);
      }
    }

    return updated;
  }

  /**
   * Resets the storage configuration back to Cloudflare R2 default locally and in D1.
   */
  public static async resetToR2Encrypted(
    apiClient: IApiClient | null | undefined,
    username: string | null,
    vaultId: string
  ): Promise<VaultStorageConfig> {
    const updated = this.saveVaultStorageConfig(username, vaultId, {
      provider: 'r2',
      s3: undefined,
      cloudDrive: undefined,
      webdav: undefined,
    });

    if (apiClient && username && vaultId) {
      try {
        await apiClient.deleteVaultStorageConfig(vaultId);
      } catch (err) {
        console.warn('Failed to delete remote storage config:', err);
      }
    }

    return updated;
  }

  /**
   * Resets the storage configuration back to Cloudflare R2 default (local only).
   */
  public static resetToR2(username: string | null, vaultId: string): VaultStorageConfig {
    return this.saveVaultStorageConfig(username, vaultId, {
      provider: 'r2',
      s3: undefined,
      cloudDrive: undefined,
      webdav: undefined,
    });
  }

  /**
   * Dispatches a connectivity test for any storage configuration.
   */
  public static async testConnection(
    provider: StorageProviderType,
    config: {
      s3?: S3Config;
      cloudDrive?: CloudDriveConfig;
      webdav?: WebDAVConfig;
    }
  ): Promise<StorageTestResult> {
    if (provider === 'r2') {
      return {
        success: true,
        message: 'Cloudflare R2 (第一方存储) 处于就绪状态。',
        latencyMs: 12,
      };
    }

    if (provider === 's3' && config.s3) {
      const adapter = new S3StorageAdapter(config.s3);
      return await adapter.testConnection();
    }

    if (provider === 'webdav' && config.webdav) {
      const adapter = new WebDAVStorageAdapter(config.webdav);
      return await adapter.testConnection();
    }

    if (provider === 'cloud_drive' && config.cloudDrive) {
      const adapter = new CloudDriveStorageAdapter(config.cloudDrive);
      return await adapter.testConnection();
    }

    return {
      success: false,
      message: '未知或未初始化的存储配置。',
    };
  }
}
