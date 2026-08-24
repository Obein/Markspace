import React, { useState } from 'react';
import { Fingerprint, ShieldCheck, Plus, Loader2, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { PasskeyCryptoService } from '../../crypto/PasskeyCryptoService';

export interface SetupPasskeyViewProps {
  username: string;
  userId: string | null;
  onPasskeySetupComplete: () => void;
  onError: (msg: string | null) => void;
}

export const SetupPasskeyView: React.FC<SetupPasskeyViewProps> = ({
  username,
  userId,
  onPasskeySetupComplete,
  onError,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const handleRegisterPasskey = async () => {
    onError(null);
    try {
      setLoading(true);
      await PasskeyCryptoService.registerPasskey(username, userId || undefined);
      onPasskeySetupComplete();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Passkey registration cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex p-3.5 rounded-2xl bg-primaryColor-500/15 border border-primaryColor-500/25 backdrop-blur-md text-primaryColor-600 dark:text-primaryColor-400 shadow-lg shadow-primaryColor-500/10 mb-2">
          <Fingerprint className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-wide">
          {t('setupPasskeyTitle') || 'Setup Device Passkey'}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          {t('setupPasskeyDesc') || 'Create a hardware Passkey before creating or unlocking encrypted vaults.'}
        </p>
      </div>

      {/* Cloud & Platform Support Info Card */}
      <div className="p-3.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 space-y-2 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-primaryColor-700 dark:text-primaryColor-400 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{t('supportedPasskeyProviders') || 'Cross-Platform & Cloud Synced Passkeys'}</span>
        </div>
        <ul className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
          <li>Google Password Manager (Chrome, Android)</li>
          <li>Apple iCloud Keychain (Safari, macOS, iOS)</li>
          <li>1Password, Bitwarden, Dashlane</li>
          <li>Windows Hello (Fingerprint, Face, PIN)</li>
          <li>USB / NFC Security Keys (YubiKey)</li>
        </ul>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={handleRegisterPasskey}
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition shadow-lg shadow-primaryColor-500/20 disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t('registeringPasskey') || 'Creating Passkey in Browser...'}</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            <span>{t('createPasskeyNow') || 'Create & Bind Passkey'}</span>
          </>
        )}
      </button>

      {/* Zero Trust Notice */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 pt-2 border-t border-black/5 dark:border-white/5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>FIDO2 WebAuthn Hardware-Level Zero-Knowledge Protection</span>
      </div>
    </div>
  );
};
