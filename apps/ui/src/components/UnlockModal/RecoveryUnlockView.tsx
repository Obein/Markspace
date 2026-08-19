import React, { useState } from 'react';
import { ArrowLeft, Sparkles, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultInfo } from '../../interfaces/INoteModels';
import { PasskeyCryptoService } from '../../crypto/PasskeyCryptoService';

export interface RecoveryUnlockViewProps {
  activeVault: VaultInfo | undefined;
  username: string | null;
  onBackToPasskey: () => void;
  onError: (msg: string | null) => void;
  onSuccess: (vaultId: string, vmk: CryptoKey) => void;
  triggerShake: () => void;
}

export const RecoveryUnlockView: React.FC<RecoveryUnlockViewProps> = ({
  activeVault,
  username,
  onBackToPasskey,
  onError,
  onSuccess,
  triggerShake,
}) => {
  const { cryptoService, apiClient, setVaultKey } = useApp();
  const { t } = useI18n();

  const [recoveryMnemonic, setRecoveryMnemonic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecoveryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVault) return;

    const trimmed = recoveryMnemonic.trim().toLowerCase();
    const words = trimmed.split(/\s+/);
    if (words.length !== 8) {
      onError(t('recoveryKeyInvalid') || 'Recovery phrase must be exactly 8 words');
      triggerShake();
      return;
    }

    try {
      setLoading(true);
      onError(null);

      if (!activeVault.wrappedVmkByRecovery || !activeVault.salt) {
        throw new Error('This vault does not contain a recovery key envelope');
      }

      // 1. Blind Recovery Key on client
      const blindPoint = await cryptoService.computeOprfBlindPoint(trimmed, activeVault.salt);

      // 2. Evaluate with Server
      const oprfResult = await apiClient.evaluateVaultOprf(activeVault.id, blindPoint);

      const recoveryKey = await cryptoService.deriveKeyFromRecoveryKey(
        trimmed,
        activeVault.salt,
        oprfResult.evaluatedPoint
      );
      const vmk = await cryptoService.unwrapVMK(activeVault.wrappedVmkByRecovery, recoveryKey);

      // 3. If Passkey is supported, attempt to bind Passkey for future one-click unlocks
      if (username && PasskeyCryptoService.isSupported()) {
        try {
          const { key: pvk } = await PasskeyCryptoService.authenticateAndDeriveKey(
            username,
            activeVault.salt
          );
          const wrappedVmkByPasskey = await cryptoService.wrapVMK(vmk, pvk);
          activeVault.wrappedVmkByPasskey = wrappedVmkByPasskey;
          const stored = localStorage.getItem(`markspace_vaults_${username}`);
          if (stored) {
            const parsed: VaultInfo[] = JSON.parse(stored);
            const updated = parsed.map((v: VaultInfo) =>
              v.id === activeVault.id ? { ...v, wrappedVmkByPasskey } : v
            );
            localStorage.setItem(`markspace_vaults_${username}`, JSON.stringify(updated));
          }
        } catch (_) {}
      }

      setVaultKey(activeVault.id, vmk);
      onSuccess(activeVault.id, vmk);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Invalid recovery phrase for this vault');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => {
            onError(null);
            onBackToPasskey();
          }}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
          title="Back to Passkey Unlock"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-primaryColor-400" />
            <span>{t('recoveryUnlock') || 'Recovery Phrase Unlock'}</span>
          </h3>
          <p className="text-xs text-zinc-400 font-mono">
            {activeVault?.name ? `Vault: ${activeVault.name}` : 'Zero-Knowledge Mnemonic Unlock'}
          </p>
        </div>
      </div>

      <form onSubmit={handleRecoveryUnlock} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-300 font-medium mb-1.5">
            {t('enterRecoveryKey') || '8-Word Recovery Phrase'}
          </label>
          <textarea
            value={recoveryMnemonic}
            onChange={(e) => setRecoveryMnemonic(e.target.value)}
            placeholder="e.g. apple banana cherry dog elephant fox grape horse"
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500 resize-none"
            autoFocus
          />
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            {t('recoveryKeyNotice') || 'Words separated by spaces generated during vault creation.'}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !recoveryMnemonic.trim()}
          className="w-full py-2.5 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-primaryColor-500/20 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('unlocking') || 'Verifying & Unlocking...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{t('unlockVault') || 'Unlock Vault'}</span>
            </>
          )}
        </button>
      </form>

      <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>BIP-39 88-Bit Mathematical Entropy Protection</span>
      </div>
    </div>
  );
};
