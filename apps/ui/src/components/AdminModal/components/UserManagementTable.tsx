import React from 'react';
import {
  Users,
  RefreshCw,
  Loader2,
  Trash2,
  HardDrive,
  Clock,
  Copy,
  Check,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { useI18n } from '../../../i18n/i18nContext';
import { UserAdminSummary } from '../../../interfaces/IApiClient';
import { Badge } from '../../common';

export interface UserManagementTableProps {
  users: UserAdminSummary[];
  currentUsername?: string;
  loading: boolean;
  actionLoadingId: string | null;
  copiedId: string | null;
  onRefresh: () => Promise<void>;
  onToggleRole: (user: UserAdminSummary) => Promise<void>;
  onDeleteUser: (user: UserAdminSummary) => Promise<void>;
  onOpenQuotaModal: (user: UserAdminSummary) => void;
  onCopyUuid: (text: string, id: string) => void;
}

export const UserManagementTable: React.FC<UserManagementTableProps> = ({
  users,
  currentUsername,
  loading,
  actionLoadingId,
  copiedId,
  onRefresh,
  onToggleRole,
  onDeleteUser,
  onOpenQuotaModal,
  onCopyUuid,
}) => {
  const { language, t } = useI18n();

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
      second: '2-digit',
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
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 font-semibold">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primaryColor-600 dark:text-primaryColor-400" />
          <span>
            {t('systemUsers') || 'System Users'} ({users.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
            Unix Username & UUID
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
            title="Refresh user accounts"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primaryColor-500' : ''}`}
            />
          </button>
        </div>
      </div>

      {loading && users.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs font-mono flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primaryColor-500" />
          <span>Loading user accounts...</span>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {users.map((u) => {
            const isSelf = u.username === currentUsername;
            const isAdmin = u.role === 'admin';
            const usagePercent = isAdmin
              ? 0
              : Math.min(100, Math.round((u.usedStorageBytes / Math.max(1, u.storageQuotaBytes)) * 100));
            const isActionRunning = actionLoadingId === u.id;

            return (
              <div
                key={u.id}
                className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-black/40 border border-black/10 dark:border-white/10 space-y-2 text-xs font-mono"
              >
                {/* Top line: Username + Role + Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-white text-sm">
                      {u.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleRole(u)}
                      disabled={isSelf || isActionRunning}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                        isAdmin
                          ? 'bg-primaryColor-500/20 text-primaryColor-700 dark:text-primaryColor-300 border-primaryColor-500/40 hover:bg-primaryColor-500/30'
                          : 'bg-black/5 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-black/10 dark:border-zinc-700 hover:bg-black/10 dark:hover:bg-zinc-700'
                      }`}
                      title={isSelf ? 'Cannot modify self' : 'Click to toggle admin/user role'}
                    >
                      {u.role.toUpperCase()}
                    </button>
                    {isSelf && (
                      <Badge variant="zinc" size="xs">
                        YOU
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <Badge
                        variant="primary"
                        size="sm"
                        icon={<InfinityIcon className="w-3.5 h-3.5" />}
                        title={t('adminUnlimitedQuotaNotice') || 'Admins have unlimited storage capacity'}
                      >
                        {t('unlimited') || 'Unlimited'}
                      </Badge>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenQuotaModal(u)}
                        className="px-2.5 py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-primaryColor-700 dark:text-primaryColor-300 border border-black/10 dark:border-white/10 text-[11px] transition cursor-pointer"
                        title={t('setCustomQuota') || 'Set Custom Storage Quota'}
                      >
                        Quota: {formatBytes(u.storageQuotaBytes)}
                      </button>
                    )}

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => onDeleteUser(u)}
                        disabled={isActionRunning}
                        className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition cursor-pointer"
                        title="Permanently Delete User & Vaults"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* UUID Row */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 bg-white dark:bg-black/60 px-2.5 py-1 rounded-lg border border-black/5 dark:border-white/5">
                  <span className="truncate max-w-[360px]">UUID: {u.id}</span>
                  <button
                    type="button"
                    onClick={() => onCopyUuid(u.id, u.id)}
                    className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center gap-1"
                    title="Copy User UUID"
                  >
                    {copiedId === u.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Timestamps & Online Status */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                  <div>
                    <span>Created: </span>
                    <strong className="text-zinc-700 dark:text-zinc-300">
                      {formatTimestamp(u.createdAt)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primaryColor-600 dark:text-primaryColor-400" />
                    <span>Last Seen: </span>
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {formatRelativeActive(u.lastActiveAt)}
                    </strong>
                  </div>
                </div>

                {/* Storage Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                      <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                      {isAdmin ? (
                        <span>
                          Storage:{' '}
                          <strong className="text-zinc-800 dark:text-zinc-200">
                            {formatBytes(u.usedStorageBytes)}
                          </strong>{' '}
                          /{' '}
                          <strong className="text-primaryColor-600 dark:text-primaryColor-400">
                            {t('unlimited') || 'Unlimited'}
                          </strong>
                        </span>
                      ) : (
                        <span>
                          Storage: {formatBytes(u.usedStorageBytes)} / {formatBytes(u.storageQuotaBytes)}
                        </span>
                      )}
                    </span>
                    {!isAdmin && (
                      <span
                        className={`${
                          usagePercent > 90 ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {usagePercent}%
                      </span>
                    )}
                  </div>
                  {!isAdmin && (
                    <div className="w-full h-1.5 bg-black/10 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          usagePercent > 90
                            ? 'bg-red-500'
                            : usagePercent > 70
                            ? 'bg-amber-500'
                            : 'bg-primaryColor-500'
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
  );
};
