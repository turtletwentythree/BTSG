import { STEPS } from '../data/requestTypes';

export default function Stepper({ current }) {
  return (
    <div className="stepper">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const cls = n < current ? 'done' : n === current ? 'active' : '';
        return (
          <div key={s} className={'step ' + cls}>
            <div className="step-line-row">
              <span className={'step-line' + (i === 0 ? ' hid' : '')} />
              <span className="step-dot">{n}</span>
              <span className={'step-line' + (i === STEPS.length - 1 ? ' hid' : '')} />
            </div>
            <span className="step-label">{s}</span>
          </div>
        );
      })}
    </div>
  );
}
