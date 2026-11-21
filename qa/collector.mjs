import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const resultsDirectory = 'qa-results';
fs.mkdirSync(resultsDirectory, { recursive: true });

function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const filename = path.join(directory, entry.name);
        return entry.isDirectory() ? files(filename) : [filename];
    });
}

// Отпечаток исходников фиксируется при запуске сборщика.
const sourceHash = crypto.createHash('sha256');
for (const filename of files('src').filter(name => /\.(ts|json|css)$/.test(name)).sort()) {
    sourceHash.update(filename);
    sourceHash.update(fs.readFileSync(filename));
}
const build = {
    version: JSON.parse(fs.readFileSync('package.json', 'utf8')).version,
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    sourceSha256: sourceHash.digest('hex')
};

http.createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5190');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (request.method === 'OPTIONS') {
        response.end();
        return;
    }
    if (request.url !== '/results' || request.method !== 'POST') {
        response.writeHead(404);
        response.end();
        return;
    }

    let body = '';
    request.on('data', chunk => {
        body += chunk;
        if (body.length > 40_000_000) request.destroy();
    });
    request.on('end', () => {
        try {
            const results = JSON.parse(body);
            results.build = build;
            for (const item of results.results) {
                if (!item.image?.startsWith('data:image/png;base64,') || !/^[A-Z0-9-]+$/.test(item.id)) continue;
                fs.writeFileSync(`${resultsDirectory}/${item.id}.png`, Buffer.from(item.image.split(',')[1], 'base64'));
                item.evidence = `${item.id}.png`;
                delete item.image;
            }
            fs.writeFileSync(`${resultsDirectory}/browser.json`, JSON.stringify(results, null, 2) + '\n');
            response.end('saved');
            console.log('Сохранено сценариев:', results.results.length);
        } catch (error) {
            response.writeHead(400);
            response.end(String(error));
        }
    });
}).listen(5191, '127.0.0.1', () => {
    console.log('Сборщик результатов: http://127.0.0.1:5191', build);
});
