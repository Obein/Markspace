import React from 'react';
import { Database, SlidersHorizontal, Lock, LogOut } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { VaultInfo } from '../../interfaces/INoteModels';

interface VaultHeaderProps {
  activeVault: VaultInfo | null;
  onOpenVaultSettings?: () => void;
  onLockVault: () => void;
  onLogoutAccount: () => void;
}

export const VaultHeader: React.FC<VaultHeaderProps> = ({
  activeVault,
  onOpenVaultSettings,
  onLockVault,
  onLogoutAccount,
}) => {
  const { t } = useI18n();

  return (
    <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
          <Database className="w-4 h-4" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-zinc-900 dark:text-white tracking-wide flex items-center gap-1.5">
            <span>Markspace</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono">
              E2EE
            </span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[140px] font-mono">
            {activeVault ? activeVault.name : t('encryptedVault')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onOpenVaultSettings && (
          <button
            onClick={onOpenVaultSettings}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
            title={t('vaultSettings')}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => onLockVault()}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
          title={t('lockVault')}
        >
          <Lock className="w-4 h-4" />
        </button>

        <button
          onClick={onLogoutAccount}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
          title={t('logoutAccount')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
