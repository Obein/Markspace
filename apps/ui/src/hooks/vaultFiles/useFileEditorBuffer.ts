import { useState, useCallback } from 'react';
import { VaultFileItem } from '../../interfaces/INoteModels';

export interface UseFileEditorBufferReturn {
  activeFileId: string | null;
  setActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
  activeTitle: string;
  setActiveTitle: React.Dispatch<React.SetStateAction<string>>;
  activeContent: string;
  setActiveContent: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  historyPast: string[];
  historyFuture: string[];
  selectedWordCount: number;
  selectedCharCount: number;
  setSelectedWordCount: React.Dispatch<React.SetStateAction<number>>;
  setSelectedCharCount: React.Dispatch<React.SetStateAction<number>>;
  handleSelectFile: (id: string, files: VaultFileItem[]) => void;
  handleContentChange: (newContent: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  resetEditorBuffer: () => void;
}

export function useFileEditorBuffer(): UseFileEditorBufferReturn {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [activeContent, setActiveContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Undo / Redo History Stack
  const [historyPast, setHistoryPast] = useState<string[]>([]);
  const [historyFuture, setHistoryFuture] = useState<string[]>([]);

  // Selection Stats
  const [selectedWordCount, setSelectedWordCount] = useState(0);
  const [selectedCharCount, setSelectedCharCount] = useState(0);

  const handleSelectFile = useCallback((id: string, files: VaultFileItem[]) => {
    const selected = files.find((f) => f.id === id);
    if (selected) {
      setActiveFileId(id);
      setActiveTitle(selected.filename);
      setActiveContent(selected.content);
      setHistoryPast([]);
      setHistoryFuture([]);
      setSelectedWordCount(0);
      setSelectedCharCount(0);
    }
  }, []);

  const handleContentChange = useCallback(
    (newContent: string) => {
      if (newContent === activeContent) return;
      setHistoryPast((prev) => [...prev.slice(-99), activeContent]);
      setHistoryFuture([]);
      setActiveContent(newContent);
    },
    [activeContent]
  );

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [activeContent, ...prev]);
    setActiveContent(previous);
  }, [historyPast, activeContent]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev.slice(-99), activeContent]);
    setActiveContent(next);
  }, [historyFuture, activeContent]);

  const resetEditorBuffer = useCallback(() => {
    setActiveFileId(null);
    setActiveTitle('');
    setActiveContent('');
    setHistoryPast([]);
    setHistoryFuture([]);
    setSelectedWordCount(0);
    setSelectedCharCount(0);
  }, []);

  return {
    activeFileId,
    setActiveFileId,
    activeTitle,
    setActiveTitle,
    activeContent,
    setActiveContent,
    searchQuery,
    setSearchQuery,
    historyPast,
    historyFuture,
    selectedWordCount,
    selectedCharCount,
    setSelectedWordCount,
    setSelectedCharCount,
    handleSelectFile,
    handleContentChange,
    handleUndo,
    handleRedo,
    resetEditorBuffer,
  };
}
