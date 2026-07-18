# 公文写作训练系统

基于 React、TypeScript 和 Vite 的公文速录、写作训练和智能快速画布应用，静态前端部署在 GitHub Pages。

## 本地开发

```bash
npm install
npm run dev
```

## WPS 知识库灵感联想

快速画布的“灵感联想”和“写作问答”均可通过一台加入 Tailnet 的本机服务检索 WPS 知识库。GitHub Pages 仅保留公开的服务地址；WPS 凭证始终留在运行服务的电脑上。

1. 在服务电脑安装、登录 `kwiki-cli`，或为服务进程配置非公开的 `X_KWIKI_AUTH`。
2. 配置服务环境变量并启动：

```bash
export KWIKI_API_PORT=8787
export KWIKI_DEFAULT_KUIDS=0s_3125676226
export KWIKI_CORS_ORIGINS=https://yc4805551.github.io,http://localhost:5173
npm run api:kwiki
```

3. 使用 Tailscale Serve 将本机回环服务以 Tailnet HTTPS 地址提供；不要启用 Funnel。
4. GitHub Pages 已使用此机器的 Tailscale HTTPS 地址 `https://mac-agent.tail36f59d.ts.net`；如果设备名称或 Tailnet 发生变化，请同步更新 [部署工作流](.github/workflows/deploy.yml) 并重新部署页面。

详见 [Tailscale 私有 WPS 知识库服务](docs/kwiki-tailscale.md)。

## 构建

```bash
npm run build
```
