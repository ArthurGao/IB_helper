# IB 选课助手 / IB Subject Selector for Parents

帮助家长理解 IB 结构、模拟选课、校验文凭要求与目标大学方向。纯前端、中英双语、面向新西兰升学场景。

完整需求见 [`IB-Course-Selector-Spec.md`](./IB-Course-Selector-Spec.md)；每轮工作约定见 [`CLAUDE.md`](./CLAUDE.md)。

## 命令

```bash
npm run dev        # 本地开发
npm run build      # tsc -b && vite build
npm run typecheck  # tsc -b
npm run lint       # oxlint（typescript/no-explicit-any = error）
npm run test       # vitest run
```

## 进度

- [x] **M1 骨架**：Vite + React 18 + TS(strict) + Tailwind v4 + react-router-dom + react-i18next；中/英一键切换、深/浅色切换，均持久化到 localStorage。
- [x] **M2 数据**：规格第 8 节类型落地为 `src/types/ib.ts`；第 9 节种子数据落地为 `src/data/*.json`（双语字段 + `lastVerified` + `sourceUrl`）。
- [x] **M3 规则引擎**：`src/lib/ib-rules/` 五个纯函数 + Vitest。
- [x] **M4 选课向导**：/selector Step 1–3（背景输入、逐组选课含 Group 6 替换、实时校验 + 警告 + 方向匹配 + NZ UE）。
- [x] **M5 模拟器与结果**：Step 4–5（保底/冲刺两档预估、失败条件逐条亮灯、方案卡）+ 保存 / 对比 / 打印 / URL 分享。
- [x] **M6 内容页**：/learn（9→12 时间线、六组卡片、Core、评分）、/learn/considerations（可搜索卡片）、/nz（UE、8 所大学、学校筛选）、/updates（按入学年份判新旧大纲）、/glossary（术语 + 家长 FAQ）。
- [x] **M7 打磨**：打印样式、跳转链接与 focus-visible、语义色 + 图标 + 文字三重表达、移动优先布局、常驻免责声明、本地埋点。

当前共 158 个测试（`npm run test`），typecheck / lint / build 均 0 退出码。

## 考试 session（影响新旧大纲判定）

IB 有 5 月与 11 月两个 session：北半球通常 5 月（入学年 + 2），新西兰学校通常在 Year 13 的 11 月（入学年 + 1）。差这一年会把新旧大纲判反，因此 session 由用户在 Step 1 或 /updates 选择，**不做推测**；未选择时 `/updates` 显示「请填入年份并选择 session」而不是给结论。

## 在手机上打开

- **局域网（开发时）**：`npm run dev -- --host`，手机连同一 Wi-Fi 后访问终端里打印的 `Network` 地址。
- **部署后**：本项目是纯静态站点，`vercel.json` 已配好 SPA rewrite（否则直接访问 `/selector`、`/nz` 会 404）。`npm run build` 后部署 `dist` 即可。

布局为移动优先：手机（390px）单列、平板（768px）两列、桌面（≥1280px）校验与方向匹配左右分栏，容器上限 `max-w-7xl`。

## 分享与隐私

方案通过 `?plan=<base64>` 分享，**数据全在链接里**，没有后端；保存的方案、语言、主题、本地埋点统计都只写 `localStorage`，不出网。

## 数据与「待核实」约定

JSON 不支持注释，因此每个待核实项用 `_verify` 字段承载 TODO 与来源：

```json
{ "_verify": { "status": "unverified", "sourceUrl": "https://…", "note": { "en": "…", "zh": "…" } } }
```

核实状态（2026-09-20 对照 ibo.org 官方页面逐条核对）：

| 数据 | 状态 | 来源 |
|---|---|---|
| TOK/EE 附加分矩阵 | ✅ 已核实（25 格全部填入，E 行列为失败条件） | [DP passing criteria](https://ibo.org/about-the-ib/what-it-means-to-be-an-ib-student/recognizing-student-achievement/about-assessment/dp-passing-criteria/) |
| 文凭失败条件与阈值（含 SL：3 门 9 分 / 2 门 5 分） | ✅ 已核实 | 同上 |
| 课改周期（2024→2026、2025→2027、2026→2028、2027→2029） | ✅ 已核实 | [Latest curriculum updates](https://www.ibo.org/university-admission/latest-curriculum-updates/) |
| ESS 同时提供 SL 与 HL | ✅ 已核实 | [ESS updates](https://www.ibo.org/university-admission/latest-curriculum-updates/environmental-systems-and-societies-updates/) |
| 各学科组科目清单 | ✅ 已核实 | [DP curriculum](https://www.ibo.org/programmes/diploma-programme/curriculum/) |
| 理科 2023 首教 / 2025 首考 | ⚠️ 待核实（官方更新页只覆盖 2024 年起的周期） | — |
| 6 所 NZ 大学的 IB 入学页面 URL | ⚠️ 待核实 | — |
| World Religions 仅 SL（将由 religion and society 取代，2029 首次评估） | ✅ 已核实 | [World religions](https://www.ibo.org/programmes/diploma-programme/curriculum/individuals-and-societies/world-religions/) |
| 专业方向的 HL 要求（`pathways.json`） | ⚠️ 通用参考：全部放在 `recommendedHL`，`requiredHL` 刻意留空 | — |

阈值或矩阵若为 `null`（未核实），`evaluateDiploma` 返回 `status: 'indeterminate'`，**不会**把「未核实」当成「通过」或「不及格」。

`requiredHL` 只保留给「具体大学 + 具体专业 + 入学年份」级别、已核实的规则；在拿到这类数据之前，工具不会告诉家长某门课是「必需」的。

方向匹配刻意不使用 open / closed 措辞：状态是 `meets` / `partial` / `not-met`，表示与**通用选课建议**的符合程度，而非某所大学的录取判定（例如新西兰的医学是通过大学一年级课程入读，不是高中直申）。

## 规则引擎

`src/lib/ib-rules/`（纯函数、零 UI 依赖，数据可注入以便测试）：

| 函数 | 作用 |
|---|---|
| `validateStructure` | 组覆盖、HL 3–4、一门数学、Group 6 替换、跨学科科目（ESS / Literature and Performance） |
| `evaluateDiploma` | 逐条失败条件亮灯 + 总分 /45（阈值全部来自 `diploma-rules.json`）。科目数不等于 6 时返回 `incomplete` 并隐藏总分——官方条件以 6 门为前提，拿 5 门去套会算出「通过」；「最低分」类条件在未选满时不判失败（再加课分数只会变多） |
| `getWarnings` | 数据驱动警告（`warnings-rules.json`，新增规则不改代码） |
| `matchPathways` | 方向匹配：`met / missing` 与 `open / at-risk / closed` |
| `checkNZUE` | NZ UE 读写（英语 A 任一 level 或英语 B 的 HL）+ 算术（任一数学） |

结构性错误只返回 `id` + `params`，由 UI 走 i18n 翻译；数据驱动的警告文案直接带 JSON 里的双语 `msg`。
