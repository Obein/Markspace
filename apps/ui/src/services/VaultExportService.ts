import { NoteItem } from '../interfaces/INoteModels';

/**
 * Service to export active Vault notes and assets into local files.
 */
export class VaultExportService {
  /**
   * Export all notes in vault as an archive package or batch file download.
   */
  static exportVault(vaultName: string, notes: NoteItem[]): void {
    if (notes.length === 0) {
      alert('Vault is empty. Nothing to export.');
      return;
    }

    // Create a structured export payload
    const exportBundle = {
      vaultName,
      exportedAt: new Date().toISOString(),
      totalNotes: notes.length,
      notes: notes.map((n) => ({
        filename: n.filename.endsWith('.md') ? n.filename : `${n.filename}.md`,
        title: n.title,
        content: n.content,
        updatedAt: new Date(n.updatedAt).toISOString(),
      })),
    };

    const jsonBlob = new Blob([JSON.stringify(exportBundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(jsonBlob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${vaultName.toLowerCase().replace(/\s+/g, '_')}_export_${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    // Also download individual markdown files
    notes.forEach((note, idx) => {
      setTimeout(() => {
        const fileName = note.filename.endsWith('.md') ? note.filename : `${note.filename}.md`;
        const mdBlob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' });
        const mdUrl = URL.createObjectURL(mdBlob);
        const a = document.createElement('a');
        a.href = mdUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(mdUrl);
      }, idx * 150);
    });
  }
}
