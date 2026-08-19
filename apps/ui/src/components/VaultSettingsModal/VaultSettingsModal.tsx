import React, { useState } from 'react';
import { Download, Plus, Database, ShieldCheck, Trash2, Edit2, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultExportService } from '../../services/VaultExportService';
import { CreateVaultDialog } from './CreateVaultDialog';
import { VaultSettingsModalProps } from './VaultSettingsModal.types';
import { Modal, Button, Card, Badge, ConfirmCard } from '../common';

export const VaultSettingsModal: React.FC<VaultSettingsModalProps> = ({
  isOpen,
  onClose,
  vaults,
  activeVaultId,
  onSelectVault,
  onCreateVault,
  onRenameVault,
  onDeleteVault,
  activeVaultNotes,
}) => {
  const { isVaultUnlocked } = useApp();
  const { t } = useI18n();

  const [showCreateVaultDialog, setShowCreateVaultDialog] = useState(false);
  const [confirmDeleteVaultId, setConfirmDeleteVaultId] = useState<string | null>(null);
  const [editingVaultId, setEditingVaultId] = useState<string | null>(null);
  const [editingVaultName, setEditingVaultName] = useState('');

  if (!isOpen) return null;

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];

  const handleExportVault = () => {
    VaultExportService.exportVault(activeVault?.name || 'Vault', activeVaultNotes);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('vaultSettings')}
        size="lg"
        footer={
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-primaryColor-600 dark:text-primaryColor-400" />
              <span>Zero-Knowledge Architecture</span>
            </div>
          </div>
        }
      >
        {/* Active Vault Switch & Create Vault Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <Database className="w-4 h-4 text-primaryColor-600 dark:text-primaryColor-400" />
              <span>{t('activeVault')}</span>
            </div>
            <Button
              size="xs"
              variant="glass"
              icon={<Plus className="w-3.5 h-3.5 text-primaryColor-600 dark:text-primaryColor-400" />}
              onClick={() => setShowCreateVaultDialog(true)}
            >
              {t('createVault')}
            </Button>
          </div>

          {/* Vault List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {vaults.map((v) => {
              const isConfirmingDelete = confirmDeleteVaultId === v.id;
              const isEditing = editingVaultId === v.id;
              const isActive = v.id === activeVaultId;

              if (isConfirmingDelete) {
                return (
                  <ConfirmCard
                    key={v.id}
                    title={v.name}
                    message={t('confirmDeleteVault') || 'Are you sure you want to delete this vault?'}
                    cancelText={t('cancel') || 'Cancel'}
                    confirmText={t('confirm') || 'Confirm'}
                    onCancel={() => setConfirmDeleteVaultId(null)}
                    onConfirm={() => {
                      setConfirmDeleteVaultId(null);
                      if (onDeleteVault) {
                        onDeleteVault(v.id);
                        if (vaults.length <= 1) {
                          onClose();
                        }
                      }
                    }}
                  />
                );
              }

              if (isEditing) {
                return (
                  <form
                    key={v.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editingVaultName.trim() && onRenameVault) {
                        onRenameVault(v.id, editingVaultName.trim());
                      }
                      setEditingVaultId(null);
                    }}
                    className="p-2.5 rounded-xl border border-primaryColor-500/40 bg-primaryColor-500/10 flex items-center gap-2 animate-in fade-in duration-150 text-xs font-mono"
                  >
                    <input
                      type="text"
                      value={editingVaultName}
                      onChange={(e) => setEditingVaultName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingVaultId(null);
                      }}
                      className="flex-1 bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1 text-zinc-900 dark:text-white text-xs font-mono focus:outline-none focus:border-primaryColor-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="p-1 rounded bg-primaryColor-600 hover:bg-primaryColor-500 text-white transition cursor-pointer"
                      title={t('confirm')}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingVaultId(null)}
                      className="p-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                      title={t('cancel')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                );
              }

              return (
                <div
                  key={v.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    isActive
                      ? 'bg-primaryColor-500/15 dark:bg-primaryColor-500/20 border-primaryColor-500/30 text-zinc-900 dark:text-white font-semibold shadow-xs'
                      : 'bg-black/[0.02] dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 border-black/10 dark:border-white/5 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div
                    onClick={() => onSelectVault(v.id)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-primaryColor-500' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-mono truncate">{v.name}</span>
                      <span className="text-[9px] text-zinc-500 font-mono truncate">{v.id}</span>
                    </div>
                    {isActive && (
                      <Badge variant="primary" size="xs" className="shrink-0 ml-1">
                        Active
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {/* Rename Vault Button */}
                    {onRenameVault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingVaultId(v.id);
                          setEditingVaultName(v.name);
                        }}
                        className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-primaryColor-500/15 text-zinc-500 dark:text-zinc-400 hover:text-primaryColor-600 dark:hover:text-primaryColor-300 border border-black/5 dark:border-white/10 transition cursor-pointer"
                        title={t('rename')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete Vault Button */}
                    {onDeleteVault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteVaultId(v.id);
                        }}
                        className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-red-500/15 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-300 border border-black/5 dark:border-white/10 transition cursor-pointer"
                        title={t('deleteVault')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full Vault Export Section */}
        <Card className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <Download className="w-4 h-4 text-primaryColor-600 dark:text-primaryColor-400" />
              <span>{t('exportVault')}</span>
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
              {activeVaultNotes.length} Files
            </span>
          </div>
          <Button
            variant="glass"
            fullWidth
            onClick={handleExportVault}
            disabled={!isVaultUnlocked || activeVaultNotes.length === 0}
            icon={<Download className="w-3.5 h-3.5 text-primaryColor-600 dark:text-primaryColor-400" />}
          >
            {t('download')} "{activeVault?.name}"
          </Button>
        </Card>
      </Modal>

      {/* Create Vault with PIN & Mnemonic Recovery Dialog */}
      <CreateVaultDialog
        isOpen={showCreateVaultDialog}
        onClose={() => setShowCreateVaultDialog(false)}
        onCreateVault={onCreateVault}
      />
    </>
  );
};

