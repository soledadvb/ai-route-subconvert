import { convert, renderIni } from './convert.mjs';

async function render(text, origin) {
  try {
    const result = await convert(text, undefined, origin);
    return new Response(result.body, { headers: { ...privateHeaders, 'Content-Type': result.type } });
  } catch (err) {
    // 只返回公开的错误信息，避免订阅地址或节点凭据进入响应。
    const reason = /^(公共后端|节点过滤|未取得|节点列表超过|转换结果(?:含|超过)|分流模板|请输入有效|转换后端未应用)/.test(err.message) ? err.message : '上游连接失败或订阅格式不受支持。';
    return fail(reason, 502);
  }
}

const maxYaml = 24 * 1024;
const maxToken = 6000;
const dailyLimit = 5;
const shortId = /^[0-9a-f]{48}$/;
const privateHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
const tokenContext = new TextEncoder().encode('ai-route-subconvert:v1');

// 限制实际读取的请求体大小，避免依赖客户端声明的长度。
async function readBody(request) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const buffer = new Uint8Array(maxYaml);
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return buffer.subarray(0, size);
    if (size + value.length > maxYaml) {
      await reader.cancel();
      return null;
    }
    buffer.set(value, size);
    size += value.length;
  }
}

async function importKey(secret) {
  if (!secret || !/^[0-9a-f]{64}$/i.test(secret)) return null;
  const bytes = Uint8Array.from(secret.match(/../g), pair => parseInt(pair, 16));
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function fail(body, status, headers = {}) {
  return new Response(body, { status, headers: { ...privateHeaders, ...headers } });
}

function limitedPath(path) {
  return path === '/api/config' ||
    ['/api/inline', '/api/convert', '/api/subscriptions'].includes(path) ||
    path.startsWith('/sub/v1/') || path.startsWith('/sub/v2/') || path.startsWith('/sub/v3/');
}

// 按上海时区自然日限制每个客户端 IP。KV 计数在并发突发下可能有短暂延迟。
async function limitRequest(request, env) {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return null;
  if (!env.SUBSCRIPTIONS) return fail('Rate limit storage is unavailable.', 503);

  const utc = new Date();
  const local = new Date(utc.getTime() + 8 * 60 * 60 * 1000);
  const day = local.toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const hash = Array.from(new Uint8Array(digest).slice(0, 16), byte => byte.toString(16).padStart(2, '0')).join('');
  const key = `rate:v1:${day}:${hash}`;

  let count;
  try {
    count = Number(await env.SUBSCRIPTIONS.get(key)) || 0;
  } catch {
    return fail('Rate limit storage is unavailable.', 503);
  }
  if (count >= dailyLimit) {
    const reset = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - 8 * 60 * 60 * 1000;
    return fail('Daily request limit reached. Try again after 00:00 Asia/Shanghai.', 429, {
      'Retry-After': String(Math.max(60, Math.ceil((reset - utc.getTime()) / 1000))),
      'X-RateLimit-Limit': String(dailyLimit),
      'X-RateLimit-Remaining': '0',
    });
  }
  try {
    await env.SUBSCRIPTIONS.put(key, String(count + 1), { expirationTtl: 26 * 60 * 60 });
  } catch {
    return fail('Rate limit storage is unavailable.', 503);
  }
  return null;
}

// 先压缩，再用 AES-GCM 加密。每条链接使用独立随机数，避免同一配置产生相同地址。
async function createSub(request, env) {
  if (request.method !== 'POST') return fail('Method not allowed.', 405, { Allow: 'POST' });
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return fail('Forbidden.', 403);
  }
  if (request.headers.get('Content-Type') !== 'application/yaml') {
    return fail('Unsupported content type.', 415);
  }
  const key = await importKey(env.SUB_LINK_KEY);
  if (!key || !env.SUBSCRIPTIONS) return fail('Subscription storage is unavailable.', 503);
  const body = await readBody(request);
  if (!body) return fail('Configuration too large.', 413);
  const yaml = new TextDecoder().decode(body);
  if (!/^proxy-providers:/m.test(yaml) || !/^proxy-groups:/m.test(yaml) || !/^rules:/m.test(yaml)) {
    return fail('Expected a Mihomo YAML configuration.', 400);
  }
  const path = new URL(request.url).pathname;
  const inline = path === '/api/convert' || path === '/api/inline';
  if (inline) {
    const result = await render(yaml, new URL(request.url).origin);
    if (!result.ok || path === '/api/convert') return result;
  }
  const version = inline ? 'v3' : 'v2';
  const stream = new Blob([body]).stream().pipeThrough(new CompressionStream('gzip'));
  const compressed = await new Response(stream).arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: tokenContext }, key, compressed);
  const bytes = new Uint8Array(iv.length + encrypted.byteLength);
  bytes.set(iv);
  bytes.set(new Uint8Array(encrypted), iv.length);
  // 短链接只携带 192 位随机编号。KV 只保存加密后的配置，不写入明文订阅地址。
  const id = Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => (
    byte.toString(16).padStart(2, '0')
  )).join('');
  try {
    await env.SUBSCRIPTIONS.put(version + ':' + id, bytes.buffer);
  } catch {
    return fail('Subscription storage is temporarily unavailable.', 503);
  }
  const url = new URL('/sub/' + version + '/' + id, request.url);
  return Response.json({ url: url.href }, { status: 201, headers: privateHeaders });
}

// 链接本身就是访问凭据。读取旧版长链接，同时支持新版随机编号。
async function getSub(request, env) {
  if (request.method !== 'GET') return fail('Method not allowed.', 405, { Allow: 'GET' });
  const path = new URL(request.url).pathname;
  const id = path.slice('/sub/v1/'.length);
  let bytes;
  const inline = path.startsWith('/sub/v3/');
  if (inline || path.startsWith('/sub/v2/')) {
    if (!shortId.test(id)) return fail('Not found.', 404);
    if (!env.SUBSCRIPTIONS) return fail('Subscription storage is unavailable.', 503);
    let encrypted;
    try {
      encrypted = await env.SUBSCRIPTIONS.get((inline ? 'v3:' : 'v2:') + id, 'arrayBuffer');
    } catch {
      return fail('Subscription storage is temporarily unavailable.', 503);
    }
    if (!encrypted) return fail('Not found.', 404);
    bytes = new Uint8Array(encrypted);
  } else {
    if (!/^[A-Za-z0-9_-]+$/.test(id) || id.length < 40 || id.length > maxToken) {
      return fail('Not found.', 404);
    }
    try {
      bytes = Uint8Array.from(atob(id.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
    } catch {
      return fail('Not found.', 404);
    }
  }
  const key = await importKey(env.SUB_LINK_KEY);
  if (!key) return fail('Subscription link key is unavailable.', 503);
  try {
    const compressed = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.subarray(0, 12), additionalData: tokenContext }, key, bytes.subarray(12),
    );
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    let output = stream;
    let contentType = 'application/yaml; charset=utf-8';
    if (inline) {
      const rendered = await render(await new Response(stream).text(), new URL(request.url).origin);
      if (!rendered.ok) return rendered;
      output = rendered.body;
      contentType = rendered.headers.get('Content-Type') || contentType;
    }
    const extension = contentType.includes('json') ? 'json' : contentType.includes('yaml') ? 'yaml' : 'conf';
    return new Response(output, {
      headers: {
        ...privateHeaders,
        'Content-Type': contentType,
        // 扩展名与客户端格式一致，便于客户端按配置类型识别下载内容。
        'Content-Disposition': `attachment; filename=AI-Route-Subconvert.${extension}; filename*=UTF-8''AI%20Route%20Subconvert.${extension}`,
        'Profile-Title': 'AI Route Subconvert',
      },
    });
  } catch {
    return fail('Not found.', 404);
  }
}

// 公共转换后端只读取分类和规则，不接收用户订阅，避免规则模板泄露节点凭据。
function rules(request) {
  if (request.method !== 'GET') return fail('Method not allowed.', 405, { Allow: 'GET' });
  return new Response(renderIni(new URL(request.url).searchParams), {
    headers: { ...privateHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function config(request, env) {
  const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
  const url = new URL(request.url);
  let subscription = new URL('/nodes.yaml', url).href;

  // 演示版使用静态节点。接入真实订阅后，只有持有访问密钥的客户端才能取得配置。
  if (env.NODE_SUB_URL) {
    if (!env.CONFIG_KEY || env.CONFIG_KEY.length < 32) {
      return new Response('CONFIG_KEY is missing or too short.', { status: 503, headers });
    }
    if (url.searchParams.get('key') !== env.CONFIG_KEY) {
      return new Response('Not found.', { status: 404, headers });
    }
    let upstream;
    try {
      upstream = new URL(env.NODE_SUB_URL);
    } catch {
      return new Response('Invalid node subscription URL.', { status: 503, headers });
    }
    if (upstream.protocol !== 'https:' || upstream.username || upstream.password) {
      return new Response('The node subscription must use HTTPS.', { status: 503, headers });
    }
    subscription = upstream.href;
  }

  // 从构建产物读取原模板。用带引号的 YAML 字符串写入地址，保留其他分流配置。
  const asset = await env.ASSETS.fetch(new URL('/template.txt', url));
  if (!asset.ok) {
    return new Response('Configuration template unavailable.', { status: 500, headers });
  }
  const template = await asset.text();
  if (!template.includes('__NODE_SUB_URL__')) {
    return new Response('Configuration placeholder missing.', { status: 500, headers });
  }
  return new Response(template.replace('__NODE_SUB_URL__', () => JSON.stringify(subscription)), {
    headers: { ...headers, 'Content-Type': 'application/yaml; charset=utf-8' },
  });
}
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (limitedPath(path)) {
      const limited = await limitRequest(request, env);
      if (limited) return limited;
    }
    if (['/api/inline','/api/convert','/api/subscriptions'].includes(path)) return createSub(request, env);
    if (path.startsWith('/sub/v1/') || path.startsWith('/sub/v2/') || path.startsWith('/sub/v3/')) return getSub(request, env);
    if (path === '/api/rules.ini') return rules(request);
    if (path === '/api/config') {
      if (request.method !== 'GET') {
        return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET' } });
      }
      return config(request, env);
    }
    // 其他路径由 Pages 提供静态文件，包括首页和演示节点。
    return env.ASSETS.fetch(request);
  },
};
