import React, { useState } from 'react';
import { X, ShieldCheck, LogOut, Globe, FileText, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGE_OPTIONS, Language, useI18n } from '../i18n/i18nContext';
import { AuditLogResponse } from '../interfaces/IApiClient';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { username, role, logoutAccount, apiClient } = useApp();
  const { language, setLanguage, t } = useI18n();

  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleAuditLogs = async () => {
    const nextState = !showAuditLogs;
    setShowAuditLogs(nextState);

    if (nextState && auditLogs.length === 0) {
      try {
        setLoadingLogs(true);
        setLogsError(null);
        const logs = await apiClient.getAuditLogs();
        setAuditLogs(logs);
      } catch (err: any) {
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
      case 'AUTH_REGISTER':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'AUTH_LOGOUT':
        return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
      <div className="w-full max-w-lg p-8 glass-panel rounded-glass-lg border border-white/10 text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User Header */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white text-xl shadow-lg border border-white/10">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{username || 'Anonymous'}</h2>
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
            <p className="text-xs text-zinc-400 mt-0.5">{t('userProfile')}</p>
          </div>
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
              <span>{t('securityAudit')}</span>
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
