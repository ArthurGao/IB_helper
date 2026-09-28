# IB 选课助手 · 增量规格（NCEA + AI 层）

> 交给 **Claude Code**。基座（IB 主体）**已完成**，见 `IB-Course-Selector-Spec.md`。本文件是在其之上的**增量**。
> 本文件**合并并取代**之前三份草稿（`NCEA-Extension-Spec`、`AI-Layering-Spec`、`AI-Provider-Config-Spec`）——以已完成的真实结构为准，只用这一份即可。
> 与 IB 规格同仓库、同约定；`CLAUDE.md` 硬规则照样适用。语言：中英双语。上下文：新西兰，部署 Vercel。

---

## 0. 总则与红线

**沿用 IB 规格的约定**：数据驱动（JSON，带 `lastVerified` + 来源）、双语一等公民、规则引擎纯函数 + Vitest 全绿且先于 UI、结果页常驻免责声明、移动优先 + 无障碍。

**红线（不可违反）**：
1. **权威永远在规则引擎**——能否文凭 / UE / 学分达标 / 考哪套资格，只由确定性规则引擎判定，**绝不经过 Jev 或 LLM**。
2. **强制降级**——Jev / LLM 均为托管 API，任一挂掉，app 退回纯规则模式照常工作；页面关键路径不依赖任何模型。
3. **无 PII 出域**——只向任何托管 AI 发送去标识化的抽象字段，绝不发姓名/出生日期/学校（涉及未成年人数据，从严）。
4. **不重构已完成的 IB 部分**——增量以**兄弟模块**插入现有扁平结构（见 §1），不改动 `ib-rules/`、`selectionStore`、现有页面与数据。

---

## 1. 结构对齐（关键：贴合已完成的扁平结构）

已完成结构是扁平式；增量按下列方式插入，**不做 `features/` 重构**：

```
src/
  data/
    ...（现有 IB 数据不动）
    ncea/                         # 新增：NCEA 数据子目录
      ncea-levels.json  ue-requirements.json  ue-approved-subjects.json
      reform-timeline.json  new-qualifications.json  comparison.json
  lib/
    ib-rules/                     # 现有，不动
    ncea-rules/                   # 新增：兄弟目录，纯函数 + Vitest
      checkUniversityEntrance.ts  calcNceaLevel.ts
      resolveQualificationByYear.ts  describeNewQualification.ts  index.ts
      __tests__/*.test.ts
    ai/                           # 新增：AI 编排 + Jev + LLM 路由
      orchestrator.ts  jev/*.ts  llm/{router.ts,gatewayAdapter.ts}  types.ts
  config/                         # 新增
    ai.config.ts  llm-providers.ts
  pages/
    ...（现有不动）
    Ncea.tsx  NceaHowItWorks.tsx  NceaUniversity.tsx
    NceaCalculator.tsx  NceaChanges.tsx  NceaWhichOne.tsx
    Compare.tsx                   # 升级为可跨 IB/NCEA
  locales/{en,zh}/
    ...（现有不动）
    ncea.json  ai.json            # 新增 namespace
  store/
    selectionStore.ts             # 现有不动
    nceaStore.ts                  # 新增：NCEA 计划状态（localStorage + URL 同步，同 IB 模式）
api/                              # 新增：唯一的服务端（Vercel Functions），只为代理 AI 调用
  jev.ts  llm.ts
```

**唯一的架构变化**：IB v1 是"纯前端无后端"。**引入 AI（Jev + LLM）必须有服务端**放密钥——绝不能进浏览器。故新增 `api/`（Vercel Functions）**仅**用于代理模型调用；NCEA 模块与其余部分仍是客户端数据驱动，延续 `localStorage` + URL 分享。

**路由**：新增 `/ncea/*`（见 §2），升级 `/compare`；首页加"IB / NCEA / 我该选哪个"三入口。NCEA 术语并入现有 `/glossary`，改革时间线复用现有 `/updates` 组件模式。

---

## 2. NCEA 模块

> ⚠️ NCEA 现制度还在跑、未来几年才被新资格分阶段取代。本模块须**同时**讲清现行制度与改革，并**按孩子年级**判断考哪一套。改革数值一律标 `// SUBJECT TO CHANGE — verify`。来源限官方：education.govt.nz、ncea.education.govt.nz、NZQA、beehive.govt.nz、各大学 UE 页。

### 2.1 现行 NCEA 详解（/ncea/how-it-works，数据见 2.5）
- 三级：Level 1（≈Yr11）、Level 2（≈Yr12）、Level 3（≈Yr13）。
- 学分制：每级需在**该级或以上**修 60 学分；L2/L3 可含 ≤20 个下一级学分（故 L3=60@L3+20@L2）。**另需单独通过 20 学分读写与算术 co-requisite**（10+10，一次修得、对各级有效、是拿任何一级的"闸门"，常以数字化 CAA 完成，最早 9 年级可考）。〔60/80 各源表述不一，以 NZQA 为准并标注〕
- 标准与评分：achievement standards → Not Achieved/Achieved/Merit/Excellence；unit standards（职业）→ Achieved/Not Achieved。各科重构为 4 标准（2 内 + 2 外）= 20 学分。
- 内部（学校评）+ 外部（统考/作品集，NZQA 审）。
- 背书：证书背书（同级或以上 50 个 M/E 学分）；科目背书（单科 14 个 M/E，含 ≥3 内 + 3 外）。

### 2.2 UE 检查器（/ncea/university，规则见 2.6）
现行 UE = 同时满足四项，缺一不可：
- 取得 **NCEA Level 3**；
- **三门 UE 认可科目**各 ≥14 个 **Level 3** 学分；
- **UE 读写**：Level 2+ 10 学分（≥5 阅读 + 5 写作）；
- **UE 算术**：Level 1+ 10 学分。
UI：家长按科目输入预计 L3 / M-E / 读写 / 算术学分 → 四项实时亮灯 + 缺口。大学/专业另有 rank score 与指定科目，链接官网标"以官网为准"；认可科目清单以 NZQA 为准。

### 2.3 学分与背书估算器（/ncea/calculator）
输入科目 + 各标准预计成绩（N/A/M/E）与学分 → 估算某级总学分是否达标、证书背书档位、各科科目背书。声明为估算、非官方成绩。

### 2.4 "我的孩子考哪一套"年级解析器（/ncea/which-one）— 核心
输入孩子**当前年级 + 当前年份**（或出生年）→ 依改革时间线逐年推算所考资格（NCEA / Foundational Award / NZCE / NZACE），标出关键节点。**逻辑不硬编码日期，全读 `reform-timeline.json`。** 这是本模块对家长最高价值的功能。

### 2.5 数据模型与种子（`src/data/ncea/*`，均带 `lastVerified` + 来源）
```ts
interface NceaLevelInfo {
  level: 1|2|3; typicalYear: number;                 // 11/12/13
  creditsAtLevel: number;                            // 60
  carriedCreditsAllowed: number;                     // 20
  coRequisite: { literacy: number; numeracy: number; note: L10n };  // 10/10
  name: L10n; summary: L10n;
}
interface UEApprovedSubject { code: string; name: L10n; }
interface UERequirement { id: string; label: L10n; rule: L10n; }    // 四项之一
interface NewQualification {
  id: 'foundational'|'nzce'|'nzace'; name: L10n;
  replacesLevel?: 1|2|3; yearLevel?: number;
  minSubjects?: number;               // ≥5（verify）
  minSubjectsToPass?: number;         // ≥3（verify；早期方案曾为 4）
  gradingScale: L10n;                 // A+ 到 E，C 及以上通过（verify）
  assessment: L10n;                   // 内部评估 + 期末统考，每科一个成绩
  status: 'confirmed'|'proposed'|'tbc'; sourceUrl: string; lastVerified: string;
}
interface ReformMilestone { year: number; event: L10n; affectsYearLevel?: number; }
interface ComparisonRow { dimension: L10n; ib: L10n; ncea: L10n; }
```
**改革时间线种子（`reform-timeline.json`）**：新资格 = Foundational Award（读写算术，对标 Yr11）、NZCE（Yr12）、NZACE（Yr13）。节点：2026 定稿资格设计；2028 取消 NCEA Level 1、Yr11 首考 Foundational；2029 Yr12 启用 NZCE；2030 Yr13 启用 NZACE；公布时的 Yr9 届是首个完整走完新体系者，且无学生中途切换。
**新资格结构（`new-qualifications.json`，全标"可能变动"）**：学科制取代学分累积（证书呈现所修科目与成绩）；每年 ≥5 门、通过 ≥3 门（verify）；六级 A+–E、C 及以上通过（verify）；每科内部评估 + 期末统考、一个成绩；需先取得 Foundational Award；含产业共建职业路径。

### 2.6 规则引擎（`src/lib/ncea-rules/`，纯函数 + Vitest 全覆盖）
- `checkUniversityEntrance(plan)` → 四项校验 `{ ueAwarded, components:[{id,met,detail,gap}] }`。
- `calcNceaLevel(subjects)` → 学分达标 / co-requisite / 背书档位。
- `resolveQualificationByYear(yearLevel, calendarYear)` → `[{year,yearLevel,qualification,note}]`，全读时间线数据。
- `describeNewQualification(id)` → 信息级说明；**不做通过/失败判定**（官方未定稿前不实现评分校验）。

---

## 3. AI 层（Jev + 可切换多 LLM）

### 3.1 三层职责与数据流
**规则引擎（权威）＋ Jev（类型化决策）＋ LLM（生成语言）**。
```
家长自由文本
  → [Jev] 护栏分类 + 意图路由
  → [Jev] 抽取学生画像（typed）
  → [规则引擎] 硬校验（合法/UE/文凭）——权威 yes-no
  → [Jev] 只对"通过校验"的组合打契合分 + 排序
  → [LLM] 写成双语解释 / "为什么"
  → 家长追问 → [LLM] grounded 答疑（注入规则结果 + 数据 JSON）
```
一句话：**规则引擎管"能不能"，Jev 管"合不合适"，LLM 管"为什么"。**

### 3.2 Jev（`src/lib/ai/jev/`，schema 是你要定义的输出契约）
> Jev＝TypeSafe AI 的 System One 模型：吃非结构化输入 + 预定义 schema，返回带校准置信度的类型化决策，不生成文本、单次并行、便宜快。**具体 API 签名以 TypeSafe / Vercel AI Gateway 早期访问文档为准**（`// verify API shape`）。全部服务端调用。
```ts
interface StudentProfileExtraction {           // 3.a 画像抽取（P0）
  interests: string[]; strengths: string[];
  workStyle: 'hands_on'|'analytical'|'creative'|'mixed';
  subjectAffinity: { subjectTag: string; affinity: number }[];
  riskTolerance: 'low'|'medium'|'high'; confidence: number;
}
interface FitScoringInput {                     // 3.b 契合打分（P0，即"选课推荐概率"）
  profile: StudentProfileExtraction; targetPathwayIds: string[];
  candidates: { id: string; subjects: {code:string; level:'HL'|'SL'}[] }[];  // 均已 rules-valid
}
interface FitScoringOutput { scores: { id:string; fit:number; confidence:number; drivers:string[] }[]; }
interface IntentRouting { intent:'ib'|'ncea'|'compare'|'qualification_timeline'|'general'; confidence:number; } // P1
interface SoftWarnings { flags:{ id:string; severity:'low'|'med'|'high'; confidence:number }[]; }               // P1
interface Guardrail { safe:boolean; categories:string[]; confidence:number; }                                   // P1，护 LLM 输入输出
```
**约束**：Jev 只对**已过规则校验**的合法组合打分；抽取/打分失败 → 降级（画像退回 UI 勾选标签，打分退回规则式方向匹配排序）。

### 3.3 LLM 多供应商配置（`src/config/` + `src/lib/ai/llm/`）
业务代码只认 `LLMRouter`，**改配置即切供应商**（都 OpenAI 兼容、走 Vercel AI Gateway，切换＝换一个模型字符串）。

`src/config/ai.config.ts`：
```jsonc
{
  "jev": { "enabled": true, "viaGateway": true, "gatewayModel": "typesafe/jev", // verify
           "keyEnv": "JEV_API_KEY", "timeoutMs": 2000 },
  "llm": {
    "activeProfile": "free",                     // ← 一处全局切换
    "profiles": {
      "free":     { "primary": "groq-qwen",    "fallback": ["gemini-flash"] },
      "balanced": { "primary": "gemini-flash", "fallback": ["groq-qwen"] },
      "quality":  { "primary": "gemini-pro",   "fallback": ["groq-llama70b"] }
    },
    "taskOverrides": { "qa": "balanced", "explain": "free", "summarize": "free", "reform_narrative": "free" },
    "timeoutMs": 8000, "cacheExplanations": true,
    "allowTrainsOnDataProviders": false          // 隐私门控
  }
}
```
`src/config/llm-providers.ts`（价格/限额/阵容变动频繁，全标 `// verify`；**模型名一律配置化、不写死**）：
```jsonc
{
  "groq-qwen":    { "provider":"groq","viaGateway":true,"gatewayModel":"groq/qwen-...","keyEnv":"GROQ_API_KEY",
                    "trainsOnData":false,"costTier":"free","limitsHint":{"rpm":30,"tokensPerDay":100000} },
  "groq-llama70b":{ "provider":"groq","viaGateway":true,"gatewayModel":"groq/llama-3.3-70b-versatile","keyEnv":"GROQ_API_KEY",
                    "trainsOnData":false,"costTier":"free" },
  "gemini-flash": { "provider":"google","viaGateway":true,"gatewayModel":"google/gemini-3-flash","keyEnv":"GOOGLE_AI_API_KEY",
                    "trainsOnData":true,"costTier":"free","limitsHint":{"rpm":15,"requestsPerDay":1500} },  // ⚠️免费层或训练数据
  "gemini-pro":   { "provider":"google","viaGateway":true,"gatewayModel":"google/gemini-3.1-pro","keyEnv":"GOOGLE_AI_API_KEY",
                    "trainsOnData":false,"costTier":"paid" },
  "grok":         { "provider":"xai","viaGateway":true,"gatewayModel":"xai/grok-4-fast","keyEnv":"XAI_API_KEY",
                    "trainsOnData":false,"costTier":"paid" }   // API 付费，非免费层
}
```
```ts
type LLMTask = 'explain'|'qa'|'summarize'|'reform_narrative';
interface LLMResult { text: string; providerId: string; degraded: boolean; }
interface LLMRouter {
  run(task: LLMTask, messages, opts?): Promise<LLMResult>;
  stream(task: LLMTask, messages, opts?): AsyncIterable<string>;
}
```
**Router 逻辑**：task → profile(`taskOverrides[task] ?? activeProfile`) → primary → 失败依次 fallback → 全挂返回 `degraded:true`，调用方走模板降级。**因隐私门控禁用的供应商自动跳过。** 适配器只需一个 `GatewayAdapter`（OpenAI 兼容 + Vercel AI Gateway）。

### 3.4 供应商选型（依当前调研）
免费主力 **`groq-qwen`**（真免费、快、中文强、OpenAI 兼容、开源可迁移）；`gemini-flash` 备选但打 `trainsOnData:true`、受隐私门控；`grok` 付费，这轮跳过。中文质量是双语解释/答疑的决定因素，`explain`/`qa` 主力避免中文偏弱模型。

### 3.5 LLM 用途 + Grounding
- **"为什么"解释器（P0）**：注入规则结果 + Jev 的 `drivers` + 相关数据 → 温暖双语解释。**只解释，不断言注入内容里没有的资格结论。**
- **对话答疑（P1，RAG）**：注入 pathways/NCEA 数据 + 当前规则结果；资格问题必须引注入内容，不确定就说"以学校/官网为准"；入 LLM 前过 Guardrail。
- **方案摘要 / 分享文案（P2）**、**改革影响个性化叙述（P2）**：确定性结果来自规则，LLM 只叙述。
- **触发频率**：规则即时本地；Jev 便宜快、可高频（每改一门课重算）；LLM 贵慢、仅按需 + 缓存。

### 3.6 服务端与隐私
- 全部模型调用走 `api/`（Vercel Functions / AI Gateway）；密钥、schema、prompt 不进浏览器。
- 隐私门控：`allowTrainsOnDataProviders=false` 时 Router 跳过 `trainsOnData:true` 供应商；任何载荷发送前 PII 脱敏（写测试断言）。
- 可观测：记录每次调用的供应商/延迟/是否降级/token 用量，评估早期访问阶段稳定性。
- AI 层做成 feature flag，可整体关闭回纯规则模式。

---

## 4. IB vs NCEA 对比（/compare 升级）
并排对比家长关心维度（`comparison.json`，双语中立）：结构（学科制 vs 学分制）、评分、灵活度、国际认可、UE 路径、工作量、适合的学生类型、改革影响（NCEA 在变 / IB 相对稳定）。可选：把已存 IB 方案与 NCEA 计划并列。**中立呈现、不下判断，附"咨询学校"提示。**

---

## 5. 里程碑（接在已完成的 IB M1–M7 之后）

1. **X1 结构与服务端接入**：按 §1 建 `ncea/`、`ncea-rules/`、`ai/`、`config/`、`api/`、新增 locale namespace 与路由；`api/` 空函数 + AI feature flag（默认关）跑通"AI 关掉也照常"。
2. **X2 NCEA 数据 + 规则**：`data/ncea/*.json`（§2.5，全带 `lastVerified` / 来源 / "可能变动"）+ `ncea-rules/*` + Vitest 全绿。
3. **X3 NCEA UI**：/ncea、/ncea/how-it-works、/ncea/university（UE 检查器）、/ncea/calculator。
4. **X4 改革 + 年级解析**：/ncea/changes、/ncea/which-one。
5. **X5 AI 供应商层**：`ai.config` + `llm-providers` + `LLMRouter` + `GatewayAdapter`；接一个 provider 跑通；演示"改 `activeProfile` 即切换、代码零改动"。
6. **X6 Jev 抽取 + 打分**：§3.2 两个 schema 经 `api/jev`；契合排序上线；Jev 挂掉降级正常。
7. **X7 LLM 解释器 + 答疑**：§3.5，经 Router，注入规则结果；LLM 挂掉模板降级。
8. **X8 对比 + 打磨**：/compare 升级、术语/时间线并入、隐私门控与观测、无障碍、移动端。

> 依赖：X5–X7 依赖 IB/NCEA 规则引擎测试全绿；务必先 X2 再 X6/X7。

---

## 6. 验收标准（部分）
- [ ] 增量以兄弟模块插入，**未改动**已完成的 `ib-rules/`、`selectionStore`、现有页面与数据。
- [ ] 关闭 AI feature flag / 断网模型，app（IB + NCEA）作为纯规则工具**完整可用**。
- [ ] 年级解析器：给"2026 年 9 年级"正确推出未来各年所考资格并解释。
- [ ] UE 检查器：四项任缺其一都判为未达 UE 并指出缺口（有测试）。
- [ ] 仅改 `ai.config.activeProfile` 即切换 LLM 供应商，业务代码零改动。
- [ ] `allowTrainsOnDataProviders=false` 时跳过 `trainsOnData:true` 供应商（有测试）。
- [ ] Jev 只对"已过规则校验"的组合打分；LLM 不断言注入内容外的资格结论（有对抗测试）。
- [ ] 发往任何 AI 的载荷无 PII（有测试断言）；模型密钥不在客户端。
- [ ] 改革相关数值带"可能变动/以官方为准"标记与来源；模型名/限额均配置化且带 `// verify`。

---

## 7. 免责声明与数据来源

**NCEA 免责（双语，强调制度在变）**：本工具仅供家庭规划参考，不构成升学建议。现行 NCEA 与 UE 要求以 NZQA 与各大学官网为准；**NCEA 正在改革，替代资格（Foundational Award / NZCE / NZACE）设计仍在最终确定，细节可能变动**，以教育部（education.govt.nz、ncea.education.govt.nz）最新公告为准。涉及学生信息时，仅向 AI 服务发送去标识化特征，不发送可识别个人身份的信息。请咨询学校升学/学业指导老师。

**数据来源（供 `sourceUrl`）**：
- 现行 NCEA：ncea.education.govt.nz、tahatu.govt.nz、NZQA
- UE via NCEA：NZQA UE 页 + 各大学 UE 页
- 改革结构与时间线：education.govt.nz、beehive.govt.nz
- LLM 供应商定价/限额：各供应商官方页 + Vercel AI Gateway 文档
- Jev：TypeSafe AI 文档
```
