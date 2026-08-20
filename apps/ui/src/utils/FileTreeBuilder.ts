import { FileTreeNode, VaultFileItem } from '../interfaces/INoteModels';

/**
 * Utility building a VSCode-style nested File System Tree from flat file items.
 */
export class FileTreeBuilder {
  static buildTree(files: VaultFileItem[]): FileTreeNode[] {
    const root: FileTreeNode[] = [];
    const folderMap = new Map<string, FileTreeNode>();

    for (const file of files) {
      const isExplicitDirectory = file.mimeType === 'inode/directory' || file.path.endsWith('/');
      const cleanPath = file.path.replace(/^\/+|\/+$/g, '');
      const parts = cleanPath.split('/').filter(Boolean);

      if (parts.length === 0) continue;

      let currentLevel = root;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLast && !isExplicitDirectory) {
          // Leaf File Node
          currentLevel.push({
            id: file.id,
            name: part,
            path: file.path,
            isDirectory: false,
            fileItem: file,
          });
        } else {
          // Directory Node
          let dirNode = folderMap.get(currentPath);
          if (!dirNode) {
            dirNode = {
              id: isExplicitDirectory && isLast ? file.id : `dir_${currentPath}`,
              name: part,
              path: currentPath,
              isDirectory: true,
              children: [],
            };
            folderMap.set(currentPath, dirNode);
            currentLevel.push(dirNode);
          }
          currentLevel = dirNode.children!;
        }
      }
    }

    // Sort folders first, then files alphabetically
    const sortTree = (nodes: FileTreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((n) => {
        if (n.isDirectory && n.children) {
          sortTree(n.children);
        }
      });
    };

    sortTree(root);
    return root;
  }

  static detectCategory(filename: string, mimeType?: string): 'markdown' | 'image' | 'audio' | 'video' | 'binary' {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'md' || ext === 'markdown' || ext === 'txt') return 'markdown';
    if (
      ['webp', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'avif'].includes(ext) ||
      mimeType?.startsWith('image/')
    ) {
      return 'image';
    }
    if (
      ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext) ||
      mimeType?.startsWith('audio/')
    ) {
      return 'audio';
    }
    if (
      ['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(ext) ||
      mimeType?.startsWith('video/')
    ) {
      return 'video';
    }
    return 'binary';
  }

  static detectMimeType(filename: string, fallbackMime?: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      webp: 'image/webp',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      avif: 'image/avif',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      aac: 'audio/aac',
      flac: 'audio/flac',
      m4a: 'audio/mp4',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
      md: 'text/markdown',
      markdown: 'text/markdown',
      txt: 'text/plain',
    };
    if (mimeMap[ext]) return mimeMap[ext];
    if (fallbackMime && fallbackMime !== 'application/octet-stream') return fallbackMime;
    return 'application/octet-stream';
  }
}
