import { useState, useEffect, useCallback } from 'react';

const LOCKOUT_TIERS: Record<number, number> = {
  3: 60, // 3 fails = 1 minute
  4: 300, // 4 fails = 5 minutes
  5: 900, // 5 fails = 15 minutes
  6: 3600, // 6+ fails = 60 minutes
};

interface LockoutState {
  failCount: number;
  lockoutUntil: number; // Unix timestamp (ms)
}

export function usePinLockout(vaultId: string, username: string | null) {
  const storageKey = `markspace_lockout_${username || 'anon'}_${vaultId}`;

  const [state, setState] = useState<LockoutState>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return { failCount: 0, lockoutUntil: 0 };
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Reload state when storageKey changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setState(JSON.parse(stored));
        return;
      }
    } catch (_) {}
    setState({ failCount: 0, lockoutUntil: 0 });
  }, [storageKey]);

  // Sync state to localStorage ONLY when active lockout or failures exist
  useEffect(() => {
    try {
      if (state.failCount > 0 || state.lockoutUntil > Date.now()) {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (_) {}
  }, [state, storageKey]);

  // Recalculate remaining lockout seconds every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      if (state.lockoutUntil > now) {
        const secs = Math.ceil((state.lockoutUntil - now) / 1000);
        setRemainingSeconds(secs);
      } else {
        setRemainingSeconds(0);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [state.lockoutUntil]);

  const recordSuccess = useCallback(() => {
    setState({ failCount: 0, lockoutUntil: 0 });
    setRemainingSeconds(0);
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {}
  }, [storageKey]);

  const recordFailure = useCallback(
    (serverTime?: number) => {
      const currentTime = serverTime || Date.now();
      const newFailCount = state.failCount + 1;

      let penaltySeconds = 0;
      if (newFailCount >= 6) {
        penaltySeconds = LOCKOUT_TIERS[6];
      } else if (LOCKOUT_TIERS[newFailCount]) {
        penaltySeconds = LOCKOUT_TIERS[newFailCount];
      }

      const lockoutUntil = penaltySeconds > 0 ? currentTime + penaltySeconds * 1000 : 0;
      setState({ failCount: newFailCount, lockoutUntil });
    },
    [state.failCount]
  );

  return {
    isLockedOut: remainingSeconds > 0,
    remainingSeconds,
    failCount: state.failCount,
    recordSuccess,
    recordFailure,
  };
}
