<h1 align="center">✨ AI Route Subconvert</h1>

<p align="center"><strong>面向 AI 服务分流的 Mihomo 订阅转换工具</strong></p>

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

把节点订阅生成一份带有 AI 和常用服务分流规则的 Mihomo 配置。可以直接复制、下载 YAML，或生成短订阅链接导入 Clash Verge Rev。

## 快速开始

1. 打开网页，粘贴 HTTPS 节点订阅或 `ss://`、`vmess://`、`trojan://` 节点链接。
2. 选择转换后端，按需要勾选 AI 与常用服务分类。规则同步周期按小时填写，默认 24 小时。
3. 点击 **生成订阅链接**，将短链接作为远程订阅导入 Clash Verge Rev。也可以点击 **复制** 或 **下载文件**，直接获取完整 YAML。

远程订阅每次刷新都会向所选后端获取最新节点，并应用生成链接时选择的分流规则。修改勾选项或切换后端后，重新生成链接即可。

## 分流功能

| 分类 | 支持范围 |
| --- | --- |
| AI | OpenAI、Claude、Gemini、Grok、Perplexity、其他海外 AI 和国内 AI |
| 常用服务 | YouTube、Netflix、Disney+、Prime Video、Spotify、TikTok、Telegram、Google、开发工具等 |
| 基础分流 | 私有网络、国内服务默认直连。非中国默认跟随「节点选择」。广告拦截组可在拦截与直连之间切换 |

- AI 策略组可排除香港、国内节点，以及流量、剩余、到期和重置等提示项。
- 规则集使用 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) 的 `.mrs` 文件，支持 GitHub、镜像和自定义地址。
- **覆写脚本** 模式可为 Clash Verge Rev 已有的订阅添加 AI 分流规则。在网页右侧点击 **查看配置预览** 可展开输出。

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
