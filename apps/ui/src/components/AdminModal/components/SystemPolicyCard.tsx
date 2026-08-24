import React from 'react';
import { Settings, HardDrive, Clock, Flame, Trash2 } from 'lucide-react';
import { useI18n } from '../../../i18n/i18nContext';
import { Card, Badge, Button } from '../../common';

export interface SystemPolicyCardProps {
  defaultQuotaMb: number;
  setDefaultQuotaMb: (mb: number) => void;
  idlePeriodDays: number;
  setIdlePeriodDays: (days: number) => void;
  savingPolicies: boolean;
  cleaningIdle: boolean;
  onSavePolicies: (e: React.FormEvent) => Promise<void>;
  onRunIdleCleanup: () => Promise<void>;
}

export const SystemPolicyCard: React.FC<SystemPolicyCardProps> = ({
  defaultQuotaMb,
  setDefaultQuotaMb,
  idlePeriodDays,
  setIdlePeriodDays,
  savingPolicies,
  cleaningIdle,
  onSavePolicies,
  onRunIdleCleanup,
}) => {
  const { t } = useI18n();

  return (
    <form onSubmit={onSavePolicies}>
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/5">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <Settings className="w-4 h-4 text-primaryColor-600 dark:text-primaryColor-400" />
            <span>{t('globalSystemPolicies') || 'Global System Policies'}</span>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="xs"
            loading={savingPolicies}
            loadingText={t('savingPolicies') || 'Saving...'}
          >
            {t('savePolicies') || 'Save Policies'}
          </Button>
        </div>

        {/* Policy Rows: Default Storage Quota & Idle Destruction Period */}
        <div className="space-y-3.5 text-xs font-mono">
          {/* ROW 1: Default Storage Quota */}
          <div className="w-full space-y-1.5 bg-black/[0.02] dark:bg-white/5 p-3 rounded-xl border border-black/10 dark:border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs dark:text-zinc-700 text-zinc-300 font-medium flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-primaryColor-600 dark:text-primaryColor-400" />
                <span>{t('defaultStorageQuota') || 'Default Storage Quota'}:</span>
              </label>
              <Badge variant="primary" size="xs">
                {defaultQuotaMb >= 1048576
                  ? `${(defaultQuotaMb / 1048576).toFixed(0)} TB`
                  : defaultQuotaMb >= 1024
                  ? `${(defaultQuotaMb / 1024).toFixed(0)} GB`
                  : `${defaultQuotaMb} MB`}
              </Badge>
            </div>
            <select
              value={defaultQuotaMb}
              onChange={(e) => setDefaultQuotaMb(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-black/15 dark:border-white/10 text-xs text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-primaryColor-500 cursor-pointer"
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

          {/* ROW 2: Idle Destruction Period */}
          <div className="w-full space-y-1.5 bg-black/[0.02] dark:bg-white/5 p-3 rounded-xl border border-black/10 dark:border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs dark:text-zinc-700 text-zinc-300 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{t('idleDestructionPeriod') || 'Idle Destruction Period'}:</span>
              </label>
              <Badge variant="amber" size="xs">
                {idlePeriodDays === 0
                  ? t('disabledNeverDestroy') || 'Disabled'
                  : `${idlePeriodDays} ${t('days') || 'Days'}`}
              </Badge>
            </div>
            <select
              value={idlePeriodDays}
              onChange={(e) => setIdlePeriodDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-black/15 dark:border-white/10 text-xs text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-primaryColor-500 cursor-pointer"
            >
              <option value={0}>{t('disabledNeverDestroy') || 'Disabled (Never Destroy)'}</option>
              <option value={30}>
                1 {t('month') || 'Month'} (30 {t('days') || 'Days'} - {t('default') || 'Default'})
              </option>
              <option value={60}>
                2 {t('months') || 'Months'} (60 {t('days') || 'Days'})
              </option>
              <option value={90}>
                3 {t('months') || 'Months'} (90 {t('days') || 'Days'})
              </option>
              <option value={180}>
                6 {t('months') || 'Months'} (180 {t('days') || 'Days'})
              </option>
              <option value={365}>
                1 {t('year') || 'Year'} (365 {t('days') || 'Days'})
              </option>
            </select>
          </div>
        </div>

        {/* Sweep Trigger Button */}
        <div className="pt-2 border-t border-black/10 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1.5 text-[11px]">
            <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{t('idleSweepNotice') || 'Idle user automatic cleanup runs daily via Worker Cron.'}</span>
          </span>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={onRunIdleCleanup}
            loading={cleaningIdle}
            className="text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            {t('sweepIdleNow') || 'Sweep Idle Now'}
          </Button>
        </div>
      </Card>
    </form>
  );
};
