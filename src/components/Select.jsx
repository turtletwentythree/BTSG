import { useEffect, useRef, useState } from 'react';

export default function Select({ value, options, onChange, placeholder = 'โปรดเลือก...', disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className={'rs' + (open ? ' focus' : '') + (disabled ? ' disabled' : '')} ref={ref}>
      <div className="rs-control" onClick={() => !disabled && setOpen(!open)}>
        <span className={value ? 'rs-value' : 'rs-placeholder'}>{value || placeholder}</span>
        <span className="rs-icons">
          {value && !disabled && (
            <i className="mdi mdi-close rs-clear" onClick={(e) => { e.stopPropagation(); onChange(''); }} />
          )}
          <span className="rs-sep" />
          <i className="mdi mdi-chevron-down" />
        </span>
      </div>
      {open && (
        <div className="rs-menu">
          {options.length === 0 && <div className="rs-empty">No options</div>}
          {options.map((o) => (
            <div key={o} className={'rs-option' + (o === value ? ' sel' : '')}
              onClick={() => { onChange(o); setOpen(false); }}>{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}
