import React from 'react';
import { RefreshCw, QrCode, Copy, Check, Loader2 } from 'lucide-react';
import { useI18n } from '../../../i18n/i18nContext';
import { Button } from '../../common';

export interface TotpSetupWizardProps {
  setupSecret: string;
  qrCodeDataUrl: string;
  secondsRemaining: number;
  verifyCode: string;
  setVerifyCode: (code: string) => void;
  copied: boolean;
  loading: boolean;
  onCopySecret: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export const TotpSetupWizard: React.FC<TotpSetupWizardProps> = ({
  setupSecret,
  qrCodeDataUrl,
  secondsRemaining,
  verifyCode,
  setVerifyCode,
  copied,
  loading,
  onCopySecret,
  onCancel,
  onSubmit,
}) => {
  const { t } = useI18n();

  return (
    <div className="p-4 rounded-xl bg-black/[0.03] dark:bg-black/40 border border-primaryColor-500/30 space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-zinc-800 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-primaryColor-600 dark:text-primaryColor-400" />
          <span>1. {t('scanQrCodeOrSecret')}</span>
        </span>
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-300 text-[11px]">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>
            {t('rotatesIn')} {secondsRemaining}s
          </span>
        </span>
      </div>

      {/* QR Code Container */}
      <div className="flex flex-col items-center justify-center p-3.5 bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-2xl">
        {qrCodeDataUrl ? (
          <div className="p-2.5 bg-white rounded-xl shadow-lg border border-black/10">
            <img
              src={qrCodeDataUrl}
              alt="TOTP Setup QR Code"
              className="w-40 h-40 object-contain block"
            />
          </div>
        ) : (
          <div className="w-40 h-40 flex items-center justify-center text-zinc-500 text-xs font-mono">
            <Loader2 className="w-6 h-6 animate-spin text-primaryColor-500" />
          </div>
        )}
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-mono text-center">
          Google Authenticator / 1Password / Authy
        </p>
      </div>

      {/* Manual Secret Key Copy Box */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono block">
          {t('totpSecretKey')}:
        </label>
        <div className="p-2.5 rounded-xl bg-primaryColor-50 dark:bg-primaryColor-950/40 border border-primaryColor-500/30 flex items-center justify-between gap-2">
          <div className="font-mono text-xs text-primaryColor-700 dark:text-primaryColor-300 font-semibold tracking-wider select-all break-all pr-2">
            {setupSecret}
          </div>
          <button
            type="button"
            onClick={onCopySecret}
            className="px-2.5 py-1 rounded-lg bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-[11px] font-mono flex items-center gap-1 shrink-0 transition cursor-pointer shadow-sm"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? t('copied') : t('copy')}</span>
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 pt-2">
        <div>
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-300 mb-1">
            2. {t('enterTotpCode')}
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black/50 border border-black/20 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-primaryColor-500 text-base font-mono tracking-widest text-center"
            required
            autoFocus
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            size="md"
            onClick={onCancel}
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="md"
            loading={loading}
          >
            {t('confirmAndEnable')}
          </Button>
        </div>
      </form>
    </div>
  );
};
