const maxYaml = 24 * 1024;
const maxToken = 6000;
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
    await env.SUBSCRIPTIONS.put('v2:' + id, bytes.buffer);
  } catch {
    return fail('Subscription storage is temporarily unavailable.', 503);
  }
  const url = new URL('/sub/v2/' + id, request.url);
  return Response.json({ url: url.href }, { status: 201, headers: privateHeaders });
}

// 链接本身就是访问凭据。读取旧版长链接，同时支持新版随机编号。
async function getSub(request, env) {
  if (request.method !== 'GET') return fail('Method not allowed.', 405, { Allow: 'GET' });
  const path = new URL(request.url).pathname;
  const id = path.slice('/sub/v1/'.length);
  let bytes;
  if (path.startsWith('/sub/v2/')) {
    if (!shortId.test(id)) return fail('Not found.', 404);
    if (!env.SUBSCRIPTIONS) return fail('Subscription storage is unavailable.', 503);
    let encrypted;
    try {
      encrypted = await env.SUBSCRIPTIONS.get('v2:' + id, 'arrayBuffer');
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
    return new Response(stream, {
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/yaml; charset=utf-8',
        // Clash Verge 优先解析 filename*，旧版客户端可读取不带引号的备用名称。
        'Content-Disposition': "attachment; filename=AI-Route-Subconvert; filename*=UTF-8''AI%20Route%20Subconvert",
        'Profile-Title': 'AI Route Subconvert',
      },
    });
  } catch {
    return fail('Not found.', 404);
  }
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
  fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/subscriptions') return createSub(request, env);
    if (path.startsWith('/sub/v1/') || path.startsWith('/sub/v2/')) return getSub(request, env);
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