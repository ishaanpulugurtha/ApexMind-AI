import type { Report } from '../types'

export function velocityLabel(velocity: number): string {
  if (velocity >= 75) return 'Fast'
  if (velocity >= 50) return 'Moderate'
  if (velocity >= 25) return 'Slow'
  return 'Panicked'
}

export function integrityLabel(integrity: number): string {
  if (integrity >= 75) return 'Disciplined reads'
  if (integrity >= 50) return 'Mixed reads'
  return 'Rushed / risky reads'
}

export function buildJudgeVerdict(report: Report): string {
  const composure = Math.round(report.composure_score)
  const speed = velocityLabel(report.decision_velocity)
  const readQuality = integrityLabel(report.tactical_integrity)
  return `Composure: ${composure} · Decision speed: ${speed} · ${readQuality}`
}

export function buildVerdictSubline(report: Report): string {
  const { category } = report.reappraisal
  const rushed = report.tactical_integrity < 50
  const panicked = report.decision_velocity < 40
  if (panicked && rushed) return `${category} — you rushed the risky read under pressure.`
  if (panicked) return `${category} — decisions came too slow when the clock mattered.`
  if (rushed) return `${category} — you leaned into high-risk reads.`
  return report.reappraisal.detail
}
