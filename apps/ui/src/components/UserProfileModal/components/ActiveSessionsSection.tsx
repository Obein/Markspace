import React, { useEffect, useState, useCallback } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Clock,
  MapPin,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useI18n } from '../../../i18n/i18nContext';
import { ActiveSession } from '../../../interfaces/IApiClient';

export const ActiveSessionsSection: React.FC = () => {
  const { apiClient } = useApp();
  const { t } = useI18n();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [terminatingOthers, setTerminatingOthers] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const list = await apiClient.getSessions();
      setSessions(list || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setTerminatingId(sessionId);
      setErrorMsg(null);
      await apiClient.revokeSession(sessionId);
      setSuccessMsg(t('sessionTerminated') || 'Session terminated successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchSessions();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to terminate session');
    } finally {
      setTerminatingId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      setTerminatingOthers(true);
      setErrorMsg(null);
      await apiClient.revokeOtherSessions();
      setSuccessMsg(t('otherSessionsTerminated') || 'All other sessions terminated successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
      setConfirmRevokeOthers(false);
      await fetchSessions();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to terminate other sessions');
    } finally {
      setTerminatingOthers(false);
    }
  };

  const getDeviceIcon = (userAgent?: string, deviceName?: string) => {
    const text = `${deviceName || ''} ${userAgent || ''}`.toLowerCase();
    if (text.includes('iphone') || text.includes('android') || text.includes('mobile')) {
      return <Smartphone className="w-4 h-4 text-primaryColor-500" />;
    }
    if (text.includes('ipad') || text.includes('tablet')) {
      return <Tablet className="w-4 h-4 text-primaryColor-500" />;
    }
    return <Laptop className="w-4 h-4 text-primaryColor-500" />;
  };

  const formatTimestamp = (ts?: number) => {
    if (!ts) return '-';
    const date = new Date(ts);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="space-y-4">
      {/* Header & Revoke Others Action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primaryColor-500" />
            <span>{t('activeSessions') || '活动会话与在线设备'}</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t('activeSessionsDesc') || '管理已登录 Markspace 账号的在线设备与会话凭证'}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSessions}
          disabled={loading}
          className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
          title={t('refresh') || 'Refresh'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-300 text-xs font-mono">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
          {successMsg}
        </div>
      )}

      {/* Terminate Other Sessions Action Card */}
      {otherSessionsCount > 0 && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-300">
              {`${t('foundOtherSessions')} (${otherSessionsCount})`}
            </span>
          </div>

          {confirmRevokeOthers ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleRevokeOtherSessions}
                disabled={terminatingOthers}
                className="flex-1 sm:flex-none px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                {terminatingOthers ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <LogOut className="w-3 h-3" />
                )}
                <span>{t('confirmRevokeOthers') || '确认下线其他所有设备'}</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmRevokeOthers(false)}
                className="px-2.5 py-1 rounded-lg border border-black/10 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
              >
                {t('cancel') || 'Cancel'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRevokeOthers(true)}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition shadow-sm cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <LogOut className="w-3 h-3" />
              <span>{t('revokeOtherSessions') || '终结其他所有会话'}</span>
            </button>
          )}
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-2.5">
        {loading && sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 font-mono flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primaryColor-500" />
            <span>{t('loadingSessions') || '加载在线会话列表...'}</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 font-mono">
            {t('noActiveSessions') || '暂无活跃会话记录'}
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                session.isCurrent
                  ? 'bg-primaryColor-500/5 border-primaryColor-500/30 dark:bg-primaryColor-500/10'
                  : 'bg-black/[0.02] dark:bg-white/5 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shrink-0 mt-0.5">
                    {getDeviceIcon(session.userAgent, session.deviceName)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {session.deviceName || session.userAgent || 'Unknown Device'}
                      </span>
                      {session.isCurrent && (
                        <span className="px-1.5 py-0.2 text-[10px] font-medium font-mono rounded bg-primaryColor-500/20 text-primaryColor-600 dark:text-primaryColor-400 border border-primaryColor-500/30 flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>{t('currentDevice') || '当前设备'}</span>
                        </span>
                      )}
                      <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-black/5 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border border-black/5 dark:border-white/5">
                        {session.isRememberMe ? (t('valid7Days') || '7 日免登') : (t('valid1Day') || '1 日时效')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono flex-wrap">
                      {session.ipAddress && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          <span>{session.ipAddress}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>{t('lastActive') || '活跃'}: {formatTimestamp(session.lastActiveAt)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={terminatingId === session.id}
                    className="px-2.5 py-1 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono transition shrink-0 cursor-pointer flex items-center gap-1"
                    title={t('terminateSession') || 'Terminate Session'}
                  >
                    {terminatingId === session.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <LogOut className="w-3 h-3" />
                    )}
                    <span>{t('terminate') || '下线'}</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
