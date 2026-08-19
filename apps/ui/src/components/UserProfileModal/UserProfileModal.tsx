import React, { useState } from 'react';
import { X, ShieldCheck, LogOut, Globe, Palette, FileText, Loader2, ChevronRight, ChevronDown, Lock, Copy, Check, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ACCENT_COLOR_OPTIONS } from '../../hooks/useTheme';
import { LANGUAGE_OPTIONS, Language, useI18n } from '../../i18n/i18nContext';
import { AuditLogResponse } from '../../interfaces/IApiClient';
import { TotpSetupSection } from './TotpSetupSection';
import { UserProfileModalProps } from './UserProfileModal.types';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  autoLockEnabled = true,
  onToggleAutoLock,
  autoLockMinutes = 15,
  onChangeAutoLockMinutes,
  accentColor = 'blue',
  onSelectAccentColor,
  customHex = '#3b82f6',
  onSelectCustomHex,
}) => {
  const { userId, username, role, logoutAccount, apiClient } = useApp();
  const { language, setLanguage, t } = useI18n();

  const [isThemeColorOpen, setIsThemeColorOpen] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

  if (!isOpen) return null;

  const copyUuid = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  const handleToggleAuditLogs = async () => {
    const nextState = !showAuditLogs;
    setShowAuditLogs(nextState);

    if (nextState && auditLogs.length === 0) {
      try {
        setLoadingLogs(true);
        setLogsError(null);
        const logs = await apiClient.getAuditLogs();
        setAuditLogs(logs);
      } catch (err: unknown) {
        setLogsError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
      } finally {
        setLoadingLogs(false);
      }
    }
  };

  const formatTimestamp = (ms: number): string => {
    return new Date(ms).toLocaleString(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'AUTH_LOGIN':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'AUTH_PASSWORDLESS_TOTP':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'AUTH_REGISTER':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'AUTH_LOGOUT':
        return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
      case 'SECURITY_NONCE_VIOLATION':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'VAULT_OPRF_EVAL':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'TOTP_ENABLE':
      case 'TOTP_SETUP':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'TOTP_DISABLE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg cursor-pointer"
    >
      <div className="w-full max-w-lg p-6 sm:p-8 glass-panel rounded-glass-lg border border-white/10 text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto cursor-default">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Centered Modal Title */}
        <div className="text-center pb-3 border-b border-white/10 mb-5">
          <h2 className="text-base font-bold text-white tracking-wide">
            {t('userProfile')}
          </h2>
        </div>

        {/* User Info Header */}
        <div className="mb-5 pb-4 border-b border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-white">{username || 'Anonymous'}</h3>
              {role === 'admin' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  <span>SYSTEM ADMIN</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-zinc-400 border border-white/10">
                  STANDARD USER
                </span>
              )}
            </div>
          </div>

          {/* User UUID Bar */}
          {userId && (
            <div className="flex items-center justify-between text-[11px] font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 text-zinc-400">
              <span className="truncate max-w-[320px]">UUID: {userId}</span>
              <button
                type="button"
                onClick={copyUuid}
                className="text-zinc-400 hover:text-white transition cursor-pointer flex items-center gap-1 shrink-0 ml-2"
                title="Copy User UUID"
              >
                {copiedUuid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{copiedUuid ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Idle Account Lifecycle Destruction Policy Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-mono flex items-start gap-2.5 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-left">
            <span className="font-medium text-amber-300/90 block leading-relaxed text-[11px]">
              {t('idleAccountNotice')}
            </span>
          </div>
        </div>

        {/* TOTP Multi-Factor Authentication Management */}
        <div className="mb-4">
          <TotpSetupSection />
        </div>

        {/* Vault Auto-Lock Idle Settings */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">{t('autoLockVault')}</span>
                <span className="text-[10px] text-zinc-400 block">{t('autoLockDesc')}</span>
              </div>
            </div>
            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoLockEnabled}
                onChange={(e) => onToggleAutoLock && onToggleAutoLock(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {autoLockEnabled && (
            <div className="pt-2 border-t border-white/10 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300">{t('autoLockTimeout')}</span>
                <span className="text-blue-400 font-bold">
                  {autoLockMinutes} {t('minutes')}
                </span>
              </div>

              {/* Quick Preset Buttons (5m, 15m, 30m, 60m) */}
              <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                {[5, 15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onChangeAutoLockMinutes && onChangeAutoLockMinutes(mins)}
                    className={`py-1 rounded-lg border transition text-[11px] cursor-pointer ${
                      autoLockMinutes === mins
                        ? 'bg-blue-600 text-white font-bold border-blue-500 shadow-sm'
                        : 'bg-black/30 hover:bg-white/10 text-zinc-400 hover:text-white border-white/10'
                    }`}
                  >
                    {mins} {t('minutes')}
                  </button>
                ))}
              </div>

              {/* Slider for Custom 1 - 60 Min Range */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[10px] text-zinc-500 font-mono">1m</span>
                <input
                  type="range"
                  min={1}
                  max={60}
                  step={1}
                  value={autoLockMinutes}
                  onChange={(e) =>
                    onChangeAutoLockMinutes &&
                    onChangeAutoLockMinutes(parseInt(e.target.value, 10))
                  }
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-[10px] text-zinc-500 font-mono">60m</span>
              </div>
            </div>
          )}
        </div>

        {/* Theme Accent Color Selection Section (Collapsible Accordion - Closed by default) */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4 transition-all">
          <button
            type="button"
            onClick={() => setIsThemeColorOpen(!isThemeColorOpen)}
            className="w-full flex items-center justify-between text-xs font-medium text-zinc-200 hover:text-white transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Palette className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>{t('themeColor')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                style={{
                  backgroundColor:
                    accentColor === 'custom'
                      ? customHex
                      : ACCENT_COLOR_OPTIONS.find((c) => c.id === accentColor)?.hex || '#3b82f6',
                }}
              />
              <span className="text-[10px] text-zinc-400 font-mono font-semibold">
                {accentColor === 'custom'
                  ? t('customColor') || 'Custom'
                  : t(ACCENT_COLOR_OPTIONS.find((c) => c.id === accentColor)?.labelKey as any) ||
                    ACCENT_COLOR_OPTIONS.find((c) => c.id === accentColor)?.name}
              </span>
              {isThemeColorOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </div>
          </button>

          {isThemeColorOpen && (
            <div className="pt-3.5 mt-3 border-t border-white/10 space-y-3.5 animate-in fade-in duration-150">
              {/* Presets Grid */}
              <div>
                <span className="text-[11px] font-mono text-zinc-400 block mb-2">{t('presetColors')}</span>
                <div className="grid grid-cols-6 gap-2">
                  {ACCENT_COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectAccentColor && onSelectAccentColor(opt.id)}
                      className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer group ${
                        accentColor === opt.id
                          ? 'border-white/50 bg-white/15 shadow-md scale-105'
                          : 'border-white/5 bg-black/20 hover:bg-white/10 hover:border-white/20'
                      }`}
                      title={t(opt.labelKey as any) || opt.name}
                    >
                      <div
                        className="w-6 h-6 rounded-full shadow-md flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: opt.hex }}
                      >
                        {accentColor === opt.id && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Color Palette Picker */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <input
                      type="color"
                      value={customHex}
                      onChange={(e) => onSelectCustomHex && onSelectCustomHex(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      id="customColorInput"
                    />
                    <label
                      htmlFor="customColorInput"
                      className={`w-7 h-7 rounded-full border border-white/20 shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${
                        accentColor === 'custom' ? 'ring-2 ring-white/50' : ''
                      }`}
                      style={{ backgroundColor: customHex }}
                    >
                      {accentColor === 'custom' && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                    </label>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">{t('customPalette')}</span>
                    <span className="text-[10px] text-zinc-400 font-mono block">{customHex.toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customHex}
                    maxLength={7}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        if (onSelectCustomHex) {
                          onSelectCustomHex(val);
                        }
                      }
                    }}
                    className="w-20 px-2 py-1 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono text-white text-center uppercase focus:outline-none focus:border-[var(--accent-primary)]"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Language Selection Section */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>{t('language')}</span>
            </div>
            <span className="text-[10px] text-blue-400 font-mono font-semibold">
              {LANGUAGE_OPTIONS.find((l) => l.code === language)?.flag} {LANGUAGE_OPTIONS.find((l) => l.code === language)?.label}
            </span>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50 transition cursor-pointer"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code} className="bg-zinc-900 text-white">
                {opt.flag} {opt.label} ({opt.code})
              </option>
            ))}
          </select>
        </div>

        {/* Security Audit Logs Entrance */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 mb-6">
          <button
            onClick={handleToggleAuditLogs}
            className="w-full flex items-center justify-between text-xs font-medium text-zinc-200 hover:text-white transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <div className="text-left">
                <span className="block">{t('securityAudit')}</span>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  {t('auditLogLimitNotice') || 'Auto-pruned to latest 100 entries'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
              {showAuditLogs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </button>

          {showAuditLogs && (
            <div className="pt-2 space-y-2 border-t border-white/10">
              {loadingLogs ? (
                <div className="p-4 text-center text-zinc-400 text-xs font-mono flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Loading audit logs...</span>
                </div>
              ) : logsError ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl">
                  {logsError}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 text-xs font-mono">
                  {t('noAuditLogs')}
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-zinc-500 text-[10px]">{formatTimestamp(log.timestamp)}</span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300 text-[10px] pt-1">
                        <span>{t('authMethod')}: <strong className="text-zinc-200">{log.authMethod}</strong></span>
                        <span className={`font-semibold ${log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {log.status}
                        </span>
                      </div>

                      <div className="text-zinc-400 text-[10px]">
                        <span>IP: <strong className="text-zinc-300">{log.ipAddress}</strong></span>
                        {log.details && (
                          <p className="text-zinc-500 text-[9px] truncate mt-0.5">{log.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Zero-Knowledge Account</span>
          </div>
          <button
            onClick={() => {
              onClose();
              logoutAccount();
            }}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('logoutAccount')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
