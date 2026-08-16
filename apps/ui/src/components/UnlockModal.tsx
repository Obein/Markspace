import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, LogOut, Database, User, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/i18nContext';
import { VaultInfo } from '../interfaces/INoteModels';

interface UnlockModalProps {
  vaults?: VaultInfo[];
  activeVaultId?: string;
  onSelectVault?: (id: string) => void;
  onOpenProfile?: () => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({
  vaults = [],
  activeVaultId,
  onSelectVault,
  onOpenProfile,
}) => {
  const { cryptoService, setCmk, isAuthenticated, isVaultUnlocked, username, logoutAccount } = useApp();
  const { t } = useI18n();

  const [dataPassword, setDataPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Show modal only when account is authenticated BUT vault is locked
  if (!isAuthenticated || isVaultUnlocked) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataPassword) {
      setErrorMsg('Please enter your data password');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      // Step 2: Derive CMK strictly in client memory using Data Password!
      const { cmk } = await cryptoService.deriveCMK(dataPassword, `markspace-vault-${username}`);

      // Save CMK to browser memory
      setCmk(cmk);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vault decryption failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
      <div className="w-full max-w-md p-8 glass-panel rounded-glass-lg border border-white/10 text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Actions: Settings / Profile */}
        {onOpenProfile && (
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={onOpenProfile}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
              title="User Profile & Settings"
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('userProfile')}</span>
            </button>
          </div>
        )}

        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-3 text-blue-400">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{t('unlockVault')}</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Logged in as <strong className="text-zinc-200 font-mono">{username}</strong>.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center font-mono">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          {/* Vault Selector (if multiple vaults exist) */}
          {vaults.length > 0 && onSelectVault && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('activeVault')}</span>
              </label>
              <select
                value={activeVaultId}
                onChange={(e) => onSelectVault(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50 transition cursor-pointer"
              >
                {vaults.map((v) => (
                  <option key={v.id} value={v.id} className="bg-zinc-900 text-white">
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">{t('masterPassword')}</label>
            <input
              type="password"
              value={dataPassword}
              onChange={(e) => setDataPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-lg shadow-blue-500/20 border border-blue-400/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{t('unlocking')}</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>{t('unlock')}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1 text-blue-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>E2EE Zero-Knowledge</span>
          </div>
          <button
            onClick={logoutAccount}
            className="text-red-400 hover:underline transition flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('logoutAccount')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
