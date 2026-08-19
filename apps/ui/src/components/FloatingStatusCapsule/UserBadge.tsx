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
        className="flex items-center gap-1.5 text-[var(--accent-primary)] hover:opacity-80 transition group focus:outline-none cursor-pointer"
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
          className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-primaryColor-500/15 hover:bg-primaryColor-500/25 text-primaryColor-700 dark:text-primaryColor-300 border border-black/10 dark:border-white/15 backdrop-blur-md flex items-center gap-1 shrink-0 transition cursor-pointer shadow-sm"
          title="Open System Administration Console"
        >
          <Shield className="w-2.5 h-2.5" />
          <span>ADMIN</span>
        </button>
      ) : (
        <span className="px-2 py-0.5 rounded-lg text-[9px] font-semibold bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-black/10 dark:border-white/15 backdrop-blur-md shrink-0">
          USER
        </span>
      )}
    </div>
  );
};
