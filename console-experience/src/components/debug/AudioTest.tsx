/**
 * Audio Test Component
 *
 * Quick testing panel for audio system.
 * Use this to validate Web Audio API implementation.
 *
 * @module components/debug/AudioTest
 */

import { useAudio } from '../../hooks/useAudio';

export function AudioTest() {
  const {
    audioNav,
    audioSelect,
    audioBack,
    audioWhoosh,
    audioLaunch,
    audioError,
    enabled,
    setEnabled,
    volume,
    setVolume,
  } = useAudio();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        padding: 20,
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 8,
        color: 'white',
        zIndex: 10000,
      }}
    >
      <h3>🔊 Audio Test Panel</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={audioNav}>Navigation (click)</button>
        <button onClick={audioSelect}>Select (confirm)</button>
        <button onClick={audioBack}>Back (cancel)</button>
        <button onClick={audioWhoosh}>Whoosh (transition)</button>
        <button onClick={audioLaunch}>Launch (power-up)</button>
        <button onClick={audioError}>Error (warning)</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <label>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
      </div>

      <div style={{ marginTop: 8 }}>
        <label>
          Volume: {Math.round(volume * 100)}%
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
            style={{ width: '100%' }}
          />
        </label>
      </div>
    </div>
  );
}
