# AGENTS.md

给编码 agent（Codex 等）的常驻工作约定。完整需求见根目录 `IB-Course-Selector-Spec.md`（下称"规格"）——本文件只列**每轮都适用的规则**，不重复规格内容。

`CLAUDE.md` 与本文件内容等价（供 Claude Code 读取），改动时**两份都要改**。

## 项目

IB 选课助手：帮助**家长**理解 IB 结构、模拟选课、校验文凭要求与目标大学方向。纯前端、双语（中/英）、面向新西兰升学场景。

线上地址：https://ib-helper-gamma.vercel.app （公开可访问）

知识库：`~/Docs/Knowledgebase/IB_helper/` —— 已核实的 IB 事实、架构决策与未决问题都记在那里，**动数据或规则前先看**。

## 目录结构（2026-09-21 重构为前后端分离）

```
.
├── frontend/          # 当前全部代码：Vite + React 18 + TS + Tailwind v4 + Vitest
│   ├── src/
│   │   ├── data/      # IB 数据（JSON）—— 唯一事实来源
│   │   ├── lib/       # 规则引擎、评估入口、分享、埋点（纯函数）
│   │   ├── locales/   # i18n（en / zh）
│   │   ├── components/ pages/ store/ hooks/ types/
│   │   └── ...
│   └── package.json
├── backend/           # 预留，目前只有 README；v1 不需要后端
├── vercel.json        # 根级构建配置，产物为 frontend/dist
└── package.json       # 根级脚本，全部代理到 frontend
```

**在哪写代码**：一律在 `frontend/`。`backend/` 目前是空的，动它之前先读 `backend/README.md` 并与我确认技术栈。

## 硬性规则（不可违反）

1. **不臆造事实。** IB 课程结构、评分/失败条件阈值、TOK/EE 矩阵、大学要求、学校列表——一律来自 `frontend/src/data/*.json`，绝不凭记忆写进组件或逻辑。缺数据就停下来问我，不要编。
2. **事实要核实并留痕。** 每条数据带 `_verify: { status, sourceUrl, note }`。已核实写 `verified` + 官方 URL + 核实日期；未核实写 `unverified` 并说明缺什么。**由已知事实推导出来的结论**（例如「ESS 新大纲 2026 首考 → 2025 及更早只有 SL」）必须在 note 里写明是推导，不是官方原话。
   - ibo.org 会挡 curl/WebFetch（403），用浏览器工具读。
3. **数据文件三件套。** 每个 `frontend/src/data/*.json` 顶部含 `lastVerified`（ISO 日期）与 `sourceUrl`；所有名称类字段用 `{ "en": "...", "zh": "..." }` 双语对象。
4. **规则引擎纯净且测试优先。** `frontend/src/lib/ib-rules/` 全部是纯函数、零 UI 依赖、数据可注入。**先写函数 + Vitest 测试，再写调用它的 UI。**
5. **评估只有一个入口。** 任何页面要判断一个方案，必须调用 `frontend/src/lib/evaluatePlan.ts` 的 `evaluatePlan()`，**不要**自己拼 `validateStructure` + `evaluateDiploma`——曾经对比页自己拼了一份，导致同一方案在两页结论矛盾。总分一律经 `displayTotal()` 输出。
6. **不确定就说不确定。** 阈值未核实 → `indeterminate`；科目数不对或结构非法 → `incomplete`。**绝不**把「未核实」或「没选完」当成「通过」。
7. **不把建议说成必需。** `pathways.json` 是通用选课参考，全部放 `recommendedHL`，`requiredHL` 留空；只有「具体大学 + 具体专业 + 入学年份」级别已核实的规则才配用 `requiredHL`。UI 措辞用 `meets / partial / not-met`，不用 open / closed。
8. **i18n 无死角。** 所有面向用户的文案走 `frontend/src/locales/{en,zh}/*.json`，不硬编码中文或英文字符串。引擎返回 i18n key（`RuleMessage.id`），数据驱动的文案返回 JSON 里的双语 `msg`。中英 key 集合必须完全一致（有测试守）。
9. **免责声明常驻。** 布局里固定展示规格第 15 节的双语免责声明。

## 代码规范

- TypeScript **strict 模式**，禁止 `any`（确需时用 `unknown` + 收窄）。lint 规则 `typescript/no-explicit-any: error`。
- 组件函数式 + Hooks；状态用 zustand（`frontend/src/store/`），持久化到 `localStorage`。
- 颜色语义化（绿/琥珀/红）但**不只靠颜色**，配图标或文字（用 `StatusPill`）。
- 移动优先、响应式；交互给即时反馈。容器 `max-w-7xl`，宽屏分栏而不是把单列拉宽。
- 命名清晰，注释解释"为什么"而非"是什么"。

## 命令（根目录执行，自动代理到 frontend）

```bash
npm run dev        # 本地开发（加 -- --host 可用手机在同一 Wi-Fi 访问）
npm run build      # 生产构建
npm run test       # Vitest
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm run verify     # typecheck + lint + test + build，提交前跑这个
npx vercel --prod  # 部署
```

## 工作流

- **大改动先给计划，等我确认再写。** 动目录结构、引入新依赖、新建里程碑前，先说方案。
- **完成的定义**：`npm run verify` 全绿、双语文案补齐、（涉及数据时）`lastVerified`/`sourceUrl`/`_verify` 就位、（涉及 UI 时）有浏览器实测证据。
- **不要只报告"测试通过"**，要贴退出码/输出；UI 改动要截图。
- **提交前**跑 `npm run verify`；commit message 用祈使句简述改动。**不要替我 commit，先给出 message 等我确认。**
- 数据或架构有变动时，同步更新知识库 `~/Docs/Knowledgebase/IB_helper/`（更新政策见那里的 README）。
- 遇到规格与本文件冲突，或需求不清，**先问我**，不要自行假设。

## 明确不做（v1）

后端 / 账户系统、真实成绩预测、精确到具体专业的自动录取判定（只给方向指引 + 官网链接）。
