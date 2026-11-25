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