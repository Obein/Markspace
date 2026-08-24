import React, { useState } from 'react';
import { X, ShieldCheck, LogOut, Copy, Check, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { TotpSetupSection } from './TotpSetupSection';
import { PasskeySection } from './PasskeySection';
import { GeneralSettingsSection } from './components/GeneralSettingsSection';
import { ActiveSessionsSection } from './components/ActiveSessionsSection';
import { AuditLogsAccordion } from './components/AuditLogsAccordion';
import { UserProfileModalProps } from './UserProfileModal.types';

/**
 * UserProfileModal
 * User profile shell orchestrating user identity info, hardware passkeys,
 * active multi-sessions, TOTP 2FA, theme/language preferences, and security audit logs.
 */
export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  autoLockEnabled = true,
  onToggleAutoLock,
  autoLockMinutes = 15,
  onChangeAutoLockMinutes,
  autoLockAction = 'lock',
  onChangeAutoLockAction,
  accentColor = 'blue',
  onSelectAccentColor,
  customHex = '#3b82f6',
  onSelectCustomHex,
}) => {
  const { userId, username, role, logoutAccount } = useApp();
  const { t } = useI18n();
  const [copiedUuid, setCopiedUuid] = useState(false);

  if (!isOpen) return null;

  const copyUuid = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-black/80 backdrop-blur-lg cursor-pointer"
    >
      <div className="w-full max-w-lg p-6 sm:p-8 glass-panel rounded-glass-lg border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto cursor-default">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Centered Modal Title */}
        <div className="text-center pb-3 border-b border-black/10 dark:border-white/10 mb-5">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-wide">
            {t('userProfile')}
          </h2>
        </div>

        {/* User Info Header */}
        <div className="mb-5 pb-4 border-b border-black/10 dark:border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {username || 'Anonymous'}
              </h3>
              {role === 'admin' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primaryColor-500/15 text-primaryColor-700 dark:text-primaryColor-300 border border-black/10 dark:border-white/15 backdrop-blur-md flex items-center gap-1 shadow-sm">
                  <span>SYSTEM ADMIN</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-black/10 dark:border-white/15 backdrop-blur-md">
                  STANDARD USER
                </span>
              )}
            </div>
          </div>

          {/* User UUID Bar */}
          {userId && (
            <div className="flex items-center justify-between text-[11px] font-mono bg-black/5 dark:bg-black/40 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 text-zinc-600 dark:text-zinc-400">
              <span className="truncate max-w-[320px]">UUID: {userId}</span>
              <button
                type="button"
                onClick={copyUuid}
                className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition cursor-pointer flex items-center gap-1 shrink-0 ml-2"
                title="Copy User UUID"
              >
                {copiedUuid ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="text-[10px]">{copiedUuid ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Idle Account Lifecycle Destruction Policy Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-mono flex items-start gap-2.5 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-left">
            <span className="font-medium text-amber-900 dark:text-amber-300/90 block leading-relaxed text-[11px]">
              {t('idleAccountNotice')}
            </span>
          </div>
        </div>

        {/* Passkey Hardware Authentication Management */}
        <PasskeySection username={username} userId={userId} />

        {/* TOTP Multi-Factor Authentication Management */}
        <div className="mb-4">
          <TotpSetupSection />
        </div>

        {/* Active Multi-Session & Device Management */}
        <div className="mb-4 p-4 rounded-2xl bg-black/[0.03] dark:bg-white/5 border border-black/10 dark:border-white/10">
          <ActiveSessionsSection />
        </div>

        {/* General Settings: AutoLock, Theme Accent Color, Language */}
        <GeneralSettingsSection
          autoLockEnabled={autoLockEnabled}
          onToggleAutoLock={onToggleAutoLock}
          autoLockMinutes={autoLockMinutes}
          onChangeAutoLockMinutes={onChangeAutoLockMinutes}
          autoLockAction={autoLockAction}
          onChangeAutoLockAction={onChangeAutoLockAction}
          accentColor={accentColor}
          onSelectAccentColor={onSelectAccentColor}
          customHex={customHex}
          onSelectCustomHex={onSelectCustomHex}
        />

        {/* Security Audit Logs */}
        <AuditLogsAccordion />

        {/* Account Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/10 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-primaryColor-600 dark:text-primaryColor-400" />
            <span>{t('zeroTrustActive')}</span>
          </div>

          <button
            onClick={() => {
              logoutAccount();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition cursor-pointer font-medium text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
