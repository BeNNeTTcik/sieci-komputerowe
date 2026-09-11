import React, {useRef, useState} from 'react';

// Wygląda jak blok kodu (```), ale jest prawdziwym JSX-em, więc może zawierać
// komponenty React (np. <SharedValue />) wstawiające dynamiczne wartości.
// Zwykły blok ``` w Markdown/MDX nie renderuje komponentów w środku — to
// jest właśnie obejście tego ograniczenia.
//
// Kolory (`--prism-background-color`, `--prism-color`) to te same zmienne CSS,
// których Docusaurus używa do faktycznych bloków kodu podświetlanych przez
// Prism — dzięki temu ten komponent wygląda identycznie i sam dopasowuje się
// do jasnego/ciemnego motywu strony, bez własnej, sztywnej palety kolorów.
export default function CodeLine({children}) {
  const contentRef = useRef(null);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = contentRef.current ? contentRef.current.textContent : '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      /* przeglądarka bez dostępu do schowka — po prostu nic nie robimy */
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      background: 'var(--prism-background-color, #2a2a2a)',
      color: 'var(--prism-color, #e2e2e2)',
      padding: '12px 12px 12px 16px', borderRadius: 'var(--ifm-code-border-radius, 8px)',
      fontFamily: 'var(--ifm-font-family-monospace)', fontSize: '0.88rem',
      margin: '14px 0',
    }}>
      <div ref={contentRef} style={{flex: 1, overflowX: 'auto', whiteSpace: 'nowrap', lineHeight: 1.6}}>
        {children}
      </div>
      <button
        onClick={handleCopy}
        title="Kopiuj"
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
