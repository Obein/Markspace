import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseAutoLockOptions {
  username: string | null;
  isVaultUnlocked: boolean;
  onLockVault: () => void;
  onAutoLocked?: () => void;
}

export interface UseAutoLockReturn {
  autoLockEnabled: boolean;
  setAutoLockEnabled: (enabled: boolean) => void;
  autoLockMinutes: number;
  setAutoLockMinutes: (minutes: number) => void;
}

export function useAutoLock({
  username,
  isVaultUnlocked,
  onLockVault,
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
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 60) {
          return parsed;
        }
      }
    } catch {
      // Fallback to default 15 minutes
    }
    return 15;
  });

  // Sync state when switching users
  useEffect(() => {
    try {
      const storedEnabled = localStorage.getItem(`markspace_auto_lock_enabled_${userKey}`);
      setAutoLockEnabledState(storedEnabled === null ? true : storedEnabled === 'true');

      const storedMins = localStorage.getItem(`markspace_auto_lock_minutes_${userKey}`);
      if (storedMins) {
        const parsed = parseInt(storedMins, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 60) {
          setAutoLockMinutesState(parsed);
          return;
        }
      }
      setAutoLockMinutesState(15);
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
      const clamped = Math.min(60, Math.max(1, Math.round(mins)));
      setAutoLockMinutesState(clamped);
      try {
        localStorage.setItem(`markspace_auto_lock_minutes_${userKey}`, String(clamped));
      } catch {
        // ignore
      }
    },
    [userKey]
  );

  const lastActiveRef = useRef<number>(Date.now());
  const onLockVaultRef = useRef(onLockVault);
  const onAutoLockedRef = useRef(onAutoLocked);

  useEffect(() => {
    onLockVaultRef.current = onLockVault;
    onAutoLockedRef.current = onAutoLocked;
  }, [onLockVault, onAutoLocked]);

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
        onLockVaultRef.current();
        if (onAutoLockedRef.current) {
          onAutoLockedRef.current();
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
  }, [isVaultUnlocked, autoLockEnabled, autoLockMinutes]);

  return {
    autoLockEnabled,
    setAutoLockEnabled,
    autoLockMinutes,
    setAutoLockMinutes,
  };
}
