import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { UnlockModalProps } from './UnlockModal.types';
import { usePinLockout } from './usePinLockout';
import { PinUnlockView } from './PinUnlockView';
import { RecoveryUnlockView } from './RecoveryUnlockView';
import { CreateVaultView } from './CreateVaultView';

/**
 * UnlockModal Orchestrator Component.
 * Dispatches between:
 * - PinUnlockView: standard 4-6 digit PIN entry & OPRF evaluation
 * - RecoveryUnlockView: 8-word BIP-39 mnemonic recovery & PIN reset
 * - CreateVaultView: new vault initialization & recovery key backup card
 */
export const UnlockModal: React.FC<UnlockModalProps> = ({
  vaults = [],
  activeVaultId,
  onSelectVault,
  onOpenProfile,
  onCreateVault,
  onDeleteVault,
}) => {
  const {
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

  // Automatically adjust mode ONLY when all vaults are deleted
  useEffect(() => {
    if (vaults.length === 0 && mode !== 'create') {
      setMode('create');
    }
  }, [vaults.length, mode]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];

  const { isLockedOut, remainingSeconds, recordSuccess, recordFailure } =
    usePinLockout(activeVault?.id || 'default', username);

  if (!isAuthenticated || isVaultUnlocked) return null;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleUnlockSuccess = (vaultId: string, vmk: CryptoKey) => {
    setVaultKey(vaultId, vmk);
    setErrorMsg(null);
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
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <img
              src="/assets/obex_cat_eye_logo-256.webp"
              alt="Markspace Logo"
              className="w-4 h-4 rounded object-contain"
            />
            <span className="font-mono text-zinc-300">
              {mode === 'create' ? 'Setup Vault' : 'Vault Locked'}
            </span>
          </div>
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition cursor-pointer"
              title={t('userProfile')}
            >
              <span>{username}</span>
            </button>
          )}
        </div>

        {/* Global Error Notice */}
        {errorMsg && !isLockedOut && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center font-mono">
            {errorMsg}
          </div>
        )}

        {/* View Mode Dispatcher */}
        {mode === 'create' ? (
          <CreateVaultView
            vaultsCount={vaults.length}
            onCreateVault={onCreateVault}
            onBackToPin={() => {
              setErrorMsg(null);
              setMode('pin');
            }}
            onComplete={(vaultId, vmk) => {
              handleUnlockSuccess(vaultId, vmk);
              setMode('pin');
            }}
            onError={setErrorMsg}
          />
        ) : mode === 'pin' ? (
          <PinUnlockView
            vaults={vaults}
            activeVault={activeVault}
            activeVaultId={activeVaultId}
            onSelectVault={onSelectVault}
            onSwitchToCreate={() => {
              setErrorMsg(null);
              setMode('create');
            }}
            onSwitchToRecovery={() => {
              setErrorMsg(null);
              setMode('recovery');
            }}
            onError={setErrorMsg}
            onSuccess={handleUnlockSuccess}
            triggerShake={triggerShake}
            isLockedOut={isLockedOut}
            remainingSeconds={remainingSeconds}
            recordSuccess={recordSuccess}
            recordFailure={recordFailure}
            onDeleteVault={onDeleteVault}
          />
        ) : (
          <RecoveryUnlockView
            activeVault={activeVault}
            username={username}
            onBackToPin={() => {
              setErrorMsg(null);
              setMode('pin');
            }}
            onError={setErrorMsg}
            onSuccess={handleUnlockSuccess}
            triggerShake={triggerShake}
            recordSuccess={recordSuccess}
          />
        )}

        {/* Modal Footer */}
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
