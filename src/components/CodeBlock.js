import React, {useRef, useState} from 'react';

// Wielolinijkowy odpowiednik CodeLine — przyjmuje TABLICĘ linii (`lines`),
// a nie dowolny tekst jako children. To celowe: JSX i tak scala białe znaki
// i nie interpretuje "\n" jako znaku nowej linii w zwykłym tekście, więc próba
// napisania kilku komend jedna pod drugą jako zwykłych "children" zawsze
// wyląduje w jednej linii. Przekazując linie jako osobne elementy tablicy,
// ten problem znika całkowicie — każda pozycja w `lines` to jedna linijka,
// niezależnie od tego, czy to zwykły string, czy JSX z <SharedValue />.
//
// Kolory (`--prism-background-color`, `--prism-color`) — te same zmienne co
// w CodeLine, więc wygląda identycznie jak prawdziwe bloki kodu Docusaurusa.
export default function CodeBlock({lines = []}) {
  const containerRef = useRef(null);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const container = containerRef.current;
    if (!container) return;
    const text = Array.from(container.children).map(el => el.textContent).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      /* przeglądarka bez dostępu do schowka — nic nie robimy */
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      background: 'var(--prism-background-color, #2a2a2a)',
      color: 'var(--prism-color, #e2e2e2)',
      padding: '12px 12px 12px 16px', borderRadius: 'var(--ifm-code-border-radius, 8px)',
      fontFamily: 'var(--ifm-font-family-monospace)', fontSize: '0.88rem',
      margin: '14px 0',
    }}>
      <div ref={containerRef} style={{flex: 1, overflowX: 'auto'}}>
        {lines.map((line, i) => (
          <div key={i} style={{whiteSpace: 'nowrap', lineHeight: 1.8}}>{line}</div>
        ))}
      </div>
      <button
        onClick={handleCopy}
        title="Kopiuj wszystkie linie"
        style={{
          flexShrink: 0, padding: '5px 12px', borderRadius: '6px', fontSize: '0.78rem',
          border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
          background: copied ? '#16a34a' : 'rgba(255,255,255,0.08)',
          color: copied ? '#ffffff' : 'var(--prism-color, #e2e2e2)',
        }}
      >
        {copied ? '✓ Skopiowano' : 'Kopiuj'}
      </button>
    </div>
  );
}
