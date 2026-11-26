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
  <a href="#自行部署">☁️ Cloudflare Pages 部署</a> ·
  <a href="https://github.com/soledadvb/ai-route-subconvert/issues">💬 提交问题</a>
</p>

把节点订阅生成带有 AI 和常用服务分流规则的客户端配置。可以直接复制、下载配置，或生成可重复刷新的短订阅链接。

支持 Mihomo、Clash Verge Rev 覆写脚本、Surge 5、Loon、Quantumult X、Shadowrocket、sing-box 和 Stash。非 Mihomo 客户端使用相同选项生成对应格式，AI 分组、香港节点过滤和规则顺序保持不变。

## 快速开始

1. 打开网页，粘贴 HTTPS 节点订阅或 `ss://`、`vmess://`、`trojan://` 节点链接。
2. 在右上角选择目标客户端，再选择转换后端并勾选 AI 与常用服务分类。
3. 点击 **生成订阅链接**，将短链接导入所选客户端。也可以点击 **复制** 或 **下载文件** 直接取得配置。

远程订阅每次刷新都会重新获取最新节点，并应用生成链接时保存的客户端类型和分流选项。修改客户端、选项或切换后端后，重新生成链接即可。

## 分流功能

**Claude 专用模式**适用于 Mihomo YAML、Mihomo 远程订阅和 Clash Verge Rev 覆写脚本。规则依次匹配私有网络、国内域名白名单和广告，其余流量由 `非国内` 策略组处理。国内白名单使用 MetaCubeX 的 `geolocation-cn` 和 `cn` 规则集，命中后直连。「私有网络」默认直连，可切换到 `非国内`。「广告拦截」默认拒绝，可切换到直连。规则集使用页面所选的镜像和同步周期。覆写脚本会替换原有路由规则，并使用配置中内联的节点。没有符合条件的节点时，代理组使用 `REJECT`。节点名称过滤仅供初筛，出口 IP 取决于实际选择的代理节点。已生成的短链接保存原有配置，重新生成后即可使用新版规则。

| 分类 | 支持范围 |
| --- | --- |
| AI | OpenAI、Claude、Gemini、Grok、Perplexity、其他海外 AI 和国内 AI |
| 常用服务 | YouTube、Netflix、Disney+、Prime Video、Spotify、TikTok、Telegram、Google、开发工具等 |
| 基础分流 | 私有网络、国内服务默认直连。非中国默认跟随「节点选择」。广告拦截组可在拦截与直连之间切换 |

- AI 策略组可排除香港、国内节点，以及流量、剩余、到期和重置等提示项。
- 规则集使用 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) 的 `.mrs` 文件，支持 GitHub、镜像和自定义地址。
- Surge、Loon、Quantumult X、Shadowrocket 和 sing-box 使用外部转换后端支持的对应目标格式，分流规则来自 [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) 和 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) 的文本列表。
- Stash 使用 Clash YAML 输出并通过远程 rule provider 引用规则。Shadowrocket 固定使用 `api.v1.mk`，sing-box 固定使用 `subapi.fxxk.dedyn.io`，其余客户端使用页面选择的后端。
- 转换完成后会检查目标客户端配置是否实际包含所选策略组。后端未应用规则时直接提示更换后端，避免把默认配置误当成成功结果。
- **覆写脚本** 模式可为 Clash Verge Rev 已有的订阅添加 AI 分流规则。在网页右侧点击 **查看配置预览** 可展开输出；其他客户端在复制、下载或生成链接时实时转换。

## 订阅地址与转换后端

页面提供 `subapi.fxxk.dedyn.io`、`subapi.cmliussss.net` 和 `api.v1.mk` 三个公共后端。生成或刷新订阅时，所选后端会收到完整上游地址。短链接持有者可以读取生成的节点配置，请私下保管这些链接。

## 自行部署

项目使用 Node.js 22 构建。克隆仓库后执行：

```sh
npm ci
node build.mjs
```

在 Cloudflare Pages 连接 Git 仓库，选择 `main` 为生产分支，构建命令填 `node build.mjs`，输出目录填 `public`。

为启用短链接，在目标环境绑定名为 `SUBSCRIPTIONS` 的 Workers KV 命名空间，并设置 `SUB_LINK_KEY` 机密。用下面的命令生成 64 位十六进制密钥，填入控制台。更换密钥会使之前生成的链接失效。

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

本地预览可使用 `npx wrangler pages dev public --kv=SUBSCRIPTIONS`，在项目根目录的 `.dev.vars` 中填写测试用的 `SUB_LINK_KEY`。线上 API 和 KV 绑定方式见 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/functions/bindings/)。

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
