import React, {useState, useEffect} from 'react';
import {readSharedField, subscribeSharedField} from './sharedFieldStore';

// Pole tekstowe do osadzenia W ŚRODKU linijki kodu (w <CodeBlock>/<CodeLine>),
// które student wypełnia Z PAMIĘCI, a komponent na żywo porównuje wpisaną
// wartość z tym, co student wcześniej faktycznie ustawił (np. w diagramie
// topologii) pod tym samym kluczem `shared`. To odwrotność <SharedValue> —
// tam wartość jest tylko WYŚWIETLANA, tutaj trzeba ją samodzielnie PRZYPOMNIEĆ
// sobie i wpisać, a dopiero potem dostać potwierdzenie.
export default function CodeBlank({shared, width = '130px', placeholder = '...'}) {
  const [target, setTarget] = useState('');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    setTarget(readSharedField(shared, ''));
    const unsubscribe = subscribeSharedField(shared, (v) => setTarget(v));
    return unsubscribe;
  }, [shared]);

  function normalize(s) {
    return String(s ?? '').trim().toLowerCase();
  }

  const targetIsEmpty = target.trim() === '';
  const hasAnswer = answer.trim() !== '';
  const isCorrect = !targetIsEmpty && hasAnswer && normalize(answer) === normalize(target);
  const isWrong = !targetIsEmpty && hasAnswer && !isCorrect;

  const borderColor = isCorrect ? '#22c55e' : isWrong ? '#ef4444' : 'rgba(255,255,255,0.35)';
  const bgColor = isCorrect ? 'rgba(34,197,94,0.18)' : isWrong ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.08)';

  return (
    <input
      type="text"
      value={answer}
      onChange={e => setAnswer(e.target.value)}
      placeholder={placeholder}
      title={targetIsEmpty ? 'Brak wartości odniesienia — uzupełnij najpierw odpowiednie pole wyżej na stronie' : undefined}
      style={{
        width, padding: '2px 6px', borderRadius: '4px', fontSize: '0.88rem',
        fontFamily: 'inherit', textAlign: 'center', boxSizing: 'border-box',
        border: `1px solid ${borderColor}`, background: bgColor,
        color: 'inherit', outline: 'none',
      }}
    />
  );
}
