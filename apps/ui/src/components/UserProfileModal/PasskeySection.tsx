import React, { useState, useEffect } from 'react';
import { Fingerprint, Check, Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { PasskeyCryptoService, PasskeyRegistrationResult } from '../../crypto/PasskeyCryptoService';

export interface PasskeySectionProps {
  username: string | null;
  userId: string | null;
}

export const PasskeySection: React.FC<PasskeySectionProps> = ({ username, userId }) => {
  const { t } = useI18n();
  const [credential, setCredential] = useState<PasskeyRegistrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isSupported = PasskeyCryptoService.isSupported();

  useEffect(() => {
    if (username) {
      const stored = PasskeyCryptoService.getStoredCredential(username);
      setCredential(stored);
    }
  }, [username]);

  const handleRegisterPasskey = async () => {
    if (!username) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setLoading(true);
      const res = await PasskeyCryptoService.registerPasskey(username, userId || undefined);
      setCredential(res);
      setSuccessMsg(t('passkeyRegisteredSuccess') || 'Passkey successfully registered and bound to this device!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to register Passkey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-primaryColor-400" />
          <span className="text-xs font-medium text-zinc-200">{t('passkeyManagement') || 'Hardware Passkeys (WebAuthn)'}</span>
        </div>
        {credential ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Bound</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/10">
            Not Bound
          </span>
        )}
      </div>

      <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
        {t('passkeyAccountDesc') || 'Bound to your account to securely unlock all your E2EE Vaults via Touch ID, Windows Hello, Face ID, or YubiKey.'}
      </p>

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {isSupported ? (
        <div className="pt-1 flex items-center justify-between">
          <div className="text-[10px] text-zinc-500 font-mono">
            {credential ? (
              <span>Credential: {credential.credentialId.slice(0, 12)}...</span>
            ) : (
              <span>Ready to bind authenticator</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleRegisterPasskey}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-primaryColor-500/20 hover:bg-primaryColor-500/30 text-primaryColor-300 hover:text-white border border-primaryColor-500/40 text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Registering...</span>
              </>
            ) : credential ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('updatePasskey') || 'Re-bind Device'}</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>{t('registerPasskey') || 'Register Passkey'}</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>WebAuthn is not supported in this browser.</span>
        </div>
      )}
    </div>
  );
};
