# backend

**部署中的服务端代码在项目根目录的 `api/`**，不在这里——Vercel Functions 只识别项目根的
`api/` 目录（[docs](https://vercel.com/docs/functions)）。本目录保留给将来**不适合放在 Vercel
Function 里**的服务端代码（长驻进程、队列消费者、数据库迁移等）；目前为空。

## 现有服务端（`api/`）

| 端点 | 用途 | 状态 |
|---|---|---|
| `api/llm.ts` | 代理 LLM 调用（解释 / 答疑 / 摘要） | X1 空实现，返回 501 + `degraded:true`；X5 接入 Router |
| `api/jev.ts` | 代理 Jev 调用（画像抽取 / 契合打分） | X1 空实现，返回 501 + `degraded:true`；X6 接入 |

**它们存在的唯一理由是放密钥。** IB v1 是纯前端无后端；引入 AI 后模型密钥不能进浏览器，
因此新增这两个代理。除此之外，NCEA 与 IB 仍是客户端数据驱动，延续 `localStorage` + URL 分享。

## 两个已经踩过的坑（改 `api/` 前必读）

1. **签名必须是 `export default { fetch(request) }`**（或具名 `export function GET`）。写成裸的
   `export default function handler(request)` 会被运行时当成旧式 `(req, res)` 处理器，
   永远不调用 `res.end()`，请求挂死到超时——不是 500，是没有响应，很难从状态码看出来。
2. **根 `package.json` 必须有 `"type": "module"`**。`api/*.ts` 编译出的是 ESM，没有这一行
   Node 会按 CJS 加载并报 `SyntaxError: Unexpected token 'export'`。

排查手段：`vercel logs <deployment-url>` 能直接看到函数的运行时报错，比猜快得多。

## 安全约束（2026-09-29 自动安全审查后加固）

`api/` 是**无鉴权的公开端点，却持有会计费的 Gateway 密钥**。三道防线：

1. **模型链由服务端推导。** 客户端只发 `task`，服务端从 `frontend/src/config/` 同一份配置算出模型链。
   绝不接受客户端传模型名——那等于把账户开放给任何人跑任意模型，并且会绕过
   `allowTrainsOnDataProviders` 这道隐私门控（门控只在客户端执行就等于没有门控）。
2. **Origin 白名单。** 没有 Origin 的请求（curl、脚本）默认拒绝；需要调试时把来源加进 `ALLOWED_ORIGINS`。
   注意这**不是强鉴权**——Origin 可伪造，它只挡得住「别的网页调用我的端点」。
3. **体积上限 + 值级 PII 闸门。** 消息数、单条长度、总长度都有上限；PII 检查同时查键名**与字符串值**
   （家长的自由提问会把邮箱、学校写进 `content` 这个值里，只查键名完全拦不住）。

**仍然缺的：真正的限流。** 需要外部状态存储（Vercel Firewall 限流或 Upstash），属于要额外决策的
基础设施。在配 `AI_GATEWAY_API_KEY` **之前**这个缺口不产生成本；配上之后应优先补。

**已知边界：** 正则只能识别有固定形状的标识（邮箱、电话、NSN、日期、英文校名）。
**自由文本里的人名（尤其中文名）无法可靠检测**，因此 UI 必须提示家长不要填写姓名。

## 硬性约束

1. **规则判定绝不上服务端做第二份实现。** 唯一实现在 `frontend/src/lib/ib-rules/` 与
   `frontend/src/lib/ncea-rules/`。服务端若需要同样的判定，抽成共享包复用，不要重写——
   两份实现必然漂移。
2. **无 PII 出域。** 发往任何模型的载荷只含去标识化的抽象字段，绝不含姓名、出生日期、学校。
3. **密钥只从环境变量读**，配置文件里只写变量名（见 `frontend/src/config/llm-providers.ts`）。
4. **强制降级。** 任一模型服务不可用，前端必须照常工作——端点返回 `degraded:true`，调用方走模板。

## 环境变量（全部服务端）

```
AI_GATEWAY_API_KEY=     # Vercel AI Gateway 统一鉴权，覆盖 Jev 与各 LLM
```

配置文件只引用变量名；变量缺失时对应供应商视为不可用并降级。
