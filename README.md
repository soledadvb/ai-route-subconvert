# AI Route Subconvert
网页支持选择 subapi.fxxk.dedyn.io、subapi.cmliussss.net 或 api.v1.mk。完整上游地址会发送至所选后端，链接保存后端选择，切换后需要重新生成。配置预览默认折叠，点击「查看配置预览」展开。AI 过滤包含香港、国内，以及流量、到期、重置、剩余等提示名称。


按 AI 服务分类分流的订阅工具。当前版本接入转换后的节点订阅，通过 Cloudflare Pages 生成 Mihomo 配置，内置 OpenAI、Claude、Gemini 等策略组。

## 网页使用

打开部署域名首页，填入节点订阅链接，按需选择 AI 分类和常用服务，然后复制或下载生成的 YAML。Clash Verge Rev 用户也可以切换到覆写脚本模式。

网页文件为 `ai-route-subconvert.html`。Cloudflare Pages 构建时会将它作为站点首页发布。

## 部署到 Cloudflare Pages

在 Cloudflare 控制台进入 **Workers & Pages → Create application → Pages → Connect to Git**，授权 GitHub 并选择本仓库。

| 设置 | 值 |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Root directory | 留空 |
| Build command | `node build.mjs` |
| Build output directory | `public` |

在客户端添加远程配置 `https://<项目名>.pages.dev/api/config`，刷新后在「🚀 节点选择」中查看「演示直连（仅用于测试）」。演示节点会直接连接目标，只用于确认客户端能拉取配置和节点。

## 生成带分流的订阅链接

在 Cloudflare Pages 项目的生产环境添加 Secret `SUB_LINK_KEY`，值为 32 个随机字节组成的 64 位十六进制字符串。可在终端运行以下命令生成，直接粘贴到 Cloudflare 控制台：

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

在生产环境的「绑定」中添加 KV 命名空间，绑定名称填 `SUBSCRIPTIONS`。保存后重新部署。打开首页，填入 HTTPS 节点订阅地址，勾选分流选项，再按「生成订阅链接」。复制地址并作为远程配置导入 Clash Verge。链接保存生成时的配置，之后修改选项需要重新生成。Mihomo 仍按配置定时从上游更新节点。

链接持有者可读取完整配置和其中的节点订阅地址。请私下保存链接。保留同一个 `SUB_LINK_KEY` 才能继续使用已生成的链接，替换密钥会使旧链接失效。短链接使用 KV 保存加密后的配置，访客可用随机链接读取自己生成的配置。原来的长链接仍可读取。

## 配置固定的服务端订阅

在 Pages 项目 **Settings → Variables and Secrets** 的生产环境添加下列两个 Secret，保存后重新部署：

- `NODE_SUB_URL` 填入转换后的 HTTPS 节点订阅地址。
- `CONFIG_KEY` 填入至少 32 字符的随机密钥，建议使用十六进制字符串。

客户端的远程配置地址改为 `https://<项目名>.pages.dev/api/config?key=<CONFIG_KEY>`。该地址用于更新整份配置，Mihomo 也会按模板的 `interval: 3600` 单独刷新节点。以后在 Pages 替换 `NODE_SUB_URL` 并重新部署，客户端继续使用同一个配置地址，更新配置后获取新的节点订阅。

`NODE_SUB_URL` 应指向 Mihomo 可用的节点订阅，例如带有顶层 `proxies:` 的节点 YAML。配置地址和客户端收到的 YAML 都可能包含凭据，请按私有订阅保管。

## 本地预览

运行 `node build.mjs` 后执行 `npx wrangler pages dev public`，访问 Wrangler 打印的本地地址加 `/api/config`。真实订阅可通过本地 `.dev.vars` 注入。
新版网页通过 subapi.fxxk.dedyn.io 转换节点，公共后端会收到完整上游地址。新链接使用 /sub/v3/，每次获取都会重新转换，并将节点写入 proxies 和分流组。旧链接继续使用原先的配置方式。
