import React, { useState } from 'react';
import { ArrowLeft, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VaultInfo } from '../../interfaces/INoteModels';

export interface RecoveryUnlockViewProps {
  activeVault: VaultInfo | undefined;
  username: string | null;
  onBackToPin: () => void;
  onError: (msg: string | null) => void;
  onSuccess: (vaultId: string, vmk: CryptoKey) => void;
  triggerShake: () => void;
  recordSuccess: () => void;
}

export const RecoveryUnlockView: React.FC<RecoveryUnlockViewProps> = ({
  activeVault,
  username,
  onBackToPin,
  onError,
  onSuccess,
  triggerShake,
  recordSuccess,
}) => {
  const { cryptoService, apiClient } = useApp();

  const [recoveryMnemonic, setRecoveryMnemonic] = useState('');
  const [newPinAfterRecovery, setNewPinAfterRecovery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecoveryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVault) return;

    if (!recoveryMnemonic.trim()) {
      onError('Please enter your 8-word recovery key');
      return;
    }

    if (!/^\d{4,6}$/.test(newPinAfterRecovery)) {
      onError('Please choose a new 4 to 6 digit PIN');
      return;
    }

    try {
      setLoading(true);
      onError(null);

      if (!activeVault.wrappedVmkByRecovery || !activeVault.salt) {
        throw new Error('This vault does not contain a recovery key envelope');
      }

      // 1. Blind Recovery Key on client
      const blindPoint = await cryptoService.computeOprfBlindPoint(recoveryMnemonic, activeVault.salt);

      // 2. Evaluate with Server
      const oprfResult = await apiClient.evaluateVaultOprf(activeVault.id, blindPoint);

      const recoveryKey = await cryptoService.deriveKeyFromRecoveryKey(
        recoveryMnemonic,
        activeVault.salt,
        oprfResult.evaluatedPoint
      );
      const vmk = await cryptoService.unwrapVMK(activeVault.wrappedVmkByRecovery, recoveryKey);

      // 3. Setup OPRF for new PIN
      const newPinBlindPoint = await cryptoService.computeOprfBlindPoint(newPinAfterRecovery, activeVault.salt);
      const newPinOprf = await apiClient.setupVaultOprf(activeVault.id, newPinBlindPoint);

      // 4. Re-wrap VMK with new PIN + OPRF
      const newPinKey = await cryptoService.deriveKeyFromPin(
        newPinAfterRecovery,
        activeVault.salt,
        newPinOprf.evaluatedPoint
      );
      const newWrappedVmkByPin = await cryptoService.wrapVMK(vmk, newPinKey);

      // Reset lockout status on server
      await apiClient.reportVaultPinSuccess(activeVault.id);

      // Update vault in localStorage
      activeVault.wrappedVmkByPin = newWrappedVmkByPin;
      try {
        const stored = localStorage.getItem(`markspace_vaults_${username}`);
        if (stored) {
          const parsed: VaultInfo[] = JSON.parse(stored);
          const updated = parsed.map((v: VaultInfo) =>
            v.id === activeVault.id ? { ...v, wrappedVmkByPin: newWrappedVmkByPin } : v
          );
          localStorage.setItem(`markspace_vaults_${username}`, JSON.stringify(updated));
        }
      } catch (_) {}

      recordSuccess();
      onSuccess(activeVault.id, vmk);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Invalid recovery key for this vault');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => {
            onError(null);
            onBackToPin();
          }}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Vault Recovery & Reset PIN</span>
          </h3>
          <p className="text-[11px] text-zinc-400 font-mono truncate">
            Vault UUID: <span className="text-primaryColor-400 select-all">{activeVault?.id}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleRecoveryUnlock} autoComplete="off" className="space-y-3.5">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            8-Word Recovery Key (BIP-39 Mnemonic)
          </label>
          <textarea
            rows={2}
            value={recoveryMnemonic}
            onChange={(e) => setRecoveryMnemonic(e.target.value)}
            placeholder="word1-word2-word3-word4-word5-word6-word7-word8"
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primaryColor-500 text-xs font-mono resize-none"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
            <span>Set New PIN (4 - 6 digits)</span>
            <span className="text-[10px] text-zinc-500 font-mono">Numbers only</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            name="vault-recovery-new-pin"
            autoComplete="one-time-code"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            value={newPinAfterRecovery}
            onChange={(e) => setNewPinAfterRecovery(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primaryColor-500 text-sm tracking-widest font-mono text-center"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-lg shadow-emerald-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify Key & Reset PIN</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
