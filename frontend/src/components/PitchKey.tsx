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
          <span><strong>YOU</strong> — gold token (wedge shows facing).</span>
        </div>
        <div className="key-item">
          <span className="key-swatch ball" />
          <span><strong>BALL</strong> — white token.</span>
        </div>
        <div className="key-item">
          <span className="key-swatch ally" />
          <span><strong>Allies</strong> — blue tokens.</span>
        </div>
        <div className="key-item">
          <span className="key-swatch opp" />
          <span><strong>Opponents</strong> — red tokens. Jersey tags (#10, GK, W) on pitch.</span>
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
          <span><strong>Action buttons</strong> — below the pitch (green safe, orange press, red risky).</span>
        </div>
      </div>
    </div>
  )
}
