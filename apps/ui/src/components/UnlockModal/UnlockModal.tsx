import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { UnlockModalProps } from './UnlockModal.types';
import { PasskeyUnlockView } from './PasskeyUnlockView';
import { RecoveryUnlockView } from './RecoveryUnlockView';
import { CreateVaultView } from './CreateVaultView';
import { SetupPasskeyView } from './SetupPasskeyView';
import { PasskeyCryptoService } from '../../crypto/PasskeyCryptoService';

/**
 * UnlockModal Orchestrator Component.
 * Dispatches between:
 * - SetupPasskeyView: Mandatory first-time Passkey registration
 * - PasskeyUnlockView: One-click biometric/hardware Passkey unlock (Default)
 * - RecoveryUnlockView: 8-word BIP-39 mnemonic recovery phrase unlock
 * - CreateVaultView: New vault creation & recovery key backup card
 */
export const UnlockModal: React.FC<UnlockModalProps> = ({
  vaults = [],
  activeVaultId,
  onSelectVault,
  onOpenProfile,
  onCreateVault,
  onDeleteVault,
  onUnlockVaultWithPasskey,
  onUnlockVaultWithRecovery,
}) => {
  const {
    setVaultKey,
    setActiveVaultId,
    isAuthenticated,
    isVaultUnlocked,
    userId,
    username,
    logoutAccount,
  } = useApp();
  const { t } = useI18n();

  // Mode: 'setup-passkey' | 'passkey' | 'recovery' | 'create'
  const [mode, setMode] = useState<'setup-passkey' | 'passkey' | 'recovery' | 'create'>(() => {
    if (username && !PasskeyCryptoService.hasPasskey(username)) {
      return 'setup-passkey';
    }
    return vaults.length === 0 ? 'create' : 'passkey';
  });

  const prevUsernameRef = React.useRef<string | null>(username);
  const prevVaultsLengthRef = React.useRef<number>(vaults.length);

  // Automatically enforce Passkey setup or adjust mode when vaults or user changes
  useEffect(() => {
    const isUserChanged = prevUsernameRef.current !== username;
    const isVaultsLoaded = prevVaultsLengthRef.current === 0 && vaults.length > 0;
    prevUsernameRef.current = username;
    prevVaultsLengthRef.current = vaults.length;

    if (username) {
      if (!PasskeyCryptoService.hasPasskey(username)) {
        if (mode !== 'setup-passkey') {
          setMode('setup-passkey');
        }
      } else if (vaults.length === 0) {
        if (mode !== 'create' && mode !== 'setup-passkey') {
          setMode('create');
        }
      } else if (isUserChanged || isVaultsLoaded) {
        // When existing vaults are loaded or user logs in with vaults, default to passkey unlock
        setMode('passkey');
      }
    }
  }, [username, vaults.length, mode]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];
  const isCreateMode = mode === 'create' || (vaults.length === 0 && mode !== 'setup-passkey');

  if (!isAuthenticated || isVaultUnlocked) return null;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleUnlockSuccess = (vaultId: string, vmk: CryptoKey) => {
    setActiveVaultId(vaultId);
    setVaultKey(vaultId, vmk);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md p-7 glass-panel rounded-glass-lg border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white shadow-2xl relative overflow-hidden transition-transform duration-200 ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <img
              src="/assets/obex_cat_eye_logo-256.webp"
              alt="Markspace Logo"
              className="w-4 h-4 rounded object-contain"
            />
            <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">
              {mode === 'setup-passkey'
                ? t('setupPasskeyTitle') || 'Passkey Setup'
                : isCreateMode
                ? 'Setup Vault'
                : 'Vault Locked'}
            </span>
          </div>
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-black/10 dark:border-white/10 text-xs font-mono transition cursor-pointer"
              title={t('userProfile')}
            >
              <span>{username}</span>
            </button>
          )}
        </div>

        {/* Global Error Notice */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-300 text-xs text-center font-mono">
            {errorMsg}
          </div>
        )}

        {/* Vault Switcher & Management bar (When multiple vaults exist and in unlock mode) */}
        {!isCreateMode && mode !== 'setup-passkey' && vaults.length > 0 && activeVault && (
          <div className="mb-5 flex items-center justify-between gap-2 p-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10">
            <select
              value={activeVault.id}
              onChange={(e) => onSelectVault(e.target.value)}
              className="bg-transparent text-xs text-zinc-800 dark:text-zinc-200 font-mono focus:outline-none px-2 py-1 flex-1 cursor-pointer"
            >
              {vaults.map((v) => (
                <option key={v.id} value={v.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                  {v.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  if (username && !PasskeyCryptoService.hasPasskey(username)) {
                    setMode('setup-passkey');
                  } else {
                    setMode('create');
                  }
                }}
                className="p-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-primaryColor-600 dark:text-primaryColor-400 hover:text-primaryColor-700 dark:hover:text-primaryColor-300 transition cursor-pointer"
                title={t('newVault') || 'New Vault'}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {onDeleteVault && (
                <button
                  type="button"
                  onClick={() => {
                    const vaultName = activeVault?.name || 'this vault';
                    if (
                      window.confirm(
                        t('confirmDeleteVault') || `Delete vault "${vaultName}" and all its encrypted files?`
                      )
                    ) {
                      onDeleteVault(activeVault.id);
                    }
                  }}
                  className="p-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-red-500/10 dark:hover:bg-red-500/20 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-300 transition cursor-pointer"
                  title={t('deleteVault') || 'Delete Vault'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* View Mode Dispatcher */}
        {mode === 'setup-passkey' ? (
          <SetupPasskeyView
            username={username || ''}
            userId={userId}
            onPasskeySetupComplete={() => {
              setErrorMsg(null);
              setMode(vaults.length === 0 ? 'create' : 'passkey');
            }}
            onError={setErrorMsg}
          />
        ) : isCreateMode ? (
          <CreateVaultView
            vaultsCount={vaults.length}
            onCreateVault={onCreateVault}
            onBackToUnlock={() => {
              setErrorMsg(null);
              if (vaults.length > 0) {
                setMode('passkey');
              }
            }}
            onComplete={(vaultId, vmk) => {
              handleUnlockSuccess(vaultId, vmk);
              setMode('passkey');
            }}
            onError={setErrorMsg}
          />
        ) : mode === 'passkey' ? (
          <PasskeyUnlockView
            activeVault={activeVault}
            username={username}
            onUnlockSuccess={handleUnlockSuccess}
            onUnlockWithPasskey={
              onUnlockVaultWithPasskey ||
              (async (_vaultId) => {
                throw new Error('Passkey unlock handler not provided');
              })
            }
            onSwitchToRecovery={() => {
              setErrorMsg(null);
              setMode('recovery');
            }}
            onError={setErrorMsg}
          />
        ) : (
          <RecoveryUnlockView
            activeVault={activeVault}
            username={username}
            onBackToPasskey={() => {
              setErrorMsg(null);
              setMode('passkey');
            }}
            onError={setErrorMsg}
            onSuccess={handleUnlockSuccess}
            onUnlockWithRecovery={
              onUnlockVaultWithRecovery ||
              (async (_vaultId, _mnemonic) => {
                throw new Error('Recovery unlock handler not provided');
              })
            }
            triggerShake={triggerShake}
          />
        )}

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1 text-primaryColor-600 dark:text-primaryColor-400 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Hardware Passkey Protected</span>
          </div>
          <button
            onClick={logoutAccount}
            className="text-red-600 dark:text-red-400 hover:underline transition flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('logoutAccount')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
