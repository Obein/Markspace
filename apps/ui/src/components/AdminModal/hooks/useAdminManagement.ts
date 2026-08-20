import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { useI18n } from '../../../i18n/i18nContext';
import { UserAdminSummary, UserRole } from '../../../interfaces/IApiClient';

export interface UseAdminManagementReturn {
  users: UserAdminSummary[];
  loading: boolean;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  successMsg: string | null;
  setSuccessMsg: (msg: string | null) => void;
  copiedId: string | null;
  actionLoadingId: string | null;
  defaultQuotaMb: number;
  setDefaultQuotaMb: (mb: number) => void;
  idlePeriodDays: number;
  setIdlePeriodDays: (days: number) => void;
  savingPolicies: boolean;
  cleaningIdle: boolean;
  editingQuotaUser: UserAdminSummary | null;
  setEditingQuotaUser: (user: UserAdminSummary | null) => void;
  customQuotaInputMb: string;
  setCustomQuotaInputMb: (val: string) => void;
  loadData: () => Promise<void>;
  copyToClipboard: (text: string, id: string) => void;
  handleToggleRole: (user: UserAdminSummary) => Promise<void>;
  handleDeleteUser: (user: UserAdminSummary) => Promise<void>;
  handleSaveCustomQuota: (e: React.FormEvent) => Promise<void>;
  handleSaveSystemPolicies: (e: React.FormEvent) => Promise<void>;
  handleRunIdleCleanup: () => Promise<void>;
}

/**
 * useAdminManagement
 * Encapsulates administrative data loading, policy configuration, user role mutation, and custom storage quotas.
 */
export function useAdminManagement(isOpen: boolean): UseAdminManagementReturn {
  const { apiClient, username: currentUsername } = useApp();
  const { t } = useI18n();

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
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save system policies');
    } finally {
      setSavingPolicies(false);
    }
  };

  const handleRunIdleCleanup = async () => {
    const confirmPrompt = t('confirmSweepIdle') || 'Run background idle cleanup now? All user accounts inactive beyond policy period will be permanently destroyed.';
    if (!window.confirm(confirmPrompt)) return;

    try {
      setCleaningIdle(true);
      setErrorMsg(null);
      const res = await apiClient.adminCleanupIdleUsers();
      setSuccessMsg(res.message || `Cleaned up ${res.destroyedCount} idle accounts`);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to execute idle sweep');
    } finally {
      setCleaningIdle(false);
    }
  };

  return {
    users,
    loading,
    errorMsg,
    setErrorMsg,
    successMsg,
    setSuccessMsg,
    copiedId,
    actionLoadingId,
    defaultQuotaMb,
    setDefaultQuotaMb,
    idlePeriodDays,
    setIdlePeriodDays,
    savingPolicies,
    cleaningIdle,
    editingQuotaUser,
    setEditingQuotaUser,
    customQuotaInputMb,
    setCustomQuotaInputMb,
    loadData,
    copyToClipboard,
    handleToggleRole,
    handleDeleteUser,
    handleSaveCustomQuota,
    handleSaveSystemPolicies,
    handleRunIdleCleanup,
  };
}
