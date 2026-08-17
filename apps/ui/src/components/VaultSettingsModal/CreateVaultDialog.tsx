import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
  Database,
  ArrowRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { VaultInfo } from '../../interfaces/INoteModels';

interface CreateVaultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateVault: (
    name: string,
    pin: string,
    recoveryKey?: string
  ) => Promise<{ vault: VaultInfo; recoveryKey: string }>;
}

export const CreateVaultDialog: React.FC<CreateVaultDialogProps> = ({
  isOpen,
  onClose,
  onCreateVault,
}) => {
  const { t } = useI18n();

  const [step, setStep] = useState<'form' | 'recovery'>('form');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [createdVault, setCreatedVault] = useState<VaultInfo | null>(null);
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
      setErrorMsg('Please enter a vault name');
      return;
    }

    if (!/^\d{4,6}$/.test(pin)) {
      setErrorMsg('PIN must be 4 to 6 digits');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMsg('PINs do not match');
      return;
    }

    try {
      setLoading(true);
      const res = await onCreateVault(name.trim(), pin);
      setCreatedVault(res.vault);
      setRecoveryKey(res.recoveryKey);
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
    onClose();
    // Reset state
    setStep('form');
    setName('');
    setPin('');
    setConfirmPin('');
    setCreatedVault(null);
    setRecoveryKey('');
    setConfirmedSaved(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md p-6 glass-panel rounded-glass-lg border border-white/15 text-white shadow-2xl relative overflow-hidden">
        {step === 'form' ? (
          <div>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
              <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('createVault')}</h3>
                <p className="text-xs text-zinc-400">Set a unique name and 4-6 digit PIN for this vault</p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">{t('vaultName')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Work Notes, Private Vault"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                  <span>Vault PIN (4 - 6 digits)</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Numbers only</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm tracking-widest font-mono text-center"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm tracking-widest font-mono text-center"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <span>Next: Recovery Key</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
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
                <p className="text-xs text-zinc-400">Save this key in a secure location (e.g. Password Manager)</p>
              </div>
            </div>

            {/* Vault Metadata Card */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                <span>Vault Name:</span>
                <strong className="text-zinc-200">{createdVault?.name}</strong>
              </div>
              <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                <span>Vault Identifier (ID):</span>
                <span className="text-blue-400 select-all font-mono text-[10px]">{createdVault?.id}</span>
              </div>
            </div>

            {/* Mnemonic Key Box */}
            <div className="relative p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-blue-300 font-mono">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>BIP-39 Mnemonic Recovery Key</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2 py-0.5 rounded bg-blue-600/80 hover:bg-blue-500 text-white text-[10px] flex items-center gap-1 transition cursor-pointer shadow-sm"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Word Pills Display */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {recoveryKey.split('-').map((word, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs font-mono text-white flex items-center gap-2 select-all"
                  >
                    <span className="text-zinc-500 text-[10px]">{idx + 1}.</span>
                    <span className="font-semibold text-emerald-300">{word}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] font-mono text-zinc-400 bg-black/60 p-2 rounded-lg break-all select-all">
                {recoveryKey}
              </div>
            </div>

            {/* Security Warning */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Critical:</strong> This recovery key is the ONLY way to unlock your vault or reset your PIN if you forget it. It is never stored on the server.
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedSaved}
                onChange={(e) => setConfirmedSaved(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>I have safely backed up my recovery key and Vault ID.</span>
            </label>

            <button
              onClick={handleFinish}
              disabled={!confirmedSaved}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Complete & Open Vault</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
