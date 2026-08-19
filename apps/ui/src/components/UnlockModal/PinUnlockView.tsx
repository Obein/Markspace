import React, { useState } from 'react';
import { KeyRound, Database, Loader2, AlertTriangle, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultInfo } from '../../interfaces/INoteModels';

export interface PinUnlockViewProps {
  vaults: VaultInfo[];
  activeVault: VaultInfo | undefined;
  activeVaultId: string;
  onSelectVault: (vaultId: string) => void;
  onSwitchToCreate: () => void;
  onSwitchToRecovery: () => void;
  onError: (msg: string | null) => void;
  onSuccess: (vaultId: string, vmk: CryptoKey) => void;
  triggerShake: () => void;
  isLockedOut: boolean;
  remainingSeconds: number;
  recordSuccess: () => void;
  recordFailure: () => void;
  onDeleteVault?: (vaultId: string) => void;
}

export const PinUnlockView: React.FC<PinUnlockViewProps> = ({
  vaults,
  activeVault,
  activeVaultId,
  onSelectVault,
  onSwitchToCreate,
  onSwitchToRecovery,
  onError,
  onSuccess,
  triggerShake,
  isLockedOut,
  remainingSeconds,
  recordSuccess,
  recordFailure,
  onDeleteVault,
}) => {
  const { cryptoService, apiClient, username } = useApp();
  const { t } = useI18n();

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectDifferentVault = (vaultId: string) => {
    onSelectVault(vaultId);
    setPin('');
    onError(null);
  };

  const handlePinUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    if (!activeVault) {
      onSwitchToCreate();
      return;
    }

    if (!pin || pin.length < 4 || pin.length > 6) {
      onError('Please enter your 4 to 6 digit PIN');
      triggerShake();
      return;
    }

    try {
      setLoading(true);
      onError(null);

      if (activeVault.wrappedVmkByPin && activeVault.salt) {
        // 1. Blind PIN on client
        const blindPoint = await cryptoService.computeOprfBlindPoint(pin, activeVault.salt);

        // 2. Evaluate with Server (Server pre-charges 1 attempt & enforces rate-limiting gate)
        const oprfResult = await apiClient.evaluateVaultOprf(activeVault.id, blindPoint);

        // 3. Multi-factor derivation: (PBKDF2(PIN, salt) + OPRF Evaluation)
        const pinKey = await cryptoService.deriveKeyFromPin(
          pin,
          activeVault.salt,
          oprfResult.evaluatedPoint
        );
        // AES-GCM Unwrap VMK in memory
        const vmk = await cryptoService.unwrapVMK(activeVault.wrappedVmkByPin, pinKey);

        // Notify server of successful unlock to reset fail counter
        await apiClient.reportVaultPinSuccess(activeVault.id);
        recordSuccess();
        onSuccess(activeVault.id, vmk);
      } else {
        // Legacy fallback
        const { cmk } = await cryptoService.deriveCMK(pin, `markspace-vault-${username}`);
        await apiClient.reportVaultPinSuccess(activeVault.id);
        recordSuccess();
        onSuccess(activeVault.id, cmk);
      }
    } catch (err: any) {
      recordFailure();
      triggerShake();

      // Check if server rejected due to lockout or unwrap failed
      if (err.message?.includes('VAULT_LOCKED_OUT') || err.code === 'VAULT_LOCKED_OUT') {
        onError(err.message);
      } else {
        // PIN mismatch on client unwrap
        onError('Incorrect PIN. Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col items-center text-center mb-5">
        <div className="p-2 bg-gradient-to-b from-primaryColor-500/20 to-purple-500/10 rounded-2xl border border-white/15 mb-3 shadow-xl shadow-primaryColor-500/10 flex items-center justify-center">
          <img
            src="/assets/obex_cat_eye_logo-256.webp"
            alt="Markspace Logo"
            className="w-12 h-12 rounded-xl object-contain drop-shadow-md"
          />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">{t('unlockVault')}</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Enter PIN to decrypt <strong className="text-zinc-200">{activeVault?.name || 'Vault'}</strong>
        </p>
      </div>

      {/* Lockout Banner */}
      {isLockedOut && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2.5 font-mono animate-in fade-in duration-150">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-red-300">PIN Entry Suspended</div>
            <div className="text-[11px] text-zinc-300">
              Try again in <strong>{formatCountdown(remainingSeconds)}</strong>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handlePinUnlock} autoComplete="off" className="space-y-4">
        {/* Prominent Vault Selector Dropdown */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-primaryColor-400" />
              <span>Select Vault</span>
            </span>
            <button
              type="button"
              onClick={() => {
                onError(null);
                onSwitchToCreate();
              }}
              className="text-[11px] text-primaryColor-400 hover:text-primaryColor-300 flex items-center gap-1 font-mono cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>New Vault</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeVault?.id || activeVaultId}
              onChange={(e) => handleSelectDifferentVault(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-primaryColor-500/50 transition cursor-pointer"
            >
              {vaults.map((v) => (
                <option key={v.id} value={v.id} className="bg-zinc-900 text-white">
                  {v.name} ({v.id})
                </option>
              ))}
            </select>

            {onDeleteVault && activeVault && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 transition cursor-pointer shrink-0"
                title={t('deleteVault')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Inline Confirm Delete Vault Prompt */}
        {confirmDelete && activeVault && (
          <div className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 space-y-2 animate-in fade-in duration-150 text-xs font-mono">
            <div className="flex items-center justify-between text-red-200">
              <span className="font-semibold truncate">{activeVault.name}</span>
              <span className="text-[11px] text-red-300 font-sans">{t('confirmDeleteVault')}</span>
            </div>
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  if (onDeleteVault) {
                    onDeleteVault(activeVault.id);
                    setPin('');
                  }
                }}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition shadow-md shadow-red-500/20 cursor-pointer"
              >
                {t('confirm')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 text-xs transition cursor-pointer"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
            <span>Vault PIN (4 - 6 digits)</span>
            <span className="text-[10px] text-zinc-500 font-mono">Numbers only</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            name="vault-unlock-pin"
            autoComplete="one-time-code"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            disabled={isLockedOut}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primaryColor-500 text-lg tracking-[0.3em] font-mono text-center disabled:opacity-40 disabled:cursor-not-allowed"
            required
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={loading || isLockedOut}
          className="w-full py-3 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-medium transition shadow-lg shadow-primaryColor-500/20 border border-primaryColor-400/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-xs"
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

      {/* Recovery Key Switch Link (Always Visible) */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            onError(null);
            onSwitchToRecovery();
          }}
          className="text-xs text-primaryColor-400 hover:text-primaryColor-300 transition flex items-center gap-1.5 mx-auto font-mono cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Forgot PIN? Unlock with Recovery Key</span>
        </button>
      </div>
    </div>
  );
};
