import React, {useState, useEffect, useRef} from 'react';

export default function OpenQuestion({title, question, modelAnswer, storageKey, minLength = 0}) {
  const key = `open-question:${storageKey || (question || '').slice(0, 40)}`;
  const loadedRef = useRef(false);

  const [answer, setAnswer] = useState('');
  const [showModel, setShowModel] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) setAnswer(raw);
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.sessionStorage.setItem(key, answer);
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 1200);
      return () => clearTimeout(t);
    } catch (e) { /* ignorujemy */ }
  }, [answer, key]);

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '20px 0',
  };
  const heading = {fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: '0 0 10px 0'};
  const qText = {fontSize: '0.95rem', color: '#374151', margin: '0 0 14px 0', lineHeight: 1.5};

  const textareaStyle = {
    width: '100%', minHeight: '110px', padding: '12px 14px', borderRadius: '10px',
    border: answer.trim().length >= minLength ? '1px solid #16a34a' : '1px solid #e5e7eb',
    background: answer.trim().length >= minLength && answer.trim() !== '' ? '#f0fdf4' : '#ffffff',
    fontSize: '0.92rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
    color: '#111827',
  };

  const footerRow = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px'};
  const counter = {fontSize: '0.78rem', color: minLength && answer.trim().length < minLength ? '#dc2626' : '#9ca3af'};
  const savedLabel = {fontSize: '0.78rem', color: '#16a34a', opacity: saved ? 1 : 0, transition: 'opacity 0.3s'};

  const lightBtn = {
    padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb',
    background: '#ffffff', color: '#111827', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600,
  };

  return (
    <div style={card}>
      {title && <h4 style={heading}>{title}</h4>}
      {question && <p style={qText}>{question}</p>}

      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Wpisz swoją odpowiedź..."
        style={textareaStyle}
      />

      <div style={footerRow}>
        <span style={counter}>
          {minLength > 0
            ? `${answer.trim().length} / min. ${minLength} znaków`
            : `${answer.trim().length} znaków`}
        </span>
        <span style={savedLabel}>✓ zapisano</span>
      </div>

      {modelAnswer && (
        <div style={{marginTop: '16px'}}>
          <button style={lightBtn} onClick={() => setShowModel(s => !s)}>
            {showModel ? 'Ukryj przykładową odpowiedź' : 'Pokaż przykładową odpowiedź'}
          </button>
          {showModel && (
            <div style={{
              marginTop: '12px', padding: '14px 16px', borderRadius: '10px',
              background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.9rem',
              color: '#1e3a8a', lineHeight: 1.5,
            }}>
              {modelAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
