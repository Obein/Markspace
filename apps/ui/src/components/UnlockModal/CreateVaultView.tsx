import React, { useState } from 'react';
import {
  Database,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Fingerprint,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { VaultInfo } from '../../interfaces/INoteModels';

export interface CreateVaultViewProps {
  vaultsCount: number;
  onCreateVault: (
    name: string,
    customRecoveryKey?: string,
    providedPasskeyKey?: CryptoKey
  ) => Promise<{ vault: VaultInfo; recoveryKey: string; vmk: CryptoKey }>;
  onBackToUnlock: () => void;
  onComplete: (vaultId: string, vmk: CryptoKey) => void;
  onError: (msg: string | null) => void;
}

export const CreateVaultView: React.FC<CreateVaultViewProps> = ({
  vaultsCount,
  onCreateVault,
  onBackToUnlock,
  onComplete,
  onError,
}) => {
  const { t } = useI18n();

  const [newVaultName, setNewVaultName] = useState('');
  const [loading, setLoading] = useState(false);

  const [createdRecoveryInfo, setCreatedRecoveryInfo] = useState<{
    vault: VaultInfo;
    recoveryKey: string;
    vmk: CryptoKey;
  } | null>(null);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [confirmedBackup, setConfirmedBackup] = useState(false);

  const handleCreateVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);

    if (!newVaultName.trim()) {
      onError(t('enterVaultName') || 'Please enter a vault name');
      return;
    }

    try {
      setLoading(true);
      const res = await onCreateVault(newVaultName.trim());
      setCreatedRecoveryInfo(res);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishVaultCreation = () => {
    if (createdRecoveryInfo) {
      onComplete(createdRecoveryInfo.vault.id, createdRecoveryInfo.vmk);
      setCreatedRecoveryInfo(null);
      setNewVaultName('');
      setConfirmedBackup(false);
    }
  };

  if (!createdRecoveryInfo) {
    return (
      <div className="space-y-5 animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primaryColor-500/15 border border-primaryColor-500/30 text-primaryColor-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {vaultsCount === 0 ? t('initializeFirstVault') || 'Create First Vault' : t('createNewVault') || 'Create New Vault'}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                {t('passkeyProtectedDesc') || 'Hardware Passkey & 8-Word Mnemonic Protected'}
              </p>
            </div>
          </div>

          {vaultsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                onError(null);
                onBackToUnlock();
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer"
              title="Back to Unlock"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleCreateVaultSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-300 font-medium mb-1.5">
              {t('vaultName') || 'Vault Name'}
            </label>
            <input
              type="text"
              value={newVaultName}
              onChange={(e) => setNewVaultName(e.target.value)}
              placeholder="e.g. Personal Journal, Research, Work Vault"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500"
              autoFocus
            />
          </div>

          <div className="p-3.5 rounded-xl bg-primaryColor-500/10 border border-black/10 dark:border-white/15 backdrop-blur-md space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-primaryColor-700 dark:text-primaryColor-300">
              <Fingerprint className="w-4 h-4 text-primaryColor-500" />
              <span>{t('hardwareProtection') || 'Biometric Passkey Binding'}</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
              {t('passkeyAutoBindNotice') || 'Your vault will be bound to your device hardware authenticator (Touch ID, Windows Hello, Face ID) and backup with an 8-word mnemonic.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !newVaultName.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-primaryColor-500/20 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('creating') || 'Generating Vault Keys...'}</span>
              </>
            ) : (
              <>
                <span>{t('createVault') || 'Create Vault'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Zero-Knowledge Multi-Tier Envelope Encryption</span>
        </div>
      </div>
    );
  }

  // Backup Mnemonic Display Card
  const words = createdRecoveryInfo.recoveryKey.split(' ');

  const handleCopy = () => {
    navigator.clipboard.writeText(createdRecoveryInfo.recoveryKey);
    setCopiedRecovery(true);
    setTimeout(() => setCopiedRecovery(false), 2000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="text-center space-y-1 pb-3 border-b border-white/10">
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

      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {words.map((word, idx) => (
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
          {copiedRecovery ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('copied') || 'Copied to clipboard'}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t('copyRecoveryKey') || 'Copy 8-Word Recovery Phrase'}</span>
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
          id="confirmBackupCheckbox"
          checked={confirmedBackup}
          onChange={(e) => setConfirmedBackup(e.target.checked)}
          className="rounded border-white/20 bg-black/40 text-primaryColor-500 focus:ring-primaryColor-500 h-4 w-4 cursor-pointer"
        />
        <label
          htmlFor="confirmBackupCheckbox"
          className="text-xs text-zinc-300 cursor-pointer select-none font-medium"
        >
          {t('confirmBackupCheckbox') || 'I have saved my 8-word recovery phrase safely'}
        </label>
      </div>

      <button
        type="button"
        disabled={!confirmedBackup}
        onClick={handleFinishVaultCreation}
        className="w-full py-2.5 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primaryColor-500/20 cursor-pointer"
      >
        <span>{t('enterVault') || 'Enter Vault & Start Writing'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
