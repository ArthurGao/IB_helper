/**
 * NCEA 数据层的唯一出口。与 IB 的 src/data/index.ts 并列，互不依赖。
 */
import type {
  ComparisonFile,
  NceaLevelsFile,
  NewQualificationsFile,
  ReformTimelineFile,
  UeApprovedSubjectsFile,
  UeRequirementsFile,
} from '../../types/ncea'

import comparisonJson from './comparison.json'
import nceaLevelsJson from './ncea-levels.json'
import newQualificationsJson from './new-qualifications.json'
import reformTimelineJson from './reform-timeline.json'
import ueApprovedSubjectsJson from './ue-approved-subjects.json'
import ueRequirementsJson from './ue-requirements.json'

export const nceaLevelsFile = nceaLevelsJson as NceaLevelsFile
export const ueRequirementsFile = ueRequirementsJson as unknown as UeRequirementsFile
export const ueApprovedSubjectsFile = ueApprovedSubjectsJson as UeApprovedSubjectsFile
export const reformTimelineFile = reformTimelineJson as unknown as ReformTimelineFile
export const newQualificationsFile = newQualificationsJson as unknown as NewQualificationsFile
export const comparisonFile = comparisonJson as ComparisonFile

export const nceaLevels = nceaLevelsFile.levels
export const ueRequirements = ueRequirementsFile.requirements
export const ueApprovedSubjects = ueApprovedSubjectsFile.subjects
export const reformMilestones = reformTimelineFile.milestones
export const newQualifications = newQualificationsFile.qualifications
export const comparisonRows = comparisonFile.rows
