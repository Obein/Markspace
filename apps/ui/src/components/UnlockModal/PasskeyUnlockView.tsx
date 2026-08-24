import React, { useState } from 'react';
import {
  Lock,
  Fingerprint,
  KeyRound,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { VaultInfo } from '../../interfaces/INoteModels';
import { PasskeyCryptoService } from '../../crypto/PasskeyCryptoService';

export interface PasskeyUnlockViewProps {
  activeVault: VaultInfo | undefined;
  username: string | null;
  onUnlockSuccess: (vaultId: string, vmk: CryptoKey) => void;
  onUnlockWithPasskey: (vaultId: string) => Promise<CryptoKey>;
  onSwitchToRecovery: () => void;
  onError: (msg: string | null) => void;
}

export const PasskeyUnlockView: React.FC<PasskeyUnlockViewProps> = ({
  activeVault,
  username: _username,
  onUnlockSuccess,
  onUnlockWithPasskey,
  onSwitchToRecovery,
  onError,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const isSupported = PasskeyCryptoService.isSupported();

  const handleTriggerPasskeyUnlock = async () => {
    if (!activeVault) return;
    onError(null);
    try {
      setLoading(true);
      const vmk = await onUnlockWithPasskey(activeVault.id);
      onUnlockSuccess(activeVault.id, vmk);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Passkey authentication failed';
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Vault Identity Badge - Locked State Icon */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex p-3.5 rounded-2xl bg-primaryColor-500/15 border border-primaryColor-500/25 backdrop-blur-md text-primaryColor-600 dark:text-primaryColor-400 shadow-lg shadow-primaryColor-500/10 mb-2">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-wide">
          {activeVault?.name || t('encryptedVault') || 'Encrypted Vault'}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          {t('passkeyUnlockDesc') || 'Unlock with biometric hardware or security key'}
        </p>
      </div>

      {/* Main Action Button */}
      <div className="space-y-3">
        {isSupported ? (
          <button
            type="button"
            onClick={handleTriggerPasskeyUnlock}
            disabled={loading || !activeVault}
            className="w-full py-3 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition shadow-lg shadow-primaryColor-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('authenticating') || 'Verifying Biometrics...'}</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4" />
                <span>{t('unlockWithPasskey') || 'Unlock with Passkey'}</span>
              </>
            )}
          </button>
        ) : (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Passkeys are not supported on this device. Please use your 8-word recovery phrase.</span>
          </div>
        )}

        {/* Switch to 8-word Recovery Key */}
        <button
          type="button"
          onClick={onSwitchToRecovery}
          className="w-full py-2.5 px-4 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-black/10 dark:border-white/10 text-xs font-mono transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-primaryColor-600 dark:text-primaryColor-400" />
          <span>{t('unlockWithRecovery') || 'Unlock with 8-Word Recovery Phrase'}</span>
        </button>
      </div>
    </div>
  );
};
