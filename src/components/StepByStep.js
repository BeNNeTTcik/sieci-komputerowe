import React, {useState, Children} from 'react';

export default function StepByStep({children}) {
  const steps = Children.toArray(children);
  const total = steps.length;
  const [current, setCurrent] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const card = {
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '32px',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    margin: '24px 0',
  };

  const title = {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 12px 0',
  };

  const desc = {
    fontSize: '1rem',
    lineHeight: 1.6,
    color: '#6b7280',
    margin: '0 0 28px 0',
  };

  const row = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  };

  const pill = (active) => ({
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: active ? '#dbeafe' : 'transparent',
    color: active ? '#2563eb' : '#9ca3af',
    transition: 'background 0.15s',
  });

  const viewAll = {
    marginLeft: '8px',
    color: '#9ca3af',
    fontSize: '0.9rem',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
  };

  const spacer = { flex: 1 };

  const nextBtn = (disabled) => ({
    marginLeft: '12px',
    padding: '10px 22px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: disabled ? 'default' : 'pointer',
    background: disabled ? '#e5e7eb' : '#111827',
    color: disabled ? '#9ca3af' : '#ffffff',
  });

  const backBtn = {
    padding: '10px 22px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    background: '#ffffff',
    color: '#111827',
  };

  const listItem = (active) => ({
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    background: active ? '#f3f4f6' : 'transparent',
    color: active ? '#111827' : '#6b7280',
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={card}>
      <h3 style={title}>{steps[current].props.title}</h3>
      <div style={desc}>{steps[current]}</div>

      <div style={row}>
        {steps.map((_, i) => (
          <button
            key={i}
            style={pill(i === current)}
            onClick={() => { setCurrent(i); setShowAll(false); }}
            aria-label={`Krok ${i + 1}`}
          >
            {i + 1}
          </button>
        ))}

        <button style={viewAll} onClick={() => setShowAll(s => !s)}>
          {showAll ? 'Ukryj listę kroków' : 'Zobacz wszystkie kroki'}
        </button>

        <div style={spacer} />

        {current > 0 && (
          <button style={backBtn} onClick={() => setCurrent(c => c - 1)}>
            Wstecz
          </button>
        )}
        <button
          style={nextBtn(current === total - 1)}
          disabled={current === total - 1}
          onClick={() => setCurrent(c => Math.min(c + 1, total - 1))}
        >
          Dalej
        </button>
      </div>

      {showAll && (
        <div style={{marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '12px'}}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={listItem(i === current)}
              onClick={() => { setCurrent(i); setShowAll(false); }}
            >
              {i + 1}. {step.props.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
