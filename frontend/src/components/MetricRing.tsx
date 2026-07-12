interface Props {
  value: number
  label: string
  accent?: boolean
  delay?: number
}

export default function MetricRing({ value, label, accent, delay = 0 }: Props) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ

  return (
    <div className={`metric-ring ${accent ? 'accent' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <svg viewBox="0 0 120 120" className="ring-svg">
        <circle cx="60" cy="60" r={r} className="ring-bg" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="ring-fill"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-value">{value}%</span>
        <span className="ring-label">{label}</span>
      </div>
    </div>
  )
}
