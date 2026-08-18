import { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';

export interface UseAuthModalFormReturn {
  // Mode & Step
  isRegisterMode: boolean;
  loginStep: 1 | 2;
  setLoginStep: (step: 1 | 2) => void;
  isTransitioning: boolean;
  isFormFocused: boolean;
  setIsFormFocused: (focused: boolean) => void;
  switchMode: (toRegister: boolean) => void;

  // Form Fields
  usernameInput: string;
  setUsernameInput: (val: string) => void;
  accountPassword: string;
  setAccountPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (val: boolean) => void;
  totpCode: string;
  setTotpCode: (val: string) => void;
  isTotpEnabledForUser: boolean;
  loginMethod: 'totp' | 'password';
  setLoginMethod: (method: 'totp' | 'password') => void;

  // Status & Feedback
  loading: boolean;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  securityAlert: string | null;

  // Actions
  handleStep1Submit: (e: React.FormEvent) => Promise<void>;
  handleLoginSubmit: (e: React.FormEvent) => Promise<void>;
  handleRegisterSubmit: (e: React.FormEvent) => Promise<void>;
}

/**
 * Custom hook encapsulating state machine, prelogin validation,
 * cryptographic key derivation, and authentication flows for AuthModal.
 */
export function useAuthModalForm(): UseAuthModalFormReturn {
  const {
    apiClient,
    cryptoService,
    setToken,
    setUsername,
    setRole,
    securityAlert,
    clearSecurityAlert,
  } = useApp();
  const { t } = useI18n();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [usernameInput, setUsernameInput] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [isTotpEnabledForUser, setIsTotpEnabledForUser] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'totp' | 'password'>('password');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Camera lens blur & scale transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFormFocused, setIsFormFocused] = useState(false);

  // Step 1: Username prelogin check for both Login and Register
  const handleStep1Submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = usernameInput.trim();
    if (!cleanUsername) {
      setErrorMsg(t('chooseUsername'));
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      clearSecurityAlert();

      const prelogin = await apiClient.prelogin(cleanUsername);

      if (isRegisterMode) {
        // Register Mode: Verify username uniqueness
        if (prelogin.exists) {
          setErrorMsg(t('usernameTaken'));
          return;
        }
        setLoginStep(2);
      } else {
        // Login Mode: Check user existence
        if (!prelogin.exists) {
          setErrorMsg(t('userNotFound'));
          return;
        }

        setIsTotpEnabledForUser(prelogin.isTotpEnabled);
        if (prelogin.isTotpEnabled) {
          setLoginMethod('totp');
        } else {
          setLoginMethod('password');
        }
        setLoginStep(2);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }, [usernameInput, isRegisterMode, apiClient, clearSecurityAlert, t]);

  // Step 2 Login Submit
  const handleLoginSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg(null);

      let res;
      if (loginMethod === 'totp') {
        if (!totpCode || totpCode.trim().length !== 6) {
          setErrorMsg(t('enterTotpCode'));
          return;
        }
        res = await apiClient.loginPasswordlessTotp(usernameInput.trim(), totpCode.trim());
      } else {
        if (!accountPassword) {
          setErrorMsg(t('enterPassword'));
          return;
        }
        const authToken = await cryptoService.deriveAuthToken(
          accountPassword,
          'markspace-account-auth-salt'
        );
        res = await apiClient.login(
          usernameInput.trim(),
          authToken,
          isTotpEnabledForUser ? totpCode.trim() : undefined
        );
      }

      setToken(res.accessToken || res.token || '');
      setUsername(res.user.username);
      setRole(res.user.role);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }, [loginMethod, totpCode, accountPassword, cryptoService, apiClient, usernameInput, isTotpEnabledForUser, setToken, setUsername, setRole, t]);

  // Step 2 Register Submit
  const handleRegisterSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountPassword) {
      setErrorMsg(t('enterPassword'));
      return;
    }
    if (accountPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      clearSecurityAlert();

      const authToken = await cryptoService.deriveAuthToken(
        accountPassword,
        'markspace-account-auth-salt'
      );
      const res = await apiClient.register(usernameInput.trim(), authToken);
      setToken(res.accessToken || res.token || '');
      setUsername(res.user.username);
      setRole(res.user.role);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }, [accountPassword, confirmPassword, clearSecurityAlert, cryptoService, apiClient, usernameInput, setToken, setUsername, setRole, t]);

  // Camera lens zoom-blur mode switch transition
  const switchMode = useCallback((toRegister: boolean) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    setTimeout(() => {
      setIsRegisterMode(toRegister);
      setLoginStep(1);
      setErrorMsg(null);
      setAccountPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setTotpCode('');

      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 180);
  }, [isTransitioning]);

  return {
    isRegisterMode,
    loginStep,
    setLoginStep,
    isTransitioning,
    isFormFocused,
    setIsFormFocused,
    switchMode,
    usernameInput,
    setUsernameInput,
    accountPassword,
    setAccountPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    totpCode,
    setTotpCode,
    isTotpEnabledForUser,
    loginMethod,
    setLoginMethod,
    loading,
    errorMsg,
    setErrorMsg,
    securityAlert,
    handleStep1Submit,
    handleLoginSubmit,
    handleRegisterSubmit,
  };
}
