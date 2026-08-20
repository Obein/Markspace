import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { AdminModalProps } from './AdminModal.types';
import { Modal } from '../common';
import { useAdminManagement } from './hooks/useAdminManagement';
import { SystemPolicyCard } from './components/SystemPolicyCard';
import { UserManagementTable } from './components/UserManagementTable';
import { CustomQuotaModal } from './components/CustomQuotaModal';

/**
 * AdminModal
 * Administrative Console for system settings, policy controls, and user directory management.
 */
export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const { username: currentUsername } = useApp();
  const { t } = useI18n();

  const {
    users,
    loading,
    errorMsg,
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
  } = useAdminManagement(isOpen);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={t('adminConsole') || '系统管理控制台'}
    >
      <div className="space-y-5">
        {/* Alert Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-200 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-200 text-xs font-mono flex items-center justify-between">
            <span>{successMsg}</span>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:opacity-80 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Global System Policies Card */}
        <SystemPolicyCard
          defaultQuotaMb={defaultQuotaMb}
          setDefaultQuotaMb={setDefaultQuotaMb}
          idlePeriodDays={idlePeriodDays}
          setIdlePeriodDays={setIdlePeriodDays}
          savingPolicies={savingPolicies}
          cleaningIdle={cleaningIdle}
          onSavePolicies={handleSaveSystemPolicies}
          onRunIdleCleanup={handleRunIdleCleanup}
        />

        {/* 2. User Accounts Directory */}
        <UserManagementTable
          users={users}
          currentUsername={currentUsername || undefined}
          loading={loading}
          actionLoadingId={actionLoadingId}
          copiedId={copiedId}
          onRefresh={loadData}
          onToggleRole={handleToggleRole}
          onDeleteUser={handleDeleteUser}
          onOpenQuotaModal={(u) => {
            setEditingQuotaUser(u);
            setCustomQuotaInputMb(
              u.isCustomQuota ? String(Math.round(u.storageQuotaBytes / (1024 * 1024))) : ''
            );
          }}
          onCopyUuid={copyToClipboard}
        />

        {/* 3. Custom Quota Edit Dialog */}
        <CustomQuotaModal
          editingQuotaUser={editingQuotaUser}
          customQuotaInputMb={customQuotaInputMb}
          setCustomQuotaInputMb={setCustomQuotaInputMb}
          onClose={() => setEditingQuotaUser(null)}
          onSaveQuota={handleSaveCustomQuota}
        />
      </div>
    </Modal>
  );
};
