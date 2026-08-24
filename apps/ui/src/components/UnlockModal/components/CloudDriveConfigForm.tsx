import React, { useState } from 'react';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { CloudDriveConfig, CloudDriveProvider } from '../../../services/storage/ThirdPartyStorageTypes';
import { useI18n } from '../../../i18n/i18nContext';

interface CloudDriveConfigFormProps {
  config: CloudDriveConfig;
  onChange: (updated: CloudDriveConfig) => void;
}

export const CloudDriveConfigForm: React.FC<CloudDriveConfigFormProps> = ({ config, onChange }) => {
  const { t } = useI18n();
  const [showToken, setShowToken] = useState(false);

  const providers: Array<{ id: CloudDriveProvider; label: string; authHint: string; tokenPlaceholder: string }> = [
    { id: 'google_drive', label: 'Google Drive', authHint: 'OAuth Access Token / Service Account Key', tokenPlaceholder: 'ya29.a0AfH6SM...' },
    { id: 'onedrive', label: 'Microsoft OneDrive', authHint: 'Microsoft Graph OAuth Access Token', tokenPlaceholder: 'EwBoA8l6BAAU...' },
    { id: 'dropbox', label: 'Dropbox', authHint: 'Dropbox App Generated Access Token', tokenPlaceholder: 'sl.B4x...' },
    { id: 'aliyun_drive', label: t('aliyunDriveLabel'), authHint: '', tokenPlaceholder: 'eyJhbGciOi...' },
    { id: 'quark_drive', label: t('quarkDriveLabel'), authHint: 'Cookie / 网页端授权 Token', tokenPlaceholder: 'b-user-id=...; b-cookie=...' },
  ];

  const currentProvider = providers.find((p) => p.id === config.provider) || providers[0];

  const handleProviderChange = (provider: CloudDriveProvider) => {
    onChange({
      ...config,
      provider,
    });
  };

  return (
    <div className="space-y-3 text-xs font-mono">
      {/* Cloud Drive Provider Select */}
      <div>
        <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
          {t('commercialCloudDrive')}
        </label>
        <select
          value={config.provider}
          onChange={(e) => handleProviderChange(e.target.value as CloudDriveProvider)}
          className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-primaryColor-500 transition cursor-pointer"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Target Directory Path */}
      <div>
        <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
          {t('targetFolderPath')}
        </label>
        <input
          type="text"
          value={config.targetFolder}
          onChange={(e) => onChange({ ...config, targetFolder: e.target.value })}
          placeholder="/Markspace/VaultData"
          className="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition"
        />
      </div>

      {/* Auth Token / Key */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-zinc-600 dark:text-zinc-400 font-medium">
            {t('accessTokenAuth')}
          </label>
          <span className="text-[10px] text-zinc-400">
            {currentProvider.authHint}
          </span>
        </div>
        <div className="relative">
          <textarea
            rows={2}
            value={config.authToken}
            onChange={(e) => onChange({ ...config, authToken: e.target.value })}
            placeholder={currentProvider.tokenPlaceholder}
            className={`w-full px-3 py-1.5 pr-9 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition font-mono ${
              !showToken ? 'filter blur-[3px] hover:blur-none' : ''
            }`}
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
          >
            {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Custom API Proxy / Endpoint (Optional) */}
      <div>
        <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
          {t('customApiProxyOptional')}
        </label>
        <input
          type="text"
          value={config.customEndpoint || ''}
          onChange={(e) => onChange({ ...config, customEndpoint: e.target.value })}
          placeholder="https://api.yourproxy.com"
          className="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition"
        />
      </div>

      {/* Zero Knowledge Notice */}
      <div className="flex items-start gap-1.5 p-2 rounded-xl bg-primaryColor-500/10 border border-primaryColor-500/20 text-primaryColor-700 dark:text-primaryColor-300 text-[11px]">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{t('cloudDriveE2eeNotice')}</span>
      </div>
    </div>
  );
};
