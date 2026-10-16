// "Este ficheiro foi chamado diretamente?" de forma robusta: compara caminhos REAIS.
// (No macOS /var e /tmp sao links para /private/...; caminhos com acentos ou espacos tambem
// quebravam a comparacao ingenua import.meta.url === file://argv[1].)
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function ehPrincipal(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}
