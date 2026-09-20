/**
 * 数据层的唯一出口：JSON 在这里一次性断言成类型，其它地方只 import 这里。
 * 断言（而非结构校验）是因为 JSON 与 src/types/ib.ts 的形状由 data.test.ts 守住。
 */
import type {
  CurriculumUpdatesFile,
  DiplomaRules,
  GroupsFile,
  PathwaysFile,
  SchoolsFile,
  SubjectsFile,
  TokEeMatrix,
  UniversitiesFile,
  WarningsRulesFile,
} from '../types/ib'

import curriculumUpdatesJson from './curriculum-updates.json'
import diplomaRulesJson from './diploma-rules.json'
import groupsJson from './groups.json'
import nzSchoolsJson from './nz-schools.json'
import pathwaysJson from './pathways.json'
import subjectsJson from './subjects.json'
import tokEeMatrixJson from './tokEeMatrix.json'
import universitiesJson from './universities.json'
import warningsRulesJson from './warnings-rules.json'

export const subjectsFile = subjectsJson as SubjectsFile
export const groupsFile = groupsJson as GroupsFile
export const pathwaysFile = pathwaysJson as PathwaysFile
export const universitiesFile = universitiesJson as UniversitiesFile
export const schoolsFile = nzSchoolsJson as SchoolsFile
export const diplomaRules = diplomaRulesJson as DiplomaRules
export const tokEeMatrix = tokEeMatrixJson as TokEeMatrix
export const warningsRulesFile = warningsRulesJson as WarningsRulesFile
export const curriculumUpdatesFile = curriculumUpdatesJson as CurriculumUpdatesFile

export const subjects = subjectsFile.subjects
export const groups = groupsFile.groups
export const pathways = pathwaysFile.pathways
export const universities = universitiesFile.universities
export const schools = schoolsFile.schools
export const warningRules = warningsRulesFile.rules
export const curriculumUpdates = curriculumUpdatesFile.updates
