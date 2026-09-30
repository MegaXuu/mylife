// Serveur de développement — sert le projet en local SANS aucun cache HTTP
// (Cache-Control: no-store), ce qui évite le piège décrit dans CLAUDE.md
// (« Lancer / tester ») : `python3 -m http.server` laisse le navigateur
// garder de vieilles versions des fichiers, que le service worker recopie
// ensuite dans son cache. Aucune dépendance.
// Usage : node tools/serve.mjs [port]      (8765 par défaut)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = parseInt(process.argv[2], 10) || 8765;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8'
};

createServer(async (req, res) => {
  try{
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    // Jamais hors du projet (un dossier voisin « mylife-autre » commence aussi
    // par la racine : d'où le séparateur), ni dans ses dossiers techniques.
    if(!file.startsWith(root + sep) || /[\\/](node_modules|\.git|\.claude)([\\/]|$)/.test(file)){ res.writeHead(403).end(); return; }
    if(!(await stat(file)).isFile()) throw new Error('pas un fichier');
    res.writeHead(200, {'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    res.end(await readFile(file));
  }catch(e){
    res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store'}).end('Introuvable');
  }
}).listen(port, () => console.log('MyLife sur http://localhost:' + port));
