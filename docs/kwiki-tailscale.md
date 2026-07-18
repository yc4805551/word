# Tailscale 私有 WPS 知识库服务

快速画布前端部署在 GitHub Pages。本机服务通过 `kwiki-cli` 查询 WPS 知识库，且只监听回环地址；Tailscale Serve 负责在 Tailnet 内提供 HTTPS 访问。

## 安全边界

- `X_KWIKI_AUTH` 只能存在于服务电脑的 keychain 或服务进程环境中。
- 不要把 WPS 令牌写入 `VITE_*`、GitHub Actions、Git 仓库、浏览器设置或 `localStorage`。
- 服务只绑定 `127.0.0.1`，不要绑定 `0.0.0.0`。
- 使用 `tailscale serve`，不要使用 `tailscale funnel`。
- 用 Tailnet ACL/Grants 只允许指定用户或设备访问服务。

## 启动本机 API

先确保 `kwiki-cli` 在服务用户的 PATH 中，并且该用户可读取 WPS 凭证。

```bash
export KWIKI_API_PORT=8787
export KWIKI_DEFAULT_KUIDS=0s_3125676226
export KWIKI_CORS_ORIGINS=https://yc4805551.github.io,http://localhost:5173
npm run api:kwiki
```

健康检查：

```bash
curl http://127.0.0.1:8787/healthz
```

API 仅支持 `POST /api/associations`。浏览器只发送少量选中文本或光标前内容；服务端固定知识库 ID，调用 `kwiki-cli kwiki knowledge-view-ask`，不会接受客户端传来的命令、令牌或任意知识库 ID。

## 配置 Tailscale Serve

安装并登录 Tailscale 后，先确认设备名称和状态：

```bash
tailscale status
tailscale serve --help
```

按当前 CLI 帮助中的语法，将 Tailnet HTTPS 请求转发到本机 API。例如：

```bash
tailscale serve --https=443 http://127.0.0.1:8787
```

使用 `tailscale serve status` 确认规则。Tailscale 会提供此设备的 `*.ts.net` HTTPS 地址；只有加入 Tailnet 且被 ACL/Grants 授权的设备可以访问它。

## 配置 GitHub Pages 前端

此机器当前的私网 HTTPS 地址为：

```text
https://mac-agent.tail36f59d.ts.net
```

GitHub Pages 构建工作流已使用该地址。设备名称或 Tailnet 改变时，请同步更新 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) 并重新部署。

## 故障排查

- 页面提示本地素材降级：确认本机 API 正在运行、Tailscale 已连接、设备加入正确 Tailnet，且 GitHub Variable 指向正确 HTTPS 地址。
- 浏览器 CORS 失败：确认 `KWIKI_CORS_ORIGINS` 包含 `https://yc4805551.github.io`，并重启本机 API。
- API 上游失败：使用服务用户运行 `kwiki-cli kwiki knowledge-view-list --page-size 1` 检查 WPS 登录状态。不要运行会回显令牌的认证状态命令。
- Tailnet 外设备无法访问：这是预期行为；通过 Tailscale ACL/Grants 添加授权，而不是启用 Funnel。
