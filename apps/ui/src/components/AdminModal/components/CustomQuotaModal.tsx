import React from 'react';
import { HardDrive } from 'lucide-react';
import { useI18n } from '../../../i18n/i18nContext';
import { UserAdminSummary } from '../../../interfaces/IApiClient';
import { Modal, Input, Button } from '../../common';

export interface CustomQuotaModalProps {
  editingQuotaUser: UserAdminSummary | null;
  customQuotaInputMb: string;
  setCustomQuotaInputMb: (val: string) => void;
  onClose: () => void;
  onSaveQuota: (e: React.FormEvent) => Promise<void>;
}

export const CustomQuotaModal: React.FC<CustomQuotaModalProps> = ({
  editingQuotaUser,
  customQuotaInputMb,
  setCustomQuotaInputMb,
  onClose,
  onSaveQuota,
}) => {
  const { t } = useI18n();

  if (!editingQuotaUser) return null;

  return (
    <Modal
      isOpen={!!editingQuotaUser}
      onClose={onClose}
      size="sm"
      title={t('customQuota') || 'Custom Storage Quota'}
      icon={<HardDrive className="w-4 h-4 text-primaryColor-600 dark:text-primaryColor-400" />}
    >
      <form onSubmit={onSaveQuota} className="space-y-4">
        <p className="text-xs text-zinc-600 dark:text-zinc-300 font-mono">
          {(
            t('customQuotaDesc') ||
            'Set a custom quota (MB) for {name}, or leave empty to use system default.'
          ).replace('{name}', editingQuotaUser.username)}
        </p>

        <Input
          label={t('enterQuotaInMb') || 'Quota in MB (e.g. 50, 1024)'}
          type="number"
          min="1"
          max="1048576"
          value={customQuotaInputMb}
          onChange={(e) => setCustomQuotaInputMb(e.target.value)}
          placeholder="e.g. 50"
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() => setCustomQuotaInputMb('')}
          >
            {t('resetToDefaultQuota') || 'Use Default'}
          </Button>
          <Button type="submit" variant="primary" size="xs">
            {t('confirm') || 'Confirm'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
