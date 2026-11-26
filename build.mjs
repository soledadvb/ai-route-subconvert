import { build } from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const file = new URL('./mihomo-config.yaml', import.meta.url);
const config = await readFile(file, 'utf8');
const provider = /(^  AirportSub:\r?\n    type: http\r?\n    url: )"([^"\r\n]+)"/m;

// 只替换 AirportSub 的占位地址，避免把本地真实订阅发布到静态目录。
const match = config.match(provider);
if (!match || new URL(match[2]).origin !== 'https://example.com') {
  throw new Error('AirportSub must use the https://example.com placeholder.');
}
await build({ entryPoints: ['worker.mjs'], bundle: true, format: 'esm', platform: 'browser', outfile: 'public/_worker.js' });
const template = config.replace(provider, '$1__NODE_SUB_URL__');
await mkdir(new URL('./public/', import.meta.url), { recursive: true });
await writeFile(new URL('./public/template.txt', import.meta.url), template, 'utf8');
for (const [source, target] of [['ai-route-subconvert.html', 'index.html'], ['nodes.yaml', 'nodes.yaml']]) {
  await copyFile(new URL('./' + source, import.meta.url), new URL('./public/' + target, import.meta.url));
}