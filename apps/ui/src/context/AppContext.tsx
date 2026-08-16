import React, { createContext, useContext, useState } from 'react';
import { EnvelopeCryptoService } from '../crypto/EnvelopeCryptoService';
import { IApiClient, UserRole } from '../interfaces/IApiClient';
import { ICryptoService } from '../interfaces/ICryptoService';
import { IHighlightService } from '../interfaces/IHighlightService';
import { ISheetEngine } from '../interfaces/ISheetEngine';
import { SheetEvaluator } from '../markdown/SheetEvaluator';
import { ApiClient } from '../services/ApiClient';
import { LezerHighlightService } from '../services/LezerHighlightService';

interface AppContextType {
  cryptoService: ICryptoService;
  apiClient: IApiClient;
  sheetEngine: ISheetEngine;
  highlightService: IHighlightService;
  cmk: CryptoKey | null;
  setCmk: (key: CryptoKey | null) => void;
  username: string | null;
  setUsername: (name: string | null) => void;
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  isVaultUnlocked: boolean;
  lockVault: () => void;
  logoutAccount: () => void;
}

const cryptoService = new EnvelopeCryptoService();
const apiClient = new ApiClient();
const sheetEngine = new SheetEvaluator();
const highlightService = new LezerHighlightService();

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cmk, setCmk] = useState<CryptoKey | null>(null);
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('markspace_jwt_token'));
  const [username, setUsernameState] = useState<string | null>(localStorage.getItem('markspace_username'));
  const [role, setRoleState] = useState<UserRole | null>(
    (localStorage.getItem('markspace_user_role') as UserRole) || null
  );

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('markspace_jwt_token', newToken);
      apiClient.setToken(newToken);
    } else {
      localStorage.removeItem('markspace_jwt_token');
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

  const lockVault = () => {
    setCmk(null);
  };

  const logoutAccount = () => {
    apiClient.logout();
    setCmk(null);
    setToken(null);
    setUsername(null);
    setRole(null);
  };

  const value: AppContextType = {
    cryptoService,
    apiClient,
    sheetEngine,
    highlightService,
    cmk,
    setCmk,
    username,
    setUsername,
    role,
    setRole,
    token,
    setToken,
    isAuthenticated: !!token,
    isVaultUnlocked: cmk !== null,
    lockVault,
    logoutAccount,
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
