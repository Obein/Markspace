import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { WebDAVConfig, WebDAVPreset } from '../../../services/storage/ThirdPartyStorageTypes';
import { useI18n } from '../../../i18n/i18nContext';

interface WebDAVConfigFormProps {
  config: WebDAVConfig;
  onChange: (updated: WebDAVConfig) => void;
}

export const WebDAVConfigForm: React.FC<WebDAVConfigFormProps> = ({ config, onChange }) => {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);

  const presets: Array<{ id: WebDAVPreset; label: string; defaultUrl: string; defaultPath: string }> = [
    { id: 'jianguoyun', label: t('jianguoyunPreset'), defaultUrl: 'https://dav.jianguoyun.com/dav/', defaultPath: '/markspace' },
    { id: 'nextcloud', label: 'Nextcloud / ownCloud', defaultUrl: 'https://your-nextcloud.com/remote.php/dav/files/USERNAME/', defaultPath: '/markspace' },
    { id: 'synology_nas', label: t('synologyPreset'), defaultUrl: 'https://nas.local:5006/webdav/', defaultPath: '/markspace' },
    { id: 'alist', label: t('alistPreset'), defaultUrl: 'http://localhost:5244/dav/', defaultPath: '/markspace' },
    { id: 'infinicloud', label: 'InfiniCLOUD (TeraCLOUD)', defaultUrl: 'https://your-id.teracloud.jp/dav/', defaultPath: '/markspace' },
    { id: 'custom', label: t('customWebdavPreset'), defaultUrl: '', defaultPath: '/markspace' },
  ];

  const handlePresetChange = (preset: WebDAVPreset) => {
    const selected = presets.find((p) => p.id === preset);
    if (!selected) return;

    onChange({
      ...config,
      preset,
      serverUrl: selected.defaultUrl || config.serverUrl,
      basePath: selected.defaultPath || config.basePath,
    });
  };

  return (
    <div className="space-y-3 text-xs font-mono">
      {/* WebDAV Preset Select */}
      <div>
        <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
          {t('webdavPreset')}
        </label>
        <select
          value={config.preset}
          onChange={(e) => handlePresetChange(e.target.value as WebDAVPreset)}
          className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-primaryColor-500 transition cursor-pointer"
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* WebDAV Server URL */}
      <div>
        <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
          WebDAV Server URL *
        </label>
        <input
          type="text"
          value={config.serverUrl}
          onChange={(e) => onChange({ ...config, serverUrl: e.target.value })}
          placeholder="https://dav.jianguoyun.com/dav/"
          className="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition"
        />
      </div>

      {/* Base Path */}
      <div>
        <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
          {t('basePath')}
        </label>
        <input
          type="text"
          value={config.basePath}
          onChange={(e) => onChange({ ...config, basePath: e.target.value })}
          placeholder="/markspace"
          className="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition"
        />
      </div>

      {/* Account / Username & Password */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
            {t('usernameOrEmail')}
          </label>
          <input
            type="text"
            value={config.username}
            onChange={(e) => onChange({ ...config, username: e.target.value })}
            placeholder="user@example.com"
            className="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition"
          />
        </div>
        <div>
          <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
            {t('appPassword')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={config.password}
              onChange={(e) => onChange({ ...config, password: e.target.value })}
              placeholder="••••••••••••"
              className="w-full px-3 py-1.5 pr-8 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
