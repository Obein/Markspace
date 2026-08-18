import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Shield,
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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { UserAdminSummary, UserRole } from '../../interfaces/IApiClient';

export const AdminManagementSection: React.FC = () => {
  const { apiClient, username: currentUsername } = useApp();
  const { language } = useI18n();

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
    loadData();
  }, [loadData]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleRole = async (user: UserAdminSummary) => {
    if (user.username === currentUsername) {
      setErrorMsg('You cannot modify your own administrator role');
      return;
    }
    const nextRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      setActionLoadingId(user.id);
      setErrorMsg(null);
      await apiClient.adminUpdateUserRole(user.id, nextRole);
      setSuccessMsg(`Updated ${user.username} role to ${nextRole}`);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (user: UserAdminSummary) => {
    if (user.username === currentUsername) {
      setErrorMsg('You cannot delete your own active administrator account');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete user "${user.username}"? All associated vaults and data will be destroyed.`)) {
      return;
    }

    try {
      setActionLoadingId(user.id);
      setErrorMsg(null);
      await apiClient.adminDeleteUser(user.id);
      setSuccessMsg(`User ${user.username} permanently deleted`);
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
      setSuccessMsg(`Updated storage quota for ${editingQuotaUser.username}`);
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
      setSuccessMsg('System policies updated successfully');
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update system policies');
    } finally {
      setSavingPolicies(false);
    }
  };

  const handleRunIdleCleanup = async () => {
    if (!window.confirm('Trigger automated lifecycle sweep now? Non-admin users inactive beyond the threshold will be permanently destroyed.')) {
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
    if (!ms) return 'Inactive';
    const diffSecs = Math.round((Date.now() - ms) / 1000);
    if (diffSecs < 60) return 'Online just now';
    const diffMins = Math.round(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-blue-500/30 space-y-4 mb-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">System Administration Console</h3>
            <span className="text-[10px] text-zinc-400 font-mono">User Management, Quotas & Lifecycle Policy</span>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-mono flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white text-[10px] cursor-pointer">✕</button>
        </div>
      )}

      {/* 1. Global System Policies Card */}
      <form onSubmit={handleSaveSystemPolicies} className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Settings className="w-3.5 h-3.5 text-blue-400" />
            <span>Global System Policies</span>
          </div>
          <button
            type="submit"
            disabled={savingPolicies}
            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {savingPolicies ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Save Policies'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          {/* Default Quota */}
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">
              Default Storage Quota: <strong className="text-blue-400">{defaultQuotaMb} MB</strong>
            </label>
            <select
              value={defaultQuotaMb}
              onChange={(e) => setDefaultQuotaMb(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={1}>1 MB (Minimal)</option>
              <option value={10}>10 MB (Default)</option>
              <option value={50}>50 MB</option>
              <option value={100}>100 MB</option>
              <option value={512}>512 MB</option>
              <option value={1024}>1 GB (1,024 MB)</option>
              <option value={10240}>10 GB</option>
              <option value={1048576}>1 TB (1,048,576 MB)</option>
            </select>
          </div>

          {/* Idle Destruction Period */}
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">
              Idle Destruction Period: <strong className="text-amber-400">{idlePeriodDays === 0 ? 'Disabled' : `${idlePeriodDays} Days`}</strong>
            </label>
            <select
              value={idlePeriodDays}
              onChange={(e) => setIdlePeriodDays(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={0}>Disabled (Never Destroy)</option>
              <option value={30}>1 Month (30 Days - Default)</option>
              <option value={60}>2 Months (60 Days)</option>
              <option value={90}>3 Months (90 Days)</option>
              <option value={180}>6 Months (180 Days)</option>
              <option value={365}>1 Year (365 Days)</option>
            </select>
          </div>
        </div>

        {/* Sweep Trigger Button */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 font-mono flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Idle user automatic cleanup runs daily via Worker Cron.</span>
          </span>
          <button
            type="button"
            onClick={handleRunIdleCleanup}
            disabled={cleaningIdle}
            className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-mono transition cursor-pointer flex items-center gap-1"
          >
            {cleaningIdle ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            <span>Sweep Idle Now</span>
          </button>
        </div>
      </form>

      {/* 2. User Accounts Directory */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-300 font-semibold">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>System Users ({users.length})</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">Unix Username & UUID</span>
        </div>

        {loading && users.length === 0 ? (
          <div className="p-6 text-center text-zinc-400 text-xs font-mono flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>Loading user accounts...</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {users.map((u) => {
              const isSelf = u.username === currentUsername;
              const usagePercent = Math.min(100, Math.round((u.usedStorageBytes / Math.max(1, u.storageQuotaBytes)) * 100));
              const isActionRunning = actionLoadingId === u.id;

              return (
                <div
                  key={u.id}
                  className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs font-mono"
                >
                  {/* Top line: Username + Role + Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{u.username}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleRole(u)}
                        disabled={isSelf || isActionRunning}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border transition cursor-pointer ${
                          u.role === 'admin'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                        }`}
                        title={isSelf ? 'Cannot modify self' : 'Click to toggle admin/user role'}
                      >
                        {u.role.toUpperCase()}
                      </button>
                      {isSelf && (
                        <span className="text-[9px] text-zinc-400 bg-white/5 px-1.5 py-0.2 rounded border border-white/10">
                          YOU
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuotaUser(u);
                          setCustomQuotaInputMb(u.isCustomQuota ? String(Math.round(u.storageQuotaBytes / (1024 * 1024))) : '');
                        }}
                        className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-blue-300 border border-white/10 text-[10px] transition cursor-pointer"
                        title="Set Custom Storage Quota"
                      >
                        Quota: {formatBytes(u.storageQuotaBytes)}
                      </button>

                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          disabled={isActionRunning}
                          className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition cursor-pointer"
                          title="Permanently Delete User & Vaults"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* UUID Row */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 bg-black/60 px-2 py-1 rounded-lg border border-white/5">
                    <span className="truncate max-w-[280px]">UUID: {u.id}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(u.id, u.id)}
                      className="text-zinc-400 hover:text-white transition cursor-pointer flex items-center gap-1"
                    >
                      {copiedId === u.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Timestamps & Online Status */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 pt-0.5">
                    <div>
                      <span>Created: </span>
                      <strong className="text-zinc-300">{formatTimestamp(u.createdAt)}</strong>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span>Last Seen: </span>
                      <strong className="text-zinc-200">{formatRelativeActive(u.lastActiveAt)}</strong>
                    </div>
                  </div>

                  {/* Storage Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <HardDrive className="w-3 h-3 text-zinc-400" />
                        <span>Storage: {formatBytes(u.usedStorageBytes)} / {formatBytes(u.storageQuotaBytes)}</span>
                      </span>
                      <span className={`${usagePercent > 90 ? 'text-red-400' : 'text-zinc-400'}`}>
                        {usagePercent}%
                      </span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Custom Quota Edit Dialog */}
      {editingQuotaUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveCustomQuota}
            className="w-full max-w-sm p-5 glass-panel rounded-2xl border border-white/20 text-white shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-xs font-bold text-white">Set Quota: {editingQuotaUser.username}</h4>
              <button
                type="button"
                onClick={() => setEditingQuotaUser(null)}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <label className="text-[11px] text-zinc-300 block">
                Custom Quota in MB (1MB - 1,048,576MB):
              </label>
              <input
                type="number"
                min={1}
                max={1048576}
                value={customQuotaInputMb}
                onChange={(e) => setCustomQuotaInputMb(e.target.value)}
                placeholder="Leave blank for system default (10MB)"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
              />
              <p className="text-[10px] text-zinc-400">
                Tip: Leave empty to reset to global default quota ({defaultQuotaMb}MB).
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingQuotaUser(null)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold transition cursor-pointer"
              >
                Save Quota
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
