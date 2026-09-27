import React, {useState, useEffect, useRef, Children} from 'react';

// Losowa permutacja indeksów 0..n-1 (Fisher-Yates). Używana do wybrania
// podzbioru pytań z puli — zwykły Math.random (BEZ ziarna/determinizmu),
// bo w przeciwieństwie np. do wag OSPF, tu celowo chcemy, żeby różne
// podejścia (i różni studenci) dostawali różny zestaw pytań z tej samej puli.
function shuffledIndices(n) {
  const arr = Array.from({length: n}, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// `randomCount` (opcjonalne) — jeśli podane i mniejsze niż liczba wszystkich
// <Question> w środku, quiz przy KAŻDYM "Spróbuj ponownie" losuje NOWY podzbiór
// pytań z całej puli (a nie tylko tasuje kolejność) — dzięki temu ten sam
// <Quiz> może zawierać dużą bazę pytań (np. 20), a każde podejście pokazuje
// tylko część z nich, w innym zestawie. Bez `randomCount` (albo gdy jest
// większe/równe całej puli) zachowanie jest identyczne jak dotychczas —
// wszystkie pytania, w kolejności podanej w kodzie.
//
// `storageKey` (opcjonalne, potrzebne tylko z `randomCount`) — utrwala WYLOSOWANY
// zestaw (nie odpowiedzi) w tej karcie przeglądarki, żeby odświeżenie strony
// w trakcie rozwiązywania nie podmieniało puli pytań pod studentem.
export default function Quiz({title, children, randomCount, storageKey}) {
  const allQuestions = Children.toArray(children).map(q => q.props);
  const allTotal = allQuestions.length;
  const usePool = Number.isInteger(randomCount) && randomCount > 0 && randomCount < allTotal;

  const key = `quiz-pool:${storageKey || (title || 'domyslny').slice(0, 40)}`;
  const loadedRef = useRef(false);

  const [selected, setSelected] = useState(() =>
    usePool ? shuffledIndices(allTotal).slice(0, randomCount) : allQuestions.map((_, i) => i)
  );

  // Wczytaj poprzednio wylosowany (w tej karcie/sesji) zestaw, jeśli jest —
  // TYLKO gdy korzystamy z puli; bez `randomCount` nie ma czego wczytywać.
  useEffect(() => {
    if (!usePool) { loadedRef.current = true; return; }
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.selected) && saved.selected.length === randomCount &&
            saved.selected.every(i => Number.isInteger(i) && i >= 0 && i < allTotal)) {
          setSelected(saved.selected);
        }
      }
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current || !usePool) return;
    try { window.sessionStorage.setItem(key, JSON.stringify({selected})); } catch (e) { /* ignorujemy */ }
  }, [selected, usePool, key]);

  const questions = selected.map(i => allQuestions[i]);
  const total = questions.length;

  const [phase, setPhase] = useState('taking'); // 'taking' | 'results'
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(Array(total).fill(null));
  const [warning, setWarning] = useState('');
  const [studentName, setStudentName] = useState('');

  const card = {
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '32px',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    margin: '24px 0',
  };

  const heading = { fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' };
  const poolHint = { fontSize: '0.82rem', color: '#6b7280', margin: '0 0 20px 0' };
  const qText = { fontSize: '1.05rem', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' };

  const optionStyle = (selectedOpt) => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '12px 16px',
    marginBottom: '10px',
    borderRadius: '10px',
    border: selectedOpt ? '2px solid #2563eb' : '1px solid #e5e7eb',
    background: selectedOpt ? '#eff6ff' : '#ffffff',
    color: '#111827',
    cursor: 'pointer',
    fontSize: '0.95rem',
  });

  const row = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '24px' };

  const pill = (active, answered) => ({
    width: '36px', height: '36px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', border: 'none',
    background: active ? '#dbeafe' : answered ? '#f3f4f6' : 'transparent',
    color: active ? '#2563eb' : '#9ca3af',
  });

  const spacer = { flex: 1 };

  const darkBtn = (disabled) => ({
    padding: '10px 22px', borderRadius: '8px', border: 'none', fontWeight: 600,
    fontSize: '0.95rem', cursor: disabled ? 'default' : 'pointer',
    background: disabled ? '#e5e7eb' : '#111827', color: disabled ? '#9ca3af' : '#ffffff',
  });

  const lightBtn = {
    padding: '10px 22px', borderRadius: '8px', border: '1px solid #e5e7eb',
    fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', background: '#ffffff', color: '#111827',
  };

  function selectOption(qIndex, optIndex) {
    const next = [...answers];
    next[qIndex] = optIndex;
    setAnswers(next);
    setWarning('');
  }

  function handleSubmit() {
    if (answers.includes(null)) {
      setWarning('Odpowiedz na wszystkie pytania przed przesłaniem.');
      return;
    }
    setPhase('results');
  }

  function handleRetry() {
    // Przy podejściu z puli losujemy NOWY zestaw pytań — nie tylko czyścimy
    // odpowiedzi. Bez puli zachowanie jak dotychczas: te same pytania od nowa.
    if (usePool) setSelected(shuffledIndices(allTotal).slice(0, randomCount));
    setAnswers(Array(total).fill(null));
    setCurrent(0);
    setWarning('');
    setPhase('taking');
  }

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  if (phase === 'results') {
    return (
      <div style={card} className="printable-results">
        <h3 style={heading}>{title || 'Wynik quizu'}</h3>
        {usePool && (
          <p style={poolHint}>Ten zestaw to {total} z {allTotal} pytań wylosowanych z puli — kolejne podejście może dać inny zestaw.</p>
        )}

        <div className="no-print" style={{marginBottom: '20px'}}>
          <label style={{display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '6px'}}>
            Imię i nazwisko (pojawi się na wydruku)
          </label>
          <input
            type="text"
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            placeholder="np. Jan Kowalski"
            style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.95rem'}}
          />
        </div>
        {studentName && (
          <p style={{color: '#6b7280', marginTop: '-12px', marginBottom: '20px'}}>
            Student(ka): <strong style={{color: '#111827'}}>{studentName}</strong>
          </p>
        )}

        <div style={{
          textAlign: 'center', padding: '20px', borderRadius: '12px',
          background: pct >= 50 ? '#f0fdf4' : '#fef2f2', marginBottom: '24px',
        }}>
          <div style={{fontSize: '2rem', fontWeight: 700, color: pct >= 50 ? '#16a34a' : '#dc2626'}}>
            {score} / {total} poprawnych ({pct}%)
          </div>
        </div>

        {questions.map((q, i) => {
          const isCorrect = answers[i] === q.correct;
          return (
            <div key={i} style={{
              padding: '14px 16px', borderRadius: '10px', marginBottom: '10px',
              border: `1px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}`,
              background: isCorrect ? '#f0fdf4' : '#fef2f2',
            }}>
              <div style={{fontWeight: 600, color: '#111827', marginBottom: '6px'}}>
                {isCorrect ? '✅' : '❌'} {i + 1}. {q.text}
              </div>
              {q.children && <div style={{margin: '6px 0 10px 0'}}>{q.children}</div>}
              <div style={{fontSize: '0.9rem', color: '#374151'}}>
                Twoja odpowiedź: {q.options[answers[i]]}
              </div>
              {!isCorrect && (
                <div style={{fontSize: '0.9rem', color: '#16a34a'}}>
                  Poprawna odpowiedź: {q.options[q.correct]}
                </div>
              )}
            </div>
          );
        })}

        <div className="no-print" style={{display: 'flex', gap: '12px', marginTop: '24px'}}>
          <button style={lightBtn} onClick={handleRetry}>{usePool ? 'Losuj nowy zestaw' : 'Spróbuj ponownie'}</button>
          <button style={darkBtn(false)} onClick={() => window.print()}>Pobierz wynik (PDF)</button>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div style={card}>
      <h3 style={heading}>{title || 'Quiz'}</h3>
      {usePool && (
        <p style={poolHint}>Losowo wybrany zestaw.</p>
      )}
      <div style={qText}>{current + 1}. {q.text}</div>

      {/* Opcjonalna zawartość dodatkowa pytania (children `<Question>`) — np.
          schemat sieci w ASCII albo fragment konfiguracji w <CodeBlock>,
          do którego odnosi się treść pytania. Bez `children` nic się tu nie
          renderuje (zachowanie identyczne jak dotychczas). */}
      {q.children && <div style={{marginBottom: '16px'}}>{q.children}</div>}

      {q.options.map((opt, i) => (
        <button key={i} style={optionStyle(answers[current] === i)} onClick={() => selectOption(current, i)}>
          {opt}
        </button>
      ))}

      {warning && <p style={{color: '#dc2626', fontSize: '0.9rem', marginTop: '8px'}}>{warning}</p>}

      <div style={row}>
        {questions.map((_, i) => (
          <button key={i} style={pill(i === current, answers[i] !== null)} onClick={() => setCurrent(i)}>
            {i + 1}
          </button>
        ))}
        <div style={spacer} />
        {current > 0 && (
          <button style={lightBtn} onClick={() => setCurrent(c => c - 1)}>Wstecz</button>
        )}
        {current < total - 1 ? (
          <button style={darkBtn(false)} onClick={() => setCurrent(c => c + 1)}>Dalej</button>
        ) : (
          <button style={darkBtn(false)} onClick={handleSubmit}>Prześlij</button>
        )}
      </div>
    </div>
  );
}
