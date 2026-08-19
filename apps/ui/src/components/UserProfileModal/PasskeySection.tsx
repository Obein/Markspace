import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Check,
  Plus,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Edit2,
  KeyRound,
  Laptop,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { PasskeyCryptoService, PasskeyRegistrationResult } from '../../crypto/PasskeyCryptoService';

export interface PasskeySectionProps {
  username: string | null;
  userId: string | null;
}

export const PasskeySection: React.FC<PasskeySectionProps> = ({ username, userId }) => {
  const { t } = useI18n();
  const [credentials, setCredentials] = useState<PasskeyRegistrationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isSupported = PasskeyCryptoService.isSupported();

  const loadCredentials = () => {
    if (username) {
      const list = PasskeyCryptoService.getStoredCredentials(username);
      setCredentials(list);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, [username]);

  const handleRegisterPasskey = async () => {
    if (!username) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setLoading(true);
      const res = await PasskeyCryptoService.registerPasskey(username, userId || undefined);
      loadCredentials();
      setSuccessMsg(
        t('passkeyRegisteredSuccess') || `Passkey "${res.name}" registered and bound!`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to register Passkey');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRename = (cred: PasskeyRegistrationResult) => {
    setEditingId(cred.credentialId);
    setEditingName(cred.name);
  };

  const handleSaveRename = (credentialId: string) => {
    if (!username || !editingName.trim()) return;
    PasskeyCryptoService.renamePasskey(username, credentialId, editingName.trim());
    setEditingId(null);
    loadCredentials();
  };

  const executeDeletePasskey = (credentialId: string) => {
    if (!username) return;
    PasskeyCryptoService.deletePasskey(username, credentialId);
    setConfirmDeleteId(null);
    loadCredentials();
  };

  const getDeviceIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('iphone') || lower.includes('android') || lower.includes('phone') || lower.includes('ipad')) {
      return <Smartphone className="w-4 h-4 text-primaryColor-400 shrink-0" />;
    }
    if (lower.includes('mac') || lower.includes('windows') || lower.includes('linux') || lower.includes('laptop')) {
      return <Laptop className="w-4 h-4 text-primaryColor-400 shrink-0" />;
    }
    return <KeyRound className="w-4 h-4 text-primaryColor-400 shrink-0" />;
  };

  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-3.5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-primaryColor-600 dark:text-primaryColor-400" />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {t('passkeyManagement') || 'Hardware Passkeys (WebAuthn)'}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <Check className="w-3 h-3" />
          <span>
            {credentials.length} {credentials.length === 1 ? 'Passkey' : 'Passkeys'}
          </span>
        </span>
      </div>

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-mono">
        {t('passkeyAccountDesc') ||
          'Bound to your account to securely unlock all your E2EE Vaults via Passkeys (Google Password Manager, iCloud Keychain, Windows Hello, YubiKey).'}
      </p>

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-300 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-mono flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Multi-Passkey List */}
      {credentials.length > 0 && (
        <div className="space-y-2 pt-1">
          {credentials.map((cred) => (
            <React.Fragment key={cred.credentialId}>
              {confirmDeleteId === cred.credentialId ? (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2.5 my-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start gap-2.5 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1.5 text-xs flex-1">
                      <p className="font-semibold text-red-700 dark:text-red-300 leading-snug">
                        {credentials.length <= 1
                          ? (t('deleteLastPasskeyWarning') ||
                            'This is your only registered Passkey. After removing it, you can no longer use biometric unlock and must use your 8-word Recovery Phrase to unlock/recover vaults.')
                          : (t('deletePasskeyWarning') ||
                            'Are you sure you want to remove this Passkey from your account?')}
                      </p>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-mono">
                        {t('orphanPasskeyNotice') ||
                          'Notice: The corresponding Passkey in this client device keychain will become an orphaned passkey and must be deleted manually from your password manager.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end pt-1 border-t border-red-500/20">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 text-xs font-mono transition cursor-pointer"
                    >
                      {t('cancel') || 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => executeDeletePasskey(cred.credentialId)}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-medium transition shadow-sm cursor-pointer"
                    >
                      {t('confirmRemove') || 'Confirm Remove'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white/80 dark:bg-black/40 border border-black/10 dark:border-white/10 flex items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {getDeviceIcon(cred.name)}
                    <div className="min-w-0 flex-1">
                      {editingId === cred.credentialId ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-black/20 dark:border-white/20 text-zinc-900 dark:text-white text-xs font-mono focus:outline-none focus:border-primaryColor-500 flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(cred.credentialId);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(cred.credentialId)}
                            className="px-2 py-0.5 rounded bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-[10px] font-mono cursor-pointer"
                          >
                            {t('save') || 'Save'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate">{cred.name}</span>
                          <button
                            type="button"
                            onClick={() => handleStartRename(cred)}
                            className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition cursor-pointer"
                            title={t('rename') || 'Rename'}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                        <span>{t('createdOn') || 'Created'}: {formatDate(cred.createdAt)}</span>
                        <span>•</span>
                        <span className="truncate">ID: {cred.credentialId.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(cred.credentialId)}
                    className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-red-500/15 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-300 transition cursor-pointer"
                    title={t('delete') || 'Delete Passkey'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Add New Passkey Bar */}
      {isSupported ? (
        <div className="pt-2 border-t border-black/10 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>FIDO2 WebAuthn Supported</span>
          </div>

          <button
            type="button"
            onClick={handleRegisterPasskey}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-primaryColor-500/15 hover:bg-primaryColor-500/25 text-primaryColor-700 dark:text-primaryColor-300 hover:text-primaryColor-800 dark:hover:text-white border border-primaryColor-500/30 text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Registering...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>{t('addPasskey') || 'Add New Passkey'}</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>WebAuthn is not supported in this browser.</span>
        </div>
      )}
    </div>
  );
};
