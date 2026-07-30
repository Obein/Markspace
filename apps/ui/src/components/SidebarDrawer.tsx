import React from 'react';
import { Plus, Search, FileText, Lock, LogOut, ShieldAlert, Crown } from 'lucide-react';
import { UserRole } from '../interfaces/IApiClient';
import { NoteItem } from '../interfaces/INoteModels';

interface SidebarDrawerProps {
  notes: NoteItem[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onLockVault: () => void;
  onLogoutAccount: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  username: string | null;
  role: UserRole | null;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onLockVault,
  onLogoutAccount,
  searchQuery,
  onSearchChange,
  username,
  role,
}) => {
  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-80 h-[calc(100vh-2rem)] my-4 ml-4 glass-panel rounded-glass-lg border border-white/10 flex flex-col overflow-hidden shrink-0 shadow-2xl">
      {/* Top Brand Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
            M
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight text-white">Markspace</h1>
            <p className="text-[10px] text-zinc-400 font-mono">E2EE EDGE NOTES</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onLockVault}
            title="Lock Data Vault (Wipe CMK Memory)"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-amber-400 transition border border-white/5"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onLogoutAccount}
            title="Logout Account"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-red-400 transition border border-white/5"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action Button & Search */}
      <div className="p-4 space-y-3 border-b border-white/5">
        <button
          onClick={onCreateNote}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/10 border border-blue-400/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition"
          />
        </div>
      </div>

      {/* Note Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredNotes.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 opacity-20" />
            <span>No notes found</span>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isActive = note.id === activeNoteId;
            return (
              <button
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`w-full text-left p-3 rounded-xl transition flex flex-col gap-1 border ${
                  isActive
                    ? 'bg-blue-600/20 border-blue-500/40 text-white'
                    : 'bg-white/0 hover:bg-white/5 border-transparent text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs truncate max-w-[180px]">
                    {note.title || 'Untitled Note'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {new Date(note.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 line-clamp-1">
                  {note.content.substring(0, 60) || 'Empty note...'}
                </p>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom User Profile Footer */}
      <div className="p-3 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2 truncate">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="truncate font-mono">{username || 'Anonymous'}</span>
          {role === 'admin' ? (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <Crown className="w-2.5 h-2.5 text-amber-400" />
              <span>ADMIN</span>
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
              USER
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <ShieldAlert className="w-3 h-3 text-emerald-400" />
          <span>CMK Memory</span>
        </div>
      </div>
    </aside>
  );
};
