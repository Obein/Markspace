import React, { createContext, useContext, useState, useEffect } from 'react';
import { EnvelopeCryptoService } from '../crypto/EnvelopeCryptoService';
import { IApiClient, UserRole } from '../interfaces/IApiClient';
import { ICryptoService } from '../interfaces/ICryptoService';
import { IHighlightService } from '../interfaces/IHighlightService';
import { IPreviewService } from '../interfaces/IPreviewService';
import { ISheetEngine } from '../interfaces/ISheetEngine';
import { SheetEvaluator } from '../markdown/SheetEvaluator';
import { ApiClient } from '../services/ApiClient';
import { HighlightService } from '../services/HighlightService';
import { MarkdownPreviewService } from '../services/MarkdownPreviewService';

interface AppContextType {
  cryptoService: ICryptoService;
  apiClient: IApiClient;
  sheetEngine: ISheetEngine;
  highlightService: IHighlightService;
  previewService: IPreviewService;
  cmk: CryptoKey | null; // Active vault key
  setCmk: (key: CryptoKey | null) => void;
  unlockedVaultKeys: Record<string, CryptoKey>;
  setVaultKey: (vaultId: string, key: CryptoKey | null) => void;
  activeVaultId: string;
  setActiveVaultId: (vaultId: string) => void;
  username: string | null;
  setUsername: (name: string | null) => void;
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  isVaultUnlocked: boolean;
  lockVault: (vaultId?: string) => void;
  logoutAccount: () => void;
  securityAlert: string | null;
  clearSecurityAlert: () => void;
}

const cryptoService = new EnvelopeCryptoService();
const apiClient = new ApiClient();
const sheetEngine = new SheetEvaluator();
const highlightService = new HighlightService();
const previewService = new MarkdownPreviewService(highlightService);

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unlockedVaultKeys, setUnlockedVaultKeys] = useState<Record<string, CryptoKey>>({});
  const [activeVaultId, setActiveVaultId] = useState<string>('vault_default');
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('markspace_jwt_token'));
  const [username, setUsernameState] = useState<string | null>(localStorage.getItem('markspace_username'));
  const [role, setRoleState] = useState<UserRole | null>(
    (localStorage.getItem('markspace_user_role') as UserRole) || null
  );
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  // Wire ApiClient Nonce Violation force logout handler
  useEffect(() => {
    apiClient.setOnForceLogout((reason: string) => {
      setUnlockedVaultKeys({});
      setTokenState(null);
      setUsernameState(null);
      setRoleState(null);
      localStorage.removeItem('markspace_jwt_token');
      localStorage.removeItem('markspace_username');
      localStorage.removeItem('markspace_user_role');
      setSecurityAlert(reason);
    });
  }, []);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('markspace_jwt_token', newToken);
      apiClient.setToken(newToken);
    } else {
      localStorage.removeItem('markspace_jwt_token');
      apiClient.setToken('');
    }
  };

  const setUsername = (name: string | null) => {
    setUsernameState(name);
    if (name) {
      localStorage.setItem('markspace_username', name);
    } else {
      localStorage.removeItem('markspace_username');
    }
  };

  const setRole = (newRole: UserRole | null) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem('markspace_user_role', newRole);
    } else {
      localStorage.removeItem('markspace_user_role');
    }
  };

  const setVaultKey = (vaultId: string, key: CryptoKey | null) => {
    setUnlockedVaultKeys((prev) => {
      const copy = { ...prev };
      if (key) {
        copy[vaultId] = key;
      } else {
        delete copy[vaultId];
      }
      return copy;
    });
  };

  const setCmk = (key: CryptoKey | null) => {
    setVaultKey(activeVaultId, key);
  };

  const lockVault = (vaultId?: string) => {
    if (vaultId) {
      setVaultKey(vaultId, null);
    } else {
      setVaultKey(activeVaultId, null);
    }
  };

  const logoutAccount = () => {
    apiClient.logout();
    setUnlockedVaultKeys({});
    setToken(null);
    setUsername(null);
    setRole(null);
  };

  const activeVmk = unlockedVaultKeys[activeVaultId] || null;

  const value: AppContextType = {
    cryptoService,
    apiClient,
    sheetEngine,
    highlightService,
    previewService,
    cmk: activeVmk,
    setCmk,
    unlockedVaultKeys,
    setVaultKey,
    activeVaultId,
    setActiveVaultId,
    username,
    setUsername,
    role,
    setRole,
    token,
    setToken,
    isAuthenticated: !!token,
    isVaultUnlocked: activeVmk !== null,
    lockVault,
    logoutAccount,
    securityAlert,
    clearSecurityAlert: () => setSecurityAlert(null),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
