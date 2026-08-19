import React from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';

interface SearchBarProps {
  /** Current search query value */
  value: string;
  /** Fires whenever the input changes */
  onChange: (query: string) => void;
}

/**
 * Live search bar for filtering the file tree.
 * Self-contained: owns its own icon and i18n placeholder.
 */
export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  const { t } = useI18n();

  return (
    <div className="p-3 border-b border-black/5 dark:border-white/10 shrink-0">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-primaryColor-500/50 font-mono"
        />
      </div>
    </div>
  );
};
