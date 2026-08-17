import { VaultFileItem } from '../../interfaces/INoteModels';

export interface EditorCanvasProps {
  activeFile: VaultFileItem | null;
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  isPreview: boolean;
  isSplitView: boolean;
  hasBottomCapsule?: boolean;
  onDownloadFile?: () => void;
  onSelectionStatsChange?: (selectedWords: number, selectedChars: number) => void;
}
