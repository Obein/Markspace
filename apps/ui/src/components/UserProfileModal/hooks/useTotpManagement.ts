import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../../context/AppContext';

export interface UseTotpManagementReturn {
  isTotpEnabled: boolean;
  isSettingUp: boolean;
  setIsSettingUp: (val: boolean) => void;
  setupSecret: string;
  qrCodeDataUrl: string;
  secondsRemaining: number;
  verifyCode: string;
  setVerifyCode: (val: string) => void;
  copied: boolean;
  loading: boolean;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  successMsg: string | null;
  setSuccessMsg: (msg: string | null) => void;
  isDisabling: boolean;
  setIsDisabling: (val: boolean) => void;
  disableCode: string;
  setDisableCode: (val: string) => void;
  fetchStatus: () => Promise<void>;
  copySecret: () => void;
  handleStartSetup: () => void;
  handleCancelSetup: () => void;
  handleVerifyAndEnable: (e: React.FormEvent) => Promise<void>;
  handleDisableTotp: (e: React.FormEvent) => Promise<void>;
}

export function useTotpManagement(): UseTotpManagementReturn {
  const { apiClient } = useApp();

  const [isTotpEnabled, setIsTotpEnabled] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState(25);
  const [verifyCode, setVerifyCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Disable modal state
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const username = localStorage.getItem('markspace_username');
      if (username) {
        const prelogin = await apiClient.prelogin(username);
        setIsTotpEnabled(prelogin.isTotpEnabled);
      }
    } catch (_) {}
  }, [apiClient]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const loadNewSetupSession = useCallback(async () => {
    try {
      setErrorMsg(null);
      const res = await apiClient.setupTotp();
      setSetupSecret(res.secret);
      setSecondsRemaining(25);

      if (res.otpauthUri) {
        try {
          const url = await QRCode.toDataURL(res.otpauthUri, {
            margin: 1,
            width: 190,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          setQrCodeDataUrl(url);
        } catch (qrErr) {
          console.error('Failed to render QR Code', qrErr);
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to initialize TOTP session');
    }
  }, [apiClient]);

  // 25-second auto-rotation countdown timer during setup
  useEffect(() => {
    if (!isSettingUp) return;

    loadNewSetupSession();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          loadNewSetupSession();
          return 25;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSettingUp, loadNewSetupSession]);

  const handleStartSetup = () => {
    setIsSettingUp(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setVerifyCode('');
  };

  const handleCancelSetup = () => {
    setIsSettingUp(false);
    setErrorMsg(null);
    setVerifyCode('');
    setSetupSecret('');
    setQrCodeDataUrl('');
  };

  const copySecret = () => {
    navigator.clipboard.writeText(setupSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit TOTP verification code');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await apiClient.enableTotp(setupSecret, verifyCode.trim());
      setSuccessMsg('Two-Factor Authentication (TOTP) successfully activated!');
      setIsSettingUp(false);
      setIsTotpEnabled(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to verify TOTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode || disableCode.trim().length !== 6) {
      setErrorMsg('Please enter your current 6-digit TOTP code to disable');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await apiClient.disableTotp(disableCode.trim());
      setSuccessMsg('TOTP 2FA disabled successfully.');
      setIsDisabling(false);
      setIsTotpEnabled(false);
      setDisableCode('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to disable TOTP');
    } finally {
      setLoading(false);
    }
  };

  return {
    isTotpEnabled,
    isSettingUp,
    setIsSettingUp,
    setupSecret,
    qrCodeDataUrl,
    secondsRemaining,
    verifyCode,
    setVerifyCode,
    copied,
    loading,
    errorMsg,
    setErrorMsg,
    successMsg,
    setSuccessMsg,
    isDisabling,
    setIsDisabling,
    disableCode,
    setDisableCode,
    fetchStatus,
    copySecret,
    handleStartSetup,
    handleCancelSetup,
    handleVerifyAndEnable,
    handleDisableTotp,
  };
}
