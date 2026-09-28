# AI 供应商配置层规格 · Jev + 可切换多 LLM（在现有应用之上）

> 交给 **Claude Code**。**细化并取代** `AI-Layering-Spec.md` 中关于 LLM 供应商与配置的部分（§4 的调用方式、§8 集成、§9 类型里 LLM 相关项）；该文件的其余内容——三层职责、数据流、Jev 的 schema（§3）、两条红线、降级策略——**继续有效，不改动**。
> 与 `IB-Course-Selector-Spec.md`、`NCEA-Extension-Spec.md` 同仓库；`CLAUDE.md` 硬规则照样适用。语言：中英双语。上下文：新西兰家长工具，部署在 Vercel。

---

## 0. 目标与红线

**目标**：让 **Jev + LLM** 两层都由**一个配置文件**统管，LLM 供应商（Groq / Gemini / xAI-Grok / 其它 OpenAI 兼容）可**改配置即切换**，无需改业务代码；任一供应商不可用可按链降级。

**红线（沿用 AI-Layering-Spec §0，不可违反）**：
1. **权威永远在规则引擎**——能否文凭/UE/学分/考哪套资格，只由规则引擎判定，绝不经过 Jev 或任何 LLM。
2. **强制降级**——Jev / LLM 均为托管 API，任一挂掉，app 退回纯规则模式照常工作；页面关键路径不依赖任何模型。
3. **无 PII 出域**——只向任何托管 AI 发送去标识化的抽象字段，绝不发姓名/出生日期/学校等（工具涉及未成年人数据，从严）。

---

## 1. 总体形态

```
规则引擎（本地、确定性、权威）
   └─ Jev（类型化决策：抽取/打分/路由/护栏）        —— 配置见 §8
   └─ LLM 层（生成语言：解释/答疑/摘要/叙述）        —— 本文件重点
         └─ LLMRouter：读配置 → 选 provider → 失败按 fallback 链 → 全挂则模板降级
               └─ 单一 OpenAI 兼容适配器（经 Vercel AI Gateway）
                     └─ 模型字符串切换：groq / google / xai / …
```

关键实现观念：**Vercel AI Gateway 提供 OpenAI 兼容的统一入口**，所以"切供应商"在实现上 = **换配置里的一个模型字符串**，业务代码只认 `LLMRouter`，不认任何具体厂商。

---

## 2. 统一配置文件 `src/config/ai.config.ts`

> 服务端读取。密钥只放环境变量，配置里只写 `keyEnv` 名称，绝不写明文密钥。

```jsonc
{
  "jev": {
    "enabled": true,
    "viaGateway": true,
    "gatewayModel": "typesafe/jev",     // verify: TypeSafe/Vercel AI Gateway 上的实际模型 id（早期访问，可能变）
    "keyEnv": "JEV_API_KEY",
    "timeoutMs": 2000
  },
  "llm": {
    "activeProfile": "free",            // ← 全局默认，一处切换
    "profiles": {
      "free":     { "primary": "groq-qwen",    "fallback": ["gemini-flash"] },
      "balanced": { "primary": "gemini-flash", "fallback": ["groq-qwen"] },
      "quality":  { "primary": "gemini-pro",   "fallback": ["groq-llama70b", "groq-qwen"] }
    },
    "taskOverrides": {                   // 可选：按任务覆盖 profile
      "qa":              "balanced",
      "explain":         "free",
      "summarize":       "free",
      "reform_narrative":"free"
    },
    "timeoutMs": 8000,
    "cacheExplanations": true,          // 沿用 AI-Layering §6：LLM 只按需 + 缓存
    "allowTrainsOnDataProviders": false // 隐私门控，见 §7
  }
}
```

**切换方式**：改 `activeProfile`（全局），或改某任务的 `taskOverrides`（局部）。加新供应商=在 §4 注册表加一项、在 profile 里引用其 id，业务代码零改动。

---

## 3. LLM 抽象与路由（`src/lib/ai/llm/`）

```ts
type LLMTask = 'explain' | 'qa' | 'summarize' | 'reform_narrative';
interface LLMMessage { role: 'system'|'user'|'assistant'; content: string; }
interface LLMOptions { temperature?: number; maxTokens?: number; stream?: boolean; }
interface LLMResult { text: string; providerId: string; degraded: boolean; }

interface LLMProvider {                 // 所有供应商统一到这个接口
  id: string;
  complete(messages: LLMMessage[], opts?: LLMOptions): Promise<LLMResult>;
  stream(messages: LLMMessage[], opts?: LLMOptions): AsyncIterable<string>;
}

interface LLMRouter {                    // 业务代码只调它
  run(task: LLMTask, messages: LLMMessage[], opts?: LLMOptions): Promise<LLMResult>;
  stream(task: LLMTask, messages: LLMMessage[], opts?: LLMOptions): AsyncIterable<string>;
}
```

**Router 逻辑**：`task` → 解析 profile（`taskOverrides[task] ?? activeProfile`）→ 取 `primary` providerId → 调用；出错/超时 → 依次试 `fallback`；全部失败 → 返回 `{ degraded: true, text: '' }`，由调用方走**模板降级**（AI-Layering §7）。**因隐私门控被禁用的供应商自动跳过**（§7）。

**适配器**：因目标供应商都 OpenAI 兼容且走 Vercel AI Gateway，实现**一个 `GatewayAdapter`** 即可覆盖 Groq/Gemini/xAI；构造参数只是 `gatewayModel` + `keyEnv`。仅当某供应商需绕过 Gateway 直连时，再加一个 `OpenAICompatibleAdapter(baseUrl)`。

---

## 4. 供应商注册表 `src/config/llm-providers.ts`

> 每项带 `lastVerified` 与来源；**价格/限额/模型阵容会变**（Groq 阵容按季变动），一律标 `// verify`，且**模型名做成配置项、不写死在代码里**。

```jsonc
{
  "groq-qwen": {
    "provider": "groq", "viaGateway": true,
    "gatewayModel": "groq/qwen-...",     // verify 当前 Groq 阵容里的 Qwen 版本；中文优先选 Qwen
    "keyEnv": "GROQ_API_KEY",
    "trainsOnData": false,               // verify Groq 数据政策
    "costTier": "free",
    "limitsHint": { "rpm": 30, "tokensPerDay": 100000 }  // verify
  },
  "groq-llama70b": {
    "provider": "groq", "viaGateway": true,
    "gatewayModel": "groq/llama-3.3-70b-versatile",      // verify
    "keyEnv": "GROQ_API_KEY",
    "trainsOnData": false, "costTier": "free",
    "limitsHint": { "rpm": 30, "tokensPerDay": 100000 }
  },
  "gemini-flash": {
    "provider": "google", "viaGateway": true,
    "gatewayModel": "google/gemini-3-flash",             // verify 当前 Flash 型号
    "keyEnv": "GOOGLE_AI_API_KEY",
    "trainsOnData": true,                // ⚠️ 免费层可能用于训练——verify；受 §7 门控
    "costTier": "free",
    "limitsHint": { "rpm": 15, "requestsPerDay": 1500 }  // verify
  },
  "gemini-pro": {
    "provider": "google", "viaGateway": true,
    "gatewayModel": "google/gemini-3.1-pro",             // verify；付费
    "keyEnv": "GOOGLE_AI_API_KEY",
    "trainsOnData": false, "costTier": "paid", "limitsHint": {}
  },
  "grok": {
    "provider": "xai", "viaGateway": true,
    "gatewayModel": "xai/grok-4-fast",                   // verify
    "keyEnv": "XAI_API_KEY",
    "trainsOnData": false,               // verify
    "costTier": "paid",                  // xAI API 按量付费，非免费层
    "limitsHint": {}
  }
}
```

> 选型结论（依当前调研，见 AI-Layering 讨论）：**免费主力用 `groq-qwen`**（真免费、快、中文强、OpenAI 兼容）；`gemini-flash` 作备选但注意训练数据隐私；`grok` 为付费、这轮不作免费方案。

---

## 5. Profiles 与按任务映射

- **Profile** = 一组"主用 + 备用链"的命名预设（`free`/`balanced`/`quality`）。切 `activeProfile` 即全局换档。
- **taskOverrides** = 给单个任务指定更强/更省的 profile（如 `qa` 用 `balanced`、`explain` 用 `free`）。
- 好处：省钱的解释走免费小模型，需要质量的答疑走更好模型，全在配置里调，无需改代码。

---

## 6. Vercel AI Gateway 集成（推荐路径）

- **统一入口**：所有 LLM（及 Jev）经 Gateway 路由，一处管理密钥、观测、限流；切供应商=换 `gatewayModel` 字符串。
- **观测**：记录每次调用的供应商、延迟、是否降级、token 用量——早期访问阶段用来评估稳定性与额度消耗。
- **密钥**：全部服务端（Vercel Functions / Gateway），绝不进浏览器。
- Gateway 本身可能提供免费额度，配合 Groq 免费层，起步阶段成本可压到极低。

---

## 7. 隐私门控（对应红线 3）

- 每个供应商有 `trainsOnData` 标志。当 `llm.allowTrainsOnDataProviders = false`（默认）时，**Router 跳过所有 `trainsOnData: true` 的供应商**（如 Gemini 免费层），必要时降级到下一个或模板。
- 无论哪个供应商：发送载荷**必须无 PII**（发送前脱敏，有测试断言）。
- 若确要用会训练数据的免费层，需显式把 `allowTrainsOnDataProviders` 设 `true`，并在 UI/文档标注该风险。

---

## 8. Jev 配置（其自身，schema 见 AI-Layering §3）

- Jev **不是** LLM provider（返回类型化决策、非文本、独立 API），故单列 `ai.config.jev`，不进 `llm.profiles`。
- 同样服务端调用、经 Gateway、密钥走环境变量、超时即降级（画像抽取失败→退回 UI 勾选标签；打分失败→退回规则式排序）。
- 具体调用签名以 TypeSafe / Vercel AI Gateway 早期访问文档为准（`// verify API shape`）。

---

## 9. 环境变量（`.env`，全部服务端）
```
JEV_API_KEY=
GROQ_API_KEY=
GOOGLE_AI_API_KEY=
XAI_API_KEY=
VERCEL_AI_GATEWAY_KEY=        # 若走 Gateway 统一鉴权
```
配置文件只引用变量名；缺失时对应供应商视为不可用并降级。

---

## 10. 里程碑（并入 AI-Layering 的 A 系列）
1. **A1.5 供应商层**：`ai.config` + `llm-providers` 注册表 + `LLMRouter` + `GatewayAdapter`；先接一个 provider 跑通。
2. **A2** Jev 抽取/打分接入（配置化、可降级）。
3. **A3** LLM 解释器经 Router；验证**改 `activeProfile` 即切供应商**、无代码改动。
4. **A4+** 路由/护栏/答疑/摘要，按 `taskOverrides` 分配。
5. 全程：隐私门控 + 降级 + 观测。

---

## 11. 验收标准（部分）
- [ ] 仅改 `ai.config.activeProfile`（如 `free`→`balanced`），LLM 供应商随之切换，业务代码零改动。
- [ ] 新增一个 OpenAI 兼容供应商：只需在注册表加一项 + profile 引用，无需改 Router/业务。
- [ ] 主供应商超时/报错 → 自动走 fallback 链；全挂 → 模板降级、UI 不阻塞。
- [ ] `allowTrainsOnDataProviders=false` 时，Router 确实跳过 `trainsOnData:true` 的供应商（有测试）。
- [ ] 发往任何 AI 的载荷无 PII（有测试断言）。
- [ ] 关闭 AI（Jev+LLM 全禁）时，app 作为纯规则工具完整可用。
- [ ] 代码中无写死的具体模型名/密钥；模型名与限额均来自配置且带 `// verify`。

---

## 12. 注意
- 价格、免费额度、速率限制、模型阵容**变动频繁**：注册表数值全部标 `// verify` + `lastVerified`，勿当长期真值。
- **模型名一律配置化**（Groq 阵容按季变）；业务与 Router 不得出现硬编码模型字符串。
- 中文质量是双语解释/答疑的决定因素：免费档优先 Qwen（Groq），其次 Gemini Flash；避免中文偏弱的模型担任 `explain`/`qa` 主力。
- 数据来源（供 `lastVerified`）：各供应商官方定价/限额页 + Vercel AI Gateway 文档 + TypeSafe（Jev）文档。
```
