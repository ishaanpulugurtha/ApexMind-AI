export default function PitchKey() {
  return (
    <div className="pitch-key">
      <h4>How to read the pitch</h4>
      <div className="pitch-key-grid">
        <div className="key-item">
          <span className="key-swatch goal-left" />
          <span><strong>Left goal</strong> — you defend here.</span>
        </div>
        <div className="key-item">
          <span className="key-swatch goal-right" />
          <span><strong>Right goal</strong> — you attack here.</span>
        </div>
        <div className="key-item">
          <span className="key-swatch you" />
          <span><strong>YOU</strong> — yellow dot.</span>
        </div>
        <div className="key-item">
          <span className="key-swatch ball" />
          <span><strong>BALL</strong> — white dot.</span>
        </div>
        <div className="key-item">
          <span className="key-swatch ally" />
          <span><strong>Allies</strong> — blue dots.</span>
        </div>
        <div className="key-item">
          <span className="key-swatch opp" />
          <span><strong>Opponents</strong> — red dots.</span>
        </div>
        <div className="key-item">
          <span className="key-swatch lane" />
          <span><strong>Green dashed arrow</strong> — open space.</span>
        </div>
        <div className="key-item">
          <span className="key-swatch threat" />
          <span><strong>Red solid arrow</strong> — threat / pressure.</span>
        </div>
        <div className="key-item">
          <span className="key-swatch danger" />
          <span><strong>Red circle</strong> — danger zone.</span>
        </div>
        <div className="key-item">
          <span className="key-swatch tap" />
          <span><strong>Action buttons</strong> — each shows what you will do (↩ Recycle, ⚡ Press, etc.).</span>
        </div>
      </div>
    </div>
  )
}
