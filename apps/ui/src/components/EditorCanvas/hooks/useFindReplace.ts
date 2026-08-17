import { useState, useMemo, useCallback, useEffect } from 'react';

interface UseFindReplaceProps {
  content: string;
  onContentChange: (newContent: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useFindReplace({
  content,
  onContentChange,
  textareaRef,
}: UseFindReplaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isWholeWord, setIsWholeWord] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Compute matches and validate regex
  const { matches, regexError } = useMemo(() => {
    if (!searchQuery) {
      return { matches: [], regexError: null };
    }

    try {
      let pattern = searchQuery;
      if (!isRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (isWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      const flags = isCaseSensitive ? 'g' : 'gi';
      const re = new RegExp(pattern, flags);
      const list: Array<{ start: number; end: number }> = [];
      let match: RegExpExecArray | null;

      while ((match = re.exec(content)) !== null) {
        list.push({ start: match.index, end: match.index + match[0].length });
        if (match[0].length === 0) {
          re.lastIndex++;
        }
      }

      return { matches: list, regexError: null };
    } catch (err: any) {
      return { matches: [], regexError: err?.message || 'Invalid regex' };
    }
  }, [content, searchQuery, isRegex, isCaseSensitive, isWholeWord]);

  // Ensure currentMatchIndex stays in bounds
  useEffect(() => {
    if (matches.length === 0) {
      setCurrentMatchIndex(0);
    } else if (currentMatchIndex >= matches.length) {
      setCurrentMatchIndex(matches.length - 1);
    }
  }, [matches.length, currentMatchIndex]);

  // Jump to specific match in textarea
  const jumpToMatch = useCallback(
    (index: number) => {
      if (matches.length === 0 || index < 0 || index >= matches.length) return;
      const target = matches[index];
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.focus();
      textarea.setSelectionRange(target.start, target.end);
      setCurrentMatchIndex(index);
    },
    [matches, textareaRef]
  );

  const findNext = useCallback(() => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    jumpToMatch(nextIdx);
  }, [matches.length, currentMatchIndex, jumpToMatch]);

  const findPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    jumpToMatch(prevIdx);
  }, [matches.length, currentMatchIndex, jumpToMatch]);

  const replaceCurrent = useCallback(() => {
    if (matches.length === 0 || currentMatchIndex >= matches.length) return;
    const match = matches[currentMatchIndex];

    try {
      let replacement = replaceQuery;
      if (isRegex) {
        let pattern = searchQuery;
        if (isWholeWord) pattern = `\\b${pattern}\\b`;
        const flags = isCaseSensitive ? '' : 'i';
        const re = new RegExp(pattern, flags);
        const matchedSnippet = content.substring(match.start, match.end);
        replacement = matchedSnippet.replace(re, replaceQuery);
      }

      const newContent =
        content.substring(0, match.start) + replacement + content.substring(match.end);
      onContentChange(newContent);

      // Focus textarea with updated selection
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(match.start, match.start + replacement.length);
        }
      }, 0);
    } catch (err) {
      console.warn('Replace error:', err);
    }
  }, [
    matches,
    currentMatchIndex,
    replaceQuery,
    isRegex,
    searchQuery,
    isWholeWord,
    isCaseSensitive,
    content,
    onContentChange,
    textareaRef,
  ]);

  const replaceAll = useCallback(() => {
    if (!searchQuery || matches.length === 0) return;

    try {
      let pattern = searchQuery;
      if (!isRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (isWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      const flags = isCaseSensitive ? 'g' : 'gi';
      const re = new RegExp(pattern, flags);

      let newContent = '';
      if (isRegex) {
        newContent = content.replace(re, replaceQuery);
      } else {
        newContent = content.replace(re, () => replaceQuery);
      }

      onContentChange(newContent);
    } catch (err) {
      console.warn('Replace all error:', err);
    }
  }, [searchQuery, matches.length, isRegex, isWholeWord, isCaseSensitive, content, replaceQuery, onContentChange]);

  const openFind = useCallback(() => {
    setIsOpen(true);
    setIsReplaceMode(false);
  }, []);

  const openReplace = useCallback(() => {
    setIsOpen(true);
    setIsReplaceMode(true);
  }, []);

  const closeFindReplace = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    isReplaceMode,
    setIsReplaceMode,
    searchQuery,
    setSearchQuery,
    replaceQuery,
    setReplaceQuery,
    isRegex,
    setIsRegex,
    isCaseSensitive,
    setIsCaseSensitive,
    isWholeWord,
    setIsWholeWord,
    matches,
    currentMatchIndex,
    regexError,
    findNext,
    findPrev,
    replaceCurrent,
    replaceAll,
    openFind,
    openReplace,
    closeFindReplace,
    jumpToMatch,
  };
}
