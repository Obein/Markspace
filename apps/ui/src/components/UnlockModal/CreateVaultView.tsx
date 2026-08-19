import React, { useState } from 'react';
import {
  Database,
  ArrowLeft,
  ArrowRight,
  Loader2,
  KeyRound,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { VaultInfo } from '../../interfaces/INoteModels';

export interface CreateVaultViewProps {
  vaultsCount: number;
  onCreateVault: (
    name: string,
    pin: string,
    recoveryKey?: string
  ) => Promise<{ vault: VaultInfo; recoveryKey: string; vmk: CryptoKey }>;
  onBackToPin: () => void;
  onComplete: (vaultId: string, vmk: CryptoKey) => void;
  onError: (msg: string | null) => void;
}

export const CreateVaultView: React.FC<CreateVaultViewProps> = ({
  vaultsCount,
  onCreateVault,
  onBackToPin,
  onComplete,
  onError,
}) => {
  const { t } = useI18n();

  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultPin, setNewVaultPin] = useState('');
  const [newVaultConfirmPin, setNewVaultConfirmPin] = useState('');
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
      onError('Please enter a vault name');
      return;
    }

    if (!/^\d{4,6}$/.test(newVaultPin)) {
      onError('PIN must be 4 to 6 digits');
      return;
    }

    if (newVaultPin !== newVaultConfirmPin) {
      onError('PINs do not match');
      return;
    }

    try {
      setLoading(true);
      const res = await onCreateVault(newVaultName.trim(), newVaultPin);
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
      setNewVaultPin('');
      setNewVaultConfirmPin('');
      setConfirmedBackup(false);
    }
  };

  if (!createdRecoveryInfo) {
    return (
      <div className="space-y-4 animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primaryColor-500/15 border border-primaryColor-500/30 text-primaryColor-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {vaultsCount === 0 ? 'Create Your First Vault' : 'Create New Vault'}
              </h3>
              <p className="text-xs text-zinc-400">Set a name & 4-6 digit PIN</p>
            </div>
          </div>

          {vaultsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                onError(null);
                onBackToPin();
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleCreateVaultSubmit} autoComplete="off" className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">{t('vaultName')}</label>
            <input
              type="text"
              value={newVaultName}
              onChange={(e) => setNewVaultName(e.target.value)}
              placeholder="e.g. Personal Workspace, Research Notes"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500 text-xs font-mono"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
              <span>Vault PIN (4 - 6 digits)</span>
              <span className="text-[10px] text-zinc-500 font-mono">Numbers only</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              name="vault-create-pin"
              autoComplete="one-time-code"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-form-type="other"
              value={newVaultPin}
              onChange={(e) => setNewVaultPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500 text-sm tracking-widest font-mono text-center"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              name="vault-create-pin-confirm"
              autoComplete="one-time-code"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-form-type="other"
              value={newVaultConfirmPin}
              onChange={(e) => setNewVaultConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500 text-sm tracking-widest font-mono text-center"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-xs font-semibold shadow-lg shadow-primaryColor-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <span>Next: Backup Recovery Key</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  // Display Created Recovery Key Card
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 pb-3 border-b border-white/10">
        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
            <span>Vault Recovery Key</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              8 Words
            </span>
          </h3>
          <p className="text-xs text-zinc-400">Save key securely to recover your vault</p>
        </div>
      </div>

      {/* Vault Metadata Card with UUID */}
      <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-xs font-mono">
        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
          <span>Vault Name:</span>
          <strong className="text-zinc-200">{createdRecoveryInfo.vault.name}</strong>
        </div>
        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
          <span>Vault UUID:</span>
          <span className="text-primaryColor-400 select-all font-mono text-[10px]">{createdRecoveryInfo.vault.id}</span>
        </div>
      </div>

      {/* Mnemonic Key Box */}
      <div className="relative p-3.5 rounded-xl bg-primaryColor-950/40 border border-primaryColor-500/30 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-primaryColor-300 font-mono">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>BIP-39 Mnemonic Recovery Key</span>
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(createdRecoveryInfo.recoveryKey);
              setCopiedRecovery(true);
              setTimeout(() => setCopiedRecovery(false), 2000);
            }}
            className="px-2 py-0.5 rounded bg-primaryColor-600/80 hover:bg-primaryColor-500 text-white text-[10px] flex items-center gap-1 transition cursor-pointer shadow-sm"
          >
            {copiedRecovery ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
            <span>{copiedRecovery ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {createdRecoveryInfo.recoveryKey.split('-').map((word, idx) => (
            <div
              key={idx}
              className="px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-xs font-mono text-white flex items-center gap-1.5 select-all"
            >
              <span className="text-zinc-500 text-[10px]">{idx + 1}.</span>
              <span className="font-semibold text-emerald-300">{word}</span>
            </div>
          ))}
        </div>

        <div className="text-[11px] font-mono text-zinc-400 bg-black/60 p-2 rounded-lg break-all select-all">
          {createdRecoveryInfo.recoveryKey}
        </div>
      </div>

      {/* Warning */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          <strong>Critical:</strong> This recovery key is the ONLY way to unlock your vault or reset your PIN. It is never stored on the server.
        </p>
      </div>

      {/* Confirmation Checkbox */}
      <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmedBackup}
          onChange={(e) => setConfirmedBackup(e.target.checked)}
          className="w-4 h-4 rounded text-primaryColor-600 focus:ring-0 cursor-pointer"
        />
        <span>I have safely backed up my recovery key and Vault UUID.</span>
      </label>

      <button
        onClick={handleFinishVaultCreation}
        disabled={!confirmedBackup}
        className="w-full py-3 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-xs font-bold transition shadow-lg shadow-primaryColor-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <ShieldCheck className="w-4 h-4" />
        <span>Complete & Open Vault</span>
      </button>
    </div>
  );
};
