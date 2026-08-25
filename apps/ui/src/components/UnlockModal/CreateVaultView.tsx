import React, { useState } from 'react';
import {
  Database,
  ArrowLeft,
  ArrowRight,
  Loader2,
  KeyRound,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Fingerprint,
  HardDrive,
  Cloud,
  Globe,
  Radio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { useApp } from '../../context/AppContext';
import { VaultInfo } from '../../interfaces/INoteModels';
import {
  StorageProviderType,
  VaultStorageConfig,
  S3Config,
  CloudDriveConfig,
  WebDAVConfig,
  StorageTestResult,
} from '../../services/storage/ThirdPartyStorageTypes';
import { ThirdPartyStorageManager } from '../../services/storage/ThirdPartyStorageManager';
import { S3ConfigForm } from './components/S3ConfigForm';
import { CloudDriveConfigForm } from './components/CloudDriveConfigForm';
import { WebDAVConfigForm } from './components/WebDAVConfigForm';

export interface CreateVaultViewProps {
  vaultsCount: number;
  onCreateVault: (
    name: string,
    customRecoveryKey?: string,
    providedPasskeyKey?: CryptoKey,
    initialStorageConfig?: VaultStorageConfig
  ) => Promise<{ vault: VaultInfo; recoveryKey: string; vmk: CryptoKey }>;
  onBackToUnlock: () => void;
  onComplete: (vaultId: string, vmk: CryptoKey) => void;
  onError: (msg: string | null) => void;
}

const DEFAULT_S3_CONFIG: S3Config = {
  preset: 'aws',
  endpoint: 'https://s3.amazonaws.com',
  region: 'us-east-1',
  bucketName: '',
  accessKeyId: '',
  secretAccessKey: '',
  prefix: '',
  forcePathStyle: false,
};

const DEFAULT_CLOUD_DRIVE_CONFIG: CloudDriveConfig = {
  provider: 'google_drive',
  authType: 'token',
  authToken: '',
  targetFolder: '/Markspace/VaultData',
};

const DEFAULT_WEBDAV_CONFIG: WebDAVConfig = {
  preset: 'jianguoyun',
  serverUrl: 'https://dav.jianguoyun.com/dav/',
  username: '',
  password: '',
  basePath: '/markspace',
};

export const CreateVaultView: React.FC<CreateVaultViewProps> = ({
  vaultsCount,
  onCreateVault,
  onBackToUnlock,
  onComplete,
  onError,
}) => {
  const { t } = useI18n();
  const { isR2Available } = useApp();

  const [newVaultName, setNewVaultName] = useState('');
  const [loading, setLoading] = useState(false);

  // Third-party storage setup state when R2 is unavailable
  const [storageTab, setStorageTab] = useState<StorageProviderType>('s3');
  const [s3Buffer, setS3Buffer] = useState<S3Config>(DEFAULT_S3_CONFIG);
  const [cloudDriveBuffer, setCloudDriveBuffer] = useState<CloudDriveConfig>(DEFAULT_CLOUD_DRIVE_CONFIG);
  const [webdavBuffer, setWebdavBuffer] = useState<WebDAVConfig>(DEFAULT_WEBDAV_CONFIG);
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [testResult, setTestResult] = useState<StorageTestResult | null>(null);

  const [createdRecoveryInfo, setCreatedRecoveryInfo] = useState<{
    vault: VaultInfo;
    recoveryKey: string;
    vmk: CryptoKey;
  } | null>(null);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [confirmedBackup, setConfirmedBackup] = useState(false);

  const handleTestStorageConnection = async () => {
    setIsTestingStorage(true);
    setTestResult(null);
    try {
      const res = await ThirdPartyStorageManager.testConnection(storageTab, {
        s3: s3Buffer,
        cloudDrive: cloudDriveBuffer,
        webdav: webdavBuffer,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection test failed.',
      });
    } finally {
      setIsTestingStorage(false);
    }
  };

  const validateStorageConfig = (): boolean => {
    if (isR2Available) return true;
    if (storageTab === 's3') {
      return Boolean(s3Buffer.bucketName.trim() && s3Buffer.accessKeyId.trim() && s3Buffer.secretAccessKey.trim());
    }
    if (storageTab === 'cloud_drive') {
      return Boolean(cloudDriveBuffer.authToken.trim());
    }
    if (storageTab === 'webdav') {
      return Boolean(webdavBuffer.serverUrl.trim() && webdavBuffer.username.trim() && webdavBuffer.password.trim());
    }
    return false;
  };

  const handleCreateVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);

    if (!newVaultName.trim()) {
      onError(t('enterVaultName') || 'Please enter a vault name');
      return;
    }

    if (!isR2Available && !validateStorageConfig()) {
      onError(t('configureStorageFirst') || 'Please configure third-party storage credentials first.');
      return;
    }

    const storageConfig: VaultStorageConfig | undefined = !isR2Available
      ? {
          vaultId: '',
          provider: storageTab,
          s3: s3Buffer,
          cloudDrive: cloudDriveBuffer,
          webdav: webdavBuffer,
          updatedAt: Date.now(),
        }
      : undefined;

    try {
      setLoading(true);
      const res = await onCreateVault(newVaultName.trim(), undefined, undefined, storageConfig);
      setCreatedRecoveryInfo(res);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishVaultCreation = () => {
    if (createdRecoveryInfo) {
      onComplete(createdRecoveryInfo.vault.id, createdRecoveryInfo.vmk);
      setCreatedRecoveryInfo(null);
      setNewVaultName('');
      setConfirmedBackup(false);
    }
  };

  const isStorageValid = validateStorageConfig();

  if (!createdRecoveryInfo) {
    return (
      <div className="space-y-4 animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primaryColor-500/15 border border-primaryColor-500/30 text-primaryColor-600 dark:text-primaryColor-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {vaultsCount === 0 ? t('initializeFirstVault') || 'Create First Vault' : t('createNewVault') || 'Create New Vault'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {t('passkeyProtectedDesc') || 'Hardware Passkey & 8-Word Mnemonic Protected'}
              </p>
            </div>
          </div>

          {vaultsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                onError(null);
                onBackToUnlock();
              }}
              className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-black/10 dark:border-white/10 transition cursor-pointer"
              title="Back to Unlock"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mandatory Third-Party Storage Notice when R2 is unavailable */}
        {!isR2Available && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 font-mono">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{t('thirdPartyStorageRequired')}</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-mono">
                {t('r2NotConfiguredNotice')}
              </p>
            </div>

            {/* Storage Scheme Selector Tabs */}
            <div className="grid grid-cols-3 p-1 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 gap-1 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setStorageTab('s3');
                  setTestResult(null);
                }}
                className={`py-1.5 px-1 sm:px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  storageTab === 's3'
                    ? 'bg-white dark:bg-zinc-800 text-primaryColor-600 dark:text-primaryColor-400 shadow-sm font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('s3CompatibleStorage')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStorageTab('cloud_drive');
                  setTestResult(null);
                }}
                className={`py-1.5 px-1 sm:px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  storageTab === 'cloud_drive'
                    ? 'bg-white dark:bg-zinc-800 text-primaryColor-600 dark:text-primaryColor-400 shadow-sm font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('commercialCloudDrive')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStorageTab('webdav');
                  setTestResult(null);
                }}
                className={`py-1.5 px-1 sm:px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  storageTab === 'webdav'
                    ? 'bg-white dark:bg-zinc-800 text-primaryColor-600 dark:text-primaryColor-400 shadow-sm font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('webdavStorage')}</span>
              </button>
            </div>

            {/* Storage Config Sub-form */}
            <div className="p-3 rounded-xl bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5 space-y-3">
              {storageTab === 's3' && <S3ConfigForm config={s3Buffer} onChange={setS3Buffer} />}
              {storageTab === 'cloud_drive' && (
                <CloudDriveConfigForm config={cloudDriveBuffer} onChange={setCloudDriveBuffer} />
              )}
              {storageTab === 'webdav' && (
                <WebDAVConfigForm config={webdavBuffer} onChange={setWebdavBuffer} />
              )}

              {/* Test Connection Button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTestStorageConnection}
                  disabled={isTestingStorage}
                  className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-black/10 dark:border-white/10 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isTestingStorage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <Radio className="w-3.5 h-3.5 text-primaryColor-500 shrink-0" />
                  )}
                  <span>{isTestingStorage ? t('testing') : t('testConnection')}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-2 rounded-xl border text-xs font-mono flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  )}
                  <p className="font-medium text-[11px]">{testResult.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleCreateVaultSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-700 dark:text-zinc-300 font-medium mb-1.5">
              {t('vaultName') || 'Vault Name'}
            </label>
            <input
              type="text"
              value={newVaultName}
              onChange={(e) => setNewVaultName(e.target.value)}
              placeholder="e.g. Personal Workspace, Research Notes"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500"
              autoFocus
            />
          </div>

          <div className="p-3.5 rounded-xl bg-primaryColor-500/10 border border-primaryColor-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-primaryColor-700 dark:text-primaryColor-300">
              <Fingerprint className="w-4 h-4 text-primaryColor-500" />
              <span>{t('hardwareProtection') || 'Biometric Passkey Binding'}</span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-mono">
              {t('passkeyAutoBindNotice') || 'Your vault will be bound to your device hardware authenticator (Google Password Manager / iCloud Keychain / Windows Hello) and backup with an 8-word mnemonic.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !newVaultName.trim() || (!isR2Available && !isStorageValid)}
            className="w-full py-2.5 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-primaryColor-500/20 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('creating') || 'Generating Vault Keys...'}</span>
              </>
            ) : (
              <>
                <span>{t('createVault') || 'Create Vault'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 pt-2 border-t border-black/5 dark:border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Zero-Knowledge Multi-Tier Envelope Encryption</span>
        </div>
      </div>
    );
  }

  // Display Created Recovery Key Card (Clean Apple glass styling)
  const words = createdRecoveryInfo.recoveryKey.split(/[\s\-]+/).filter(Boolean);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 pb-3 border-b border-black/10 dark:border-white/10">
        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <span>{t('vaultRecoveryKey') || 'Vault Recovery Key'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-semibold">
              8 Words
            </span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            {t('saveKeySecurely') || 'Save key securely to recover your vault'}
          </p>
        </div>
      </div>

      {/* Vault Metadata Card with UUID */}
      <div className="p-3 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 space-y-1.5 text-xs font-mono">
        <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
          <span>{t('vaultName') || 'Vault Name'}:</span>
          <strong className="text-zinc-900 dark:text-zinc-200">{createdRecoveryInfo.vault.name}</strong>
        </div>
        <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
          <span>Vault UUID:</span>
          <span className="text-primaryColor-600 dark:text-primaryColor-400 select-all font-mono text-[10px]">{createdRecoveryInfo.vault.id}</span>
        </div>
      </div>

      {/* Mnemonic Key Box */}
      <div className="relative p-3.5 rounded-xl bg-primaryColor-500/10 dark:bg-primaryColor-950/40 border border-primaryColor-500/30 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-primaryColor-700 dark:text-primaryColor-300 font-mono font-medium">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>BIP-39 Mnemonic Recovery Key</span>
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(createdRecoveryInfo.recoveryKey);
              setCopiedRecovery(true);
              setTimeout(() => setCopiedRecovery(false), 2000);
            }}
            className="px-2 py-0.5 rounded bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-[10px] flex items-center gap-1 transition cursor-pointer shadow-sm"
          >
            {copiedRecovery ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
            <span>{copiedRecovery ? t('copied') || 'Copied' : t('copy') || 'Copy'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {words.map((word, idx) => (
            <div
              key={idx}
              className="px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-black/50 border border-black/10 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white flex items-center gap-1.5 select-all shadow-sm"
            >
              <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-mono">{idx + 1}.</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">{word}</span>
            </div>
          ))}
        </div>

        <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-white/60 dark:bg-black/60 p-2 rounded-lg break-all select-all border border-black/5 dark:border-white/5">
          {createdRecoveryInfo.recoveryKey}
        </div>
      </div>

      {/* Critical Warning */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed font-mono">
          <strong>Critical:</strong> {t('recoveryKeyWarning') || 'This recovery key is the ONLY way to unlock your vault if your Passkey is lost. It is never stored on the server.'}
        </p>
      </div>

      {/* Confirmation Checkbox */}
      <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmedBackup}
          onChange={(e) => setConfirmedBackup(e.target.checked)}
          className="w-4 h-4 rounded text-primaryColor-600 focus:ring-0 cursor-pointer"
        />
        <span className="font-mono text-[11px]">{t('confirmBackupCheckbox') || 'I have safely backed up my recovery key and Vault UUID.'}</span>
      </label>

      <button
        type="button"
        onClick={handleFinishVaultCreation}
        disabled={!confirmedBackup}
        className="w-full py-3 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-xs font-bold transition shadow-lg shadow-primaryColor-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <ShieldCheck className="w-4 h-4" />
        <span>{t('completeAndOpenVault') || 'Complete & Open Vault'}</span>
      </button>
    </div>
  );
};
