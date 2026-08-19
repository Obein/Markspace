import React, { useState } from 'react';
import { ArrowLeft, Sparkles, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { VaultInfo } from '../../interfaces/INoteModels';
import { MnemonicService } from '../../crypto/MnemonicService';

export interface RecoveryUnlockViewProps {
  activeVault: VaultInfo | undefined;
  username: string | null;
  onBackToPasskey: () => void;
  onError: (msg: string | null) => void;
  onSuccess: (vaultId: string, vmk: CryptoKey) => void;
  onUnlockWithRecovery: (vaultId: string, mnemonic: string) => Promise<CryptoKey>;
  triggerShake: () => void;
}

export const RecoveryUnlockView: React.FC<RecoveryUnlockViewProps> = ({
  activeVault,
  username: _username,
  onBackToPasskey,
  onError,
  onSuccess,
  onUnlockWithRecovery,
  triggerShake,
}) => {
  const { t } = useI18n();

  const [recoveryMnemonic, setRecoveryMnemonic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecoveryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVault) return;

    const normalized = MnemonicService.normalizeMnemonic(recoveryMnemonic);
    const words = normalized.split('-').filter(Boolean);
    if (words.length !== 8) {
      onError(t('recoveryKeyInvalid') || 'Recovery phrase must be exactly 8 words');
      triggerShake();
      return;
    }

    try {
      setLoading(true);
      onError(null);

      const vmk = await onUnlockWithRecovery(activeVault.id, normalized);
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
            {t('recoveryKeyNotice') || 'Words separated by spaces or dashes generated during vault creation.'}
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
        <span>Hardware Passkey Will Be Automatically Re-bound Upon Unlock</span>
      </div>
    </div>
  );
};
