import React, {useState} from 'react';

// =============================================================================
// PermissionCalculator — kalkulator uprawnień do plików i katalogów
// dla Debiana (Linux: chmod/chown/umask) oraz Windows (NTFS + udziały, icacls).
//
// Użycie w MDX:
//   import PermissionCalculator from '@site/src/components/PermissionCalculator';
//   <PermissionCalculator />                         // obie zakładki, start: Linux
//   <PermissionCalculator defaultTab="windows" />    // start na zakładce Windows
//   <PermissionCalculator tabs={['linux']} />        // tylko jedna zakładka
//
// Props:
//   title       — nagłówek karty (opcjonalny),
//   defaultTab  — 'linux' | 'windows' (domyślnie 'linux'),
//   tabs        — które zakładki pokazać, domyślnie ['linux', 'windows'].
//
// Komponent nie zapisuje stanu — to narzędzie pomocnicze, nie zadanie do
// oceny. Paleta i wygląd zgodne z COMPONENTS_CONVENTIONS.md.
// =============================================================================

// ---------- wspólne style ----------------------------------------------------

const C = {
  ok: '#16a34a', okBg: '#f0fdf4', okBorder: '#bbf7d0',
  err: '#dc2626', errBg: '#fef2f2', errBorder: '#fecaca',
  accent: '#2563eb', accentBg: '#eff6ff', accentBorder: '#bfdbfe',
  warn: '#b45309', warnBg: '#fffbeb', warnBorder: '#fde68a',
  border: '#e5e7eb', muted: '#9ca3af', text: '#111827', sub: '#6b7280', soft: '#f9fafb',
};

const S = {
  card: {
    border: `1px solid ${C.border}`, borderRadius: '16px', padding: '28px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '24px 0',
  },
  heading: {fontSize: '1.4rem', fontWeight: 600, color: C.text, margin: '0 0 6px 0'},
  sub: {fontSize: '0.9rem', color: C.sub, margin: '0 0 18px 0'},
  section: {fontSize: '1rem', fontWeight: 600, color: C.text, margin: '22px 0 10px 0'},
  label: {fontSize: '0.85rem', color: '#374151', display: 'block', marginBottom: '4px'},
  input: {
    padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`,
    fontSize: '0.92rem', fontFamily: 'var(--ifm-font-family-monospace, monospace)', boxSizing: 'border-box',
  },
  table: {borderCollapse: 'collapse', width: '100%', display: 'table'},
  th: {
    textAlign: 'center', padding: '8px 6px', background: C.soft, borderBottom: `1px solid ${C.border}`,
    fontSize: '0.82rem', color: '#374151', fontWeight: 600,
  },
  td: {padding: '8px 6px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontSize: '0.9rem', verticalAlign: 'middle'},
  code: {
    background: '#1e1e2e', color: '#e2e2e2', borderRadius: '10px', padding: '12px 14px',
    fontFamily: 'var(--ifm-font-family-monospace, monospace)', fontSize: '0.85rem',
    lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre', margin: 0,
  },
  big: {
    fontFamily: 'var(--ifm-font-family-monospace, monospace)', fontSize: '1.5rem', fontWeight: 700,
    color: C.text, letterSpacing: '0.04em',
  },
  pillGroup: {display: 'inline-flex', border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden'},
};

function pillBtn(active) {
  return {
    padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
    background: active ? C.text : '#ffffff', color: active ? '#ffffff' : C.text,
  };
}

function Notice({kind = 'info', children}) {
  const map = {
    info: [C.accent, C.accentBg, C.accentBorder],
    warn: [C.warn, C.warnBg, C.warnBorder],
    err: [C.err, C.errBg, C.errBorder],
    ok: [C.ok, C.okBg, C.okBorder],
  };
  const [fg, bg, bd] = map[kind];
  return (
    <div style={{background: bg, border: `1px solid ${bd}`, color: fg, borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', margin: '6px 0', lineHeight: 1.5}}>
      {children}
    </div>
  );
}

function Stat({label, value, hint}) {
  return (
    <div style={{flex: '1 1 160px', background: C.soft, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 14px'}}>
      <div style={{fontSize: '0.78rem', color: C.sub, marginBottom: '4px'}}>{label}</div>
      <div style={S.big}>{value}</div>
      {hint && <div style={{fontSize: '0.75rem', color: C.muted, marginTop: '4px'}}>{hint}</div>}
    </div>
  );
}

// =============================================================================
// CZĘŚĆ 1: LINUX (Debian)
// =============================================================================

const CLASSES = [
  {key: 'u', name: 'Właściciel', short: 'u (user)'},
  {key: 'g', name: 'Grupa', short: 'g (group)'},
  {key: 'o', name: 'Pozostali', short: 'o (others)'},
];
const BITS = [
  {key: 'r', value: 4, name: 'odczyt'},
  {key: 'w', value: 2, name: 'zapis'},
  {key: 'x', value: 1, name: 'wykonanie'},
];

const MEANING = {
  file: {
    r: 'odczyt zawartości pliku',
    w: 'zmiana zawartości pliku',
    x: 'uruchomienie pliku jako programu lub skryptu',
  },
  dir: {
    r: 'wyświetlenie listy nazw w katalogu (ls)',
    w: 'tworzenie, usuwanie i zmiana nazw plików w katalogu (działa tylko razem z x)',
    x: 'wejście do katalogu (cd) i dostęp do plików, których nazwę się zna',
  },
};

const emptyBits = () => ({u: {r: false, w: false, x: false}, g: {r: false, w: false, x: false}, o: {r: false, w: false, x: false}});

function bitsFromOctal(str) {
  const digits = str.padStart(4, '0').split('').map(Number);
  const [sp, ...ugo] = digits;
  const bits = emptyBits();
  CLASSES.forEach((c, i) => {
    bits[c.key] = {r: (ugo[i] & 4) !== 0, w: (ugo[i] & 2) !== 0, x: (ugo[i] & 1) !== 0};
  });
  return {bits, special: {suid: (sp & 4) !== 0, sgid: (sp & 2) !== 0, sticky: (sp & 1) !== 0}};
}

function digitOf(classBits) {
  return (classBits.r ? 4 : 0) + (classBits.w ? 2 : 0) + (classBits.x ? 1 : 0);
}

function specialDigit(special) {
  return (special.suid ? 4 : 0) + (special.sgid ? 2 : 0) + (special.sticky ? 1 : 0);
}

function octalOf(bits, special) {
  const ugo = CLASSES.map(c => digitOf(bits[c.key])).join('');
  const sp = specialDigit(special);
  return {short: sp ? `${sp}${ugo}` : ugo, full: `${sp}${ugo}`};
}

// Znak na pozycji x: zwykłe x albo litera bitu specjalnego (mała = z x, wielka = bez x).
function execChar(x, specialOn, letter) {
  if (!specialOn) return x ? 'x' : '-';
  return x ? letter : letter.toUpperCase();
}

function symbolicOf(bits, special, type) {
  const u = bits.u, g = bits.g, o = bits.o;
  return (type === 'dir' ? 'd' : '-') +
    (u.r ? 'r' : '-') + (u.w ? 'w' : '-') + execChar(u.x, special.suid, 's') +
    (g.r ? 'r' : '-') + (g.w ? 'w' : '-') + execChar(g.x, special.sgid, 's') +
    (o.r ? 'r' : '-') + (o.w ? 'w' : '-') + execChar(o.x, special.sticky, 't');
}

// Postać do polecenia chmod w trybie symbolicznym, np. u=rwx,g=rx,o=
function chmodSymbolic(bits, special) {
  const part = (cls, extra) => {
    const b = bits[cls];
    return `${cls}=${b.r ? 'r' : ''}${b.w ? 'w' : ''}${b.x ? 'x' : ''}${extra || ''}`;
  };
  return [
    part('u', special.suid ? 's' : ''),
    part('g', special.sgid ? 's' : ''),
    part('o', special.sticky ? 't' : ''),
  ].join(',');
}

// Wczytanie tego, co wpisał użytkownik: ósemkowo (644, 2775) albo
// symbolicznie (rwxr-x---, -rwsr-xr-x, drwxrwxrwt).
function parsePermissionInput(raw) {
  const s = raw.trim();
  if (/^[0-7]{3,4}$/.test(s)) return {...bitsFromOctal(s), type: null};
  const m = s.match(/^([-dl]?)([r-])([w-])([xsS-])([r-])([w-])([xsS-])([r-])([w-])([xtT-])$/);
  if (!m) return null;
  const [, t, ur, uw, ux, gr, gw, gx, or, ow, ox] = m;
  const bits = {
    u: {r: ur === 'r', w: uw === 'w', x: ux === 'x' || ux === 's'},
    g: {r: gr === 'r', w: gw === 'w', x: gx === 'x' || gx === 's'},
    o: {r: or === 'r', w: ow === 'w', x: ox === 'x' || ox === 't'},
  };
  const special = {suid: /[sS]/.test(ux), sgid: /[sS]/.test(gx), sticky: /[tT]/.test(ox)};
  return {bits, special, type: t === 'd' ? 'dir' : t === '-' ? 'file' : null};
}

function describeClass(b, type) {
  const list = BITS.filter(bit => b[bit.key]).map(bit => MEANING[type][bit.key]);
  return list.length ? list.join('; ') : 'brak dostępu';
}

function linuxWarnings(bits, special, type) {
  const out = [];
  const all = CLASSES.every(c => digitOf(bits[c.key]) === 7);
  if (all) out.push(['err', 'Uprawnienia 777: każdy użytkownik systemu może wszystko. Prawie nigdy nie jest to dobry pomysł — zwykle wystarczy 755 (katalog/skrypt) albo 644 (plik).']);
  else if (bits.o.w) {
    if (type === 'file') out.push(['warn', 'Pozostali mają prawo zapisu: każdy użytkownik systemu może zmienić zawartość tego pliku.']);
    else if (!special.sticky) out.push(['warn', 'Pozostali mogą zapisywać w katalogu, a bez sticky bitu mogą też usuwać i przemianowywać cudze pliki. Katalogi wspólne (jak /tmp) mają ustawiony sticky bit.']);
  }
  if (type === 'dir') {
    CLASSES.forEach(c => {
      const b = bits[c.key];
      if (b.w && !b.x) out.push(['warn', `${c.name}: zapis do katalogu bez x nic nie daje — bez prawa wejścia nie da się tworzyć ani usuwać w nim plików.`]);
      else if (b.r && !b.x) out.push(['info', `${c.name}: r bez x pozwala zobaczyć same nazwy plików, ale nie da się wejść do katalogu ani otworzyć plików.`]);
    });
    if (special.suid) out.push(['info', 'SUID na katalogu jest w Linuksie ignorowany.']);
    if (special.sgid) out.push(['ok', 'SGID na katalogu: nowe pliki i podkatalogi dziedziczą grupę katalogu zamiast głównej grupy twórcy — wygodne w katalogach projektów zespołowych.']);
    if (special.sticky) out.push(['ok', 'Sticky bit na katalogu: usunąć lub przemianować plik może tylko jego właściciel, właściciel katalogu lub root.']);
  } else {
    if (special.sticky) out.push(['info', 'Sticky bit na zwykłym pliku jest w Linuksie ignorowany — ma znaczenie tylko dla katalogów.']);
    if (special.suid) out.push(['warn', 'SUID: program uruchamia się z uprawnieniami WŁAŚCICIELA pliku (np. root), niezależnie od tego, kto go uruchomił. Jądro Linuksa ignoruje SUID na skryptach powłoki — działa on tylko dla programów skompilowanych.']);
    if (special.sgid) out.push(['info', 'SGID na pliku: program działa z uprawnieniami GRUPY pliku.']);
  }
  if (special.suid && !bits.u.x) out.push(['info', 'Wielka litera S oznacza bit SUID bez prawa wykonania właściciela — w tej postaci nie ma on żadnego efektu.']);
  if (special.sgid && !bits.g.x && type === 'file') out.push(['info', 'Wielka litera S na pozycji grupy: SGID bez prawa wykonania dla grupy — nie ma efektu przy uruchamianiu.']);
  if (special.sticky && !bits.o.x) out.push(['info', 'Wielka litera T: sticky bit jest ustawiony, ale pozostali nie mają prawa x.']);
  return out;
}

const LINUX_PRESETS = [
  {octal: '644', type: 'file', label: '644 — zwykły plik'},
  {octal: '600', type: 'file', label: '600 — plik prywatny (np. klucz)'},
  {octal: '755', type: 'file', label: '755 — skrypt / program'},
  {octal: '755', type: 'dir', label: '755 — katalog'},
  {octal: '750', type: 'dir', label: '750 — katalog dla grupy'},
  {octal: '2770', type: 'dir', label: '2770 — katalog zespołu (SGID)'},
  {octal: '1777', type: 'dir', label: '1777 — katalog wspólny (jak /tmp)'},
];

function LinuxCalculator() {
  const init = bitsFromOctal('644');
  const [type, setType] = useState('file');
  const [bits, setBits] = useState(init.bits);
  const [special, setSpecial] = useState(init.special);
  const [text, setText] = useState('644');
  const [textError, setTextError] = useState('');
  const [name, setName] = useState('raport.txt');
  const [owner, setOwner] = useState('jan');
  const [group, setGroup] = useState('studenci');
  const [recursive, setRecursive] = useState(false);
  const [umask, setUmask] = useState('022');

  const oct = octalOf(bits, special);
  const sym = symbolicOf(bits, special, type);

  function syncText(nextBits, nextSpecial) {
    setText(octalOf(nextBits, nextSpecial).short);
    setTextError('');
  }

  function toggleBit(cls, bit) {
    const next = {...bits, [cls]: {...bits[cls], [bit]: !bits[cls][bit]}};
    setBits(next);
    syncText(next, special);
  }

  function toggleSpecial(key) {
    const next = {...special, [key]: !special[key]};
    setSpecial(next);
    syncText(bits, next);
  }

  function handleText(value) {
    setText(value);
    if (value.trim() === '') { setTextError(''); return; }
    const parsed = parsePermissionInput(value);
    if (!parsed) {
      setTextError('Wpisz 3–4 cyfry ósemkowe (np. 640, 2775) albo zapis symboliczny (np. rwxr-x--- lub drwxrwxrwt).');
      return;
    }
    setTextError('');
    setBits(parsed.bits);
    setSpecial(parsed.special);
    if (parsed.type) setType(parsed.type);
  }

  function applyPreset(p) {
    const parsed = bitsFromOctal(p.octal);
    setBits(parsed.bits);
    setSpecial(parsed.special);
    setType(p.type);
    setText(p.octal);
    setTextError('');
    setName(p.type === 'dir' ? 'projekty' : p.octal === '755' ? 'skrypt.sh' : 'raport.txt');
  }

  // --- umask ---
  const umaskValid = /^0?[0-7]{3}$/.test(umask.trim());
  const umaskDigits = umaskValid ? umask.trim().slice(-3) : null;
  const applyMask = (base) => umaskDigits
    ? base.split('').map((d, i) => (Number(d) & ~Number(umaskDigits[i]) & 7)).join('')
    : null;
  const umaskFile = applyMask('666');
  const umaskDir = applyMask('777');

  function loadFromUmask(octal, t) {
    const parsed = bitsFromOctal(octal);
    setBits(parsed.bits);
    setSpecial(parsed.special);
    setType(t);
    setText(octal);
    setTextError('');
  }

  const target = name.trim() || 'nazwa';
  const quoted = /[\s'"$]/.test(target) ? `"${target}"` : target;
  const rFlag = type === 'dir' && recursive ? '-R ' : '';
  const commands = [
    `# nadanie uprawnień — zapis ósemkowy`,
    `chmod ${rFlag}${oct.short} ${quoted}`,
    `# to samo w zapisie symbolicznym`,
    `chmod ${rFlag}${chmodSymbolic(bits, special)} ${quoted}`,
    `# zmiana właściciela i grupy (wymaga sudo)`,
    `sudo chown ${rFlag}${owner || 'uzytkownik'}:${group || 'grupa'} ${quoted}`,
    `# sprawdzenie wyniku`,
    `ls -l${type === 'dir' ? 'd' : ''} ${quoted}`,
    `${sym} 1 ${owner || 'uzytkownik'} ${group || 'grupa'}  4096 lis 12 10:00 ${target}`,
  ].join('\n');

  const warnings = linuxWarnings(bits, special, type);
  const checkbox = {width: '18px', height: '18px', flexShrink: 0, margin: 0, cursor: 'pointer', accentColor: C.accent};

  return (
    <div>
      <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '14px'}}>
        <div>
          <span style={S.label}>Obiekt</span>
          <div style={S.pillGroup}>
            <button style={pillBtn(type === 'file')} onClick={() => setType('file')}>Plik</button>
            <button style={pillBtn(type === 'dir')} onClick={() => setType('dir')}>Katalog</button>
          </div>
        </div>
        <div style={{flex: '1 1 260px'}}>
          <label style={S.label}>Wpisz uprawnienia (ósemkowo lub symbolicznie)</label>
          <input
            style={{...S.input, width: '100%', borderColor: textError ? C.err : C.border, background: textError ? C.errBg : '#ffffff'}}
            value={text}
            onChange={e => handleText(e.target.value)}
            placeholder="np. 750 albo rwxr-x---"
            spellCheck={false}
          />
        </div>
      </div>
      {textError && <Notice kind="err">{textError}</Notice>}

      <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '4px 0 16px 0'}}>
        {LINUX_PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            style={{padding: '4px 10px', borderRadius: '999px', border: `1px solid ${C.border}`, background: '#ffffff', fontSize: '0.78rem', cursor: 'pointer', color: '#374151'}}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{overflowX: 'auto'}}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{...S.th, textAlign: 'left'}}>Kto</th>
              {BITS.map(b => (
                <th key={b.key} style={S.th}>
                  {b.key} <span style={{color: C.muted, fontWeight: 400}}>({b.value})</span><br />
                  <span style={{fontWeight: 400, color: C.sub}}>{b.name}</span>
                </th>
              ))}
              <th style={S.th}>Cyfra</th>
              <th style={{...S.th, textAlign: 'left'}}>Co to daje</th>
            </tr>
          </thead>
          <tbody>
            {CLASSES.map(c => (
              <tr key={c.key}>
                <td style={{...S.td, textAlign: 'left', whiteSpace: 'nowrap'}}>
                  <strong>{c.name}</strong><br /><span style={{fontSize: '0.75rem', color: C.muted}}>{c.short}</span>
                </td>
                {BITS.map(b => (
                  <td key={b.key} style={S.td}>
                    <input
                      type="checkbox"
                      style={checkbox}
                      checked={bits[c.key][b.key]}
                      onChange={() => toggleBit(c.key, b.key)}
                      aria-label={`${c.name}: ${b.name}`}
                      title={MEANING[type][b.key]}
                    />
                  </td>
                ))}
                <td style={{...S.td, ...S.big, fontSize: '1.15rem'}}>{digitOf(bits[c.key])}</td>
                <td style={{...S.td, textAlign: 'left', fontSize: '0.8rem', color: '#374151'}}>{describeClass(bits[c.key], type)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={S.section}>Bity specjalne (pierwsza cyfra)</div>
      <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
        {[
          {key: 'suid', label: 'SUID (4)', desc: 'program działa z uprawnieniami właściciela pliku'},
          {key: 'sgid', label: 'SGID (2)', desc: type === 'dir' ? 'nowe pliki dziedziczą grupę katalogu' : 'program działa z uprawnieniami grupy pliku'},
          {key: 'sticky', label: 'Sticky (1)', desc: 'w katalogu: cudze pliki może usunąć tylko ich właściciel'},
        ].map(sp => (
          <label key={sp.key} style={{flex: '1 1 200px', display: 'flex', gap: '8px', alignItems: 'flex-start', border: `1px solid ${special[sp.key] ? C.accent : C.border}`, background: special[sp.key] ? C.accentBg : '#ffffff', borderRadius: '10px', padding: '8px 10px', cursor: 'pointer'}}>
            <input type="checkbox" style={{...checkbox, marginTop: '2px'}} checked={special[sp.key]} onChange={() => toggleSpecial(sp.key)} />
            <span>
              <strong style={{fontSize: '0.88rem'}}>{sp.label}</strong><br />
              <span style={{fontSize: '0.78rem', color: C.sub}}>{sp.desc}</span>
            </span>
          </label>
        ))}
      </div>

      <div style={S.section}>Wynik</div>
      <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
        <Stat label="Zapis ósemkowy" value={oct.short} hint={specialDigit(special) === 0 ? `pełny zapis: ${oct.full}` : 'pierwsza cyfra: bity specjalne'} />
        <Stat label="Zapis symboliczny (ls -l)" value={sym} hint="pierwszy znak: - plik, d katalog" />
        <Stat label="chmod symbolicznie" value={<span style={{fontSize: '0.95rem'}}>{chmodSymbolic(bits, special)}</span>} />
      </div>

      {warnings.length > 0 && (
        <div style={{marginTop: '12px'}}>
          {warnings.map(([kind, msg], i) => <Notice key={i} kind={kind}>{msg}</Notice>)}
        </div>
      )}

      <div style={S.section}>Polecenia</div>
      <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'flex-end'}}>
        <div style={{flex: '2 1 180px'}}>
          <label style={S.label}>Nazwa {type === 'dir' ? 'katalogu' : 'pliku'}</label>
          <input style={{...S.input, width: '100%'}} value={name} onChange={e => setName(e.target.value)} spellCheck={false} />
        </div>
        <div style={{flex: '1 1 120px'}}>
          <label style={S.label}>Właściciel</label>
          <input style={{...S.input, width: '100%'}} value={owner} onChange={e => setOwner(e.target.value)} spellCheck={false} />
        </div>
        <div style={{flex: '1 1 120px'}}>
          <label style={S.label}>Grupa</label>
          <input style={{...S.input, width: '100%'}} value={group} onChange={e => setGroup(e.target.value)} spellCheck={false} />
        </div>
        {type === 'dir' && (
          <label style={{display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.85rem', paddingBottom: '8px', cursor: 'pointer'}}>
            <input type="checkbox" style={checkbox} checked={recursive} onChange={() => setRecursive(r => !r)} />
            rekurencyjnie (-R)
          </label>
        )}
      </div>
      <pre style={S.code}>{commands}</pre>
      {type === 'dir' && recursive && (
        <Notice kind="warn">
          <code>chmod -R</code> ustawia te same bity na katalogach i plikach w środku. Przy prawie x oznacza to, że zwykłe pliki też staną się „wykonywalne”. Bezpieczniej użyć litery <code>X</code> (np. <code>chmod -R u=rwX,g=rX,o= {quoted}</code>) — nadaje x tylko katalogom i plikom, które już były wykonywalne.
        </Notice>
      )}

      <div style={S.section}>umask — domyślne uprawnienia nowych plików</div>
      <p style={{fontSize: '0.85rem', color: C.sub, margin: '0 0 10px 0', lineHeight: 1.6}}>
        Nowy plik powstaje z uprawnieniami 666, a nowy katalog z 777, po czym system <strong>usuwa</strong> bity ustawione w masce umask.
        Aktualną maskę pokazuje polecenie <code>umask</code>; w Debianie typowa wartość to 022.
      </p>
      <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'stretch'}}>
        <div style={{flex: '0 1 140px'}}>
          <label style={S.label}>umask</label>
          <input
            style={{...S.input, width: '100%', borderColor: umaskValid ? C.border : C.err, background: umaskValid ? '#ffffff' : C.errBg}}
            value={umask} onChange={e => setUmask(e.target.value)} placeholder="022" spellCheck={false}
          />
          {!umaskValid && <div style={{fontSize: '0.75rem', color: C.err, marginTop: '4px'}}>3 cyfry 0–7, np. 027</div>}
        </div>
        {umaskValid && (
          <>
            <div style={{flex: '1 1 200px', background: C.soft, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '10px 12px'}}>
              <div style={{fontSize: '0.78rem', color: C.sub}}>nowy plik: 666 bez {umaskDigits}</div>
              <div style={{...S.big, fontSize: '1.2rem'}}>{umaskFile} <span style={{fontSize: '0.9rem', color: C.sub}}>{symbolicOf(bitsFromOctal(umaskFile).bits, {suid: false, sgid: false, sticky: false}, 'file')}</span></div>
              <button style={{marginTop: '6px', fontSize: '0.78rem', border: `1px solid ${C.border}`, background: '#ffffff', borderRadius: '8px', padding: '3px 10px', cursor: 'pointer'}} onClick={() => loadFromUmask(umaskFile, 'file')}>wczytaj do kalkulatora</button>
            </div>
            <div style={{flex: '1 1 200px', background: C.soft, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '10px 12px'}}>
              <div style={{fontSize: '0.78rem', color: C.sub}}>nowy katalog: 777 bez {umaskDigits}</div>
              <div style={{...S.big, fontSize: '1.2rem'}}>{umaskDir} <span style={{fontSize: '0.9rem', color: C.sub}}>{symbolicOf(bitsFromOctal(umaskDir).bits, {suid: false, sgid: false, sticky: false}, 'dir')}</span></div>
              <button style={{marginTop: '6px', fontSize: '0.78rem', border: `1px solid ${C.border}`, background: '#ffffff', borderRadius: '8px', padding: '3px 10px', cursor: 'pointer'}} onClick={() => loadFromUmask(umaskDir, 'dir')}>wczytaj do kalkulatora</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CZĘŚĆ 2: WINDOWS (NTFS)
// =============================================================================

// Uprawnienia szczegółowe NTFS. `code` to skrót używany przez icacls.
const SPECIAL = [
  {code: 'X', label: 'Przechodzenie przez folder / wykonywanie pliku'},
  {code: 'RD', label: 'Wyświetlanie zawartości folderu / odczyt danych'},
  {code: 'RA', label: 'Odczyt atrybutów'},
  {code: 'REA', label: 'Odczyt atrybutów rozszerzonych'},
  {code: 'WD', label: 'Tworzenie plików / zapis danych'},
  {code: 'AD', label: 'Tworzenie folderów / dołączanie danych'},
  {code: 'WA', label: 'Zapis atrybutów'},
  {code: 'WEA', label: 'Zapis atrybutów rozszerzonych'},
  {code: 'DC', label: 'Usuwanie podfolderów i plików'},
  {code: 'DE', label: 'Usuwanie'},
  {code: 'RC', label: 'Odczyt uprawnień'},
  {code: 'WDAC', label: 'Zmiana uprawnień'},
  {code: 'WO', label: 'Przejęcie na własność'},
  {code: 'S', label: 'Synchronizacja'},
];
const ALL_SPECIAL = SPECIAL.map(s => s.code);

const R_SET = ['RD', 'RA', 'REA', 'RC', 'S'];
const W_SET = ['WD', 'AD', 'WA', 'WEA', 'RC', 'S'];
const RX_SET = [...R_SET, 'X'];
const M_SET = [...new Set([...RX_SET, ...W_SET, 'DE'])];

// Uprawnienia podstawowe (zakładka „Zabezpieczenia”) — każde to zestaw szczegółowych.
const BASIC = [
  {code: 'F', label: 'Pełna kontrola', set: ALL_SPECIAL, desc: 'wszystko, w tym zmiana uprawnień i przejęcie na własność'},
  {code: 'M', label: 'Modyfikacja', set: M_SET, desc: 'odczyt, zapis, uruchamianie i usuwanie'},
  {code: 'RX', label: 'Odczyt i wykonanie', set: RX_SET, desc: 'odczyt oraz uruchamianie programów / wchodzenie do folderów'},
  {code: 'R', label: 'Odczyt', set: R_SET, desc: 'odczyt zawartości, atrybutów i uprawnień'},
  {code: 'W', label: 'Zapis', set: W_SET, desc: 'tworzenie i zmiana zawartości (bez usuwania istniejących plików)'},
];

const SHARE = [
  {code: 'none', label: '— brak udziału (tylko dostęp lokalny) —', set: null},
  {code: 'R', label: 'Odczyt', set: RX_SET},
  {code: 'C', label: 'Zmiana', set: M_SET},
  {code: 'F', label: 'Pełna kontrola', set: ALL_SPECIAL},
];

const INHERIT = [
  {code: 'OICI', flags: '(OI)(CI)', label: 'Ten folder, podfoldery i pliki'},
  {code: 'NONE', flags: '', label: 'Tylko ten folder'},
  {code: 'CI', flags: '(CI)', label: 'Ten folder i podfoldery'},
  {code: 'OI', flags: '(OI)', label: 'Ten folder i pliki'},
  {code: 'OICIIO', flags: '(OI)(CI)(IO)', label: 'Tylko podfoldery i pliki'},
  {code: 'CIIO', flags: '(CI)(IO)', label: 'Tylko podfoldery'},
  {code: 'OIIO', flags: '(OI)(IO)', label: 'Tylko pliki'},
];

const has = (set, codes) => codes.every(c => set.has(c));

// Opis zestawu uprawnień „po ludzku”: największe pasujące uprawnienia
// podstawowe + to, co zostało ponad nie (jako uprawnienia szczegółowe).
function describeNtfs(set) {
  const contained = BASIC.filter(b => has(set, b.set));
  const top = contained.filter(b => !contained.some(o => o !== b && o.set.length > b.set.length && b.set.every(c => o.set.includes(c))));
  const covered = new Set(top.flatMap(b => b.set));
  const extra = SPECIAL.filter(s => set.has(s.code) && !covered.has(s.code));
  return {top, extra};
}

function icaclsPerm(set) {
  if (set.size === 0) return null;
  const exact = BASIC.find(b => b.set.length === set.size && has(set, b.set));
  if (exact) return exact.code;
  if (set.size === 1 && set.has('DE')) return 'D';
  return `(${SPECIAL.filter(s => set.has(s.code)).map(s => s.code).join(',')})`;
}

function NtfsSummary({set, emptyText, deny = false}) {
  const [fg, bg, bd] = deny ? [C.err, C.errBg, C.errBorder] : [C.ok, C.okBg, C.okBorder];
  if (set.size === 0) return <span style={{color: C.err, fontWeight: 600}}>{emptyText || 'brak dostępu'}</span>;
  const {top, extra} = describeNtfs(set);
  return (
    <span>
      {top.map(b => (
        <span key={b.code} style={{display: 'inline-block', background: bg, border: `1px solid ${bd}`, color: fg, borderRadius: '999px', padding: '1px 9px', fontSize: '0.8rem', fontWeight: 600, margin: '2px 4px 2px 0'}}>{b.label}</span>
      ))}
      {extra.length > 0 && (
        <span style={{fontSize: '0.8rem', color: '#374151'}}>
          {top.length ? ' + ' : ''}{extra.map(e => e.label.toLowerCase()).join(', ')}
        </span>
      )}
    </span>
  );
}

const WIN_PRESETS = [
  {label: 'Tylko odczyt', set: RX_SET},
  {label: 'Odczyt i zapis (bez usuwania)', set: [...new Set([...RX_SET, ...W_SET])]},
  {label: 'Modyfikacja', set: M_SET},
  {label: 'Pełna kontrola', set: ALL_SPECIAL},
  {label: 'Skrzynka podawcza (tylko wrzucanie plików)', set: ['X', 'WD', 'AD', 'RA', 'S']},
];

function WindowsCalculator() {
  const [type, setType] = useState('folder');
  const [set, setSet] = useState(new Set(M_SET));
  const [mode, setMode] = useState('grant');
  const [replace, setReplace] = useState(false);
  const [principal, setPrincipal] = useState('Studenci');
  const [path, setPath] = useState('C:\\Dane\\Projekty');
  const [inherit, setInherit] = useState('OICI');
  const [noPropagate, setNoPropagate] = useState(false);
  const [share, setShare] = useState('R');
  const [showSpecial, setShowSpecial] = useState(false);

  const checkedBasics = BASIC.filter(b => has(set, b.set));

  function toggleBasic(b) {
    const isOn = has(set, b.set);
    if (!isOn) {
      setSet(new Set([...set, ...b.set]));
      return;
    }
    // Odznaczenie: zabieramy zestaw tego uprawnienia, ale zostawiamy
    // inne zaznaczone uprawnienia podstawowe, które od niego nie zależą
    // (np. odznaczenie „Odczyt” przy „Pełnej kontroli” zostawia „Zapis”).
    const remaining = checkedBasics.filter(o => o !== b && !b.set.every(c => o.set.includes(c)));
    const next = new Set([...set].filter(c => !b.set.includes(c)));
    remaining.forEach(o => o.set.forEach(c => next.add(c)));
    setSet(next);
  }

  function toggleSpecial(code) {
    const next = new Set(set);
    if (next.has(code)) next.delete(code); else next.add(code);
    setSet(next);
  }

  const perm = icaclsPerm(set);
  const inh = INHERIT.find(i => i.code === inherit);
  const flags = type === 'folder' ? `${inh.flags}${noPropagate && inh.flags ? '(NP)' : ''}` : '';
  const verb = mode === 'deny' ? '/deny' : replace ? '/grant:r' : '/grant';
  const who = principal.trim() || 'Użytkownik';
  const target = path.trim() || (type === 'folder' ? 'C:\\Folder' : 'C:\\Folder\\plik.txt');

  const commands = perm ? [
    `:: wyświetlenie obecnej listy uprawnień (ACL)`,
    `icacls "${target}"`,
    `:: ${mode === 'deny' ? 'dodanie wpisu ODMÓW' : replace ? 'nadanie uprawnień z zastąpieniem dotychczasowych jawnych wpisów tego podmiotu' : 'dodanie wpisu ZEZWALAJ'}`,
    `icacls "${target}" ${verb} "${who}:${flags}${perm}"`,
    `:: usunięcie wszystkich jawnych wpisów tego podmiotu`,
    `icacls "${target}" /remove "${who}"`,
  ].join('\n') : null;

  const shareDef = SHARE.find(s => s.code === share);
  const effectiveNet = shareDef.set ? new Set([...set].filter(c => shareDef.set.includes(c))) : null;
  const checkbox = {width: '18px', height: '18px', flexShrink: 0, margin: 0, cursor: 'pointer', accentColor: mode === 'deny' ? C.err : C.accent};

  const warnings = [];
  if (has(set, ['WDAC']) && !has(set, ALL_SPECIAL)) warnings.push(['warn', 'Zmiana uprawnień (WDAC) pozwala podmiotowi nadać sobie dowolne inne uprawnienia — w praktyce to prawie pełna kontrola.']);
  if (has(set, ['WO']) && !has(set, ALL_SPECIAL)) warnings.push(['warn', 'Przejęcie na własność (WO): właściciel zawsze może zmienić uprawnienia obiektu, więc to też droga do pełnej kontroli.']);
  if (has(set, ['DC']) && !has(set, ALL_SPECIAL) && type === 'folder') warnings.push(['info', 'Usuwanie podfolderów i plików (DC) pozwala usunąć zawartość folderu nawet wtedy, gdy na samych plikach nie ma prawa Usuwanie.']);
  if (type === 'folder' && set.size > 0 && !set.has('X') && set.has('RD')) warnings.push(['info', 'Bez „Przechodzenia przez folder” użytkownik zobaczy listę plików, ale nie zawsze otworzy ich zawartość (zależnie od ustawienia „Pomijanie sprawdzania przy przechodzeniu” w zasadach systemu).']);
  if (mode === 'deny' && has(set, ALL_SPECIAL)) warnings.push(['err', 'Odmowa pełnej kontroli dla szerokiej grupy (np. Wszyscy, Użytkownicy) może odciąć od folderu także administratorów. Odmowy używaj oszczędnie i dla wąskich grup.']);

  return (
    <div>
      <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '14px'}}>
        <div>
          <span style={S.label}>Obiekt</span>
          <div style={S.pillGroup}>
            <button style={pillBtn(type === 'folder')} onClick={() => setType('folder')}>Folder</button>
            <button style={pillBtn(type === 'file')} onClick={() => setType('file')}>Plik</button>
          </div>
        </div>
        <div>
          <span style={S.label}>Typ wpisu</span>
          <div style={S.pillGroup}>
            <button style={pillBtn(mode === 'grant')} onClick={() => setMode('grant')}>Zezwalaj</button>
            <button style={{...pillBtn(mode === 'deny'), background: mode === 'deny' ? C.err : '#ffffff'}} onClick={() => setMode('deny')}>Odmów</button>
          </div>
        </div>
        <div style={{flex: '1 1 160px'}}>
          <label style={S.label}>Użytkownik lub grupa</label>
          <input style={{...S.input, width: '100%'}} value={principal} onChange={e => setPrincipal(e.target.value)} spellCheck={false} />
        </div>
        <div style={{flex: '2 1 220px'}}>
          <label style={S.label}>Ścieżka</label>
          <input style={{...S.input, width: '100%'}} value={path} onChange={e => setPath(e.target.value)} spellCheck={false} />
        </div>
      </div>

      <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '4px 0 16px 0'}}>
        {WIN_PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => setSet(new Set(p.set))}
            style={{padding: '4px 10px', borderRadius: '999px', border: `1px solid ${C.border}`, background: '#ffffff', fontSize: '0.78rem', cursor: 'pointer', color: '#374151'}}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={S.section}>Uprawnienia podstawowe</div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '8px'}}>
        {BASIC.map(b => {
          const on = has(set, b.set);
          return (
            <label key={b.code} style={{display: 'flex', gap: '8px', alignItems: 'flex-start', border: `1px solid ${on ? (mode === 'deny' ? C.err : C.accent) : C.border}`, background: on ? (mode === 'deny' ? C.errBg : C.accentBg) : '#ffffff', borderRadius: '10px', padding: '8px 10px', cursor: 'pointer'}}>
              <input type="checkbox" style={{...checkbox, marginTop: '2px'}} checked={on} onChange={() => toggleBasic(b)} />
              <span>
                <strong style={{fontSize: '0.88rem'}}>{b.label}</strong> <code style={{fontSize: '0.75rem'}}>{b.code}</code><br />
                <span style={{fontSize: '0.78rem', color: C.sub}}>{b.desc}</span>
              </span>
            </label>
          );
        })}
      </div>
      {type === 'folder' && (
        <p style={{fontSize: '0.8rem', color: C.sub, margin: '8px 0 0 0', lineHeight: 1.5}}>
          W oknie Właściwości folderu jest też pozycja „Wyświetlanie zawartości folderu”. To te same uprawnienia co „Odczyt i wykonanie”, ale dziedziczone tylko przez podfoldery, nie przez pliki — w kalkulatorze uzyskasz ją, wybierając „Odczyt i wykonanie” i zakres „Ten folder i podfoldery”.
        </p>
      )}

      <button
        onClick={() => setShowSpecial(v => !v)}
        style={{marginTop: '14px', background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: '0.88rem', padding: 0, fontWeight: 600}}
      >
        {showSpecial ? '▾' : '▸'} Uprawnienia szczegółowe (zaawansowane) — {set.size} z {SPECIAL.length}
      </button>
      {showSpecial && (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '4px 14px', marginTop: '8px', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: '10px', background: C.soft}}>
          {SPECIAL.map(s => (
            <label key={s.code} style={{display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.84rem', cursor: 'pointer', padding: '2px 0'}}>
              <input type="checkbox" style={checkbox} checked={set.has(s.code)} onChange={() => toggleSpecial(s.code)} />
              <span>{s.label} <code style={{fontSize: '0.72rem', color: C.sub}}>{s.code}</code></span>
            </label>
          ))}
        </div>
      )}

      {type === 'folder' && (
        <>
          <div style={S.section}>Zakres (dziedziczenie)</div>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center'}}>
            <select value={inherit} onChange={e => setInherit(e.target.value)} style={{...S.input, fontFamily: 'inherit', minWidth: '260px'}}>
              {INHERIT.map(i => <option key={i.code} value={i.code}>{i.label}{i.flags ? `  ${i.flags}` : ''}</option>)}
            </select>
            <label style={{display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer'}}>
              <input type="checkbox" style={checkbox} checked={noPropagate} onChange={() => setNoPropagate(v => !v)} disabled={!inh.flags} />
              tylko jeden poziom w dół (NP)
            </label>
          </div>
          <p style={{fontSize: '0.78rem', color: C.sub, margin: '6px 0 0 0', lineHeight: 1.5}}>
            (OI) — dziedziczą pliki, (CI) — dziedziczą podfoldery, (IO) — wpis nie dotyczy samego folderu, tylko obiektów w nim, (NP) — dziedziczenie tylko o jeden poziom.
          </p>
        </>
      )}

      <div style={S.section}>Wynik</div>
      <div style={{background: C.soft, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 14px', fontSize: '0.88rem', lineHeight: 1.8}}>
        <div><span style={{color: C.sub}}>Wpis ACL:</span> <strong>{mode === 'deny' ? 'Odmów' : 'Zezwalaj'}</strong> dla <strong>{who}</strong>{type === 'folder' ? <> — zakres: <strong>{inh.label.toLowerCase()}</strong></> : null}</div>
        <div><span style={{color: C.sub}}>Uprawnienia:</span> <NtfsSummary set={set} emptyText="nic nie zaznaczono" deny={mode === 'deny'} /></div>
        <div><span style={{color: C.sub}}>Skrót icacls:</span> <code>{perm ? `${flags}${perm}` : '—'}</code></div>
      </div>

      {warnings.map(([kind, msg], i) => <Notice key={i} kind={kind}>{msg}</Notice>)}

      <div style={S.section}>Polecenia (wiersz poleceń jako administrator)</div>
      {commands
        ? <pre style={S.code}>{commands}</pre>
        : <Notice kind="info">Zaznacz co najmniej jedno uprawnienie, żeby zobaczyć polecenie.</Notice>}
      {mode === 'grant' && (
        <label style={{display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.82rem', marginTop: '8px', cursor: 'pointer', color: '#374151'}}>
          <input type="checkbox" style={checkbox} checked={replace} onChange={() => setReplace(v => !v)} />
          zastąp dotychczasowe jawne uprawnienia tego podmiotu (<code>/grant:r</code>) zamiast je uzupełniać
        </label>
      )}

      <div style={S.section}>Uprawnienia efektywne: NTFS a udział sieciowy</div>
      {mode === 'deny' ? (
        <Notice kind="info">
          Wpis <strong>Odmów</strong> blokuje wskazane uprawnienia niezależnie od wpisów Zezwalaj z innych grup tego użytkownika.
          Kolejność ważności: jawna odmowa → jawne zezwolenie → odziedziczona odmowa → odziedziczone zezwolenie.
          Jawne zezwolenie na danym obiekcie wygrywa więc z odmową odziedziczoną z folderu nadrzędnego.
        </Notice>
      ) : (
        <>
          <p style={{fontSize: '0.85rem', color: C.sub, margin: '0 0 10px 0', lineHeight: 1.6}}>
            Przy pracy lokalnej (zalogowanie na tym komputerze) liczą się tylko uprawnienia NTFS.
            Przy dostępie przez sieć (\\serwer\udział) sprawdzane są <strong>oba</strong> poziomy i obowiązuje <strong>bardziej restrykcyjny</strong> — część wspólna obu zestawów.
          </p>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px'}}>
            <label style={{fontSize: '0.85rem', color: '#374151'}}>Uprawnienie udziału dla <strong>{who}</strong>:</label>
            <select value={share} onChange={e => setShare(e.target.value)} style={{...S.input, fontFamily: 'inherit'}}>
              {SHARE.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table style={S.table}>
              <tbody>
                <tr>
                  <td style={{...S.td, textAlign: 'left', width: '34%', color: C.sub}}>Lokalnie (tylko NTFS)</td>
                  <td style={{...S.td, textAlign: 'left'}}><NtfsSummary set={set} /></td>
                </tr>
                <tr>
                  <td style={{...S.td, textAlign: 'left', color: C.sub}}>Przez sieć (NTFS ∩ udział)</td>
                  <td style={{...S.td, textAlign: 'left'}}>
                    {effectiveNet ? <NtfsSummary set={effectiveNet} /> : <span style={{color: C.muted}}>folder nie jest udostępniony — brak dostępu przez sieć</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {effectiveNet && effectiveNet.size < set.size && (
            <Notice kind="warn">Udział ogranicza uprawnienia: przez sieć {who} ma mniej, niż wynikałoby z samego NTFS.</Notice>
          )}
          {effectiveNet && shareDef.set.length > set.size && set.size > 0 && (
            <Notice kind="info">Udział pozwala na więcej niż NTFS — przez sieć i tak obowiązują węższe uprawnienia NTFS. Typowa praktyka: udział „Zmiana” lub „Pełna kontrola” dla Użytkowników uwierzytelnionych, a szczegóły ustawia się w NTFS.</Notice>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Komponent główny
// =============================================================================

export default function PermissionCalculator({title, defaultTab = 'linux', tabs = ['linux', 'windows']}) {
  const available = tabs.filter(t => t === 'linux' || t === 'windows');
  const [tab, setTab] = useState(available.includes(defaultTab) ? defaultTab : available[0]);

  return (
    <div style={S.card}>
      <h3 style={S.heading}>{title || 'Kalkulator uprawnień'}</h3>
      <p style={S.sub}>
        {tab === 'linux'
          ? 'Debian / Linux: zaznacz prawa albo wpisz je ósemkowo lub symbolicznie — kalkulator pokaże drugi zapis, znaczenie bitów i gotowe polecenia.'
          : 'Windows / NTFS: wybierz uprawnienia podstawowe lub szczegółowe — kalkulator pokaże polecenie icacls i uprawnienia efektywne przez udział sieciowy.'}
      </p>

      {available.length > 1 && (
        <div style={{...S.pillGroup, marginBottom: '18px'}} role="tablist">
          <button role="tab" aria-selected={tab === 'linux'} style={pillBtn(tab === 'linux')} onClick={() => setTab('linux')}>Debian (Linux)</button>
          <button role="tab" aria-selected={tab === 'windows'} style={pillBtn(tab === 'windows')} onClick={() => setTab('windows')}>Windows (NTFS)</button>
        </div>
      )}

      {/* Obie zakładki zostają zamontowane, żeby przełączanie nie kasowało wprowadzonych danych. */}
      <div style={{display: tab === 'linux' ? 'block' : 'none'}}><LinuxCalculator /></div>
      <div style={{display: tab === 'windows' ? 'block' : 'none'}}><WindowsCalculator /></div>
    </div>
  );
}