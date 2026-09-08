import React, {useState, useEffect, useRef} from 'react';
import {ipv4Pool, ipv6Pool} from './subnetProblemsPool';

function normalize(str) {
  return String(str ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

function sample(arr, count) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function slugify(text) {
  return String(text || 'default')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function SubnetTrainer({countIPv4 = 7, countIPv6 = 3, title, storageKey}) {
  const key = `subnet-trainer:${storageKey || slugify(title)}`;
  const loadedRef = useRef(false);
  const fileInputRef = useRef(null);

  function drawNewSet() {
    return [...sample(ipv4Pool, countIPv4), ...sample(ipv6Pool, countIPv6)];
  }

  // Odtwarza tablicę `problems` na podstawie listy ID, biorąc dane WYŁĄCZNIE
  // z zaufanej puli w tym pliku (subnetProblemsPool.js) — nigdy z importowanego pliku.
  function resolveProblemsByIds(ids) {
    const byId = new Map([...ipv4Pool, ...ipv6Pool].map(p => [p.id, p]));
    const resolved = ids.map(id => byId.get(id)).filter(Boolean);
    if (resolved.length !== ids.length) return null; // jakiś id nie istnieje w puli
    return resolved;
  }

  const [problems, setProblems] = useState(drawNewSet);
  const total = problems.length;

  const [answers, setAnswers] = useState(() => problems.map(() => ({})));
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState('working');
  const [studentName, setStudentName] = useState('');
  const [warning, setWarning] = useState('');
  const [showMissing, setShowMissing] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  // --- Auto-wczytanie z localStorage (wygoda na tym samym urządzeniu) ---
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && Array.isArray(saved.problemIds) && saved.problemIds.length === total) {
          const resolved = resolveProblemsByIds(saved.problemIds);
          if (resolved) {
            setProblems(resolved);
            setAnswers(saved.answers || resolved.map(() => ({})));
            setCurrent(saved.current || 0);
            setPhase(saved.phase || 'working');
            setStudentName(saved.studentName || '');
            setResumed(true);
          }
        }
      }
    } catch (e) { /* localStorage niedostępny — ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Auto-zapis do localStorage przy każdej zmianie (tylko id + odpowiedzi) ---
  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({
        problemIds: problems.map(p => p.id), answers, current, phase, studentName,
      }));
    } catch (e) { /* ignorujemy błędy zapisu */ }
  }, [problems, answers, current, phase, studentName, key]);

  function drawBrandNewSet() {
    const fresh = drawNewSet();
    setProblems(fresh);
    setAnswers(fresh.map(() => ({})));
    setCurrent(0);
    setWarning('');
    setShowMissing(false);
    setPhase('working');
    setResumed(false);
    setImportError('');
    setImportSuccess(false);
  }

  function clearSavedProgress() {
    try { window.localStorage.removeItem(key); } catch (e) {}
    drawBrandNewSet();
  }

  // --- Eksport postępu do pliku .json ---
  // UWAGA: eksportujemy tylko ID zadań + odpowiedzi studenta — NIGDY poprawnych
  // odpowiedzi. Dzięki temu edycja pliku "na piechotę" nie pozwala podmienić
  // błędnej odpowiedzi na poprawną przed importem z powrotem.
  function exportProgress() {
    const data = {
      _typ: 'subnet-trainer-progress',
      _wersja: 2,
      title: title || null,
      problemIds: problems.map(p => p.id),
      answers, current, phase, studentName,
      zapisano: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `postep-${slugify(title)}-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Import postępu z pliku .json ---
  function triggerImport() {
    setImportError('');
    setImportSuccess(false);
    fileInputRef.current?.click();
  }

  function handleFileSelected(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data._typ !== 'subnet-trainer-progress') {
          setImportError('To nie jest plik postępu z tego ćwiczenia.');
          return;
        }
        if (!Array.isArray(data.problemIds) || data.problemIds.length !== total) {
          setImportError(`Plik pochodzi z innego zestawu (inna liczba zadań: ${data.problemIds?.length ?? '?'} zamiast ${total}).`);
          return;
        }
        const resolvedProblems = resolveProblemsByIds(data.problemIds);
        if (!resolvedProblems) {
          setImportError('Plik odwołuje się do nieznanych zadań — mógł zostać uszkodzony lub zmodyfikowany.');
          return;
        }
        // problems budujemy WYŁĄCZNIE z lokalnej, zaufanej puli — nie z pliku.
        setProblems(resolvedProblems);
        setAnswers(data.answers || resolvedProblems.map(() => ({})));
        setCurrent(data.current || 0);
        setPhase(data.phase || 'working');
        setStudentName(data.studentName || '');
        setImportError('');
        setImportSuccess(true);
        setResumed(false);
      } catch (err) {
        setImportError('Nie udało się odczytać pliku — upewnij się, że to poprawny plik postępu (.json).');
      }
    };
    reader.onerror = () => setImportError('Błąd podczas odczytu pliku.');
    reader.readAsText(file);
  }

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '24px 0',
  };
  const heading = { fontSize: '1.4rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' };
  const subheading = { fontSize: '0.9rem', color: '#6b7280', margin: '0 0 20px 0' };
  const givenBox = {
    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px',
    padding: '14px 18px', marginBottom: '24px',
  };
  const givenRow = { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.95rem' };
  const fieldLabel = { fontSize: '0.85rem', color: '#374151', marginBottom: '4px', display: 'block' };

  function inputStyle(flagged) {
    const base = {
      width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.95rem',
      marginBottom: '4px', boxSizing: 'border-box',
    };
    if (flagged) return {...base, border: '2px solid #dc2626', background: '#fef2f2'};
    return {...base, border: '1px solid #e5e7eb', background: '#ffffff'};
  }

  const row = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '24px' };
  const pill = (active, complete) => ({
    width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600,
    cursor: 'pointer', border: complete ? '2px solid #16a34a' : 'none',
    background: active ? '#dbeafe' : 'transparent',
    color: active ? '#2563eb' : complete ? '#16a34a' : '#9ca3af',
  });
  const spacer = { flex: 1 };
  const darkBtn = {
    padding: '10px 22px', borderRadius: '8px', border: 'none', fontWeight: 600,
    fontSize: '0.95rem', cursor: 'pointer', background: '#111827', color: '#ffffff',
  };
  const lightBtn = {
    padding: '10px 22px', borderRadius: '8px', border: '1px solid #e5e7eb',
    fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', background: '#ffffff', color: '#111827',
  };
  const smallLightBtn = {...lightBtn, padding: '7px 14px', fontSize: '0.82rem'};

  function setField(problemIdx, k, value) {
    const next = [...answers];
    next[problemIdx] = {...next[problemIdx], [k]: value};
    setAnswers(next);
  }
  function isFieldFilled(problemIdx, k) {
    return String(answers[problemIdx][k] ?? '').trim() !== '';
  }
  function isProblemComplete(problemIdx) {
    return problems[problemIdx].blanks.every(b => isFieldFilled(problemIdx, b.key));
  }
  function isFieldCorrect(problemIdx, blank) {
    return normalize(answers[problemIdx][blank.key]) === normalize(blank.answer);
  }
  function isProblemFullyCorrect(problemIdx) {
    return problems[problemIdx].blanks.every(b => isFieldCorrect(problemIdx, b));
  }
  function getIncompleteIndexes() {
    return problems.map((_, i) => i).filter(i => !isProblemComplete(i));
  }

  function handleFinish() {
    const incomplete = getIncompleteIndexes();
    if (incomplete.length > 0) {
      setShowMissing(true);
      const nums = incomplete.map(i => i + 1).join(', ');
      setWarning(
        incomplete.length === 1
          ? `Pominięto pytanie ${nums} — uzupełnij wszystkie pola przed zakończeniem.`
          : `Pominięto pytania: ${nums} — uzupełnij wszystkie pola przed zakończeniem.`
      );
      setCurrent(incomplete[0]);
      return;
    }
    setWarning('');
    setShowMissing(false);
    setPhase('results');
  }

  const fullyCorrectCount = problems.filter((_, i) => isProblemFullyCorrect(i)).length;
  const pct = Math.round((fullyCorrectCount / total) * 100);

  // pasek eksportu/importu — wspólny dla obu faz
  const transferBar = (
    <div style={{
      display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
      marginBottom: '18px', paddingBottom: '18px', borderBottom: '1px solid #f3f4f6',
    }} className="no-print">
      <button style={smallLightBtn} onClick={exportProgress}>💾 Eksportuj postęp (plik)</button>
      <button style={smallLightBtn} onClick={triggerImport}>📂 Importuj postęp (plik)</button>
      <input
        type="file" accept="application/json,.json" ref={fileInputRef}
        style={{display: 'none'}} onChange={handleFileSelected}
      />
      <span style={{fontSize: '0.78rem', color: '#9ca3af'}}>
        pobierz plik na tym urządzeniu, wczytaj na innym, żeby kontynuować
      </span>
    </div>
  );

  if (phase === 'results') {
    return (
      <div style={card} className="printable-results">
        <h3 style={heading}>{title || 'Wynik ćwiczenia — adresacja IPv4/IPv6'}</h3>

        {transferBar}
        {importError && (
          <div style={{color: '#dc2626', fontSize: '0.85rem', marginBottom: '14px'}}>⚠️ {importError}</div>
        )}
        {importSuccess && (
          <div style={{color: '#16a34a', fontSize: '0.85rem', marginBottom: '14px'}}>✅ Postęp wczytany z pliku.</div>
        )}

        <div className="no-print" style={{marginBottom: '20px'}}>
          <label style={{display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '6px'}}>
            Imię i nazwisko (pojawi się na wydruku)
          </label>
          <input
            type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
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
            {fullyCorrectCount} / {total} zadań w pełni poprawnych ({pct}%)
          </div>
        </div>

        {problems.map((p, i) => {
          const ok = isProblemFullyCorrect(i);
          return (
            <div key={i} style={{
              padding: '14px 16px', borderRadius: '10px', marginBottom: '10px',
              border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
              background: ok ? '#f0fdf4' : '#fef2f2',
            }}>
              <div style={{fontWeight: 600, color: '#111827', marginBottom: '6px'}}>
                {ok ? '✅' : '❌'} Zadanie {i + 1} ({p.type.toUpperCase()}) —{' '}
                {p.given.map(g => g.value).join(' / ')}
              </div>
              {!ok && (
                <div style={{fontSize: '0.85rem', color: '#374151'}}>
                  {p.blanks.filter(b => !isFieldCorrect(i, b)).map(b => (
                    <div key={b.key}>
                      {b.label}: Twoja odpowiedź „{answers[i][b.key] || '(puste)'}”, poprawna: „{b.answer}”
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="no-print" style={{display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap'}}>
          <button style={lightBtn} onClick={() => setPhase('working')}>Wróć do zadań</button>
          <button style={lightBtn} onClick={clearSavedProgress}>Wylosuj nowy zestaw</button>
          <button style={darkBtn} onClick={() => window.print()}>Pobierz wynik (PDF)</button>
        </div>
      </div>
    );
  }

  const p = problems[current];

  return (
    <div style={card}>
      <h3 style={heading}>{title || 'Ćwiczenie — adresacja IPv4/IPv6 (adresy prywatne)'}</h3>
      <p style={subheading}>Zadanie {current + 1} z {total} · typ: {p.type.toUpperCase()}</p>

      {transferBar}
      {importError && (
        <div style={{color: '#dc2626', fontSize: '0.85rem', marginBottom: '14px'}}>⚠️ {importError}</div>
      )}
      {importSuccess && (
        <div style={{color: '#16a34a', fontSize: '0.85rem', marginBottom: '14px'}}>✅ Postęp wczytany z pliku.</div>
      )}

      {resumed && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb',
          borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', fontSize: '0.85rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>ℹ️ Wczytano zapisany na tym urządzeniu postęp.</span>
          <button
            style={{background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem'}}
            onClick={clearSavedProgress}
          >
            zacznij od nowa
          </button>
        </div>
      )}

      {warning && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', fontSize: '0.9rem',
        }}>
          ⚠️ {warning}
        </div>
      )}

      <div style={givenBox}>
        {p.given.map((g, idx) => (
          <div key={idx} style={givenRow}>
            <span style={{color: '#6b7280'}}>{g.label}:</span>
            <strong style={{color: '#111827'}}>{g.value}</strong>
          </div>
        ))}
      </div>

      {p.blanks.map((b) => {
        const flagged = showMissing && !isFieldFilled(current, b.key);
        return (
          <div key={b.key} style={{marginBottom: '14px'}}>
            <label style={fieldLabel}>{b.label}</label>
            <input
              type="text"
              value={answers[current][b.key] || ''}
              onChange={e => setField(current, b.key, e.target.value)}
              style={inputStyle(flagged)}
              placeholder="wpisz odpowiedź..."
            />
            {flagged && (
              <div style={{fontSize: '0.8rem', color: '#dc2626'}}>To pole jest puste.</div>
            )}
          </div>
        );
      })}

      <div style={row}>
        {problems.map((_, i) => (
          <button key={i} style={pill(i === current, isProblemComplete(i))} onClick={() => setCurrent(i)}>
            {i + 1}
          </button>
        ))}
        <div style={spacer} />
        {current > 0 && (
          <button style={lightBtn} onClick={() => setCurrent(c => c - 1)}>Wstecz</button>
        )}
        {current < total - 1 ? (
          <button style={darkBtn} onClick={() => setCurrent(c => c + 1)}>Dalej</button>
        ) : (
          <button style={darkBtn} onClick={handleFinish}>Zakończ i sprawdź wynik</button>
        )}
      </div>
    </div>
  );
}
