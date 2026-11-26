import { parse, stringify } from 'yaml';

// 只从固定的转换服务接收节点，保留本地模板中的规则和策略组。
export const backends = [
  'https://subapi.fxxk.dedyn.io/sub',
  'https://subapi.cmliussss.net/sub',
  'https://api.v1.mk/sub',
];
const excluded = /港|HK|Hong|中国|CN|官网|到期|流量|重置|剩余|套餐|过期|有效期|订阅|网址|公告|Expire|Traffic|Reset/i;

export async function convert(text, send = (url, init) => fetch(url, init)) {
  const config = parse(text, { maxAliasCount: 0 });
  const source = config?.['proxy-providers']?.AirportSub?.url;
  if (typeof source !== 'string' || !Array.isArray(config['proxy-groups']) ||
      !Array.isArray(config.rules)) throw Error('分流模板无效。');
  const upstream = new URL(source);
  if (!['https:', 'ss:', 'vmess:', 'trojan:'].includes(upstream.protocol) ||
      /[\s|]/.test(source)) throw Error('请输入有效的 HTTPS 订阅或节点分享链接。');
  // 链接记录用户选择的后端。固定名单防止被当作任意服务器的请求转发接口。
  const endpoint = config['x-ai-route-backend'] || backends[0];
  if (!backends.includes(endpoint)) throw Error('分流模板中的后端无效。');
  delete config['x-ai-route-backend'];
  const api = new URL(endpoint);
  api.search = new URLSearchParams({ target: 'clash', list: 'true', url: source }).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await send(api.href, { redirect: 'manual', signal: controller.signal,
      headers: { 'User-Agent': 'AI-Route-Subconvert/1.0' } });
  } catch {
    throw Error('公共后端连接失败或超时。');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw Error('公共后端未能解析订阅，请检查上游地址或稍后重试。');
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2 * 1024 * 1024) {
      await reader.cancel();
      throw Error('节点列表超过 2 MiB。');
    }
    chunks.push(value);
  }
  let parsed;
  try {
    parsed = parse(await new Response(new Blob(chunks)).text(), { maxAliasCount: 0 });
  } catch {
    throw Error('公共后端返回了无法解析的 YAML。');
  }
  const nodes = parsed?.proxies;
  if (!Array.isArray(nodes) || !nodes.length || nodes.length > 5000) throw Error('未取得有效节点列表。');
  const groups = config['proxy-groups'];
  const used = new Set(['DIRECT','REJECT','GLOBAL','PASS','COMPATIBLE', ...groups.map(g => g.name)]);
  for (const node of nodes) {
    if (typeof node?.name !== 'string' || !node.name.trim() || !node.type || !node.server || !node.port)
      throw Error('转换结果含不完整节点。');
    // 同名节点分别保留，防止与策略组或内置策略重名。
    const name = node.name.trim();
    let index = 1;
    node.name = name;
    while (used.has(node.name)) node.name = name + ' (' + (++index) + ')';
    used.add(node.name);
  }
  for (const group of groups) {
    if (!group.use?.includes('AirportSub')) continue;
    const names = nodes.map(n => n.name).filter(name => !group.filter || !excluded.test(name));
    if (!names.length && !group.proxies?.length) throw Error('节点过滤后分组为空，请关闭节点过滤再生成。');
    group.proxies = [...new Set([...(group.proxies || []), ...names])];
    delete group.use;
    delete group.filter;
  }
  delete config['proxy-providers'];
  config.proxies = nodes;
  return stringify(config, { lineWidth: 0 });
}
