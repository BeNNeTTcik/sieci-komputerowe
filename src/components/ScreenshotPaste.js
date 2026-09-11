import React, {useState, useRef} from 'react';

// UWAGA: obraz jest trzymany WYŁĄCZNIE w stanie komponentu (RAM przeglądarki),
// celowo NIE jest zapisywany w sessionStorage/localStorage — obrazy w formacie
// base64 szybko przekraczają limit pojemności tych mechanizmów (5–10 MB na
// całą domenę). Efekt uboczny: obraz znika po zamknięciu/odświeżeniu karty —
// dlatego całą pracę nad sprawozdaniem (włącznie z wklejeniem zrzutów) trzeba
// dokończyć w jednej sesji i od razu wygenerować PDF przyciskiem w
// SprawozdanieHeader, zanim się zamknie kartę.

function downscaleImage(dataUrl, maxWidth) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataUrl;
  });
}

export default function ScreenshotPaste({label, maxWidth = 800}) {
  const [image, setImage] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const pasteZoneRef = useRef(null);

  async function processFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const scaled = await downscaleImage(e.target.result, maxWidth);
      setImage(scaled);
    };
    reader.readAsDataURL(file);
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        processFile(item.getAsFile());
        e.preventDefault();
        break;
      }
    }
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }

  const box = {
    border: `2px dashed ${dragOver ? '#2563eb' : '#e5e7eb'}`, borderRadius: '12px',
    padding: '24px', textAlign: 'center', background: dragOver ? '#eff6ff' : '#f9fafb',
    cursor: 'pointer', outline: 'none', margin: '16px 0',
  };
  const removeBtn = {
    marginTop: '10px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #fecaca',
    background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem', cursor: 'pointer',
  };
  const smallBtn = {
    padding: '7px 16px', borderRadius: '8px', border: '1px solid #e5e7eb',
    background: '#ffffff', color: '#111827', fontSize: '0.85rem', cursor: 'pointer',
  };

  return (
    <div style={{margin: '20px 0'}}>
      {label && <div style={{fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '8px'}}>{label}</div>}

      {!image ? (
        <div
          ref={pasteZoneRef}
          tabIndex={0}
          onPaste={handlePaste}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => pasteZoneRef.current?.focus()}
          style={box}
          className="no-print"
        >
          <div style={{fontSize: '0.9rem', color: '#6b7280', marginBottom: '10px'}}>
            📋 Kliknij tutaj i wklej zrzut ekranu (<strong>Ctrl+V</strong>), przeciągnij plik, albo
          </div>
          <button style={smallBtn} onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            Wybierz plik
          </button>
          <input
            ref={fileInputRef} type="file" accept="image/*"
            style={{display: 'none'}} onChange={handleFileInput}
          />
        </div>
      ) : (
        <div>
          <img src={image} alt={label || 'Zrzut ekranu'} style={{maxWidth: '100%', borderRadius: '8px', border: '1px solid #e5e7eb'}} />
          <div className="no-print">
            <button style={removeBtn} onClick={() => setImage(null)}>Usuń i wklej inny</button>
          </div>
        </div>
      )}
    </div>
  );
}
