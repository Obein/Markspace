import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { S3Config, S3Preset } from '../../../services/storage/ThirdPartyStorageTypes';
import { useI18n } from '../../../i18n/i18nContext';

interface S3ConfigFormProps {
  config: S3Config;
  onChange: (updated: S3Config) => void;
}

export const S3ConfigForm: React.FC<S3ConfigFormProps> = ({ config, onChange }) => {
  const { t } = useI18n();
  const [showSecret, setShowSecret] = useState(false);

  const presets: Array<{ id: S3Preset; label: string; defaultEndpoint: string; defaultRegion: string; pathStyle: boolean }> = [
    { id: 'aws', label: 'Amazon AWS S3', defaultEndpoint: 'https://s3.amazonaws.com', defaultRegion: 'us-east-1', pathStyle: false },
    { id: 'r2_custom', label: t('r2CustomPreset'), defaultEndpoint: 'https://<account_id>.r2.cloudflarestorage.com', defaultRegion: 'auto', pathStyle: false },
    { id: 'minio', label: t('minioPreset'), defaultEndpoint: 'http://localhost:9000', defaultRegion: 'us-east-1', pathStyle: true },
    { id: 'backblaze_b2', label: 'Backblaze B2', defaultEndpoint: 'https://s3.us-west-004.backblazeb2.com', defaultRegion: 'us-west-004', pathStyle: false },
    { id: 'aliyun_oss', label: t('aliyunOssPreset'), defaultEndpoint: 'https://oss-cn-hangzhou.aliyuncs.com', defaultRegion: 'oss-cn-hangzhou', pathStyle: false },
    { id: 'tencent_cos', label: t('tencentCosPreset'), defaultEndpoint: 'https://cos.ap-guangzhou.myqcloud.com', defaultRegion: 'ap-guangzhou', pathStyle: false },
    { id: 'custom', label: t('customS3Preset'), defaultEndpoint: '', defaultRegion: 'us-east-1', pathStyle: false },
  ];

  const handlePresetChange = (preset: S3Preset) => {
    const selected = presets.find((p) => p.id === preset);
    if (!selected) return;

    onChange({
      ...config,
      preset,
      endpoint: selected.defaultEndpoint || config.endpoint,
      region: selected.defaultRegion || config.region,
      forcePathStyle: selected.pathStyle,
    });
  };

  return (
    <div className="space-y-3 text-xs font-mono">
      {/* Provider Preset Dropdown */}
      <div>
        <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
          {t('s3ProviderPreset')}
        </label>
        <div className="relative">
          <select
            value={config.preset}
            onChange={(e) => handlePresetChange(e.target.value as S3Preset)}
            className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-primaryColor-500 transition cursor-pointer"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Endpoint URL & Region */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
            Endpoint URL
          </label>
          <input
            type="text"
            value={config.endpoint}
            onChange={(e) => onChange({ ...config, endpoint: e.target.value })}
            placeholder="https://s3.amazonaws.com"
            className="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition"
          />
        </div>
        <div>
          <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
            Region
          </label>
          <input
            type="text"
            value={config.region}
            onChange={(e) => onChange({ ...config, region: e.target.value })}
            placeholder="us-east-1"
            className="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition"
          />
        </div>
      </div>

      {/* Bucket Name & Prefix */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
            Bucket Name *
          </label>
          <input
            type="text"
            value={config.bucketName}
            onChange={(e) => onChange({ ...config, bucketName: e.target.value })}
            placeholder="my-markspace-vault"
            className="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition"
          />
        </div>
        <div>
          <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
            {t('pathPrefixOptional')}
          </label>
          <input
            type="text"
            value={config.prefix || ''}
            onChange={(e) => onChange({ ...config, prefix: e.target.value })}
            placeholder="markspace/"
            className="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition"
          />
        </div>
      </div>

      {/* Access Key ID */}
      <div>
        <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
          Access Key ID
        </label>
        <input
          type="text"
          value={config.accessKeyId}
          onChange={(e) => onChange({ ...config, accessKeyId: e.target.value })}
          placeholder="AKIAIOSFODNN7EXAMPLE"
          className="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition"
        />
      </div>

      {/* Secret Access Key */}
      <div>
        <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
          Secret Access Key
        </label>
        <div className="relative">
          <input
            type={showSecret ? 'text' : 'password'}
            value={config.secretAccessKey}
            onChange={(e) => onChange({ ...config, secretAccessKey: e.target.value })}
            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            className="w-full px-3 py-1.5 pr-9 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primaryColor-500 transition font-mono"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
          >
            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Force Path Style Toggle */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="forcePathStyle"
          checked={config.forcePathStyle}
          onChange={(e) => onChange({ ...config, forcePathStyle: e.target.checked })}
          className="w-3.5 h-3.5 rounded border-zinc-300 text-primaryColor-600 focus:ring-primaryColor-500 cursor-pointer"
        />
        <label htmlFor="forcePathStyle" className="text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
          {t('forcePathStyleDesc')}
        </label>
      </div>
    </div>
  );
};
