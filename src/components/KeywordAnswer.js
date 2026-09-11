import React, {useState, useEffect, useRef} from 'react';

// Normalizuje tekst do porównania: małe litery, myślniki i spacje traktowane
// tak samo (ciąg "-" lub spacji zamieniany na pojedynczą spację), przycięte białe znaki.
function normalize(str) {
  return String(str ?? '')
    .toLowerCase()
    .replace(/[-\s]+/g, ' ')
    .trim();
}

export default function KeywordAnswer({title, question, keywords, explanation, storageKey}) {
  // `keywords` może być stringiem (jedno wymagane słowo/fraza) albo tablicą
  // stringów — wtedy wystarczy, że w odpowiedzi pojawi się CHOĆ JEDNO z nich.
  const requiredList = Array.isArray(keywords) ? keywords : [keywords];

  const key = `keyword-answer:${storageKey || (question || '').slice(0, 40)}`;
  const loadedRef = useRef(false);

  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [emptyWarning, setEmptyWarning] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setAnswer(raw);
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.localStorage.setItem(key, answer);
    } catch (e) { /* ignorujemy */ }
  }, [answer, key]);

  function handleChange(value) {
    setAnswer(value);
    setChecked(false); // po edycji trzeba sprawdzić ponownie — ukrywamy stary wynik
    setEmptyWarning(false); // jak tylko ktoś zaczyna pisać, znika komunikat "podaj odpowiedź"
  }

  function handleCheck() {
    if (answer.trim() === '') {
      setEmptyWarning(true);
      setChecked(false);
      return;
    }
    setEmptyWarning(false);
    const normalizedAnswer = normalize(answer);
    const found = requiredList.some(k => normalizedAnswer.includes(normalize(k)));
    setIsCorrect(found);
    setChecked(true);
  }

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '20px 0',
  };
  const heading = {fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: '0 0 10px 0'};
  const qText = {fontSize: '0.95rem', color: '#374151', margin: '0 0 14px 0', lineHeight: 1.5};

  const textareaStyle = {
    width: '100%', minHeight: '100px', padding: '12px 14px', borderRadius: '10px',
    border: checked ? `1px solid ${isCorrect ? '#16a34a' : '#dc2626'}` : '1px solid #e5e7eb',
    background: checked ? (isCorrect ? '#f0fdf4' : '#fef2f2') : '#ffffff',
    fontSize: '0.92rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
    color: '#111827',
  };

  const darkBtn = (disabled) => ({
    padding: '9px 20px', borderRadius: '8px', border: 'none', fontWeight: 600,
    fontSize: '0.9rem', cursor: disabled ? 'default' : 'pointer', marginTop: '12px',
    background: disabled ? '#e5e7eb' : '#111827', color: disabled ? '#9ca3af' : '#ffffff',
  });

  return (
    <div style={card}>
      {title && <h4 style={heading}>{title}</h4>}
      {question && <p style={qText}>{question}</p>}

      <textarea
        value={answer}
        onChange={e => handleChange(e.target.value)}
        placeholder="Wpisz swoją odpowiedź..."
        style={textareaStyle}
      />

      <button style={darkBtn(checked)} onClick={handleCheck} disabled={checked}>
        Sprawdź
      </button>

      {emptyWarning && (
        <div style={{
          marginTop: '14px', padding: '14px 16px', borderRadius: '10px',
          background: '#eff6ff', border: '1px solid #bfdbfe',
          fontSize: '0.9rem', color: '#1e3a8a', lineHeight: 1.5, fontWeight: 600,
        }}>
          ✏️ Podaj odpowiedź, zanim klikniesz „Sprawdź".
        </div>
      )}

      {checked && (
        <div style={{
          marginTop: '14px', padding: '14px 16px', borderRadius: '10px',
          background: isCorrect ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}`,
          fontSize: '0.9rem', color: '#111827', lineHeight: 1.5,
        }}>
          <div style={{fontWeight: 600, marginBottom: explanation ? '6px' : 0}}>
            {isCorrect ? '✅ Dobrze!' : '❌ Nie do końca.'}
          </div>
          {explanation && <div>{explanation}</div>}
        </div>
      )}
    </div>
  );
}
