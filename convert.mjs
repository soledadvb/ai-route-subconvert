import { parse, stringify } from 'yaml';

// 只从固定的转换服务接收节点，保留本地模板中的规则和策略组。
export const backends = [
  'https://subapi.fxxk.dedyn.io/sub',
  'https://subapi.cmliussss.net/sub',
  'https://api.v1.mk/sub',
];

const excluded = /港|HK|Hong|中国|CN|官网|到期|流量|重置|剩余|套餐|过期|有效期|订阅|网址|公告|Expire|Traffic|Reset/i;
const clients = {
  mihomo: { type: 'application/yaml; charset=utf-8' },
  surge: { target: 'surge', params: { ver: '5' }, type: 'text/plain; charset=utf-8' },
  loon: { target: 'loon', type: 'text/plain; charset=utf-8' },
  quanx: { target: 'quanx', type: 'text/plain; charset=utf-8' },
  shadowrocket: { target: 'shadowrocket', backend: 'https://api.v1.mk/sub', type: 'text/plain; charset=utf-8' },
  singbox: { target: 'singbox', backend: 'https://subapi.fxxk.dedyn.io/sub', type: 'application/json; charset=utf-8' },
  stash: { target: 'clash', params: { clash_new_field_name: 'true', expand: 'false' }, type: 'application/yaml; charset=utf-8' },
};

const aiLists = {
  'category-ai-cn': 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-cn.list',
  openai: 'OpenAI/OpenAI.list',
  anthropic: 'Claude/Claude.list',
  'google-gemini': 'Gemini/Gemini.list',
  xai: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/xai.list',
  perplexity: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/perplexity.list',
  'category-ai-chat-!cn': 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-chat-!cn.list',
};

const aiGroups = {
  openai: ['AI-OpenAI', 'OpenAI'],
  anthropic: ['AI-Claude', 'Claude'],
  'google-gemini': ['AI-Gemini', 'Gemini'],
  xai: ['AI-Grok', 'Twitter'],
  perplexity: ['AI-Perplexity', 'PerplexityAI'],
  'category-ai-chat-!cn': ['AI-Other', 'Proxy'],
};

const serviceLists = {
  ads: [['Ads', 'AdvertisingLite/AdvertisingLite.list']],
  youtube: [['YouTube', 'YouTube/YouTube.list']],
  google: [['Google', 'Google/Google.list']],
  devtools: [
    ['DevTools', 'GitHub/GitHub.list'],
    ['DevTools', 'GitLab/GitLab.list'],
    ['DevTools', 'Atlassian/Atlassian.list'],
  ],
  microsoft: [
    ['Microsoft', 'OneDrive/OneDrive.list'],
    ['Microsoft', 'Microsoft/Microsoft.list'],
  ],
  apple: [
    ['Apple', 'iCloud/iCloud.list'],
    ['Apple', 'Apple/Apple.list'],
  ],
  telegram: [['Telegram', 'Telegram/Telegram.list']],
  netflix: [['Netflix', 'Netflix/Netflix.list']],
  disney: [['Disney', 'Disney/Disney.list']],
  hbo: [['HBO', 'HBO/HBO.list']],
  primevideo: [['PrimeVideo', 'AmazonPrimeVideo/AmazonPrimeVideo.list']],
  spotify: [['Spotify', 'Spotify/Spotify.list']],
  tiktok: [['TikTok', 'TikTok/TikTok.list']],
  twitter: [['Twitter', 'Twitter/Twitter.list']],
  meta: [
    ['Meta', 'Facebook/Facebook.list'],
    ['Meta', 'Instagram/Instagram.list'],
  ],
  discord: [['Discord', 'Discord/Discord.list']],
  reddit: [['Reddit', 'Reddit/Reddit.list']],
  games: [
    ['Games', 'Steam/Steam.list'],
    ['Games', 'Epic/Epic.list'],
    ['Games', 'PlayStation/PlayStation.list'],
    ['Games', 'Xbox/Xbox.list'],
  ],
  bilibili: [['Bilibili', 'BiliBili/BiliBili.list']],
  bahamut: [['Bahamut', 'Bahamut/Bahamut.list']],
  paypal: [['PayPal', 'PayPal/PayPal.list']],
  zoom: [['Zoom', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/zoom.list']],
};

const clashLists = 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/';
const metaLists = 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/';
const singboxLists = 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/';
const singboxServiceLists = {
  ads: [['REJECT', 'category-ads-all']],
  youtube: [['YouTube', 'youtube']],
  google: [['Google', 'google']],
  devtools: [['DevTools', 'github'], ['DevTools', 'gitlab'], ['DevTools', 'atlassian']],
  microsoft: [['Microsoft', 'onedrive'], ['Microsoft', 'microsoft']],
  apple: [['Apple', 'icloud'], ['Apple', 'apple']],
  telegram: [['Telegram', 'telegram']],
  netflix: [['Netflix', 'netflix']],
  disney: [['Disney', 'disney']],
  hbo: [['HBO', 'hbo']],
  primevideo: [['PrimeVideo', 'primevideo']],
  spotify: [['Spotify', 'spotify']],
  tiktok: [['TikTok', 'tiktok']],
  twitter: [['Twitter', 'twitter']],
  meta: [['Meta', 'facebook'], ['Meta', 'instagram']],
  discord: [['Discord', 'discord']],
  reddit: [['Reddit', 'reddit']],
  games: [['Games', 'steam'], ['Games', 'epicgames'], ['Games', 'playstation'], ['Games', 'xbox']],
  bilibili: [['Bilibili', 'bilibili']],
  bahamut: [['Bahamut', 'bahamut']],
  paypal: [['PayPal', 'paypal']],
  zoom: [['Zoom', 'zoom']],
};

function splitList(value) {
  return String(value || '').split(',').filter(Boolean);
}

function customGroup(name, filter, direct = false) {
  return `custom_proxy_group=${name}\`select\`${direct ? '[]DIRECT`' : ''}${filter}`;
}

function ruleList(group, path) {
  return `ruleset=${group},${path.startsWith('https://') ? path : clashLists + path}`;
}

// 该配置只包含分类和规则，不包含用户的订阅地址或节点凭据，可供公共转换后端读取。
export function renderIni(params) {
  const ai = splitList(params.get('ai'));
  const services = splitList(params.get('svc'));
  const groupsOnly = params.get('rules') === '0';
  const noHongKong = params.get('exclude') === '1';
  const nodeFilter = noHongKong
    ? '(?!.*(港|HK|Hong|中国|CN|官网|到期|流量|重置|剩余|套餐|过期|有效期|订阅|网址|公告|Expire|Traffic|Reset)).*'
    : '.*';
  const groups = ['custom_proxy_group=NodeSelect`select`.*'];
  const rules = [];
  const addGroup = (name, filter, direct = false) => {
    const line = customGroup(name, filter, direct);
    if (!groups.includes(line)) groups.push(line);
  };
  const addRule = (group, path) => {
    const line = ruleList(group, path);
    if (!rules.includes(line)) rules.push(line);
  };

  if (!groupsOnly) {
    addRule('DIRECT', metaLists + 'geosite/private.list');
    addRule('DIRECT', metaLists + 'geoip/private.list');
    if (services.includes('ads')) addRule('REJECT', serviceLists.ads[0][1]);
    if (ai.includes('category-ai-cn')) addRule('DIRECT', aiLists['category-ai-cn']);
  }

  for (const key of ai) {
    const group = aiGroups[key];
    if (!group) continue;
    addGroup(group[0], nodeFilter);
    if (!groupsOnly) addRule(group[0], aiLists[key]);
  }

  for (const service of services) {
    if (service === 'ads') continue;
    const entries = serviceLists[service];
    if (!entries) continue;
    const direct = ['microsoft', 'apple', 'bilibili', 'paypal'].includes(service);
    for (const [group, path] of entries) {
      addGroup(group, '.*', direct);
      if (!groupsOnly) addRule(group, path);
    }
  }

  groups.push('custom_proxy_group=Final`select`[]NodeSelect`[]DIRECT');
  if (!groupsOnly) {
    addRule('DIRECT', 'ChinaMax/ChinaMax.list');
    addRule('DIRECT', metaLists + 'geoip/cn.list');
    addRule('NodeSelect', 'Proxy/Proxy.list');
  }
  return [
    '[custom]',
    'enable_rule_generator=true',
    'overwrite_original_rules=true',
    'add_emoji=false',
    '',
    ...groups,
    '',
    ...rules,
    ...(groupsOnly ? [] : ['ruleset=Final,[]FINAL']),
    '',
  ].join('\n');
}

function selectedParams(config) {
  const ai = Object.entries(config['x-ai-route-ai'] || {}).filter(([, on]) => on).map(([key]) => key);
  const services = Object.entries(config['x-ai-route-services'] || {}).filter(([, on]) => on).map(([key]) => key);
  return new URLSearchParams({
    ai: ai.join(','),
    svc: services.join(','),
    exclude: config['x-ai-route-exclude-hk'] === false ? '0' : '1',
  });
}

function addSingboxRules(body, options) {
  const config = JSON.parse(body);
  const route = config.route || (config.route = {});
  const ruleSets = route.rule_set || (route.rule_set = []);
  const tags = new Set(ruleSets.map(rule => rule.tag));
  const rules = [];
  const addRule = (group, kind, name) => {
    const tag = `${kind}-${name}`;
    if (!tags.has(tag)) {
      tags.add(tag);
      ruleSets.push({
        type: 'remote',
        tag,
        format: 'binary',
        url: `https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/${kind}/${name}.srs`,
        download_detour: 'DIRECT',
        update_interval: '1d',
      });
    }
    rules.push({ rule_set: tag, outbound: group });
  };

  addRule('DIRECT', 'geosite', 'private');
  addRule('DIRECT', 'geoip', 'private');
  if (options.services.ads) addRule('REJECT', 'geosite', 'category-ads-all');
  if (options.ai['category-ai-cn']) addRule('DIRECT', 'geosite', 'category-ai-cn');

  const singboxAiNames = {
    openai: 'openai',
    anthropic: 'anthropic',
    'google-gemini': 'google-gemini',
    xai: 'xai',
    perplexity: 'perplexity',
    'category-ai-chat-!cn': 'category-ai-chat-!cn',
  };
  for (const [key, name] of Object.entries(singboxAiNames)) {
    if (options.ai[key]) addRule(aiGroups[key][0], 'geosite', name);
  }

  for (const [key, entries] of Object.entries(singboxServiceLists)) {
    if (key === 'ads' || !options.services[key]) continue;
    for (const [group, name] of entries) addRule(group, 'geosite', name);
  }

  addRule('DIRECT', 'geosite', 'cn');
  addRule('DIRECT', 'geoip', 'cn');
  addRule('NodeSelect', 'geosite', 'geolocation-!cn');
  const current = route.rules || [];
  let offset = 0;
  while (current[offset]?.clash_mode) offset += 1;
  route.rules = [...current.slice(0, offset), ...rules];

  // 上游模板仍带 sing-box 1.14 已移除的旧 DNS/TUN 字段，这里统一迁移为当前结构。
  config.dns = {
    servers: [
      { type: 'udp', tag: 'dns_direct', server: '223.5.5.5' },
      { type: 'udp', tag: 'dns_proxy', server: '1.1.1.1', detour: 'NodeSelect' },
      { type: 'fakeip', tag: 'dns_fakeip', inet4_range: '198.18.0.0/15' },
    ],
    rules: [
      { rule_set: 'geosite-geolocation-!cn', query_type: ['A', 'AAAA'], server: 'dns_fakeip' },
      { rule_set: 'geosite-geolocation-!cn', server: 'dns_proxy' },
    ],
    final: 'dns_direct',
  };
  for (const inbound of config.inbounds || []) {
    if (inbound.type !== 'tun') continue;
    if (inbound.inet4_address) inbound.address = [inbound.inet4_address];
    delete inbound.inet4_address;
    delete inbound.inet6_address;
    delete inbound.sniff;
  }
  route.default_domain_resolver = 'dns_direct';
  route.final = 'Final';
  return JSON.stringify(config, null, 2);
}

function expectedGroups(options) {
  const groups = new Set(['NodeSelect']);
  for (const [key, group] of Object.entries(aiGroups)) {
    if (options.ai[key]) groups.add(group[0]);
  }
  for (const [key, entries] of Object.entries(serviceLists)) {
    if (key === 'ads' || !options.services[key]) continue;
    for (const [group] of entries) groups.add(group);
  }
  return [...groups];
}

function validateNative(client, body, options) {
  const names = expectedGroups(options);
  const actual = client === 'singbox'
    ? new Set((JSON.parse(body).outbounds || []).map(outbound => outbound.tag))
    : null;
  const missing = names.filter(name => actual ? !actual.has(name) : !body.includes(name));
  if (missing.length) throw Error('转换后端未应用分流模板，请更换后端重试。');
}

function nativeClient(client, source, backend, origin, config) {
  const info = clients[client];
  // Shadowrocket 配置输出目前仅在 api.v1.mk 后端可用，其余客户端沿用页面选择的后端。
  const api = new URL(info.backend || backend);
  const params = selectedParams(config);
  if (client === 'singbox') params.set('rules', '0');
  params.set('target', info.target);
  params.set('url', source);
  params.set('config', new URL('/api/rules.ini?' + params, origin).href);
  params.set('list', 'false');
  for (const [key, value] of Object.entries(info.params || {})) params.set(key, value);
  api.search = params.toString();
  return { api, type: info.type };
}

async function readResponse(response, limit) {
  if (!response.ok) throw Error('公共后端未能解析订阅，请检查上游地址或稍后重试。');
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw Error(limit > 2 * 1024 * 1024 ? '转换结果超过大小限制。' : '节点列表超过 2 MiB。');
    }
    chunks.push(value);
  }
  return new Response(new Blob(chunks)).text();
}

export async function convert(text, send = (url, init) => fetch(url, init), origin = 'https://example.com') {
  const config = parse(text, { maxAliasCount: 0 });
  const source = config?.['proxy-providers']?.AirportSub?.url;
  if (typeof source !== 'string' || !Array.isArray(config['proxy-groups']) ||
      !Array.isArray(config.rules)) throw Error('分流模板无效。');
  const upstream = new URL(source);
  if (!['https:', 'ss:', 'vmess:', 'trojan:'].includes(upstream.protocol) ||
      /[\s|]/.test(source)) throw Error('请输入有效的 HTTPS 订阅或节点分享链接。');
  const backend = config['x-ai-route-backend'] || backends[0];
  if (!backends.includes(backend)) throw Error('分流模板中的后端无效。');
  const client = clients[config['x-ai-route-target']] ? config['x-ai-route-target'] : 'mihomo';
  const claude = client === 'mihomo' && config['x-ai-route-claude'] === true;
  const options = {
    ai: config['x-ai-route-ai'] || {},
    services: config['x-ai-route-services'] || {},
  };
  const native = client === 'mihomo' ? null : nativeClient(client, source, backend, origin, config);
  delete config['x-ai-route-backend'];
  delete config['x-ai-route-target'];
  delete config['x-ai-route-ai'];
  delete config['x-ai-route-services'];
  delete config['x-ai-route-exclude-hk'];
  delete config['x-ai-route-claude'];

  const api = native?.api || new URL(backend);
  if (!native) api.search = new URLSearchParams({ target: 'clash', list: 'true', url: source }).toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await send(api.href, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'User-Agent': 'AI-Route-Subconvert/1.1' },
    });
  } catch {
    throw Error('公共后端连接失败或超时。');
  } finally {
    clearTimeout(timer);
  }

  if (native) {
    const body = await readResponse(response, 8 * 1024 * 1024);
    const output = client === 'singbox' ? addSingboxRules(body, options) : body;
    validateNative(client, output, options);
    return { body: output, type: native.type };
  }

  let parsed;
  try {
    parsed = parse(await readResponse(response, 2 * 1024 * 1024), { maxAliasCount: 0 });
  } catch {
    throw Error('公共后端返回了无法解析的 YAML。');
  }
  const nodes = parsed?.proxies;
  if (!Array.isArray(nodes) || !nodes.length || nodes.length > 5000) throw Error('未取得有效节点列表。');
  const groups = config['proxy-groups'];
  const used = new Set(['DIRECT', 'REJECT', 'GLOBAL', 'PASS', 'COMPATIBLE', ...groups.map(group => group.name)]);
  for (const node of nodes) {
    if (typeof node?.name !== 'string' || !node.name.trim() || !node.type || !node.server || !node.port)
      throw Error('转换结果含不完整节点。');
    const name = node.name.trim();
    let index = 1;
    node.name = name;
    while (used.has(node.name)) node.name = name + ' (' + (++index) + ')';
    used.add(node.name);
  }
  for (const group of groups) {
    if (!group.use?.includes('AirportSub')) continue;
    const names = nodes.map(node => node.name).filter(name => !group.filter || !excluded.test(name));
    if (!names.length && !group.proxies?.length) throw Error('节点过滤后分组为空，请关闭节点过滤再生成。');
    if (claude) {
      // 专用模式先选实际代理节点。没有符合条件的节点时，保留 REJECT 防止直连。
      const selectable = nodes.filter(node => names.includes(node.name) &&
        !/^(direct|reject(?:-drop)?|pass|dns|compatible|rematch)$/i.test(node.type));
      group.proxies = [...selectable.map(node => node.name), 'REJECT'];
    } else {
      group.proxies = [...new Set([...(group.proxies || []), ...names])];
    }
    delete group.use;
    delete group.filter;
  }
  delete config['proxy-providers'];
  config.proxies = nodes;
  return { body: stringify(config, { lineWidth: 0 }), type: clients.mihomo.type };
}
