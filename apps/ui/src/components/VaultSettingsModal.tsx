import React, { useState } from 'react';
import { X, Download, Plus, Database, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/i18nContext';
import { NoteItem, VaultInfo } from '../interfaces/INoteModels';
import { VaultExportService } from '../services/VaultExportService';

interface VaultSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaults: VaultInfo[];
  activeVaultId: string;
  onSelectVault: (id: string) => void;
  onCreateVault: (name: string) => void;
  activeVaultNotes: NoteItem[];
}

export const VaultSettingsModal: React.FC<VaultSettingsModalProps> = ({
  isOpen,
  onClose,
  vaults,
  activeVaultId,
  onSelectVault,
  onCreateVault,
  activeVaultNotes,
}) => {
  const { isVaultUnlocked } = useApp();
  const { t } = useI18n();

  const [newVaultName, setNewVaultName] = useState('');
  const [showCreateVault, setShowCreateVault] = useState(false);

  if (!isOpen) return null;

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];

  const handleCreateVaultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVaultName.trim()) {
      onCreateVault(newVaultName.trim());
      setNewVaultName('');
      setShowCreateVault(false);
    }
  };

  const handleExportVault = () => {
    VaultExportService.exportVault(activeVault?.name || 'Vault', activeVaultNotes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
      <div className="w-full max-w-lg p-8 glass-panel rounded-glass-lg border border-white/10 text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('vaultSettings')}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Manage data vaults and export local backups</p>
          </div>
        </div>

        {/* Active Vault Switch & Create Vault Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Database className="w-4 h-4 text-blue-400" />
              <span>{t('activeVault')}</span>
            </div>
            <button
              onClick={() => setShowCreateVault(!showCreateVault)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('createVault')}</span>
            </button>
          </div>

          {showCreateVault && (
            <form onSubmit={handleCreateVaultSubmit} className="flex gap-2 p-3 bg-white/5 rounded-xl border border-blue-500/30">
              <input
                type="text"
                value={newVaultName}
                onChange={(e) => setNewVaultName(e.target.value)}
                placeholder={`${t('vaultName')}...`}
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono"
                required
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                {t('confirm')}
              </button>
            </form>
          )}

          {/* Vault List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {vaults.map((v) => (
              <div
                key={v.id}
                onClick={() => onSelectVault(v.id)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                  v.id === activeVaultId
                    ? 'bg-blue-600/20 border-blue-500/50 text-white font-medium'
                    : 'bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${v.id === activeVaultId ? 'bg-blue-400' : 'bg-zinc-600'}`} />
                  <span className="text-xs font-mono">{v.name}</span>
                </div>
                {v.id === activeVaultId && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Active</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Full Vault Export Section */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
              <Download className="w-4 h-4 text-blue-400" />
              <span>{t('exportVault')}</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              {activeVaultNotes.length} Files
            </span>
          </div>
          <button
            onClick={handleExportVault}
            disabled={!isVaultUnlocked || activeVaultNotes.length === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 border border-blue-400/20 shadow-lg shadow-blue-500/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('download')} "{activeVault?.name}"</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Zero-Knowledge E2EE Vault Settings</span>
          </div>
        </div>
      </div>
    </div>
  );
};
