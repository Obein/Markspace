import { FileTreeNode, VaultFileItem } from '../interfaces/INoteModels';

/**
 * Utility building a VSCode-style nested File System Tree from flat file items.
 */
export class FileTreeBuilder {
  static buildTree(files: VaultFileItem[]): FileTreeNode[] {
    const root: FileTreeNode[] = [];
    const folderMap = new Map<string, FileTreeNode>();

    for (const file of files) {
      const parts = file.path.split('/').filter(Boolean);
      let currentLevel = root;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLast) {
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
              id: `dir_${currentPath}`,
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
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || mimeType?.startsWith('image/')) return 'image';
    if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext) || mimeType?.startsWith('audio/')) return 'audio';
    if (['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(ext) || mimeType?.startsWith('video/')) return 'video';
    return 'binary';
  }
}
