import React from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { Card, Badge, Button } from '../common';
import { useTotpManagement } from './hooks/useTotpManagement';
import { TotpSetupWizard } from './components/TotpSetupWizard';
import { TotpDisableDialog } from './components/TotpDisableDialog';

/**
 * TotpSetupSection
 * Management card for RFC 6238 Time-based One-Time Passwords (TOTP 2FA).
 */
export const TotpSetupSection: React.FC = () => {
  const { t } = useI18n();

  const {
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
    successMsg,
    isDisabling,
    setIsDisabling,
    disableCode,
    setDisableCode,
    copySecret,
    handleStartSetup,
    handleVerifyAndEnable,
    handleDisableTotp,
  } = useTotpManagement();

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primaryColor-500/10 border border-primaryColor-500/20 text-primaryColor-600 dark:text-primaryColor-400 shrink-0">
          {isTotpEnabled ? (
            <ShieldCheck className="w-5 h-5" />
          ) : (
            <ShieldAlert className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
              {t('twoFactorAuth')}
            </h4>
            {isTotpEnabled && (
              <Badge variant="emerald" size="xs">
                {t('totpEnabled')}
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            {isTotpEnabled ? t('totpEnabledDesc') : t('totpDisabledDesc')}
          </p>
        </div>
      </div>

      {/* Standalone Full-Row Action Button */}
      {!isSettingUp && !isDisabling && (
        <div>
          {isTotpEnabled ? (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setIsDisabling(true)}
              className="text-red-600 dark:text-red-300 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 font-mono text-xs"
              icon={<AlertTriangle className="w-4 h-4" />}
            >
              {t('disableTotp')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              fullWidth
              size="md"
              onClick={handleStartSetup}
              icon={<Sparkles className="w-4 h-4" />}
            >
              {t('enableTotp')}
            </Button>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-300 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
          {successMsg}
        </div>
      )}

      {/* Setup Form with QR Code & Secret Key */}
      {isSettingUp && (
        <TotpSetupWizard
          setupSecret={setupSecret}
          qrCodeDataUrl={qrCodeDataUrl}
          secondsRemaining={secondsRemaining}
          verifyCode={verifyCode}
          setVerifyCode={setVerifyCode}
          copied={copied}
          loading={loading}
          onCopySecret={copySecret}
          onCancel={() => setIsSettingUp(false)}
          onSubmit={handleVerifyAndEnable}
        />
      )}

      {/* Disabling Form */}
      {isDisabling && (
        <TotpDisableDialog
          isOpen={isDisabling}
          onClose={() => setIsDisabling(false)}
          disableCode={disableCode}
          setDisableCode={setDisableCode}
          loading={loading}
          onConfirmDisable={handleDisableTotp}
        />
      )}
    </Card>
  );
};
