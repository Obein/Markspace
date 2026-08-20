import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSidebarMobileGesturesProps {
  activeFileId: string | null;
  isLoadingVaultTree?: boolean;
  onSelectFile: (fileId: string) => void;
}

export interface UseSidebarMobileGesturesReturn {
  isMobile: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  handleMobileSelectFile: (fileId: string) => void;
}

export function useSidebarMobileGestures({
  activeFileId,
  isLoadingVaultTree,
  onSelectFile,
}: UseSidebarMobileGesturesProps): UseSidebarMobileGesturesReturn {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(true);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sidebar collapse
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return Boolean(activeFileId);
    }
    return false;
  });

  // Auto-expand sidebar on mobile if entering the main interface with no active file
  const prevVaultTreeLoadingRef = useRef(isLoadingVaultTree);
  useEffect(() => {
    if (!isMobile) return;

    if (prevVaultTreeLoadingRef.current && !isLoadingVaultTree) {
      if (!activeFileId) {
        setIsCollapsed(false);
      }
    }
    prevVaultTreeLoadingRef.current = isLoadingVaultTree;
  }, [isMobile, isLoadingVaultTree, activeFileId]);

  // Touch swipe gestures for mobile (swipe right from edge to open, swipe left to close)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartXRef.current === null || touchStartYRef.current === null) return;
      if (e.changedTouches.length !== 1) return;

      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

      // Only trigger if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        if (isCollapsed) {
          // Swiping right starting within 60px of the screen left edge -> Open drawer
          if (touchStartXRef.current < 60 && deltaX > 40) {
            setIsCollapsed(false);
          }
        } else {
          // Swiping left anywhere when expanded -> Close drawer
          if (deltaX < -40) {
            setIsCollapsed(true);
          }
        }
      }

      touchStartXRef.current = null;
      touchStartYRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isCollapsed]);

  const handleMobileSelectFile = useCallback(
    (fileId: string) => {
      onSelectFile(fileId);
      if (isMobile) setIsCollapsed(true);
    },
    [onSelectFile, isMobile]
  );

  return {
    isMobile,
    isCollapsed,
    setIsCollapsed,
    handleMobileSelectFile,
  };
}
