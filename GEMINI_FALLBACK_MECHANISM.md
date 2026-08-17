# Gemini CLI 自动降级机制

## 当前链路

`/api/gemini-chat` 使用以下顺序：

```text
Gemini CLI
   ↓ 失败、超时、额度/认证错误
DMXAPI 兜底
   ↓ 失败
返回 502/504 错误
```

Gemini CLI 本身可以通过 `GOOGLE_GEMINI_BASE_URL` 连接 cc-switch；因此当没有直连 Gemini API Key 时，可以把 cc-switch 配置为 Gemini CLI 的上游代理。

## 配置方式

### Gemini CLI / cc-switch

推荐把本机配置放在 `~/.gemini/.env`，不要提交到项目：

```bash
GEMINI_API_KEY=your-gemini-api-key
# 没有直连 Gemini API Key 时，使用 cc-switch 的访问凭据
CCSWITCH_API_KEY=your-ccswitch-api-key
CCSWITCH_BASE_URL=http://127.0.0.1:15721
CCSWITCH_MODEL=your-configured-model
```

如果设置了 `GEMINI_API_KEY`，后端优先按直连 Gemini 配置启动 CLI；如果没有设置，则使用 `CCSWITCH_API_KEY` 和 `CCSWITCH_BASE_URL` 启动 CLI。

> cc-switch 当前选中的 provider 必须支持 Gemini CLI 使用的 Gemini 接口和模型。若 cc-switch 返回 403、404、余额不足或上游不可用，系统会进入 DMXAPI 兜底。

### DMXAPI 兜底

通过环境变量配置：

```bash
DMXAPI_BASE_URL=https://www.dmxapi.cn
DMXAPI_API_KEY=your-dmxapi-key
DMXAPI_MODEL=gpt-4o-mini
```

## 启动

```bash
./start-api.sh
```

启动脚本会读取 `~/.gemini/.env`，设置超时和端口，但不会覆盖或写入任何 API Key。

可调参数：

```bash
GEMINI_TIMEOUT_MS=15000
CCSWITCH_TIMEOUT_MS=12000
DMXAPI_TIMEOUT_MS=15000
KWIKI_API_PORT=8787
```

## API 响应

Gemini CLI 成功：

```json
{"answer":"回答内容","provider":"gemini-cli"}
```

Gemini CLI 失败后由 DMXAPI 成功：

```json
{"answer":"回答内容","provider":"dmxapi-fallback"}
```

## 测试

检查 Gemini CLI：

```bash
gemini -p "只回答OK" --model "$GEMINI_CLI_MODEL" --skip-trust
```

检查服务：

```bash
curl -X POST http://127.0.0.1:8787/api/gemini-chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"请只回答OK","documentContext":"","history":[]}'
```

查看日志：

```bash
tail -f /tmp/kwiki-api.log
```

## 安全说明

- API Key 只放在 `~/.gemini/.env` 或启动服务时的环境变量中。
- 不要把 API Key 写进 `start-api.sh`、源码或 Markdown 文档。
- 当前工作区中若出现过旧密钥，建议在对应服务控制台撤销并重新生成。
