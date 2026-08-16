import React, { useState } from 'react';
import { X, Crown, Download, Plus, Database, ShieldCheck, LogOut, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGE_OPTIONS, Language, useI18n } from '../i18n/i18nContext';
import { NoteItem, VaultInfo } from '../interfaces/INoteModels';
import { VaultExportService } from '../services/VaultExportService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaults: VaultInfo[];
  activeVaultId: string;
  onSelectVault: (id: string) => void;
  onCreateVault: (name: string) => void;
  activeVaultNotes: NoteItem[];
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  vaults,
  activeVaultId,
  onSelectVault,
  onCreateVault,
  activeVaultNotes,
}) => {
  const { username, role, logoutAccount, isVaultUnlocked } = useApp();
  const { language, setLanguage, t } = useI18n();
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

        {/* User Header */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white text-xl shadow-lg border border-white/10">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{username || 'Anonymous'}</h2>
              {role === 'admin' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-blue-400" />
                  <span>SYSTEM ADMIN</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-zinc-400 border border-white/10">
                  STANDARD USER
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{t('userProfile')}</p>
          </div>
        </div>

        {/* Language Selection Section */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>{t('language')}</span>
            </div>
            <span className="text-[10px] text-blue-400 font-mono font-semibold">
              {LANGUAGE_OPTIONS.find((l) => l.code === language)?.flag} {LANGUAGE_OPTIONS.find((l) => l.code === language)?.label}
            </span>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50 transition cursor-pointer"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code} className="bg-zinc-900 text-white">
                {opt.flag} {opt.label} ({opt.code})
              </option>
            ))}
          </select>
        </div>

        {/* Multi-Vault Management Section */}
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
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none"
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
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {vaults.map((v) => (
              <div
                key={v.id}
                onClick={() => onSelectVault(v.id)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                  v.id === activeVaultId
                    ? 'bg-blue-600/20 border-blue-500/50 text-white'
                    : 'bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${v.id === activeVaultId ? 'bg-blue-400' : 'bg-zinc-600'}`} />
                  <span className="text-xs font-medium">{v.name}</span>
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
              <span>Full Local Vault Export</span>
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

        {/* Account Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Zero-Knowledge E2EE Storage</span>
          </div>
          <button
            onClick={() => {
              onClose();
              logoutAccount();
            }}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('logoutAccount')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
