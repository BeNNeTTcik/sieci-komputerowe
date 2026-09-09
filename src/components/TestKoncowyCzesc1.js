import React, {useState} from 'react';

const QUESTIONS = [
  {
    text: "Ile warstw ma model ISO/OSI?",
    options: ["5", "7", "4", "9"],
    correct: 1,
    explanation: "Model OSI dzieli komunikację sieciową na 7 warstw, od fizycznej po aplikacji.",
  },
  {
    text: "Jaka jest poprawna kolejność jednostek danych w procesie enkapsulacji?",
    options: [
      "dane → pakiet → segment → ramka → bity",
      "dane → ramka → pakiet → segment → bity",
      "dane → segment → pakiet → ramka → bity",
      "segment → dane → pakiet → bity → ramka",
    ],
    correct: 2,
    explanation: "Kolejność enkapsulacji: dane (aplikacja) → segment (transport) → pakiet (sieć) → ramka (łącze danych) → bity (fizyczna).",
  },
  {
    text: "Na której warstwie modelu OSI działa switch?",
    options: ["warstwa fizyczna", "warstwa łącza danych", "warstwa sieciowa", "warstwa transportowa"],
    correct: 1,
    explanation: "Switch przynależy do warstwy łącza danych (L2) — przełącza ramki na podstawie adresów MAC.",
  },
  {
    text: "Co dokładnie robi protokół ARP?",
    options: [
      "adres MAC na adres IP",
      "adres IP na adres MAC",
      "nazwę domenową na adres IP",
      "port na adres IP",
    ],
    correct: 1,
    explanation: "ARP mapuje adres logiczny IP na adres fizyczny MAC w obrębie tej samej sieci lokalnej.",
  },
  {
    text: "Jakiej masce dziesiętnej odpowiada notacja CIDR /24?",
    options: ["255.255.0.0", "255.0.0.0", "255.255.255.0", "255.255.255.252"],
    correct: 2,
    explanation: "Prefiks /24 oznacza 24 jedynkowe bity maski, co odpowiada zapisowi 255.255.255.0.",
  },
  {
    text: "Co oznacza wpis 0.0.0.0/0 w tablicy routingu?",
    options: [
      "trasę domyślną (bramę domyślną)",
      "trasę do sieci lokalnej",
      "błąd konfiguracji",
      "adres rozgłoszeniowy",
    ],
    correct: 0,
    explanation: "Wpis 0.0.0.0/0 to trasa domyślna — używana, gdy żaden inny, bardziej szczegółowy wpis nie pasuje do adresu docelowego.",
  },
  {
    text: "Który protokół transportowy gwarantuje niezawodne dostarczenie danych?",
    options: ["TCP", "UDP", "ICMP", "ARP"],
    correct: 0,
    explanation: "TCP jest protokołem połączeniowym i niezawodnym — gwarantuje dostarczenie danych we właściwej kolejności.",
  },
  {
    text: "Jaki jest stały rozmiar nagłówka UDP?",
    options: ["20 bajtów", "8 bajtów", "4 bajty", "16 bajtów"],
    correct: 1,
    explanation: "Nagłówek UDP ma stały rozmiar 8 bajtów (4 pola po 16 bitów), znacznie mniej niż minimum 20 bajtów w TCP.",
  },
  {
    text: "Jakiego typu zapytania używa resolver DNS, pytając serwer korzenny (root)?",
    options: [
      "rekurencyjne, tak samo jak klient-resolver",
      "nie występuje żadna komunikacja",
      "zależy wyłącznie od systemu operacyjnego",
      "iteracyjne",
    ],
    correct: 3,
    explanation: "Komunikacja między resolverem a serwerami root/TLD/autorytatywnym jest iteracyjna — każdy z nich wskazuje tylko, kogo zapytać dalej.",
  },
  {
    text: "Mechanizm plików cookie (np. koszyk zakupów w sklepie internetowym) technicznie działa w której warstwie?",
    options: ["warstwie sesji", "warstwie prezentacji", "warstwie aplikacji", "warstwie transportowej"],
    correct: 2,
    explanation: "Mechanizm cookies działa w warstwie aplikacji (przez nagłówki HTTP), mimo że koncepcyjnie \"udaje\" funkcję warstwy sesji.",
  },
  {
    text: "Której warstwie OSI najbliżej odpowiada funkcja pełniona przez TLS/SSL?",
    options: ["warstwie sesji", "warstwie prezentacji", "warstwie sieciowej", "warstwie łącza danych"],
    correct: 1,
    explanation: "TLS/SSL najbliżej odpowiada funkcji warstwy prezentacji (szyfrowanie danych).",
  },
  {
    text: "Czym jest HTTPS w relacji do HTTP?",
    options: [
      "HTTP przesyłany przez szyfrowaną warstwę TLS",
      "zupełnie inny protokół niż HTTP",
      "HTTP działający na UDP zamiast TCP",
      "HTTP z dodatkową kompresją danych",
    ],
    correct: 0,
    explanation: "HTTPS to zwykły HTTP przesyłany przez dodatkową szyfrowaną warstwę TLS — nie jest osobnym protokołem aplikacyjnym.",
  },
];

export default function TestKoncowyCzesc1({title}) {
  const total = QUESTIONS.length;
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(Array(total).fill(null));
  const [phase, setPhase] = useState('taking'); // 'taking' | 'results'
  const [warning, setWarning] = useState('');

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '24px 0',
  };
  const heading = {fontSize: '1.4rem', fontWeight: 600, color: '#111827', margin: '0 0 20px 0'};
  const qText = {fontSize: '1.05rem', fontWeight: 600, color: '#111827', margin: '0 0 16px 0'};

  const optionStyle = (selected) => ({
    display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', marginBottom: '10px',
    borderRadius: '10px', border: selected ? '2px solid #2563eb' : '1px solid #e5e7eb',
    background: selected ? '#eff6ff' : '#ffffff', color: '#111827', cursor: 'pointer', fontSize: '0.95rem',
  });

  const row = {display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '24px'};
  const pill = (active, answered) => ({
    width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', border: 'none',
    background: active ? '#dbeafe' : answered ? '#f3f4f6' : 'transparent',
    color: active ? '#2563eb' : '#9ca3af',
  });
  const spacer = {flex: 1};
  const darkBtn = (disabled) => ({
    padding: '10px 22px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.95rem',
    cursor: disabled ? 'default' : 'pointer', background: disabled ? '#e5e7eb' : '#111827',
    color: disabled ? '#9ca3af' : '#ffffff',
  });
  const lightBtn = {
    padding: '10px 22px', borderRadius: '8px', border: '1px solid #e5e7eb', fontWeight: 600,
    fontSize: '0.95rem', cursor: 'pointer', background: '#ffffff', color: '#111827',
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
    setAnswers(Array(total).fill(null));
    setCurrent(0);
    setWarning('');
    setPhase('taking');
  }

  const score = QUESTIONS.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const pct = Math.round((score / total) * 100);

  if (phase === 'results') {
    return (
      <div style={card} className="printable-results">
        <h3 style={heading}>{title || 'Wynik testu'}</h3>

        <div style={{
          textAlign: 'center', padding: '20px', borderRadius: '12px',
          background: pct >= 50 ? '#f0fdf4' : '#fef2f2', marginBottom: '24px',
        }}>
          <div style={{fontSize: '2rem', fontWeight: 700, color: pct >= 50 ? '#16a34a' : '#dc2626'}}>
            {score} / {total} poprawnych ({pct}%)
          </div>
        </div>

        {QUESTIONS.map((q, i) => {
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
              <div style={{fontSize: '0.9rem', color: '#374151'}}>
                Twoja odpowiedź: {q.options[answers[i]]}
              </div>
              {!isCorrect && (
                <div style={{fontSize: '0.9rem', color: '#16a34a'}}>
                  Poprawna odpowiedź: {q.options[q.correct]}
                </div>
              )}
              <div style={{fontSize: '0.85rem', color: '#6b7280', marginTop: '4px'}}>{q.explanation}</div>
            </div>
          );
        })}

        <div className="no-print" style={{display: 'flex', gap: '12px', marginTop: '24px'}}>
          <button style={lightBtn} onClick={handleRetry}>Spróbuj ponownie</button>
          <button style={darkBtn(false)} onClick={() => window.print()}>Pobierz wynik (PDF)</button>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[current];

  return (
    <div style={card}>
      <h3 style={heading}>{title || 'Test zamykający'}</h3>
      <div style={qText}>{current + 1}. {q.text}</div>

      {q.options.map((opt, i) => (
        <button key={i} style={optionStyle(answers[current] === i)} onClick={() => selectOption(current, i)}>
          {opt}
        </button>
      ))}

      {warning && <p style={{color: '#dc2626', fontSize: '0.9rem', marginTop: '8px'}}>{warning}</p>}

      <div style={row}>
        {QUESTIONS.map((_, i) => (
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
