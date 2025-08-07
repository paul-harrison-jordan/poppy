export function detectGoogleDriveLink(text: string): string | null {
  // Regex patterns for Google Drive/Docs links
  const patterns = [
    /https?:\/\/docs\.google\.com\/document\/d\/([A-Za-z0-9_-]+)/,
    /https?:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/(?:drive\/)?folders\/([A-Za-z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  // Also check for standalone document IDs if they look like Google IDs
  const standaloneIdPattern = /\b([A-Za-z0-9_-]{20,})\b/;
  const standaloneMatch = text.match(standaloneIdPattern);
  if (standaloneMatch && standaloneMatch[1].length >= 20 && standaloneMatch[1].length <= 50) {
    // This might be a Google Doc ID
    return standaloneMatch[1];
  }

  return null;
}

export function extractGoogleDriveId(url: string): { type: 'document' | 'folder' | 'spreadsheet', id: string } | null {
  const documentMatch = url.match(/\/document\/d\/([A-Za-z0-9_-]+)/);
  if (documentMatch) {
    return { type: 'document', id: documentMatch[1] };
  }

  const spreadsheetMatch = url.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (spreadsheetMatch) {
    return { type: 'spreadsheet', id: spreadsheetMatch[1] };
  }

  const folderMatch = url.match(/\/folders\/([A-Za-z0-9_-]+)/);
  if (folderMatch) {
    return { type: 'folder', id: folderMatch[1] };
  }

  return null;
}