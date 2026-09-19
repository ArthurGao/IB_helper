# IB 选课助手 · 产品与实现规格（PRD / Spec）

> 交给 **Claude Code** 的实现指导文档。目标：帮助**家长**理解 IB 课程结构、模拟选课、并检查所选组合是否满足文凭要求与目标大学方向。
> 语言：中英双语。上下文：**新西兰**（学生在 NZ 就读 IB）。
> 本文档中所有 IB 规则、大学要求、学校列表都必须做成 **数据驱动（JSON）**，方便日后更新——不要把这些硬编码进组件逻辑。

---

## 0. 给 Claude Code 的总则（先读这段）

1. **不要凭记忆写 IB 规则和大学要求。** 所有课程结构、评分规则、失败条件、大学门槛、学校列表，都从 `src/data/*.json` 读取。本文档第 9 节给出种子数据；实现时原样落地，并在数据文件顶部标注 `lastVerified` 日期与来源 URL。
2. **本工具是"辅助规划"，不是官方建议。** 每个结果页必须有免责声明：以学校 IB 协调员与 [ibo.org](https://ibo.org) 官方文件为准。
3. **纯前端、无后端**（v1）。数据本地化，状态存 `localStorage`，可通过 URL 分享。
4. **双语是一等公民**，不是事后补丁。所有面向用户的文案走 i18n；数据文件里所有名称字段都要有 `en` / `zh` 两份。
5. **移动优先 + 无障碍**。家长很多在手机上看。

---

## 1. 项目概述

| 项 | 内容 |
|---|---|
| 产品名 | IB 选课助手 / IB Subject Selector for Parents |
| 主要用户 | 计划让孩子读 / 正在读 IB 的**家长**（多为中英双语家庭） |
| 核心价值 | 把"一次定终身、极难更改"的 IB 选课决策变得**看得懂、可模拟、可验证** |
| 平台 | Web（响应式），静态部署 |
| 地域上下文 | 新西兰（奥克兰为主），兼容海外升学（澳、英、美） |

### 用户故事
- 作为家长，我想**先看懂 IB 从 9 年级到毕业的整体流程**，知道每个阶段该关注什么。
- 我想输入**目标专业方向 / 目标大学 / 所在学校**，得到推荐的选课起点。
- 我想**拖拽 / 点选组合 6 门课并标注 HL/SL**，实时看到这个组合**是否合法、是否满足文凭要求、是否满足新西兰 UE、是否保住目标专业的门**。
- 我想**模拟预估分数**，看总分（满分 45）与是否达到及格线（24）。
- 我想把方案**保存、对比、打印/导出 PDF、分享链接**给配偶或升学顾问。
- 我全程可以**一键中英切换**。

---

## 2. 技术栈（建议）

- **Vite + React 18 + TypeScript**
- **Tailwind CSS**（设计见第 11 节）
- **react-i18next** + `i18next-browser-languagedetector`（i18n）
- **zustand** 或 React Context 管理选课状态（zustand 更简洁，推荐）
- **react-router-dom**（多页面 / 步骤路由）
- 状态持久化：`localStorage`；分享：把状态 base64/LZ 压缩进 URL query
- 导出：浏览器 `window.print()` + 打印样式；PDF 可用 `react-to-print` 或 `html2pdf.js`
- 图标：`lucide-react`
- 测试：Vitest + React Testing Library（**规则引擎必须有单元测试**，见第 7 节）
- 部署：静态托管（Vercel / Netlify / GitHub Pages）

无需数据库、无需登录（v1）。

---

## 3. 信息架构 / 页面

```
/                     首页 · 概览 + 入口（含 9→12 年级时间线）
/learn                IB 课程大纲浏览（PYP/MYP/DP、六大学科组、Core、评分）
/learn/considerations 选课注意事项（可搜索的知识卡片）
/selector             选课工具（核心）—— 分步向导
  step 1  背景输入（学校 / 目标方向 / 目标大学 / 入学年份）
  step 2  逐组选课（Group 1–6 + 替换规则）+ HL/SL
  step 3  实时校验 + 警告 + 大学方向匹配
  step 4  分数模拟器
  step 5  结果总览（保存 / 对比 / 打印 / 分享）
/compare              方案对比（并排 2–3 套）
/nz                   新西兰专区（UE 规则、开设 IB 的学校、升学去向）
/glossary             术语表 & 家长 FAQ
/updates              课程改革时间线（2024–2027，按入学年份提示考哪套大纲）
```

顶栏：Logo、语言切换（中/EN）、深浅色切换、"我的方案"入口。

---

## 4. 核心功能详解

### 4.1 IB 大纲浏览（/learn）
- 展示 IB 连贯体系：**PYP → MYP（约 6–10 年级）→ DP（11–12 年级）→ CP**。
- **9→12 年级时间线组件**（横向 stepper）：
  - 9–10 年级 = MYP 第 4/5 年（不分 HL/SL，打基础；10 年级做 Personal Project **并决定 DP 选课**）
  - 11 年级 = DP1（6 门铺开，启动 TOK/EE/CAS）
  - 12 年级 = DP2（完成 EE/CAS，5 月统考）
- **六大学科组卡片**（数据驱动，见 9.1）：点开看代表科目与 HL/SL 可用性。
- **Core 三件套**说明：TOK、EE（Extended Essay）、CAS。
- **评分卡**：6 门 × 7 分 = 42，TOK+EE 最多 +3 → **满分 45，及格 24**。

### 4.2 选课工具（/selector）—— 分步向导

**Step 1 背景输入（缺省数据）**
- 所在学校（下拉，来自 `nz-schools.json`；选校后**只显示该校实际开设的科目**——用 school.offeredSubjectCodes 过滤；找不到学校可选"通用/其它"）
- 目标专业方向（下拉：医学、工程、计算机、商科、法律、理科研究、建筑、艺术设计、社会科学、未定…）
- 目标大学（可多选：新西兰 8 所 + 常见海外；用于显示各校门槛）
- **入学 DP 的年份**（用于提示考哪套大纲，联动 /updates）
- 母语 / 是否英语母语（影响 Group 1/2 建议）

**Step 2 逐组选课 + HL/SL**
- 依次 Group 1→6，每组单选一门；每门可切 **HL / SL**。
- **替换规则（Group 6 swap）**：允许用 Group 1–4 的第二门科目替换 Group 6；也支持跨学科科目（如 ESS 同时满足 Group 3+4；Literature and Performance 满足 Group 1+6）。UI 要清楚表达"这门顶了哪两组"。
- **数学专门 UI**：AA（Analysis & Approaches，偏纯数/证明）vs AI（Applications & Interpretation，偏建模/应用），各有 HL/SL——用一个小决策助手（见 4.4 警告引擎）。

**Step 3 实时校验 + 警告**（规则引擎，见第 7 节）
- 合法性：是否每组覆盖、HL 数量是否 3–4、SL 数量、替换是否合规。
- 文凭要求预检：见 7.2。
- **大学方向匹配**：所选组合是否满足目标方向的推荐 HL（例：医学需 HL 化学 + HL 生物；工程需 HL 数学(AA) + HL 物理）。缺哪门就红字提示"当前组合会关闭 X 方向的门"。
- **新西兰 UE 检查**：是否含英语 Language A(HL/SL) 或英语 Language B(HL) + 任一数学 → 满足 NZ 读写/算术要求。

**Step 4 分数模拟器**
- 每门课滑块/输入 1–7 预估分；TOK 与 EE 各选 A–E → 用 **TOK/EE 矩阵**算 0–3 附加分（矩阵放数据文件，见 9.4）。
- 实时显示：总分 /45、是否 ≥24、以及**失败条件检查**（见 7.2）逐条亮灯。
- "冲刺/保底"两档情景对比（best case / safe case）。

**Step 5 结果总览**
- 一页式方案卡：6 门 + HL/SL、Core、总分、UE 状态、方向匹配、警告清单。
- 操作：保存到"我的方案"、加入对比、打印、导出 PDF、复制分享链接。

### 4.3 方案对比（/compare）
并排 2–3 套已保存方案，逐行对齐（各组科目、HL/SL、模拟总分、UE、方向覆盖、警告数）。

### 4.4 警告 / 建议引擎（贯穿 Step 2–3）
以规则数组驱动（见 7.3），例如：
- STEM/经济方向选了 **AI 而非 AA** → 警告多数理工/经济专业要求 AA。
- 只有 3 HL 且都很重（如 HL 数学+物理+化学）→ 提示工作量。
- 选了会**关闭医学**（缺 HL 化学/生物）→ 若目标含医学则高亮。
- 母语非英语却把英语选进 Group 1 而母语进 Group 2 → 提示通常反过来更稳。
- 组合合法但**未满足 NZ UE 读写/算术** → 明确提示。

---

## 5. 新西兰专区（/nz）
- **UE 规则卡**：完整 IB 文凭 + **最低 24 分** = 满足所有 NZ 大学的 University Entrance；NZ 境内就读需另满足读写（英语 Language A HL/SL，或英语 Language B HL）+ 算术（任一数学）。
- **开设 IB 的学校列表**（数据驱动，`nz-schools.json`，可按城市/项目筛选）。**注意：学校会开/停某项目**（例：Auckland International College 已于 2023 年关闭），所以列表要标注 `lastVerified` 并附 IB 官方"Find an IB World School"目录链接让用户自查。
- **升学去向**：NZ 8 所大学门槛 + 常见海外去向（澳洲、英国 UCAS、美国）入口。

---

## 6. 国际化（i18n）

- 语言：`zh-CN`、`en`。默认按浏览器语言，可手动切换，选择存 `localStorage`。
- **UI 文案**放 `src/locales/{lang}/*.json`（namespaces：common、learn、selector、nz、glossary）。
- **数据文案**（科目名、大学名、专业方向、警告文本）在 JSON 里用双语对象：
  ```json
  { "name": { "en": "Chemistry", "zh": "化学" } }
  ```
- 渲染统一用一个 `useLocalized()` helper：`t(obj)` 按当前语言取值。
- 数字/术语（HL、SL、TOK、EE、CAS）保留英文缩写但首次出现给中文注解。

---

## 7. 规则引擎（本项目的核心，必须有测试）

放在 `src/lib/ib-rules/`，纯函数、无 UI 依赖，**Vitest 全覆盖**。

### 7.1 合法性 `validateStructure(selection)`
输入：6 门（含所属 group、level）。校验：
- 每个 Group 1–5 恰好被覆盖一次（可由替换科目/跨学科科目满足）。
- 第 6 门来自 Group 6，或合规替换（Group 1–4 的第二门）。
- HL 数量 ∈ {3, 4}；其余为 SL；总数 = 6。
- 数学恰好一门（AA 或 AI，任一 level）。
返回：`{ valid: boolean, errors: LocalizedMsg[] }`。

### 7.2 文凭 / 失败条件 `evaluateDiploma(grades, tok, ee, casComplete)`
> ⚠️ **实现时请以 IB 官方现行《Diploma Programme Assessment procedures》/《General regulations》为准**，把确切阈值写进 `diploma-rules.json` 并标注来源与日期。以下为常见公认条件，作为起点：
- CAS 未完成 → 不予文凭。
- 总分 < 24 → 不及格。
- 任一科目 / TOK / EE 出现 **N（未提交）** → 不及格。
- TOK 或 EE 出现 **E** → 不及格。
- 任一科目出现 **成绩 1** → 不及格。
- **成绩 2** 的数量 > 2 → 不及格。
- **成绩 3 或以下** 的数量 > 3 → 不及格。
- HL 总分（3 门 HL 取其和；4 门 HL 取最高 3 门）**< 12** → 不及格。
- SL 总分 **< 9**（4HL/2SL 情形阈值不同，按官方）→ 不及格。
返回逐条 `{ passed: boolean, conditions: {id, passed, msg}[] , total, max: 45 }`。

### 7.3 警告 `getWarnings(selection, context)`
数据驱动规则数组（`warnings-rules.json`），每条：
```json
{
  "id": "math-ai-for-stem",
  "when": { "targetPathwayIn": ["engineering","cs","science","economics"], "mathCourse": "AI" },
  "severity": "high",
  "msg": { "en": "...", "zh": "多数理工/经济专业要求 AA 而非 AI…" }
}
```
引擎遍历规则，`when` 命中即产出警告。新增规则不改代码。

### 7.4 大学方向匹配 `matchPathways(selection, targets)`
读 `pathways.json`（方向 → 推荐/必需 HL），返回每个目标方向的 `met / missing` 科目，用于 Step 3 高亮与"是否关门"判断。

### 7.5 NZ UE 检查 `checkNZUE(selection)`
是否含（英语 Language A 于 HL/SL）或（英语 Language B 于 HL），且含任一数学 → `{ ueLiteracyNumeracy: boolean }`。

---

## 8. 数据模型（TypeScript 类型）

```ts
type Lang = 'en' | 'zh';
type L10n = Record<Lang, string>;

type Level = 'HL' | 'SL';
type GroupId = 1 | 2 | 3 | 4 | 5 | 6;

interface Subject {
  code: string;                 // IB 科目代码
  name: L10n;
  group: GroupId;
  levels: Level[];              // 该科目可选的层级
  satisfiesGroups?: GroupId[];  // 跨学科科目，如 ESS = [3,4]
  mathType?: 'AA' | 'AI';       // 仅数学
  tags?: string[];              // e.g. ['science','lab']
}

interface School {
  id: string;
  name: L10n;
  city: L10n;
  programmes: ('PYP'|'MYP'|'DP'|'CP')[];
  offeredSubjectCodes?: string[]; // 该校实际开设（可空=未知，则显示全量）
  lastVerified: string;           // ISO date
  sourceUrl?: string;
}

interface University {
  id: string;
  name: L10n;
  country: 'NZ' | 'AU' | 'UK' | 'US' | string;
  ibMinPoints: number;            // NZ 均为 24（UE）
  notes?: L10n;                    // 读写/算术、专业额外要求
  sourceUrl: string;
  lastVerified: string;
}

interface Pathway {              // 专业方向
  id: string;                    // 'medicine' | 'engineering' | ...
  name: L10n;
  requiredHL: string[];          // 必需 HL 科目 code（或用 tag 匹配）
  recommendedHL: string[];
  note: L10n;                    // “以各校各专业官网为准”
}

interface Selection {
  subjects: { code: string; level: Level }[]; // 长度 6
  schoolId?: string;
  targetPathwayIds: string[];
  targetUniversityIds: string[];
  dpStartYear?: number;
}
```

---

## 9. 种子数据（v1 落地，务必标注 `lastVerified` 与来源）

### 9.1 六大学科组（代表科目，实际以学校为准）
| Group | 名称（中/EN） | 代表科目 |
|---|---|---|
| 1 | 语言与文学 / Studies in Language & Literature | Language A: Literature；Language A: Language and Literature（含中文 A、英语 A 等） |
| 2 | 语言习得 / Language Acquisition | English B、Mandarin B、Spanish B、French B、语言 ab initio |
| 3 | 个人与社会 / Individuals & Societies | History、Economics、Geography、Psychology、Business Management、Digital Society |
| 4 | 科学 / Sciences | Physics、Chemistry、Biology、Computer Science、Design Technology、ESS、SEHS |
| 5 | 数学 / Mathematics | Mathematics: AA（HL/SL）、Mathematics: AI（HL/SL） |
| 6 | 艺术 / The Arts | Visual Arts、Music、Theatre、Dance、Film |

跨学科：**ESS** 满足 Group 3+4；**Literature and Performance** 满足 Group 1+6（SL）。

### 9.2 新西兰大学（种子；`ibMinPoints` 均 24 = UE）
- University of Auckland / 奥克兰大学 — 24；UE 读写：英语 Language A(HL/SL) 或 Language B(HL) + 任一数学。来源：auckland.ac.nz IB 页面。
- AUT（Auckland University of Technology）
- University of Waikato / 怀卡托大学
- Massey University / 梅西大学
- Victoria University of Wellington / 惠灵顿维多利亚大学
- University of Canterbury / 坎特伯雷大学
- Lincoln University / 林肯大学
- University of Otago / 奥塔哥大学 — 24；NZ 境内需英语 Language A(HL/SL) 或 Language B(HL) + 任一数学。来源：otago.ac.nz。
> 所有 NZ 大学："完整 IB 文凭 + 24 分"= UE；**具体专业**（如医学、工程、法律）另有更高分数/科目/面试要求，需链接到各校官网并标注"以官网为准"。

### 9.3 专业方向 → 推荐 HL（通用起点，必须标注"以目标大学专业为准"）
- **医学 Medicine**：HL 化学 + HL 生物（部分国家要三门理科，见非常规文凭）。
- **工程 Engineering**：HL 数学 AA + HL 物理。
- **计算机 CS**：HL 数学（AA 优先）+ HL 物理或计算机科学。
- **商科/经济 Business/Economics**：HL 数学 或 HL 经济。
- **法律 Law**：无固定，重语言/人文 HL（历史、英语文学常见）。
- **理科研究 Science**：对应学科 HL（+ HL 数学 AA 加分）。
- **建筑 Architecture**：HL 数学 或 物理，部分要作品集/视觉艺术。
- **艺术设计 Art/Design**：HL 视觉艺术 + 作品集。
- **社会科学 Social Sciences**：HL 人文（心理、历史、经济择一）。
- **未定 Undecided**：给"保持最多门开放"的均衡建议（含 HL 数学）。

### 9.4 TOK/EE 附加分矩阵
放 `tokEeMatrix.json`：以 TOK 成绩 (A–E) × EE 成绩 (A–E) → 0–3 分或"失败"。**用官方现行矩阵**，标注来源与日期。

### 9.5 新西兰 IB 学校（奥克兰为主，种子；务必标 `lastVerified` + IB 官方目录链接）
- Takapuna Grammar School（DP；NZ 首所开设 IB 的公立学校）
- Rangitoto College（DP）
- Saint Kentigern College（DP）
- St Cuthbert's College（DP）
- Kristin School（PYP/MYP/DP 全程）
- Diocesan School for Girls（PYP/MYP/DP 全程）
- Glendowie College（MYP）
- 惠灵顿：Queen Margaret College、Scots College（全程）
- 其它：St Peter's School、St Margaret's College、John McGlashan College 等（DP）
> ⚠️ 学校项目会变动，UI 需显著提示"请以 IB 官方 Find an IB World School 目录核实"。

### 9.6 课程改革时间线（/updates，按入学年份提示）
- 理科（物理/化学/生物/ESS）：2023 首教、**2025 年 5 月首考**（新大纲）。
- 数学、计算机科学、Extended Essay：2025 首教、**2027 年 5 月首考**；2026 年 5 月考生仍旧大纲。CS 新大纲支持 Java 与 Python、取消 Options。
- 心理学、设计技术、视觉艺术：**2027 年 5 月首考**。
- 历史：2026 首教、2028 首考（全新大纲）。
- 第二波（2027 首教）：数学、language ab initio、language B、religion and society、dance。
> 组件逻辑：输入 `dpStartYear` → 对每科提示"你的孩子考旧/新大纲"。数据放 `curriculum-updates.json`。

---

## 10. 建议增加的功能（"应该做的"清单）

按优先级（P0 必做 / P1 强烈建议 / P2 加分）：

- **P0** 选课合法性 + 文凭失败条件实时校验（第 7 节）
- **P0** 大学方向匹配 & "会不会关门"提示
- **P0** 中英双语 + 移动端 + 免责声明
- **P0** 分数模拟器（/45、24 及格、逐条失败条件亮灯）
- **P1** 保存/对比多套方案；打印 & 导出 PDF；URL 分享
- **P1** 新西兰 UE 读写/算术检查
- **P1** 按入学年份的大纲版本提示（/updates）
- **P1** 家长 FAQ + 术语表（TOK/EE/CAS/HL/SL/AA/AI/文凭 vs 课程证书）
- **P1** 引导式 onboarding（首次进入用向导带一遍）
- **P2** "为什么给这个警告"可展开解释（教育性）
- **P2** 时间线/待办清单（10 年级定选课、EE 选题、CAS 时数追踪等里程碑）
- **P2** 深色模式；打印精美排版
- **P2** 简单埋点（本地统计，最常见的方向/组合，帮你迭代内容）
- **P2** 无障碍：键盘可达、对比度 AA、屏幕阅读器 label
- **P2** "非常规文凭 / Course Results"科普（拿不满文凭时的证书路径）

**明确非目标（v1 不做）**：账户系统 / 后端、真实成绩预测、精确到具体专业的自动录取判定（只给方向指引 + 官网链接）、代替学校 IB 协调员。

---

## 11. 设计与 UX

- 气质：**清晰、可信、非营销**——家长在做重要决定，信息密度适中、层级分明。
- 关键交互给**即时反馈**：改一门课，合法性/分数/警告立刻更新。
- 颜色语义化：绿=满足/合法，琥珀=注意，红=不合法/关门。**不要只靠颜色**（配图标/文字，兼顾色盲）。
- 六大学科组用一致的卡片；HL/SL 用醒目 toggle。
- 免责声明常驻但不喧宾夺主（结果页固定一条）。
- 响应式：手机上"逐组选课"用纵向步骤；桌面可并排。

---

## 12. 项目结构（建议）

```
src/
  main.tsx / App.tsx
  i18n.ts
  locales/{en,zh}/{common,learn,selector,nz,glossary}.json
  data/
    subjects.json  groups.json  pathways.json
    universities.json  nz-schools.json
    diploma-rules.json  tokEeMatrix.json
    warnings-rules.json  curriculum-updates.json
  lib/ib-rules/
    validateStructure.ts  evaluateDiploma.ts  getWarnings.ts
    matchPathways.ts  checkNZUE.ts  index.ts
    __tests__/*.test.ts
  store/selectionStore.ts        // zustand + localStorage + URL 同步
  hooks/useLocalized.ts
  pages/{Home,Learn,Considerations,Selector,Compare,NZ,Glossary,Updates}.tsx
  components/
    Timeline/  SubjectGroupCard/  LevelToggle/  ScoreSimulator/
    WarningsPanel/  PathwayMatch/  PlanSummary/  LangSwitch/  Disclaimer/
```

---

## 13. 交付里程碑（建议实现顺序）

1. **M1 骨架**：Vite+TS+Tailwind+router+i18n 切换跑通；空数据文件 + 类型。
2. **M2 数据 & 浏览**：落地种子数据；/learn（时间线、六组卡片、Core、评分）。
3. **M3 规则引擎**：`ib-rules/*` + Vitest 全绿（先于 UI）。
4. **M4 选课向导**：/selector Step 1–3（背景输入、逐组选课、实时校验+警告+方向匹配）。
5. **M5 模拟器 & 结果**：Step 4–5；保存/对比/打印/分享。
6. **M6 NZ & Updates & Glossary**：/nz、/updates、/glossary、FAQ。
7. **M7 打磨**：无障碍、深色模式、移动端、免责声明、埋点。

---

## 14. 验收标准（部分）

- [ ] 任一非法组合都能被 `validateStructure` 拦截并给出**双语**原因。
- [ ] 输入"目标=医学"但未选 HL 化学/生物时，Step 3 明确提示"会关闭医学方向"。
- [ ] 选择"英语 A + 任一数学"时 NZ UE 检查通过；否则提示缺项。
- [ ] 分数模拟器：24 分为及格分界，失败条件逐条正确亮灯（有测试覆盖）。
- [ ] 全站可一键中/英切换，无残留未翻译文案。
- [ ] 手机端可完成完整选课流程。
- [ ] 所有数据文件含 `lastVerified` 与来源 URL；结果页有免责声明。

---

## 15. 重要免责声明（文案，需双语落地）

> 本工具仅供家庭规划参考，不构成升学或课程建议。IB 课程结构、评分与失败条件以国际文凭组织（[ibo.org](https://ibo.org)）现行官方文件为准；各大学与各专业录取要求以其官网为准；学校开设科目与项目以学校及 IB 官方"Find an IB World School"目录为准。选课前请务必咨询学校的 IB 协调员。

---

## 16. 数据来源（供数据文件 `sourceUrl` 引用）

- IB DP 课程结构 / 选课示例：ibo.org/programmes/diploma-programme/curriculum/
- IB 课程改革（按学科）：ibo.org/university-admission/latest-curriculum-updates/
- 奥克兰大学 IB 入学：auckland.ac.nz（IB 页面）
- 奥塔哥大学 IB 入学：otago.ac.nz（international entrance / IB）
- NZ IB 学校目录：IB 官方"Find an IB World School"（ibo.org）
```
