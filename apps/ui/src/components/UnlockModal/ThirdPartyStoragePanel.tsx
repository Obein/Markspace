import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  Cloud,
  HardDrive,
  Globe,
  Radio,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { useApp } from '../../context/AppContext';
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

interface ThirdPartyStoragePanelProps {
  username: string | null;
  activeVaultId: string;
  onToast?: (msg: string, type?: 'error' | 'success' | 'info') => void;
  onUpdateConfig?: (vaultId: string, config: VaultStorageConfig) => void;
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

export const ThirdPartyStoragePanel: React.FC<ThirdPartyStoragePanelProps> = ({
  username,
  activeVaultId,
  onToast,
  onUpdateConfig,
}) => {
  const { t } = useI18n();
  const { apiClient, cmk, unlockedVaultKeys } = useApp();
  const activeVaultKey = unlockedVaultKeys[activeVaultId] || cmk || null;
  const [isExpanded, setIsExpanded] = useState(false);

  // Active sub-tab inside panel: 's3' | 'cloud_drive' | 'webdav'
  const [activeTab, setActiveTab] = useState<'s3' | 'cloud_drive' | 'webdav'>('s3');

  // Loaded Storage Config
  const [config, setConfig] = useState<VaultStorageConfig>(() =>
    ThirdPartyStorageManager.getVaultStorageConfig(username, activeVaultId)
  );

  // Form State Buffers
  const [s3Buffer, setS3Buffer] = useState<S3Config>(() => config.s3 || DEFAULT_S3_CONFIG);
  const [cloudDriveBuffer, setCloudDriveBuffer] = useState<CloudDriveConfig>(
    () => config.cloudDrive || DEFAULT_CLOUD_DRIVE_CONFIG
  );
  const [webdavBuffer, setWebdavBuffer] = useState<WebDAVConfig>(
    () => config.webdav || DEFAULT_WEBDAV_CONFIG
  );

  // Test & Save status
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<StorageTestResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reload config when activeVaultId or username changes and sync with D1
  useEffect(() => {
    const loaded = ThirdPartyStorageManager.getVaultStorageConfig(username, activeVaultId);
    setConfig(loaded);
    setS3Buffer(loaded.s3 || DEFAULT_S3_CONFIG);
    setCloudDriveBuffer(loaded.cloudDrive || DEFAULT_CLOUD_DRIVE_CONFIG);
    setWebdavBuffer(loaded.webdav || DEFAULT_WEBDAV_CONFIG);
    setTestResult(null);

    if (loaded.provider !== 'r2') {
      setActiveTab(loaded.provider);
    }

    // Attempt remote D1 sync in background
    if (apiClient && username && activeVaultId) {
      ThirdPartyStorageManager.syncFromRemote(apiClient, username, activeVaultId, activeVaultKey).then(
        (synced) => {
          if (synced) {
            setConfig(synced);
            setS3Buffer(synced.s3 || DEFAULT_S3_CONFIG);
            setCloudDriveBuffer(synced.cloudDrive || DEFAULT_CLOUD_DRIVE_CONFIG);
            setWebdavBuffer(synced.webdav || DEFAULT_WEBDAV_CONFIG);
            if (synced.provider !== 'r2') {
              setActiveTab(synced.provider);
            }
            if (onUpdateConfig) {
              onUpdateConfig(activeVaultId, synced);
            }
          }
        }
      );
    }
  }, [username, activeVaultId, apiClient, activeVaultKey]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const targetProvider: StorageProviderType = activeTab;
      const res = await ThirdPartyStorageManager.testConnection(targetProvider, {
        s3: s3Buffer,
        cloudDrive: cloudDriveBuffer,
        webdav: webdavBuffer,
      });
      setTestResult(res);
      if (onToast) {
        onToast(res.message, res.success ? 'success' : 'error');
      }
    } catch (err: any) {
      const res = {
        success: false,
        message: err?.message || 'Connection test failed.',
      };
      setTestResult(res);
      if (onToast) {
        onToast(res.message, 'error');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndEnable = async () => {
    setIsSaving(true);
    try {
      const targetProvider: StorageProviderType = activeTab;
      const updated = await ThirdPartyStorageManager.saveVaultStorageConfigEncrypted(
        apiClient,
        username,
        activeVaultId,
        {
          provider: targetProvider,
          s3: s3Buffer,
          cloudDrive: cloudDriveBuffer,
          webdav: webdavBuffer,
        },
        activeVaultKey
      );
      setConfig(updated);
      if (onUpdateConfig) {
        onUpdateConfig(activeVaultId, updated);
      }
      if (onToast) {
        onToast(t('storageSavedAndEnabled'), 'success');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToR2 = async () => {
    const updated = await ThirdPartyStorageManager.resetToR2Encrypted(
      apiClient,
      username,
      activeVaultId
    );
    setConfig(updated);
    setTestResult(null);
    if (onUpdateConfig) {
      onUpdateConfig(activeVaultId, updated);
    }
    if (onToast) {
      onToast(t('restoredToR2Toast'), 'info');
    }
  };

  const isR2Active = config.provider === 'r2';

  // Title and subtitle descriptions for the collapsed bar
  const getProviderSummary = () => {
    switch (config.provider) {
      case 'r2':
        return {
          title: t('firstPartyR2Storage'),
          badge: t('firstPartyR2Badge'),
          badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          hint: t('thirdPartyStorageAvailableHint'),
        };
      case 's3':
        return {
          title: `${t('s3CompatibleStorage')} (${config.s3?.bucketName || config.s3?.preset || t('configured')})`,
          badge: t('s3EnabledBadge'),
          badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          hint: t('s3ActiveHint'),
        };
      case 'cloud_drive':
        return {
          title: `${t('commercialCloudDrive')} (${config.cloudDrive?.provider || t('configured')})`,
          badge: t('cloudDriveEnabledBadge'),
          badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          hint: t('cloudDriveActiveHint'),
        };
      case 'webdav':
        return {
          title: `${t('webdavStorage')} (${config.webdav?.preset || t('configured')})`,
          badge: t('webdavEnabledBadge'),
          badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          hint: t('webdavActiveHint'),
        };
    }
  };

  const summary = getProviderSummary();

  return (
    <div className="w-full mt-3 glass-panel rounded-glass-lg border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white shadow-lg overflow-hidden transition-all duration-300">
      {/* Collapsed Header Bar (Always Visible) */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-primaryColor-600 dark:text-primaryColor-400 shrink-0">
            {config.provider === 'r2' ? (
              <Cloud className="w-4 h-4" />
            ) : config.provider === 's3' ? (
              <HardDrive className="w-4 h-4" />
            ) : config.provider === 'webdav' ? (
              <Globe className="w-4 h-4" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {summary.title}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium whitespace-nowrap shrink-0 ${summary.badgeColor}`}
              >
                {summary.badge}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-mono">
              {summary.hint}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 whitespace-nowrap">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${
              isExpanded ? 'rotate-180 text-primaryColor-500' : ''
            }`}
          />
        </div>
      </button>

      {/* Expandable Configuration Body */}
      {isExpanded && (
        <div className="p-4 pt-2 border-t border-black/10 dark:border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Storage Scheme Selector Tabs */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 gap-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setActiveTab('s3');
                setTestResult(null);
              }}
              className={`py-2 px-1 sm:px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 's3'
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
                setActiveTab('cloud_drive');
                setTestResult(null);
              }}
              className={`py-2 px-1 sm:px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'cloud_drive'
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
                setActiveTab('webdav');
                setTestResult(null);
              }}
              className={`py-2 px-1 sm:px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'webdav'
                  ? 'bg-white dark:bg-zinc-800 text-primaryColor-600 dark:text-primaryColor-400 shadow-sm font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t('webdavStorage')}</span>
            </button>
          </div>

          {/* Tab Sub-forms */}
          <div className="p-3 rounded-xl bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5">
            {activeTab === 's3' && <S3ConfigForm config={s3Buffer} onChange={setS3Buffer} />}
            {activeTab === 'cloud_drive' && (
              <CloudDriveConfigForm config={cloudDriveBuffer} onChange={setCloudDriveBuffer} />
            )}
            {activeTab === 'webdav' && (
              <WebDAVConfigForm config={webdavBuffer} onChange={setWebdavBuffer} />
            )}
          </div>

          {/* Connection Test Result Box */}
          {testResult && (
            <div
              className={`p-2.5 rounded-xl border text-xs font-mono flex items-start gap-2 ${
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
              <div className="min-w-0">
                <p className="font-medium">{testResult.message}</p>
                {testResult.details && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {testResult.details}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-black/10 dark:border-white/10 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isTesting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <Radio className="w-3.5 h-3.5 text-primaryColor-500 shrink-0" />
                )}
                <span>{isTesting ? t('testing') : t('testConnection')}</span>
              </button>

              {!isR2Active && (
                <button
                  type="button"
                  onClick={handleResetToR2}
                  className="px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-black/10 dark:border-white/10 text-xs font-mono transition flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  title={t('restoreR2Desc')}
                >
                  <RotateCcw className="w-3 h-3 shrink-0" />
                  <span>{t('restoreR2')}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveAndEnable}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-700 active:scale-95 text-white text-xs font-mono font-medium shadow-md shadow-primaryColor-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span>{t('saveAndBind')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
