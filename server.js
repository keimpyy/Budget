const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.sql': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

function send(res, statusCode, body, contentType){
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType || 'text/plain; charset=utf-8'
  });
  res.end(body);
}

function resolvePath(urlPath){
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const relativePath = normalizedPath === path.sep ? 'index.html' : normalizedPath.replace(/^[/\\]+/, '') || 'index.html';
  return path.join(ROOT, relativePath);
}

const server = http.createServer((req, res) => {
  const method = req.method || 'GET';
  if(method !== 'GET' && method !== 'HEAD'){
    send(res, 405, 'Method Not Allowed');
    return;
  }

  const targetPath = resolvePath(req.url || '/');
  if(!targetPath.startsWith(ROOT)){
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(targetPath, (statError, stats) => {
    if(statError){
      send(res, 404, 'Not Found');
      return;
    }

    const filePath = stats.isDirectory()
      ? path.join(targetPath, 'index.html')
      : targetPath;

    fs.readFile(filePath, (readError, contents) => {
      if(readError){
        send(res, 404, 'Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': contentType
      });

      if(method === 'HEAD'){
        res.end();
        return;
      }

      res.end(contents);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Budget app running at http://localhost:${PORT}`);
});
