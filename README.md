# AI Route Subconvert

按 AI 服务分类分流的订阅工具。当前版本接入转换后的节点订阅，通过 Cloudflare Pages 生成 Mihomo 配置，内置 OpenAI、Claude、Gemini 等策略组。

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

## 接入自己的转换订阅

在 Pages 项目 **Settings → Variables and Secrets** 的生产环境添加下列两个 Secret，保存后重新部署：

- `NODE_SUB_URL` 填入转换后的 HTTPS 节点订阅地址。
- `CONFIG_KEY` 填入至少 32 字符的随机密钥，建议使用十六进制字符串。

客户端的远程配置地址改为 `https://<项目名>.pages.dev/api/config?key=<CONFIG_KEY>`。该地址用于更新整份配置，Mihomo 也会按模板的 `interval: 3600` 单独刷新节点。以后在 Pages 替换 `NODE_SUB_URL` 并重新部署，客户端继续使用同一个配置地址，更新配置后获取新的节点订阅。

`NODE_SUB_URL` 应指向 Mihomo 可用的节点订阅，例如带有顶层 `proxies:` 的节点 YAML。配置地址和客户端收到的 YAML 都可能包含凭据，请按私有订阅保管。

## 本地预览

运行 `node build.mjs` 后执行 `npx wrangler pages dev public`，访问 Wrangler 打印的本地地址加 `/api/config`。真实订阅可通过本地 `.dev.vars` 注入。