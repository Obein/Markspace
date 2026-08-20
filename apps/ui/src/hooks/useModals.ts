import { useState, useCallback } from 'react';

export type ModalType =
  | 'profile'
  | 'vaultSettings'
  | 'unlock'
  | 'history'
  | 'admin';

/**
 * useModals — Centralized Modal Focus & Mutual Exclusivity Manager.
 *
 * Enforces that regardless of screen size or device type, only ONE modal
 * can be active/open at any given moment. Opening any modal will automatically
 * dismiss any other active modal.
 */
export function useModals() {
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);

  const openModal = useCallback((modal: ModalType) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const openProfile = useCallback(() => openModal('profile'), [openModal]);
  const closeProfile = useCallback(() => {
    setActiveModal((curr) => (curr === 'profile' ? null : curr));
  }, []);

  const openVaultSettings = useCallback(() => openModal('vaultSettings'), [openModal]);
  const closeVaultSettings = useCallback(() => {
    setActiveModal((curr) => (curr === 'vaultSettings' ? null : curr));
  }, []);

  const openUnlockModal = useCallback(() => openModal('unlock'), [openModal]);
  const closeUnlockModal = useCallback(() => {
    setActiveModal((curr) => (curr === 'unlock' ? null : curr));
  }, []);

  const openHistory = useCallback(() => openModal('history'), [openModal]);
  const closeHistory = useCallback(() => {
    setActiveModal((curr) => (curr === 'history' ? null : curr));
  }, []);

  const openAdmin = useCallback(() => openModal('admin'), [openModal]);
  const closeAdmin = useCallback(() => {
    setActiveModal((curr) => (curr === 'admin' ? null : curr));
  }, []);

  const setIsProfileOpen = useCallback(
    (open: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof open === 'function' ? open(activeModal === 'profile') : open;
      if (next) openProfile();
      else closeProfile();
    },
    [activeModal, openProfile, closeProfile]
  );

  const setIsVaultSettingsOpen = useCallback(
    (open: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof open === 'function' ? open(activeModal === 'vaultSettings') : open;
      if (next) openVaultSettings();
      else closeVaultSettings();
    },
    [activeModal, openVaultSettings, closeVaultSettings]
  );

  const setIsUnlockModalOpen = useCallback(
    (open: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof open === 'function' ? open(activeModal === 'unlock') : open;
      if (next) openUnlockModal();
      else closeUnlockModal();
    },
    [activeModal, openUnlockModal, closeUnlockModal]
  );

  const setIsHistoryOpen = useCallback(
    (open: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof open === 'function' ? open(activeModal === 'history') : open;
      if (next) openHistory();
      else closeHistory();
    },
    [activeModal, openHistory, closeHistory]
  );

  const setIsAdminOpen = useCallback(
    (open: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof open === 'function' ? open(activeModal === 'admin') : open;
      if (next) openAdmin();
      else closeAdmin();
    },
    [activeModal, openAdmin, closeAdmin]
  );

  return {
    activeModal,
    openModal,
    closeModal,
    isAnyModalOpen: activeModal !== null,

    isProfileOpen: activeModal === 'profile',
    setIsProfileOpen,
    openProfile,
    closeProfile,

    isVaultSettingsOpen: activeModal === 'vaultSettings',
    setIsVaultSettingsOpen,
    openVaultSettings,
    closeVaultSettings,

    isUnlockModalOpen: activeModal === 'unlock',
    setIsUnlockModalOpen,
    openUnlockModal,
    closeUnlockModal,

    isHistoryOpen: activeModal === 'history',
    setIsHistoryOpen,
    openHistory,
    closeHistory,

    isAdminOpen: activeModal === 'admin',
    setIsAdminOpen,
    openAdmin,
    closeAdmin,
  };
}
