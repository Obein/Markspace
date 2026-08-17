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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TotpSetupSection: React.FC = () => {
  const { apiClient } = useApp();

  const [isTotpEnabled, setIsTotpEnabled] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
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
      setOtpauthUri(res.otpauthUri);
      setSecondsRemaining(25);
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
      setErrorMsg('Please enter the 6-digit code from your authenticator app');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await apiClient.enableTotp(verifyCode.trim(), setupSecret);
      setIsTotpEnabled(true);
      setIsSettingUp(false);
      setSuccessMsg('Two-factor authentication (TOTP) successfully activated!');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode || disableCode.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit code to confirm disabling');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await apiClient.disableTotp(disableCode.trim());
      setIsTotpEnabled(false);
      setIsDisabling(false);
      setDisableCode('');
      setSuccessMsg('Two-factor authentication disabled.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to disable TOTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl border ${
              isTotpEnabled
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}
          >
            {isTotpEnabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Two-Factor Authentication (TOTP)</span>
              {isTotpEnabled && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  Enabled
                </span>
              )}
            </h4>
            <p className="text-xs text-zinc-400">
              {isTotpEnabled
                ? 'Your account is protected with TOTP and supports passwordless login'
                : 'Protect your account with Google Authenticator, 1Password or Authy'}
            </p>
          </div>
        </div>

        {!isSettingUp && !isDisabling && (
          <div>
            {isTotpEnabled ? (
              <button
                type="button"
                onClick={() => setIsDisabling(true)}
                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-mono transition cursor-pointer"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartSetup}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enable TOTP</span>
              </button>
            )}
          </div>
        )}
      </div>

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

      {/* Setup Form */}
      {isSettingUp && (
        <div className="p-4 rounded-xl bg-black/40 border border-blue-500/30 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-300 font-semibold">1. Enter Secret Key into Authenticator</span>
            <span className="flex items-center gap-1 text-amber-300 text-[11px]">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Rotates in {secondsRemaining}s</span>
            </span>
          </div>

          <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
            <div className="font-mono text-xs text-blue-300 tracking-wider select-all break-all pr-2">
              {setupSecret}
            </div>
            <button
              type="button"
              onClick={handleCopySecret}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-mono flex items-center gap-1 shrink-0 transition cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="text-[11px] text-zinc-400 leading-relaxed font-mono">
            Or open URL: <a href={otpauthUri} className="text-blue-400 underline break-all">{otpauthUri}</a>
          </div>

          <form onSubmit={handleEnableSubmit} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                2. Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-base font-mono tracking-widest text-center"
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Confirm & Enable'}
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
            <span>Confirm Disabling Two-Factor Authentication</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Enter 6-Digit Authenticator Code
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-white mx-auto" /> : 'Disable'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
