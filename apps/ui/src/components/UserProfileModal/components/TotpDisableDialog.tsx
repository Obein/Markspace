import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '../../../i18n/i18nContext';
import { Button } from '../../common';

export interface TotpDisableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  disableCode: string;
  setDisableCode: (code: string) => void;
  loading: boolean;
  onConfirmDisable: (e: React.FormEvent) => Promise<void>;
}

export const TotpDisableDialog: React.FC<TotpDisableDialogProps> = ({
  isOpen,
  onClose,
  disableCode,
  setDisableCode,
  loading,
  onConfirmDisable,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <form
      onSubmit={onConfirmDisable}
      className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3 animate-in fade-in duration-150"
    >
      <div className="flex items-center gap-2 text-red-600 dark:text-red-300 text-xs font-semibold">
        <AlertTriangle className="w-4 h-4" />
        <span>{t('confirmDisableTotp')}</span>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-300 mb-1">
          {t('enterDisableCode')}
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={disableCode}
          onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full px-4 py-2 rounded-xl bg-white dark:bg-black/50 border border-black/20 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-red-500 text-sm font-mono tracking-widest text-center"
          required
          autoFocus
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          size="md"
          onClick={onClose}
        >
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          variant="danger"
          fullWidth
          size="md"
          loading={loading}
        >
          {t('disableTotp')}
        </Button>
      </div>
    </form>
  );
};
