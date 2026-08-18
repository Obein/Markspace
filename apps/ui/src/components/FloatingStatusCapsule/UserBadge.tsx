import React from 'react';
import { Shield } from 'lucide-react';
import { UserRole } from '../../interfaces/IApiClient';

interface UserBadgeProps {
  username: string | null;
  role: UserRole | null;
  onOpenProfile: () => void;
  onOpenAdmin?: () => void;
}

export const UserBadge: React.FC<UserBadgeProps> = ({ username, role, onOpenProfile, onOpenAdmin }) => {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={onOpenProfile}
        className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition group focus:outline-none cursor-pointer"
        title="Click to open User Profile"
      >
        <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:underline">
          {username || 'Anonymous'}
        </span>
      </button>

      {role === 'admin' ? (
        <button
          type="button"
          onClick={onOpenAdmin || onOpenProfile}
          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1 shrink-0 transition cursor-pointer"
          title="Open System Administration Console"
        >
          <Shield className="w-2.5 h-2.5" />
          <span>ADMIN</span>
        </button>
      ) : (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-black/5 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border border-black/10 dark:border-white/10 shrink-0">
          USER
        </span>
      )}
    </div>
  );
};
