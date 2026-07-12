import type { Config, Debrief, Outcome, Report, Scenario, StartParams } from '../types'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  getConfig: () => request<Config>('/config'),

  startSession: (params: StartParams) =>
    request<Scenario>('/session/start', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  submitChoice: (sessionId: string, choiceId: string, timeRemaining: number) =>
    request<Outcome>(`/session/${sessionId}/choice`, {
      method: 'POST',
      body: JSON.stringify({ choice_id: choiceId, time_remaining: timeRemaining }),
    }),

  submitFreeze: (sessionId: string) =>
    request<Outcome>(`/session/${sessionId}/freeze`, {
      method: 'POST',
      body: JSON.stringify({ time_remaining: 0 }),
    }),

  getReport: (sessionId: string) => request<Report>(`/session/${sessionId}/report`),

  getDebrief: (sessionId: string) =>
    request<Debrief>(`/session/${sessionId}/debrief`, { method: 'POST' }),

  getLeaderboard: () => request<{ backend: string; rows: Record<string, unknown>[] }>('/leaderboard'),
}
