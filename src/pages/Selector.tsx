import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { GroupId, Subject } from '../types/ib'
import { groups, pathways, schools, subjects, universities, diplomaRules } from '../data'
import { useLocalized } from '../hooks/useLocalized'
import { usePlanEvaluation, subjectsByCode } from '../hooks/usePlanEvaluation'
import { useSelectionStore } from '../store/selectionStore'
import { planShareUrl, readPlanFromSearch } from '../lib/share'
import { planSignature, recordPlan } from '../lib/analytics'
import { PathwayMatchPanel } from '../components/PathwayMatch'
import { PlanSummary } from '../components/PlanSummary'
import { ScoreSimulator } from '../components/ScoreSimulator'
import { SubjectGroupCard } from '../components/SubjectGroupCard'
import { WarningsPanel } from '../components/WarningsPanel'
import { StatusPill } from '../components/StatusPill'

const STEPS = [1, 2, 3, 4, 5] as const
type Step = (typeof STEPS)[number]

/** 某个槽位可以选的科目：1–5 = 能覆盖该组的科目；6 = Group 6 + Group 1–4 全部（替换规则）。 */
function optionsForSlot(slot: GroupId, offered: Subject[]): Subject[] {
  if (slot === 6) {
    return offered.filter((s) => {
      const covers = s.satisfiesGroups ?? [s.group]
      return covers.includes(6) || covers.some((g) => g <= 4)
    })
  }
  return offered.filter((s) => (s.satisfiesGroups ?? [s.group]).includes(slot))
}

export default function Selector() {
  const { t } = useTranslation('selector')
  const { t: l } = useLocalized()
  const [step, setStep] = useState<Step>(1)
  const [shareFeedback, setShareFeedback] = useState<string>()
  const [searchParams, setSearchParams] = useSearchParams()

  const plan = useSelectionStore((s) => s.plan)
  // 埋点读最新方案，但不把整个 plan 放进 effect 依赖里。
  const planRef = useRef(plan)
  planRef.current = plan
  const store = useSelectionStore()
  const evaluation = usePlanEvaluation(plan)

  // 分享链接：?plan=… 进来时覆盖当前方案（只在首次挂载时读一次）。
  useEffect(() => {
    const shared = readPlanFromSearch(window.location.search)
    if (shared) {
      store.loadPlan(shared)
      searchParams.delete('plan')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 本地埋点：同一「科目 + 方向」组合只记一次（不出网，见 lib/analytics.ts）。
  // 依赖收敛到签名，否则每调一次分数都会重复计数。
  const planKey = planSignature(plan)
  useEffect(() => {
    if (evaluation.valid) recordPlan(planRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluation.valid, planKey])

  const offeredSubjects = useMemo(() => {
    const school = schools.find((s) => s.id === plan.schoolId)
    if (!school?.offeredSubjectCodes) return subjects
    return subjects.filter((s) => school.offeredSubjectCodes?.includes(s.code))
  }, [plan.schoolId])

  const handleShare = async () => {
    const url = planShareUrl(plan, window.location.origin)
    try {
      await navigator.clipboard.writeText(url)
      setShareFeedback(t('step5.shareCopied'))
    } catch {
      window.prompt(t('step5.shareManual'), url)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('lead')}</p>
      </header>

      <nav aria-label={t('stepper.label')} className="print:hidden">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((value) => (
            <li key={value}>
              <button
                type="button"
                aria-current={step === value ? 'step' : undefined}
                onClick={() => setStep(value)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  step === value
                    ? 'border-brand bg-brand text-brand-ink'
                    : 'border-border text-ink-muted hover:text-ink'
                }`}
              >
                {value}. {t(`step${value}.tab`)}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-ink">
            {t('step1.school')}
            <select
              className="rounded-md border border-border bg-surface-raised px-3 py-2"
              value={plan.schoolId ?? ''}
              onChange={(e) => store.setSchool(e.target.value || undefined)}
            >
              <option value="">{t('step1.schoolAny')}</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {l(school.name)} — {l(school.city)}
                </option>
              ))}
            </select>
            <span className="text-xs text-ink-muted">{t('step1.schoolHint')}</span>
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink">
            {t('step1.dpStartYear')}
            <input
              type="number"
              min={2020}
              max={2035}
              className="rounded-md border border-border bg-surface-raised px-3 py-2"
              value={plan.dpStartYear ?? ''}
              onChange={(e) => store.setDpStartYear(e.target.value ? Number(e.target.value) : undefined)}
            />
            <span className="text-xs text-ink-muted">{t('step1.dpStartYearHint')}</span>
          </label>

          <fieldset className="flex flex-col gap-2 text-sm text-ink">
            <legend className="mb-1">{t('step1.examSession')}</legend>
            <div className="flex gap-2">
              {(['may', 'november'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={plan.examSession === value}
                  onClick={() => store.setExamSession(value)}
                  className={`rounded-full border px-3 py-1.5 ${
                    plan.examSession === value
                      ? 'border-brand bg-brand/10 text-ink'
                      : 'border-border text-ink-muted'
                  }`}
                >
                  {t(`step1.session.${value}`)}
                </button>
              ))}
            </div>
            <span className="text-xs leading-relaxed text-ink-muted">
              {t('step1.examSessionHint')}
            </span>
          </fieldset>

          <fieldset className="flex flex-col gap-2 text-sm text-ink">
            <legend className="mb-1">{t('step1.pathways')}</legend>
            <div className="flex flex-wrap gap-2">
              {pathways.map((pathway) => {
                const checked = plan.targetPathwayIds.includes(pathway.id)
                return (
                  <button
                    key={pathway.id}
                    type="button"
                    aria-pressed={checked}
                    onClick={() =>
                      store.setTargetPathways(
                        checked
                          ? plan.targetPathwayIds.filter((id) => id !== pathway.id)
                          : [...plan.targetPathwayIds, pathway.id],
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      checked ? 'border-brand bg-brand/10 text-ink' : 'border-border text-ink-muted'
                    }`}
                  >
                    {l(pathway.name)}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2 text-sm text-ink">
            <legend className="mb-1">{t('step1.universities')}</legend>
            <div className="flex flex-wrap gap-2">
              {universities.map((university) => {
                const checked = plan.targetUniversityIds.includes(university.id)
                return (
                  <button
                    key={university.id}
                    type="button"
                    aria-pressed={checked}
                    onClick={() =>
                      store.setTargetUniversities(
                        checked
                          ? plan.targetUniversityIds.filter((id) => id !== university.id)
                          : [...plan.targetUniversityIds, university.id],
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      checked ? 'border-brand bg-brand/10 text-ink' : 'border-border text-ink-muted'
                    }`}
                  >
                    {l(university.name)}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2 text-sm text-ink">
            <legend className="mb-1">{t('step1.nativeLanguage')}</legend>
            <div className="flex gap-2">
              {[
                { value: true, key: 'yes' },
                { value: false, key: 'no' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={plan.nativeLanguageIsEnglish === option.value}
                  onClick={() => store.setNativeLanguageIsEnglish(option.value)}
                  className={`rounded-full border px-3 py-1.5 ${
                    plan.nativeLanguageIsEnglish === option.value
                      ? 'border-brand bg-brand/10 text-ink'
                      : 'border-border text-ink-muted'
                  }`}
                >
                  {t(`step1.native.${option.key}`)}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {groups.map((group) => {
            const slot = group.id
            const selected = plan.slots.find((p) => p.slot === slot)
            return (
              <SubjectGroupCard
                key={group.id}
                group={group}
                slot={slot}
                options={optionsForSlot(slot, offeredSubjects)}
                {...(selected ? { selected: { code: selected.code, level: selected.level } } : {})}
                onPick={(code, level) => store.pickSubject(slot, code, level)}
                onLevel={(code, level) => store.setLevel(code, level)}
              />
            )
          })}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={evaluation.valid ? 'ok' : 'danger'}>
              {evaluation.valid ? t('step3.valid') : t('step3.invalid')}
            </StatusPill>
            <StatusPill tone={evaluation.warnings.length === 0 ? 'ok' : 'warn'}>
              {t('step5.warningCount', { count: evaluation.warnings.length })}
            </StatusPill>
          </div>
          {/* 宽屏左右分栏：左边校验结果，右边方向匹配；窄屏自然回到单列。 */}
          <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          <div className="flex flex-col gap-4">
          <WarningsPanel errors={evaluation.errors} warnings={evaluation.warnings} />
          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <h3 className="mb-2 font-medium text-ink">{t('step3.ueTitle')}</h3>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone={evaluation.ue.ueLiteracy ? 'ok' : 'danger'}>
                {t('step3.ueLiteracy')}
              </StatusPill>
              <StatusPill tone={evaluation.ue.ueNumeracy ? 'ok' : 'danger'}>
                {t('step3.ueNumeracy')}
              </StatusPill>
            </div>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-ink">
              {evaluation.ue.missing.map((item) => (
                <li key={item.id}>{t(`ue.${item.id}`)}</li>
              ))}
            </ul>
          </div>
          </div>
          <div>
            <h3 className="mb-2 font-medium text-ink">{t('step3.pathwayTitle')}</h3>
            <PathwayMatchPanel matches={evaluation.pathways} />
          </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-muted">{t('step4.defaultGradeHint')}</p>
          <ScoreSimulator
            plan={plan}
            subjectsByCode={subjectsByCode}
            results={evaluation.diploma}
            passMark={diplomaRules.passMark}
            requiredSubjectCount={diplomaRules.requiredSubjectCount}
            onGrade={store.setGrade}
            onTok={store.setTok}
            onEe={store.setEe}
            onCas={store.setCasComplete}
          />
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-4">
          <PlanSummary
            plan={plan}
            evaluation={evaluation}
            subjectsByCode={subjectsByCode}
            onShare={() => void handleShare()}
            {...(shareFeedback ? { shareFeedback } : {})}
          />
          <SavePlanForm />
        </div>
      )}
    </section>
  )
}

function SavePlanForm() {
  const { t } = useTranslation('selector')
  const [name, setName] = useState('')
  const savePlan = useSelectionStore((s) => s.savePlan)
  const saved = useSelectionStore((s) => s.saved)

  return (
    <form
      className="flex flex-wrap items-end gap-2 print:hidden"
      onSubmit={(event) => {
        event.preventDefault()
        savePlan(name.trim() || t('step5.untitled'))
        setName('')
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-ink">
        {t('step5.saveLabel')}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-border bg-surface-raised px-3 py-2"
          placeholder={t('step5.untitled')}
        />
      </label>
      <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink">
        {t('step5.save')}
      </button>
      <span className="self-center text-sm text-ink-muted">
        {t('step5.savedCount', { count: saved.length })}
      </span>
    </form>
  )
}
