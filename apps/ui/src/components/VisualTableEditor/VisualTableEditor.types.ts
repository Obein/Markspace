import { ParsedTableData } from '../../utils/TableConverter';

export interface VisualTableEditorProps {
  initialData?: ParsedTableData | null;
  onSave: (markdownTable: string) => void;
  onClose: () => void;
}

export interface SelectedCellCoord {
  r: number; // -1 for header, 0+ for data row
  c: number;
}
