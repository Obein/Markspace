import { useEffect, useRef, useState, useCallback } from 'react';

export type AutoLockAction = 'lock' | 'logout';

export interface UseAutoLockOptions {
  username: string | null;
  isVaultUnlocked: boolean;
  onLockVault: () => void;
  onLogout?: () => void;
  onAutoLocked?: (action: AutoLockAction) => void;
}

export interface UseAutoLockReturn {
  autoLockEnabled: boolean;
  setAutoLockEnabled: (enabled: boolean) => void;
  autoLockMinutes: number;
  setAutoLockMinutes: (minutes: number) => void;
  autoLockAction: AutoLockAction;
  setAutoLockAction: (action: AutoLockAction) => void;
}

export function useAutoLock({
  username,
  isVaultUnlocked,
  onLockVault,
  onLogout,
  onAutoLocked,
}: UseAutoLockOptions): UseAutoLockReturn {
  const userKey = username || 'default';

  const [autoLockEnabled, setAutoLockEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`markspace_auto_lock_enabled_${userKey}`);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`markspace_auto_lock_minutes_${userKey}`);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 1440) {
          return parsed;
        }
      }
    } catch {
      // Fallback to default 15 minutes
    }
    return 15;
  });

  const [autoLockAction, setAutoLockActionState] = useState<AutoLockAction>(() => {
    try {
      const stored = localStorage.getItem(`markspace_auto_lock_action_${userKey}`);
      return stored === 'logout' ? 'logout' : 'lock';
    } catch {
      return 'lock';
    }
  });

  // Sync state when switching users
  useEffect(() => {
    try {
      const storedEnabled = localStorage.getItem(`markspace_auto_lock_enabled_${userKey}`);
      setAutoLockEnabledState(storedEnabled === null ? true : storedEnabled === 'true');

      const storedMins = localStorage.getItem(`markspace_auto_lock_minutes_${userKey}`);
      if (storedMins) {
        const parsed = parseInt(storedMins, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 1440) {
          setAutoLockMinutesState(parsed);
        } else {
          setAutoLockMinutesState(15);
        }
      } else {
        setAutoLockMinutesState(15);
      }

      const storedAction = localStorage.getItem(`markspace_auto_lock_action_${userKey}`);
      setAutoLockActionState(storedAction === 'logout' ? 'logout' : 'lock');
    } catch {
      // ignore
    }
  }, [userKey]);

  const setAutoLockEnabled = useCallback(
    (enabled: boolean) => {
      setAutoLockEnabledState(enabled);
      try {
        localStorage.setItem(`markspace_auto_lock_enabled_${userKey}`, String(enabled));
      } catch {
        // ignore
      }
    },
    [userKey]
  );

  const setAutoLockMinutes = useCallback(
    (mins: number) => {
      const clamped = Math.min(1440, Math.max(1, Math.round(mins)));
      setAutoLockMinutesState(clamped);
      try {
        localStorage.setItem(`markspace_auto_lock_minutes_${userKey}`, String(clamped));
      } catch {
        // ignore
      }
    },
    [userKey]
  );

  const setAutoLockAction = useCallback(
    (action: AutoLockAction) => {
      setAutoLockActionState(action);
      try {
        localStorage.setItem(`markspace_auto_lock_action_${userKey}`, action);
      } catch {
        // ignore
      }
    },
    [userKey]
  );

  const lastActiveRef = useRef<number>(Date.now());
  const onLockVaultRef = useRef(onLockVault);
  const onLogoutRef = useRef(onLogout);
  const onAutoLockedRef = useRef(onAutoLocked);

  useEffect(() => {
    onLockVaultRef.current = onLockVault;
    onLogoutRef.current = onLogout;
    onAutoLockedRef.current = onAutoLocked;
  }, [onLockVault, onLogout, onAutoLocked]);

  // Activity tracking and inactivity timeout loop
  useEffect(() => {
    if (!isVaultUnlocked || !autoLockEnabled) return;

    lastActiveRef.current = Date.now();

    let lastThrottled = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottled > 1000) {
        lastThrottled = now;
        lastActiveRef.current = now;
      }
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
      'pointerdown',
    ];

    for (const ev of events) {
      window.addEventListener(ev, handleUserActivity, { passive: true });
    }

    const interval = setInterval(() => {
      if (!isVaultUnlocked || !autoLockEnabled) return;

      const idleDurationMs = Date.now() - lastActiveRef.current;
      const timeoutMs = autoLockMinutes * 60 * 1000;

      if (idleDurationMs >= timeoutMs) {
        if (autoLockAction === 'logout' && onLogoutRef.current) {
          onLogoutRef.current();
        } else {
          onLockVaultRef.current();
        }

        if (onAutoLockedRef.current) {
          onAutoLockedRef.current(autoLockAction);
        }
        lastActiveRef.current = Date.now();
      }
    }, 2000);

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, handleUserActivity);
      }
      clearInterval(interval);
    };
  }, [isVaultUnlocked, autoLockEnabled, autoLockMinutes, autoLockAction]);

  return {
    autoLockEnabled,
    setAutoLockEnabled,
    autoLockMinutes,
    setAutoLockMinutes,
    autoLockAction,
    setAutoLockAction,
  };
}
