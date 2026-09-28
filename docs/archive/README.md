# 已归档的规格

这里的文件**不再有效**，只为追溯保留。当前有效的增量规格是根目录的 `IB-Additions-Spec.md`。

| 文件 | 状态 |
|---|---|
| `AI-Provider-Config-Spec.md` | 2026-09-29 归档。其内容（Gateway 集成、隐私门控、环境变量、注意事项）已全部并入 `IB-Additions-Spec.md` §3，该文件自称「合并并取代之前三份草稿」。 |

⚠️ 归档文件里的模型 id（`groq/qwen-...`、`xai/grok-4-fast`、`typesafe/jev` 等）经 2026-09-29 实测**与 Vercel AI Gateway 目录不符**，正确值见 `frontend/src/config/llm-providers.ts`。
