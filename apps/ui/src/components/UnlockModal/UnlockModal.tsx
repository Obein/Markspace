import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  KeyRound,
  LogOut,
  Database,
  User,
  Loader2,
  AlertTriangle,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Plus,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultInfo } from '../../interfaces/INoteModels';
import { UnlockModalProps } from './UnlockModal.types';
import { usePinLockout } from './usePinLockout';

export const UnlockModal: React.FC<UnlockModalProps> = ({
  vaults = [],
  activeVaultId,
  onSelectVault,
  onOpenProfile,
  onCreateVault,
}) => {
  const {
    cryptoService,
    apiClient,
    setVaultKey,
    isAuthenticated,
    isVaultUnlocked,
    username,
    logoutAccount,
  } = useApp();
  const { t } = useI18n();

  // Mode: 'pin' (default unlock), 'recovery' (unlock via mnemonic), 'create' (create new vault)
  const [mode, setMode] = useState<'pin' | 'recovery' | 'create'>(
    vaults.length === 0 ? 'create' : 'pin'
  );

  const [pin, setPin] = useState('');
  const [recoveryMnemonic, setRecoveryMnemonic] = useState('');
  const [newPinAfterRecovery, setNewPinAfterRecovery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Vault Creation State inside UnlockModal
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultPin, setNewVaultPin] = useState('');
  const [newVaultConfirmPin, setNewVaultConfirmPin] = useState('');
  const [createdRecoveryInfo, setCreatedRecoveryInfo] = useState<{
    vault: VaultInfo;
    recoveryKey: string;
    vmk: CryptoKey;
  } | null>(null);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [confirmedBackup, setConfirmedBackup] = useState(false);

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];

  const { isLockedOut, remainingSeconds, recordSuccess, recordFailure } =
    usePinLockout(activeVault?.id || 'default', username);

  if (!isAuthenticated || isVaultUnlocked) return null;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSelectDifferentVault = (vaultId: string) => {
    onSelectVault(vaultId);
    setPin('');
    setErrorMsg(null);
  };

  const handlePinUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    if (!activeVault) {
      setMode('create');
      return;
    }

    if (!pin || pin.length < 4 || pin.length > 6) {
      setErrorMsg('Please enter your 4 to 6 digit PIN');
      triggerShake();
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      if (activeVault.wrappedVmkByPin && activeVault.salt) {
        // 1. Blind PIN on client
        const blindPoint = await cryptoService.computeOprfBlindPoint(pin, activeVault.salt);

        // 2. Evaluate with Server (Server pre-charges 1 attempt & enforces rate-limiting gate)
        const oprfResult = await apiClient.evaluateVaultOprf(activeVault.id, blindPoint);

        // 3. Multi-factor derivation: (PBKDF2(PIN, salt) + OPRF Evaluation)
        const pinKey = await cryptoService.deriveKeyFromPin(
          pin,
          activeVault.salt,
          oprfResult.evaluatedPoint
        );
        // AES-GCM Unwrap VMK in memory
        const vmk = await cryptoService.unwrapVMK(activeVault.wrappedVmkByPin, pinKey);

        // Notify server of successful unlock to reset fail counter
        await apiClient.reportVaultPinSuccess(activeVault.id);
        recordSuccess();
        setVaultKey(activeVault.id, vmk);
      } else {
        // Legacy fallback
        const { cmk } = await cryptoService.deriveCMK(pin, `markspace-vault-${username}`);
        await apiClient.reportVaultPinSuccess(activeVault.id);
        recordSuccess();
        setVaultKey(activeVault.id, cmk);
      }
    } catch (err: any) {
      recordFailure();
      triggerShake();

      // Check if server rejected due to lockout or unwrap failed
      if (err.message?.includes('VAULT_LOCKED_OUT') || err.code === 'VAULT_LOCKED_OUT') {
        setErrorMsg(err.message);
      } else {
        // PIN mismatch on client unwrap
        setErrorMsg('Incorrect PIN. Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVault) return;

    if (!recoveryMnemonic.trim()) {
      setErrorMsg('Please enter your 8-word recovery key');
      return;
    }

    if (!/^\d{4,6}$/.test(newPinAfterRecovery)) {
      setErrorMsg('Please choose a new 4 to 6 digit PIN');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

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
          const parsed = JSON.parse(stored);
          const updated = parsed.map((v: any) =>
            v.id === activeVault.id ? { ...v, wrappedVmkByPin: newWrappedVmkByPin } : v
          );
          localStorage.setItem(`markspace_vaults_${username}`, JSON.stringify(updated));
        }
      } catch (_) {}

      recordSuccess();
      setVaultKey(activeVault.id, vmk);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid recovery key for this vault');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newVaultName.trim()) {
      setErrorMsg('Please enter a vault name');
      return;
    }

    if (!/^\d{4,6}$/.test(newVaultPin)) {
      setErrorMsg('PIN must be 4 to 6 digits');
      return;
    }

    if (newVaultPin !== newVaultConfirmPin) {
      setErrorMsg('PINs do not match');
      return;
    }

    try {
      setLoading(true);
      const res = await onCreateVault(newVaultName.trim(), newVaultPin);
      setCreatedRecoveryInfo(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishVaultCreation = () => {
    if (createdRecoveryInfo) {
      setVaultKey(createdRecoveryInfo.vault.id, createdRecoveryInfo.vmk);
      setMode('pin');
      setCreatedRecoveryInfo(null);
      setNewVaultName('');
      setNewVaultPin('');
      setNewVaultConfirmPin('');
      setConfirmedBackup(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md p-7 glass-panel rounded-glass-lg border border-white/15 text-white shadow-2xl relative overflow-hidden transition-transform duration-200 ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono">
              {mode === 'create' ? 'Setup Vault' : 'Vault Locked'}
            </span>
          </div>
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
              title={t('userProfile')}
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>{username}</span>
            </button>
          )}
        </div>

        {mode === 'create' ? (
          /* Create New Vault Flow */
          !createdRecoveryInfo ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {vaults.length === 0 ? 'Create Your First Vault' : 'Create New Vault'}
                    </h3>
                    <p className="text-xs text-zinc-400">Set a name & 4-6 digit PIN</p>
                  </div>
                </div>

                {vaults.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setMode('pin');
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer text-xs"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateVaultSubmit} autoComplete="off" className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">{t('vaultName')}</label>
                  <input
                    type="text"
                    value={newVaultName}
                    onChange={(e) => setNewVaultName(e.target.value)}
                    placeholder="e.g. Personal Workspace, Research Notes"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm tracking-widest font-mono text-center"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm tracking-widest font-mono text-center"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
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
          ) : (
            /* Display Created Recovery Key Card */
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
                  <span className="text-blue-400 select-all font-mono text-[10px]">{createdRecoveryInfo.vault.id}</span>
                </div>
              </div>

              {/* Mnemonic Key Box */}
              <div className="relative p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-blue-300 font-mono">
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
                    className="px-2 py-0.5 rounded bg-blue-600/80 hover:bg-blue-500 text-white text-[10px] flex items-center gap-1 transition cursor-pointer shadow-sm"
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
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>I have safely backed up my recovery key and Vault UUID.</span>
              </label>

              <button
                onClick={handleFinishVaultCreation}
                disabled={!confirmedBackup}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Complete & Open Vault</span>
              </button>
            </div>
          )
        ) : mode === 'pin' ? (
          /* Standard PIN Unlock Mode */
          <div>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-3 text-blue-400 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">{t('unlockVault')}</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Enter PIN to decrypt <strong className="text-zinc-200">{activeVault?.name || 'Vault'}</strong>
              </p>
            </div>

            {/* Lockout Banner */}
            {isLockedOut && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2.5 font-mono animate-in fade-in duration-150">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-red-300">PIN Entry Suspended</div>
                  <div className="text-[11px] text-zinc-300">
                    Try again in <strong>{formatCountdown(remainingSeconds)}</strong>
                  </div>
                </div>
              </div>
            )}

            {errorMsg && !isLockedOut && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handlePinUnlock} autoComplete="off" className="space-y-4">
              {/* Prominent Vault Selector Dropdown */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    <span>Select Vault</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setMode('create');
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Vault</span>
                  </button>
                </div>

                <select
                  value={activeVaultId}
                  onChange={(e) => handleSelectDifferentVault(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50 transition cursor-pointer"
                >
                  {vaults.map((v) => (
                    <option key={v.id} value={v.id} className="bg-zinc-900 text-white">
                      {v.name} (UUID: {v.id.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
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
                  name="vault-unlock-pin"
                  autoComplete="one-time-code"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  disabled={isLockedOut}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-lg tracking-[0.3em] font-mono text-center disabled:opacity-40 disabled:cursor-not-allowed"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || isLockedOut}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-lg shadow-blue-500/20 border border-blue-400/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{t('unlocking')}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{t('unlock')}</span>
                  </>
                )}
              </button>
            </form>

            {/* Recovery Key Switch Link (Always Visible) */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('recovery');
                }}
                className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1.5 mx-auto font-mono cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Forgot PIN? Unlock with Recovery Key</span>
              </button>
            </div>
          </div>
        ) : (
          /* Recovery Mode */
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('pin');
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
                  Vault UUID: <span className="text-blue-400 select-all">{activeVault?.id}</span>
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}

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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-xs font-mono resize-none"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-sm tracking-widest font-mono text-center"
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
        )}

        <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1 text-blue-400 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero-Knowledge Multi-Factor Protection</span>
          </div>
          <button
            onClick={logoutAccount}
            className="text-red-400 hover:underline transition flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('logoutAccount')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
