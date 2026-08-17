import { VaultFileItem } from '../interfaces/INoteModels';

export function generateRandom4Chars(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function sanitizeFilename(title: string): string {
  let nameWithoutExt = title.trim();
  if (nameWithoutExt.toLowerCase().endsWith('.md')) {
    nameWithoutExt = nameWithoutExt.substring(0, nameWithoutExt.length - 3);
  }
  const clean = nameWithoutExt.toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_');
  return clean || 'note';
}

export function normalizePath(pathStr: string): string {
  const cleaned = pathStr.replace(/\\/g, '/').replace(/\/+/g, '/');
  return cleaned.startsWith('/') ? cleaned : '/' + cleaned;
}

export function downloadSingleFile(file: VaultFileItem): void {
  if (file.blobUrl) {
    const a = document.createElement('a');
    a.href = file.blobUrl;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    const blob = new Blob([file.content], { type: file.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
