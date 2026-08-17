import React from 'react';
import { User } from 'lucide-react';
import { UserRole } from '../../interfaces/IApiClient';

interface UserBadgeProps {
  username: string | null;
  role: UserRole | null;
  onOpenProfile: () => void;
}

export const UserBadge: React.FC<UserBadgeProps> = ({ username, role, onOpenProfile }) => {
  return (
    <button
      onClick={onOpenProfile}
      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition group focus:outline-none shrink-0 cursor-pointer"
      title="Click to open User Profile & Vault Settings"
    >
      <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition">
        <User className="w-3.5 h-3.5 text-blue-400" />
      </div>
      <span className="font-mono text-xs font-semibold text-zinc-200 group-hover:underline">
        {username || 'Anonymous'}
      </span>
      {role === 'admin' ? (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1 shrink-0">
          <span>ADMIN</span>
        </span>
      ) : (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/5 text-zinc-400 border border-white/10 shrink-0">
          USER
        </span>
      )}
    </button>
  );
};
