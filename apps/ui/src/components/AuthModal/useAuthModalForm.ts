import { useState, useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { MnemonicService } from '../../crypto/MnemonicService';
import { UserMasterKeyService } from '../../crypto/UserMasterKeyService';
import { PasskeyAuthResult } from '../../interfaces/IApiClient';

export interface UseAuthModalFormReturn {
  // Mode
  isRegisterMode: boolean;
  isTransitioning: boolean;
  isFormFocused: boolean;
  setIsFormFocused: (focused: boolean) => void;
  switchMode: (toRegister: boolean) => void;

  // Form Fields
  usernameInput: string;
  setUsernameInput: (val: string) => void;
  rememberMe: boolean;
  setRememberMe: (val: boolean) => void;

  // 12-Word Recovery Display Step (Register)
  generatedMnemonic: string | null;
  copiedMnemonic: boolean;
  copyMnemonicToClipboard: () => void;
  handleConfirmMnemonicSaved: () => Promise<void>;

  // Recovery Fallback Step (Login on non-PRF device)
  needsRecoveryFallback: boolean;
  recoveryInput: string;
  setRecoveryInput: (val: string) => void;
  handleRecoveryFallbackSubmit: (e: React.FormEvent) => Promise<void>;

  // Status & Feedback
  loading: boolean;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  securityAlert: string | null;

  // Actions
  handlePasskeyAuthSubmit: (e: React.FormEvent) => Promise<void>;
}

const WEBAUTHN_PRF_SALT = new TextEncoder().encode('markspace-passkey-prf-v1');

export function useAuthModalForm(): UseAuthModalFormReturn {
  const {
    apiClient,
    cryptoService,
    setToken,
    setUsername,
    setRole,
    unlockAllVaultsWithUmk,
    securityAlert,
    clearSecurityAlert,
    systemConfigErrors,
  } = useApp();
  const { t } = useI18n();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Focus & Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFormFocused, setIsFormFocused] = useState(false);

  // Registration Mnemonic State
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | null>(null);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [pendingRegResult, setPendingRegResult] = useState<PasskeyAuthResult | null>(null);
  const [pendingRegUmk, setPendingRegUmk] = useState<CryptoKey | null>(null);

  // Non-PRF Device Fallback State
  const [needsRecoveryFallback, setNeedsRecoveryFallback] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [pendingLoginResult, setPendingLoginResult] = useState<PasskeyAuthResult | null>(null);
  const [pendingPrfEntropy, setPendingPrfEntropy] = useState<Uint8Array | null>(null);

  const switchMode = useCallback(
    (toRegister: boolean) => {
      setIsTransitioning(true);
      setErrorMsg(null);
      setGeneratedMnemonic(null);
      setNeedsRecoveryFallback(false);
      setRecoveryInput('');
      setTimeout(() => {
        setIsRegisterMode(toRegister);
        setIsTransitioning(false);
      }, 150);
    },
    []
  );

  const copyMnemonicToClipboard = useCallback(() => {
    if (generatedMnemonic) {
      navigator.clipboard.writeText(generatedMnemonic);
      setCopiedMnemonic(true);
      setTimeout(() => setCopiedMnemonic(false), 2500);
    }
  }, [generatedMnemonic]);

  const handleConfirmMnemonicSaved = useCallback(async () => {
    if (!pendingRegResult || !pendingRegUmk) return;
    try {
      setLoading(true);
      await unlockAllVaultsWithUmk(pendingRegUmk, pendingRegResult.vaults);
      setToken(pendingRegResult.accessToken);
      setUsername(pendingRegResult.user.username);
      setRole(pendingRegResult.user.role);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to finalize session');
    } finally {
      setLoading(false);
    }
  }, [pendingRegResult, pendingRegUmk, unlockAllVaultsWithUmk, setToken, setUsername, setRole]);

  const handlePasskeyAuthSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg(null);
      clearSecurityAlert();

      if (systemConfigErrors && systemConfigErrors.length > 0) {
        setErrorMsg(`服务端机密配置异常（需 ≥ 30 字符）：${systemConfigErrors.join('; ')}。请先配置环境变量。`);
        return;
      }

      const cleanUsername = usernameInput.trim().toLowerCase();
      const unixUserRegex = /^[a-z_][a-z0-9_-]{4,31}$/;

      if (isRegisterMode) {
        if (!cleanUsername) {
          setErrorMsg(t('chooseUsername') || 'Please enter a username');
          return;
        }
        if (!unixUserRegex.test(cleanUsername)) {
          setErrorMsg(
            t('invalidUsernameUnix') ||
              'Username must follow Unix format (5-32 characters, lowercase letters, numbers, _, -, starting with letter or _)'
          );
          return;
        }
      }

      setLoading(true);

      try {
        if (isRegisterMode) {
          // 1. BIP-39 12-word mnemonic & REK derivation
          const mnemonic = MnemonicService.generateMnemonic(12);
          const recoverySalt = UserMasterKeyService.generateSalt();
          const rek = await UserMasterKeyService.deriveREKFromMnemonic(mnemonic, recoverySalt);

          // 2. Root UMK generation & wrapping with REK
          const umk = await UserMasterKeyService.generateUMK();
          const wrappedUmkByRecovery = await UserMasterKeyService.wrapUMK(umk, rek);

          // 3. Initial Default Vault creation & wrapping with UMK
          const defaultVmk = await cryptoService.generateVMK();
          const wrappedVmk = await UserMasterKeyService.wrapVMK(defaultVmk, umk);
          const defaultVaultSalt = UserMasterKeyService.generateSalt();

          // 4. Request WebAuthn Registration Options from Server
          const options = await apiClient.passkeyRegisterOptions(cleanUsername);

          // 5. Inject WebAuthn PRF extension input
          (options as any).extensions = {
            prf: {
              eval: {
                first: WEBAUTHN_PRF_SALT,
              },
            },
          };

          // 6. Trigger Browser WebAuthn Ceremony
          const regResponse = await startRegistration({ optionsJSON: options });

          // 7. Extract PRF output if supported by authenticator
          const prfFirst = (regResponse as any).clientExtensionResults?.prf?.results?.first;
          let wrappedUmkByPrf: string | undefined;
          if (prfFirst && prfFirst instanceof ArrayBuffer) {
            const uek = await UserMasterKeyService.deriveUEKFromPrf(new Uint8Array(prfFirst), recoverySalt);
            wrappedUmkByPrf = await UserMasterKeyService.wrapUMK(umk, uek);
          }

          // 8. Verify with Server and commit account + UMK envelope + default vault
          const result = await apiClient.passkeyRegisterVerify({
            username: cleanUsername,
            response: regResponse,
            wrappedUmkByPrf,
            wrappedUmkByRecovery,
            recoverySalt,
            initialVault: {
              name: 'Main Vault',
              salt: defaultVaultSalt,
              wrappedVmk,
            },
          });

          // 9. Show 12-Word Recovery Screen
          setGeneratedMnemonic(mnemonic);
          setPendingRegResult(result);
          setPendingRegUmk(umk);
        } else {
          // --- Passkey Login ---
          const options = await apiClient.passkeyLoginOptions(cleanUsername || undefined);

          // Inject PRF extension evaluation
          (options as any).extensions = {
            prf: {
              eval: {
                first: WEBAUTHN_PRF_SALT,
              },
            },
          };

          const authResponse = await startAuthentication({ optionsJSON: options });
          const result = await apiClient.passkeyLoginVerify({
            response: authResponse,
            username: cleanUsername || undefined,
            rememberMe,
          });

          const prfFirst = (authResponse as any).clientExtensionResults?.prf?.results?.first;

          if (prfFirst && prfFirst instanceof ArrayBuffer && result.userCryptoKeys.wrappedUmkByPrf) {
            // Hardware PRF supported & UMK envelope present: Instant Auto-Unlock!
            const uek = await UserMasterKeyService.deriveUEKFromPrf(
              new Uint8Array(prfFirst),
              result.userCryptoKeys.recoverySalt
            );
            const umk = await UserMasterKeyService.unwrapUMK(result.userCryptoKeys.wrappedUmkByPrf, uek);

            await unlockAllVaultsWithUmk(umk, result.vaults);
            setToken(result.accessToken);
            setUsername(result.user.username);
            setRole(result.user.role);
          } else {
            // Non-PRF device or new browser: Prompt for 12-Word Recovery Phrase
            setPendingLoginResult(result);
            setPendingPrfEntropy(prfFirst && prfFirst instanceof ArrayBuffer ? new Uint8Array(prfFirst) : null);
            setNeedsRecoveryFallback(true);
          }
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Passkey operation failed');
      } finally {
        setLoading(false);
      }
    },
    [
      isRegisterMode,
      usernameInput,
      rememberMe,
      apiClient,
      cryptoService,
      clearSecurityAlert,
      t,
      unlockAllVaultsWithUmk,
      setToken,
      setUsername,
      setRole,
    ]
  );

  const handleRecoveryFallbackSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!pendingLoginResult) return;

      const normalized = MnemonicService.normalizeMnemonic(recoveryInput);
      const words = normalized.split(/\s+/).filter(Boolean);
      if (words.length !== 12) {
        setErrorMsg('Please enter a valid 12-word recovery phrase');
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        // Derive REK from user-entered 12-word mnemonic
        const rek = await UserMasterKeyService.deriveREKFromMnemonic(
          normalized,
          pendingLoginResult.userCryptoKeys.recoverySalt
        );
        const umk = await UserMasterKeyService.unwrapUMK(
          pendingLoginResult.userCryptoKeys.wrappedUmkByRecovery,
          rek
        );

        // If this device supports PRF, re-wrap and bind UMK so subsequent logins auto-unlock!
        if (pendingPrfEntropy) {
          try {
            const uek = await UserMasterKeyService.deriveUEKFromPrf(
              pendingPrfEntropy,
              pendingLoginResult.userCryptoKeys.recoverySalt
            );
            const newWrappedUmk = await UserMasterKeyService.wrapUMK(umk, uek);
            await apiClient.updateWrappedUmk(newWrappedUmk);
          } catch (bindErr) {
            console.warn('Failed to bind PRF to new device', bindErr);
          }
        }

        // Auto-unlock all user vaults and enter workspace
        await unlockAllVaultsWithUmk(umk, pendingLoginResult.vaults);
        setToken(pendingLoginResult.accessToken);
        setUsername(pendingLoginResult.user.username);
        setRole(pendingLoginResult.user.role);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Invalid recovery phrase. Unable to decrypt vault root key.');
      } finally {
        setLoading(false);
      }
    },
    [
      pendingLoginResult,
      recoveryInput,
      pendingPrfEntropy,
      apiClient,
      unlockAllVaultsWithUmk,
      setToken,
      setUsername,
      setRole,
    ]
  );

  return {
    isRegisterMode,
    isTransitioning,
    isFormFocused,
    setIsFormFocused,
    switchMode,
    usernameInput,
    setUsernameInput,
    rememberMe,
    setRememberMe,
    generatedMnemonic,
    copiedMnemonic,
    copyMnemonicToClipboard,
    handleConfirmMnemonicSaved,
    needsRecoveryFallback,
    recoveryInput,
    setRecoveryInput,
    handleRecoveryFallbackSubmit,
    loading,
    errorMsg,
    setErrorMsg,
    securityAlert,
    handlePasskeyAuthSubmit,
  };
}
