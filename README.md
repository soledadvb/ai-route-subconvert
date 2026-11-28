<h1 align="center">✨ AI Route Subconvert</h1>

<p align="center"><strong>面向 AI 服务分流的跨客户端订阅转换工具</strong></p>

<p align="center">
  <a href="https://github.com/soledadvb/ai-route-subconvert/stargazers"><img src="https://img.shields.io/github/stars/soledadvb/ai-route-subconvert?style=flat-square&amp;logo=github" alt="GitHub Stars"></a>
  <a href="https://github.com/soledadvb/ai-route-subconvert/releases/latest"><img src="https://img.shields.io/github/v/release/soledadvb/ai-route-subconvert?style=flat-square" alt="最新版本"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/soledadvb/ai-route-subconvert?style=flat-square" alt="MIT 许可证"></a>
</p>

<p align="center">
  <a href="https://ai-route-subconvert.pages.dev/">🌐 在线使用</a> ·
  <a href="#快速开始">🚀 快速开始</a> ·
  <a href="#分流模式">🧭 分流模式</a> ·
  <a href="#自行部署">☁️ Cloudflare Pages 部署</a> ·
  <a href="https://github.com/soledadvb/ai-route-subconvert/issues">💬 提交问题</a>
</p>

将节点订阅转换为带 AI 和常用服务分流规则的客户端配置。支持复制、下载，以及可重复刷新的远程短订阅链接。

## 支持的客户端

| 客户端 | 输出格式 |
| --- | --- |
| Mihomo | 完整 YAML、远程订阅 |
| Clash Verge Rev | Mihomo YAML、全局覆写脚本 |
| Surge 5 | `.conf` |
| Loon | `.conf` |
| Quantumult X | `.conf` |
| Shadowrocket | `.conf` |
| sing-box | JSON |
| Stash | Clash YAML |

普通模式和兜底模式适用于以上全部输出格式。

## 快速开始

1. 打开网页，粘贴 HTTP/HTTPS 节点订阅或 `ss://`、`vmess://`、`trojan://` 节点链接（HTTP 不加密，建议仅用于自建订阅）。
2. 在右上角选择目标客户端。
3. 选择「普通模式」或「兜底模式」，再按需调整 AI、常用服务、镜像和同步周期。
4. 点击 **生成订阅链接**，或使用 **复制**、**下载文件** 导出当前格式。

远程订阅刷新时会重新获取节点，并应用生成链接时保存的客户端类型、分流模式和规则选项。修改客户端或选项后，需要重新生成链接。

## 分流模式

### 普通模式

使用页面勾选的 AI 与常用服务分类。例如 OpenAI、Claude、Gemini、YouTube、Google、Telegram、流媒体和游戏平台等。

- AI 策略组可排除香港、国内和无效提示节点。
- 规则支持 GitHub、jsDelivr 和自定义镜像前缀。
- 基础规则包含私有网络、国内直连、非中国代理和广告拦截。

### 兜底模式

兜底模式先匹配能够明确直连或拦截的地址，剩余流量统一交给 `非国内` 代理组。

```text
私有网络 → DIRECT
国内域名白名单 → DIRECT
广告域名 → REJECT
其他全部流量 → 非国内
```

- 国内白名单使用 MetaCubeX 的 `geolocation-cn` 和 `cn` 规则集。
- 「🏠 私有网络」默认直连，可切换至「非国内」。
- 「🛑 广告拦截」默认拒绝，可切换至直连。
- `非国内` 组默认选择第一个可用节点，没有节点时使用 `REJECT`。
- 规则优先直连已识别的国内域名，IP 直连仅覆盖私有网络。其余流量由代理节点决定出口 IP。
- 已存在的短链接保存旧配置，重新生成后才能使用新版兜底规则。

## 订阅转换后端

页面提供以下公共转换后端：

- `subapi.fxxk.dedyn.io`
- `subapi.cmliussss.net`
- `api.v1.mk`

不同后端支持的输出目标不同。当前 Shadowrocket 固定使用 `api.v1.mk`，sing-box 固定使用 `subapi.fxxk.dedyn.io`，其他客户端使用页面选择的后端。

转换完成后会校验目标配置是否包含所选策略组。后端忽略规则或返回默认配置时，页面会要求更换后端重试。

公共后端会接收完整的节点订阅地址。短链接持有者也能读取生成的配置，请按私有凭据保管订阅和生成链接。

### 访问频率限制

同一客户端 IP 按 Asia/Shanghai 自然日最多获取 5 次配置。限制覆盖 `/api/convert`、`/api/inline`、`/api/subscriptions`、`/sub/v1/*`、`/sub/v2/*`、`/sub/v3/*` 和 `/api/config`。

- 生成短链接并首次读取会分别计入一次。
- `/api/rules.ini` 由转换后端内部调用，不占用用户次数。
- 计数器保存在 `SUBSCRIPTIONS` KV 中，只保存 IP 哈希和计数，不保存原始 IP。
- 使用同一公网 IP 的设备共享这 5 次额度。
- 达到限制后返回 HTTP `429` 和 `Retry-After` 响应头。
- KV 计数在极高并发的瞬间可能存在短暂延迟。

## 规则来源

- [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)
- [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)

Mihomo 使用 `.mrs` 规则集，其他客户端按目标格式转换为远程规则或原生策略组。sing-box 使用远程 `.srs` 规则集。

## 自行部署

项目使用 Node.js 22 构建：

```sh
npm ci
node build.mjs
```

在 Cloudflare Pages 连接 Git 仓库，选择 `main` 为生产分支，构建命令填写 `node build.mjs`，构建输出目录填写 `public`。

### 短订阅链接

绑定名为 `SUBSCRIPTIONS` 的 Workers KV 命名空间，并设置 `SUB_LINK_KEY` 机密。密钥必须是 64 位十六进制字符串：

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

更换 `SUB_LINK_KEY` 会使已有短链接失效。

本地预览：

```sh
npx wrangler pages dev public --kv=SUBSCRIPTIONS
```

在 `.dev.vars` 中填写 `SUB_LINK_KEY`。线上 API 与 KV 绑定说明见 [Cloudflare Pages Functions 文档](https://developers.cloudflare.com/pages/functions/bindings/)。

### 固定 Mihomo 远程配置

如需使用 `/api/config` 固定配置地址，可配置以下环境变量：

- `NODE_SUB_URL`：Mihomo 可用的节点订阅地址。
- `CONFIG_KEY`：至少 32 字符的访问密钥。

访问格式：

```text
https://<项目域名>/api/config?key=<CONFIG_KEY>
```

该模式会保留 `mihomo-config.yaml` 中的策略组和规则，并按配置的 `interval` 刷新节点。

## 本地检查

```sh
node --check convert.mjs
node --check worker.mjs
node build.mjs
```

仓库没有引入测试框架，转换格式的有效性通过各客户端目标、规则引用和客户端内核检查验证。

## 友链

- [Linux.do](https://linux.do/)

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
