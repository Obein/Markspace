import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Sparkles,
  QrCode,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';

export const TotpSetupSection: React.FC = () => {
  const { apiClient } = useApp();
  const { t } = useI18n();

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

  const handleCopySecret = () => {
    if (!setupSecret) return;
    navigator.clipboard.writeText(setupSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.trim().length !== 6) {
      setErrorMsg(t('enterTotpCode'));
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await apiClient.enableTotp(verifyCode.trim(), setupSecret);
      setIsTotpEnabled(true);
      setIsSettingUp(false);
      setSuccessMsg(t('totpActivatedSuccess'));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode || disableCode.trim().length !== 6) {
      setErrorMsg(t('enterDisableCode'));
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await apiClient.disableTotp(disableCode.trim());
      setIsTotpEnabled(false);
      setIsDisabling(false);
      setDisableCode('');
      setSuccessMsg(t('totpDisabledSuccess'));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to disable TOTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
      {/* Header Info */}
      <div className="flex items-start gap-3">
        <div
          className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
            isTotpEnabled
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
          }`}
        >
          {isTotpEnabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white">
              {t('twoFactorAuth')}
            </h4>
            {isTotpEnabled && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                {t('totpEnabled')}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
            {isTotpEnabled ? t('totpEnabledDesc') : t('totpDisabledDesc')}
          </p>
        </div>
      </div>

      {/* Standalone Full-Row Action Button */}
      {!isSettingUp && !isDisabling && (
        <div>
          {isTotpEnabled ? (
            <button
              type="button"
              onClick={() => setIsDisabling(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-mono transition cursor-pointer flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{t('disableTotp')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartSetup}
              className="w-full py-2.5 px-4 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-xs font-semibold shadow-lg shadow-primaryColor-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('enableTotp')}</span>
            </button>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
          {successMsg}
        </div>
      )}

      {/* Setup Form with QR Code & Secret Key */}
      {isSettingUp && (
        <div className="p-4 rounded-xl bg-black/40 border border-primaryColor-500/30 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-primaryColor-400" />
              <span>1. {t('scanQrCodeOrSecret')}</span>
            </span>
            <span className="flex items-center gap-1 text-amber-300 text-[11px]">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{t('rotatesIn')} {secondsRemaining}s</span>
            </span>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-black/50 border border-white/10 rounded-2xl">
            {qrCodeDataUrl ? (
              <div className="p-2.5 bg-white rounded-xl shadow-lg">
                <img
                  src={qrCodeDataUrl}
                  alt="TOTP Setup QR Code"
                  className="w-40 h-40 object-contain block"
                />
              </div>
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-zinc-500 text-xs font-mono">
                <Loader2 className="w-6 h-6 animate-spin text-primaryColor-400" />
              </div>
            )}
            <p className="text-[11px] text-zinc-400 mt-2 font-mono text-center">
              Google Authenticator / 1Password / Authy
            </p>
          </div>

          {/* Manual Secret Key Copy Box */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-400 font-mono block">
              {t('totpSecretKey')}:
            </label>
            <div className="p-2.5 rounded-xl bg-primaryColor-950/40 border border-primaryColor-500/30 flex items-center justify-between gap-2">
              <div className="font-mono text-xs text-primaryColor-300 tracking-wider select-all break-all pr-2">
                {setupSecret}
              </div>
              <button
                type="button"
                onClick={handleCopySecret}
                className="px-2.5 py-1 rounded-lg bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-[11px] font-mono flex items-center gap-1 shrink-0 transition cursor-pointer shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('copied') : t('copy')}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleEnableSubmit} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                2. {t('enterTotpCode')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primaryColor-500 text-base font-mono tracking-widest text-center"
                required
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingUp(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-xs font-semibold shadow-lg shadow-primaryColor-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : t('confirmAndEnable')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Disabling Form */}
      {isDisabling && (
        <form
          onSubmit={handleDisableSubmit}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2 text-red-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>{t('confirmDisableTotp')}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              {t('enterDisableCode')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-2 rounded-xl bg-black/50 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 text-sm font-mono tracking-widest text-center"
              required
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDisabling(false)}
              className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs transition cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-white mx-auto" /> : t('disableTotp')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
