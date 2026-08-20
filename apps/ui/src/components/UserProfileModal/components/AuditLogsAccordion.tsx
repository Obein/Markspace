import React, { useState } from 'react';
import { FileText, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useI18n } from '../../../i18n/i18nContext';
import { AuditLogResponse } from '../../../interfaces/IApiClient';

export const AuditLogsAccordion: React.FC = () => {
  const { apiClient } = useApp();
  const { language, t } = useI18n();

  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

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
        return 'bg-primaryColor-500/20 text-primaryColor-300 border-primaryColor-500/30';
      case 'TOTP_DISABLE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-primaryColor-500/20 text-primaryColor-300 border-primaryColor-500/30';
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-3 mb-6">
      <button
        onClick={handleToggleAuditLogs}
        className="w-full flex items-center justify-between text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primaryColor-600 dark:text-primaryColor-400" />
          <div className="text-left">
            <span className="block font-semibold text-zinc-800 dark:text-zinc-200">
              {t('securityAudit')}
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono block">
              {t('auditLogLimitNotice') || 'Auto-pruned to latest 100 entries'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
          {showAuditLogs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {showAuditLogs && (
        <div className="pt-2 space-y-2 border-t border-black/10 dark:border-white/10">
          {loadingLogs ? (
            <div className="p-4 text-center text-zinc-500 dark:text-zinc-400 text-xs font-mono flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primaryColor-500" />
              <span>Loading audit logs...</span>
            </div>
          ) : logsError ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-300 text-xs rounded-xl">
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
                  className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 text-[11px] font-mono space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${getActionBadgeColor(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                    <span className="text-zinc-500 text-[10px]">{formatTimestamp(log.timestamp)}</span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 text-[10px] pt-1">
                    <span>
                      {t('authMethod')}:{' '}
                      <strong className="text-zinc-900 dark:text-zinc-200">{log.authMethod}</strong>
                    </span>
                    <span
                      className={`font-semibold ${
                        log.status === 'SUCCESS'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>

                  <div className="text-zinc-600 dark:text-zinc-400 text-[10px]">
                    <span>
                      IP: <strong className="text-zinc-800 dark:text-zinc-300">{log.ipAddress}</strong>
                    </span>
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
  );
};
