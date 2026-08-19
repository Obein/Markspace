import React, { useState } from 'react';
import {
  Copy,
  Check,
  AlertTriangle,
  Database,
  ArrowRight,
  Sparkles,
  Loader2,
  Fingerprint,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultInfo } from '../../interfaces/INoteModels';

interface CreateVaultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateVault: (
    name: string,
    customRecoveryKey?: string,
    providedPasskeyKey?: CryptoKey
  ) => Promise<{ vault: VaultInfo; recoveryKey: string; vmk: CryptoKey }>;
}

export const CreateVaultDialog: React.FC<CreateVaultDialogProps> = ({
  isOpen,
  onClose,
  onCreateVault,
}) => {
  const { t } = useI18n();
  const { setVaultKey, setActiveVaultId } = useApp();

  const [step, setStep] = useState<'form' | 'recovery'>('form');
  const [name, setName] = useState('');
  const [createdVault, setCreatedVault] = useState<VaultInfo | null>(null);
  const [createdVaultVmk, setCreatedVaultVmk] = useState<CryptoKey | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg(t('enterVaultName') || 'Please enter a vault name');
      return;
    }

    try {
      setLoading(true);
      const res = await onCreateVault(name.trim());
      setCreatedVault(res.vault);
      setRecoveryKey(res.recoveryKey);
      setCreatedVaultVmk(res.vmk);
      setStep('recovery');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!recoveryKey) return;
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    if (createdVault && createdVaultVmk) {
      setActiveVaultId(createdVault.id);
      setVaultKey(createdVault.id, createdVaultVmk);
    }
    onClose();
    // Reset state
    setStep('form');
    setName('');
    setCreatedVault(null);
    setCreatedVaultVmk(null);
    setRecoveryKey('');
    setConfirmedSaved(false);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && step === 'form') {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
    >
      <div className="w-full max-w-md p-6 glass-panel rounded-glass-lg border border-white/15 text-white shadow-2xl relative overflow-hidden cursor-default">
        {step === 'form' ? (
          <div>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
              <div className="p-2.5 rounded-xl bg-primaryColor-500/15 border border-primaryColor-500/30 text-primaryColor-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('createVault')}</h3>
                <p className="text-xs text-zinc-400 font-mono">
                  {t('passkeyProtectedDesc') || 'Hardware Passkey & 8-Word Mnemonic Protected'}
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleFormSubmit} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">{t('vaultName')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Work Notes, Private Vault"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500 text-xs font-mono"
                  required
                  autoFocus
                />
              </div>

              <div className="p-3 rounded-xl bg-primaryColor-500/10 border border-black/10 dark:border-white/15 backdrop-blur-md space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-primaryColor-700 dark:text-primaryColor-300">
                  <Fingerprint className="w-4 h-4 text-primaryColor-500" />
                  <span>{t('hardwareProtection') || 'Biometric Passkey Auto-Binding'}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                  {t('passkeyAutoBindNotice') || 'Your vault will be bound to your device hardware authenticator and backup with an 8-word recovery phrase.'}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-4 py-2 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-medium text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-primaryColor-500/20 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('creating')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('createVault')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="text-center space-y-1 pb-3 border-b border-white/10 mb-4">
              <div className="inline-flex p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-1">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                {t('vaultCreatedBackup') || 'Vault Created! Backup Recovery Phrase'}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                {t('recoveryPhraseSubtitle') || 'Save these 8 words securely. They are the only way to recover your vault.'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {recoveryKey.split(' ').map((word, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center"
                    >
                      <span className="text-[9px] text-zinc-500 font-mono">#{idx + 1}</span>
                      <span className="text-xs font-mono font-bold text-emerald-300">{word}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{t('copyRecoveryKey')}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2.5 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span className="text-[11px] leading-relaxed">
                  {t('recoveryKeyWarning') || 'If you lose your device or Passkey, this phrase is the ONLY mathematical key that can decrypt your vault.'}
                </span>
              </div>

              <div className="flex items-center gap-2.5 px-1 py-1">
                <input
                  type="checkbox"
                  id="dialogConfirmSaved"
                  checked={confirmedSaved}
                  onChange={(e) => setConfirmedSaved(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-primaryColor-500 focus:ring-primaryColor-500 h-4 w-4 cursor-pointer"
                />
                <label
                  htmlFor="dialogConfirmSaved"
                  className="text-xs text-zinc-300 cursor-pointer select-none font-medium"
                >
                  {t('confirmBackupCheckbox') || 'I have saved my 8-word recovery phrase safely'}
                </label>
              </div>

              <button
                type="button"
                disabled={!confirmedSaved}
                onClick={handleFinish}
                className="w-full py-2.5 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primaryColor-500/20 cursor-pointer"
              >
                <span>{t('enterVault') || 'Enter Vault & Start Writing'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
