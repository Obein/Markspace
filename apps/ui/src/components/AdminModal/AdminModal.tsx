import React, { useEffect, useState, useCallback } from 'react';
import {
  Trash2,
  HardDrive,
  Clock,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Settings,
  Flame,
  X,
  Users,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { UserAdminSummary, UserRole } from '../../interfaces/IApiClient';
import { AdminModalProps } from './AdminModal.types';

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const { apiClient, username: currentUsername } = useApp();
  const { language, t } = useI18n();

  const [users, setUsers] = useState<UserAdminSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Policy edit state
  const [defaultQuotaMb, setDefaultQuotaMb] = useState<number>(10);
  const [idlePeriodDays, setIdlePeriodDays] = useState<number>(30);
  const [savingPolicies, setSavingPolicies] = useState(false);
  const [cleaningIdle, setCleaningIdle] = useState(false);

  // Quota modal / prompt state
  const [editingQuotaUser, setEditingQuotaUser] = useState<UserAdminSummary | null>(null);
  const [customQuotaInputMb, setCustomQuotaInputMb] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [usersList, config] = await Promise.all([
        apiClient.adminListUsers(),
        apiClient.adminGetSystemSettings(),
      ]);
      setUsers(usersList);
      setDefaultQuotaMb(Math.round(config.defaultStorageQuotaBytes / (1024 * 1024)));
      setIdlePeriodDays(Math.round(config.idleDestructionPeriodMs / (24 * 3600 * 1000)));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleRole = async (user: UserAdminSummary) => {
    if (user.username === currentUsername) {
      setErrorMsg(t('cannotModifySelfRole') || 'You cannot modify your own administrator role');
      return;
    }
    const nextRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      setActionLoadingId(user.id);
      setErrorMsg(null);
      await apiClient.adminUpdateUserRole(user.id, nextRole);
      setSuccessMsg(`${user.username} -> ${nextRole.toUpperCase()}`);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (user: UserAdminSummary) => {
    if (user.username === currentUsername) {
      setErrorMsg(t('cannotDeleteSelf') || 'You cannot delete your own active administrator account');
      return;
    }
    const confirmPrompt = (t('confirmDeleteUser') || 'Are you sure you want to permanently delete user "{name}"? All associated vaults and data will be destroyed.').replace('{name}', user.username);
    if (!window.confirm(confirmPrompt)) {
      return;
    }

    try {
      setActionLoadingId(user.id);
      setErrorMsg(null);
      await apiClient.adminDeleteUser(user.id);
      setSuccessMsg(`${t('userPermanentlyDeleted') || 'User permanently deleted'}: ${user.username}`);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveCustomQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuotaUser) return;
    try {
      setActionLoadingId(editingQuotaUser.id);
      setErrorMsg(null);
      const val = customQuotaInputMb.trim();
      const quotaBytes = val === '' ? null : Math.round(Number(val) * 1024 * 1024);
      await apiClient.adminUpdateUserQuota(editingQuotaUser.id, quotaBytes);
      setSuccessMsg(`${editingQuotaUser.username}: ${val === '' ? t('resetToDefaultQuota') : `${val} MB`}`);
      setEditingQuotaUser(null);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update user quota');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveSystemPolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPolicies(true);
      setErrorMsg(null);
      const quotaBytes = defaultQuotaMb * 1024 * 1024;
      const idleMs = idlePeriodDays === 0 ? 0 : idlePeriodDays * 24 * 3600 * 1000;
      await apiClient.adminUpdateSystemSettings({
        defaultStorageQuotaBytes: quotaBytes,
        idleDestructionPeriodMs: idleMs,
      });
      setSuccessMsg(t('policiesSaved') || 'System policies updated successfully');
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update system policies');
    } finally {
      setSavingPolicies(false);
    }
  };

  const handleRunIdleCleanup = async () => {
    const promptText = t('confirmSweepIdle') || 'Trigger automated lifecycle sweep now? Non-admin users inactive beyond the threshold will be permanently destroyed.';
    if (!window.confirm(promptText)) {
      return;
    }
    try {
      setCleaningIdle(true);
      setErrorMsg(null);
      const res = await apiClient.adminCleanupIdleUsers();
      setSuccessMsg(res.message || `Cleaned up ${res.destroyedCount} idle accounts`);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Idle cleanup failed');
    } finally {
      setCleaningIdle(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (ms: number): string => {
    if (!ms) return 'Never';
    return new Date(ms).toLocaleString(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatRelativeActive = (ms: number): string => {
    if (!ms) return t('inactive') || 'Inactive';
    const diffSecs = Math.round((Date.now() - ms) / 1000);
    if (diffSecs < 60) return t('onlineJustNow') || 'Online just now';
    const diffMins = Math.round(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg cursor-pointer"
    >
      <div className="w-full max-w-2xl p-6 sm:p-8 glass-panel rounded-glass-lg border border-primaryColor-500/30 text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto space-y-5 cursor-default">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Centered Modal Title */}
        <div className="text-center pb-3 border-b border-white/10 mb-2">
          <h2 className="text-base font-bold text-white tracking-wide">
            {t('adminConsole') || '系统管理控制台'}
          </h2>
        </div>

        {/* Alert Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-mono flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white text-xs cursor-pointer">✕</button>
          </div>
        )}

        {/* 1. Global System Policies Card */}
        <form onSubmit={handleSaveSystemPolicies} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Settings className="w-4 h-4 text-primaryColor-400" />
              <span>{t('globalSystemPolicies') || 'Global System Policies'}</span>
            </div>
            <button
              type="submit"
              disabled={savingPolicies}
              className="px-3 py-1.5 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-1.5"
            >
              {savingPolicies ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{savingPolicies ? (t('savingPolicies') || 'Saving...') : (t('savePolicies') || 'Save Policies')}</span>
            </button>
          </div>

          {/* Policy Rows: Default Storage Quota & Idle Destruction Period each in its own row */}
          <div className="space-y-3.5 text-xs font-mono">
            {/* ROW 1: Default Storage Quota (Full Width) */}
            <div className="w-full space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-primaryColor-400" />
                  <span>{t('defaultStorageQuota') || 'Default Storage Quota'}:</span>
                </label>
                <span className="text-primaryColor-400 font-bold text-xs bg-primaryColor-500/10 px-2 py-0.5 rounded border border-primaryColor-500/20">
                  {defaultQuotaMb >= 1048576 ? `${(defaultQuotaMb / 1048576).toFixed(0)} TB` : defaultQuotaMb >= 1024 ? `${(defaultQuotaMb / 1024).toFixed(0)} GB` : `${defaultQuotaMb} MB`}
                </span>
              </div>
              <select
                value={defaultQuotaMb}
                onChange={(e) => setDefaultQuotaMb(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-primaryColor-500 cursor-pointer"
              >
                <option value={1}>1 MB ({t('minimal') || 'Minimal'})</option>
                <option value={10}>10 MB ({t('default') || 'Default'})</option>
                <option value={50}>50 MB</option>
                <option value={100}>100 MB</option>
                <option value={512}>512 MB</option>
                <option value={1024}>1 GB (1,024 MB)</option>
                <option value={10240}>10 GB</option>
                <option value={1048576}>1 TB (1,048,576 MB)</option>
              </select>
            </div>

            {/* ROW 2: Idle Destruction Period (Full Width) */}
            <div className="w-full space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('idleDestructionPeriod') || 'Idle Destruction Period'}:</span>
                </label>
                <span className="text-amber-400 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {idlePeriodDays === 0 ? (t('disabledNeverDestroy') || 'Disabled') : `${idlePeriodDays} ${t('days') || 'Days'}`}
                </span>
              </div>
              <select
                value={idlePeriodDays}
                onChange={(e) => setIdlePeriodDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-primaryColor-500 cursor-pointer"
              >
                <option value={0}>{t('disabledNeverDestroy') || 'Disabled (Never Destroy)'}</option>
                <option value={30}>1 {t('month') || 'Month'} (30 {t('days') || 'Days'} - {t('default') || 'Default'})</option>
                <option value={60}>2 {t('months') || 'Months'} (60 {t('days') || 'Days'})</option>
                <option value={90}>3 {t('months') || 'Months'} (90 {t('days') || 'Days'})</option>
                <option value={180}>6 {t('months') || 'Months'} (180 {t('days') || 'Days'})</option>
                <option value={365}>1 {t('year') || 'Year'} (365 {t('days') || 'Days'})</option>
              </select>
            </div>
          </div>

          {/* Sweep Trigger Button */}
          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <span className="text-zinc-400 font-mono flex items-center gap-1.5 text-[11px]">
              <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{t('idleSweepNotice') || 'Idle user automatic cleanup runs daily via Worker Cron.'}</span>
            </span>
            <button
              type="button"
              onClick={handleRunIdleCleanup}
              disabled={cleaningIdle}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-mono transition cursor-pointer flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
            >
              {cleaningIdle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{t('sweepIdleNow') || 'Sweep Idle Now'}</span>
            </button>
          </div>
        </form>

        {/* 2. User Accounts Directory */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-300 font-semibold">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primaryColor-400" />
              <span>{t('systemUsers') || 'System Users'} ({users.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400 font-mono">Unix Username & UUID</span>
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer flex items-center justify-center"
                title="Refresh user accounts"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primaryColor-400' : ''}`} />
              </button>
            </div>
          </div>

          {loading && users.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs font-mono flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primaryColor-400" />
              <span>Loading user accounts...</span>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {users.map((u) => {
                const isSelf = u.username === currentUsername;
                const isAdmin = u.role === 'admin';
                const usagePercent = isAdmin ? 0 : Math.min(100, Math.round((u.usedStorageBytes / Math.max(1, u.storageQuotaBytes)) * 100));
                const isActionRunning = actionLoadingId === u.id;

                return (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs font-mono"
                  >
                    {/* Top line: Username + Role + Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{u.username}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleRole(u)}
                          disabled={isSelf || isActionRunning}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                            isAdmin
                              ? 'bg-primaryColor-500/20 text-primaryColor-300 border-primaryColor-500/40 hover:bg-primaryColor-500/30'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                          }`}
                          title={isSelf ? 'Cannot modify self' : 'Click to toggle admin/user role'}
                        >
                          {u.role.toUpperCase()}
                        </button>
                        {isSelf && (
                          <span className="text-[9px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                            YOU
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <span className="px-2.5 py-1 rounded bg-primaryColor-500/10 text-primaryColor-300 border border-primaryColor-500/20 text-[11px] flex items-center gap-1 font-semibold" title={t('adminUnlimitedQuotaNotice') || 'Admins have unlimited storage capacity'}>
                            <InfinityIcon className="w-3.5 h-3.5" />
                            <span>{t('unlimited') || 'Unlimited'}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuotaUser(u);
                              setCustomQuotaInputMb(u.isCustomQuota ? String(Math.round(u.storageQuotaBytes / (1024 * 1024))) : '');
                            }}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-primaryColor-300 border border-white/10 text-[11px] transition cursor-pointer"
                            title={t('setCustomQuota') || 'Set Custom Storage Quota'}
                          >
                            Quota: {formatBytes(u.storageQuotaBytes)}
                          </button>
                        )}

                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            disabled={isActionRunning}
                            className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition cursor-pointer"
                            title="Permanently Delete User & Vaults"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* UUID Row */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-black/60 px-2.5 py-1 rounded-lg border border-white/5">
                      <span className="truncate max-w-[360px]">UUID: {u.id}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(u.id, u.id)}
                        className="text-zinc-400 hover:text-white transition cursor-pointer flex items-center gap-1"
                        title="Copy User UUID"
                      >
                        {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Timestamps & Online Status */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-0.5">
                      <div>
                        <span>Created: </span>
                        <strong className="text-zinc-300">{formatTimestamp(u.createdAt)}</strong>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primaryColor-400" />
                        <span>Last Seen: </span>
                        <strong className="text-zinc-200">{formatRelativeActive(u.lastActiveAt)}</strong>
                      </div>
                    </div>

                    {/* Storage Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 text-zinc-400">
                          <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                          {isAdmin ? (
                            <span>Storage: <strong className="text-zinc-200">{formatBytes(u.usedStorageBytes)}</strong> / <strong className="text-primaryColor-400">{t('unlimited') || 'Unlimited'}</strong></span>
                          ) : (
                            <span>Storage: {formatBytes(u.usedStorageBytes)} / {formatBytes(u.storageQuotaBytes)}</span>
                          )}
                        </span>
                        {!isAdmin && (
                          <span className={`${usagePercent > 90 ? 'text-red-400' : 'text-zinc-400'}`}>
                            {usagePercent}%
                          </span>
                        )}
                      </div>
                      {!isAdmin && (
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-primaryColor-500'
                            }`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Custom Quota Edit Dialog */}
        {editingQuotaUser && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingQuotaUser(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
          >
            <form
              onSubmit={handleSaveCustomQuota}
              className="w-full max-w-sm p-6 glass-panel rounded-2xl border border-white/20 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-primaryColor-400" />
                  <span>{t('customQuota') || 'Custom Storage Quota'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingQuotaUser(null)}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-zinc-300 font-mono">
                {(t('customQuotaDesc') || 'Set a custom quota (MB) for {name}, or leave empty to use system default.').replace('{name}', editingQuotaUser.username)}
              </p>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1 font-mono">{t('enterQuotaInMb') || 'Quota in MB (e.g. 50, 1024)'}:</label>
                <input
                  type="number"
                  min="1"
                  max="1048576"
                  value={customQuotaInputMb}
                  onChange={(e) => setCustomQuotaInputMb(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-primaryColor-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomQuotaInputMb('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-mono transition cursor-pointer"
                >
                  {t('resetToDefaultQuota') || 'Use Default'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-xs font-semibold transition cursor-pointer shadow-lg shadow-primaryColor-500/20"
                >
                  {t('confirm') || 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
