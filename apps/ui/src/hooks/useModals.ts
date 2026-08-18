import { useState, useCallback } from 'react';

export function useModals() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isVaultSettingsOpen, setIsVaultSettingsOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const openProfile = useCallback(() => setIsProfileOpen(true), []);
  const closeProfile = useCallback(() => setIsProfileOpen(false), []);

  const openVaultSettings = useCallback(() => setIsVaultSettingsOpen(true), []);
  const closeVaultSettings = useCallback(() => setIsVaultSettingsOpen(false), []);

  const openUnlockModal = useCallback(() => setIsUnlockModalOpen(true), []);
  const closeUnlockModal = useCallback(() => setIsUnlockModalOpen(false), []);

  const openHistory = useCallback(() => setIsHistoryOpen(true), []);
  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);

  const openAdmin = useCallback(() => setIsAdminOpen(true), []);
  const closeAdmin = useCallback(() => setIsAdminOpen(false), []);

  return {
    isProfileOpen,
    setIsProfileOpen,
    openProfile,
    closeProfile,

    isVaultSettingsOpen,
    setIsVaultSettingsOpen,
    openVaultSettings,
    closeVaultSettings,

    isUnlockModalOpen,
    setIsUnlockModalOpen,
    openUnlockModal,
    closeUnlockModal,

    isHistoryOpen,
    setIsHistoryOpen,
    openHistory,
    closeHistory,

    isAdminOpen,
    setIsAdminOpen,
    openAdmin,
    closeAdmin,
  };
}
