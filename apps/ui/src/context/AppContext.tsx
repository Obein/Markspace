import React, { createContext, useContext, useState, useEffect } from 'react';
import { EnvelopeCryptoService } from '../crypto/EnvelopeCryptoService';
import { UserMasterKeyService } from '../crypto/UserMasterKeyService';
import { IApiClient, UserRole, UserVaultItem } from '../interfaces/IApiClient';
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
  umk: CryptoKey | null;
  setUmk: (key: CryptoKey | null) => void;
  userVaults: UserVaultItem[];
  setUserVaults: React.Dispatch<React.SetStateAction<UserVaultItem[]>>;
  unlockAllVaultsWithUmk: (umkKey: CryptoKey, vaultsList: UserVaultItem[]) => Promise<void>;
  cmk: CryptoKey | null; // Active vault key
  setCmk: (key: CryptoKey | null) => void;
  unlockedVaultKeys: Record<string, CryptoKey>;
  boundVaultIps: Record<string, string>;
  currentClientIp: string | null;
  setVaultKey: (vaultId: string, key: CryptoKey | null) => void;
  activeVaultId: string;
  setActiveVaultId: (vaultId: string | ((prev: string) => string)) => void;
  userId: string | null;
  setUserId: (id: string | null) => void;
  username: string | null;
  setUsername: (name: string | null) => void;
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  isInitializingAuth: boolean;
  isR2Available: boolean;
  setIsR2Available: (available: boolean) => void;
  systemConfigErrors: string[];
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
const previewService = new MarkdownPreviewService(highlightService, sheetEngine);

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [umk, setUmk] = useState<CryptoKey | null>(null);
  const [userVaults, setUserVaults] = useState<UserVaultItem[]>([]);
  const [unlockedVaultKeys, setUnlockedVaultKeys] = useState<Record<string, CryptoKey>>({});
  const [boundVaultIps, setBoundVaultIps] = useState<Record<string, string>>({});
  const [currentClientIp, setCurrentClientIp] = useState<string | null>(null);
  const [activeVaultId, setActiveVaultId] = useState<string>('');
  // Zero-Trust: In-memory token only (0 localStorage persistence)
  const [token, setTokenState] = useState<string | null>(null);
  const [userId, setUserIdState] = useState<string | null>(localStorage.getItem('markspace_user_id'));
  const [username, setUsernameState] = useState<string | null>(localStorage.getItem('markspace_username'));
  const [role, setRoleState] = useState<UserRole | null>(
    (localStorage.getItem('markspace_user_role') as UserRole) || null
  );
  const [isInitializingAuth, setIsInitializingAuth] = useState<boolean>(() =>
    Boolean(localStorage.getItem('markspace_username'))
  );
  const [isR2Available, setIsR2Available] = useState<boolean>(true);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [systemConfigErrors, setSystemConfigErrors] = useState<string[]>([]);

  const unlockAllVaultsWithUmk = async (umkKey: CryptoKey, vaultsList: UserVaultItem[]) => {
    setUmk(umkKey);
    setUserVaults(vaultsList);
    const newKeys: Record<string, CryptoKey> = {};
    for (const v of vaultsList) {
      if (v.wrappedVmk) {
        try {
          const vmk = await UserMasterKeyService.unwrapVMK(v.wrappedVmk, umkKey);
          newKeys[v.id] = vmk;
        } catch (err) {
          console.error(`Failed to unwrap VMK for vault ${v.name}:`, err);
        }
      }
    }
    setUnlockedVaultKeys((prev) => ({ ...prev, ...newKeys }));
    if (vaultsList.length > 0) {
      const defaultVault = vaultsList.find((v) => v.isDefault) || vaultsList[0];
      setActiveVaultId((prev) => (prev && vaultsList.some((v) => v.id === prev) ? prev : defaultVault.id));
    }
  };

  // Fetch System Capabilities (R2 status & Secrets validation)
  useEffect(() => {
    apiClient
      .getSystemCapabilities()
      .then((cap) => {
        if (cap) {
          if (typeof cap.r2Available === 'boolean') {
            setIsR2Available(cap.r2Available);
          }
          if (cap.configured === false && Array.isArray(cap.missingSecrets) && cap.missingSecrets.length > 0) {
            setSystemConfigErrors(cap.missingSecrets);
          } else {
            setSystemConfigErrors([]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Zero-Trust Session Initialization from HttpOnly Cookie
  useEffect(() => {
    apiClient
      .initSession()
      .then(async (session) => {
        if (session) {
          setTokenState(session.accessToken);
          setUserIdState(session.user.id);
          setUsernameState(session.user.username);
          setRoleState(session.user.role);
          if (session.user.id) {
            localStorage.setItem('markspace_user_id', session.user.id);
          }
          if (session.user.username) {
            localStorage.setItem('markspace_username', session.user.username);
          }
          if (session.user.role) {
            localStorage.setItem('markspace_user_role', session.user.role);
          }

          try {
            const keysRes = await apiClient.getUserCryptoKeys();
            if (keysRes?.vaults) {
              setUserVaults(keysRes.vaults);
              if (keysRes.vaults.length > 0) {
                const defaultVault = keysRes.vaults.find((v) => v.isDefault) || keysRes.vaults[0];
                setActiveVaultId((prev) => (prev && keysRes.vaults.some((v) => v.id === prev) ? prev : defaultVault.id));
              }
            }
          } catch (_) {}
        } else {
          setTokenState(null);
        }
      })
      .catch(() => {
        setTokenState(null);
      })
      .finally(() => {
        setIsInitializingAuth(false);
      });
  }, []);

  // Wire ApiClient Nonce / Session Violation force logout handler & IP Mutation handler
  useEffect(() => {
    apiClient.setOnForceLogout((reason: string) => {
      setUnlockedVaultKeys({});
      setBoundVaultIps({});
      setActiveVaultId('');
      setTokenState(null);
      setUserIdState(null);
      setUsernameState(null);
      setRoleState(null);
      localStorage.removeItem('markspace_user_id');
      localStorage.removeItem('markspace_username');
      localStorage.removeItem('markspace_user_role');
      setSecurityAlert(reason);
    });

    apiClient.setOnIpChanged((oldIp: string, newIp: string) => {
      setCurrentClientIp(newIp);
      setUnlockedVaultKeys((prevKeys) => {
        const unlockedCount = Object.keys(prevKeys).length;
        if (unlockedCount > 0) {
          setSecurityAlert(
            `Zero-Trust Notice: Client IP address changed from ${oldIp} to ${newIp}. All active vaults have been automatically locked to prevent unauthorized access.`
          );
          setBoundVaultIps({});
          return {};
        }
        return prevKeys;
      });
    });
  }, []);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    apiClient.setToken(newToken || '');
  };

  const setUserId = (id: string | null) => {
    setUserIdState(id);
    if (id) {
      localStorage.setItem('markspace_user_id', id);
    } else {
      localStorage.removeItem('markspace_user_id');
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

    setBoundVaultIps((prev) => {
      const copy = { ...prev };
      if (key) {
        const currentIp = apiClient.getCurrentClientIp() || '127.0.0.1';
        copy[vaultId] = currentIp;
      } else {
        delete copy[vaultId];
      }
      return copy;
    });
  };

  const setCmk = (key: CryptoKey | null) => {
    setVaultKey(activeVaultId, key);
  };

  const lockVault = (vaultId?: string | unknown) => {
    if (typeof vaultId === 'string' && vaultId.trim()) {
      setVaultKey(vaultId.trim(), null);
    } else {
      setUmk(null);
      setUnlockedVaultKeys({});
      setBoundVaultIps({});
    }
  };

  const logoutAccount = () => {
    apiClient.logout();
    setUmk(null);
    setUserVaults([]);
    setUnlockedVaultKeys({});
    setBoundVaultIps({});
    setActiveVaultId('');
    setToken(null);
    setUserId(null);
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
    umk,
    setUmk,
    userVaults,
    setUserVaults,
    unlockAllVaultsWithUmk,
    cmk: activeVmk,
    setCmk,
    unlockedVaultKeys,
    boundVaultIps,
    currentClientIp,
    setVaultKey,
    activeVaultId,
    setActiveVaultId,
    userId,
    setUserId,
    username,
    setUsername,
    role,
    setRole,
    token,
    setToken,
    isAuthenticated: Boolean(token),
    isInitializingAuth,
    isR2Available,
    setIsR2Available,
    systemConfigErrors,
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
