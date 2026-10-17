// "Was this file run directly?", done robustly: compares REAL paths.
// (On macOS /var and /tmp are links to /private/...; paths with accents or spaces also
// broke the naive comparison import.meta.url === file://argv[1].)
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}

// Older name.
export const ehPrincipal = isMain;
