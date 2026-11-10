// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Schematy do dokumentacji symulatora. Rysowane w SVG z kolorami motywu Docusaurusa (--ifm-*),
// więc same dopasowują się do trybu jasnego i ciemnego. Plik zaczyna się od „_”, więc nie jest osobną stroną.

import React from 'react';

const C = {
  text: 'var(--ifm-font-color-base)',
  muted: 'var(--ifm-color-emphasis-700)',
  line: 'var(--ifm-color-emphasis-500)',
  band: 'var(--ifm-color-emphasis-100)',
  bandEdge: 'var(--ifm-color-emphasis-300)',
  box: 'var(--ifm-background-surface-color)',
  accent: 'var(--ifm-color-primary)',
  warn: '#d97706',
};
const MONO = 'var(--ifm-font-family-monospace)';

function Frame({ w, h, title, children }: { w: number; h: number; title: string; children: React.ReactNode }) {
  return (
    <figure style={{ margin: '1.25rem 0 1.75rem' }}>
      {/* na wąskim ekranie schemat zachowuje czytelną szerokość i przewija się w poziomie */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={title} style={{ display: 'block', maxWidth: w, minWidth: 720, fontFamily: 'var(--ifm-font-family-base)' }}>
        <defs>
          <marker id="sch-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" style={{ fill: C.accent }} />
          </marker>
          <marker id="sch-arr-m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" style={{ fill: C.line }} />
          </marker>
        </defs>
        {children}
      </svg>
      </div>
      <figcaption style={{ fontSize: '0.85rem', color: C.muted, marginTop: '0.4rem' }}>{title}</figcaption>
    </figure>
  );
}

/** pas (warstwa) z podpisem */
function Band({ x, y, w, h, label, left = false }: { x: number; y: number; w: number; h: number; label: string; left?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} style={{ fill: C.band, stroke: C.bandEdge }} />
      <text x={left ? x + 12 : x + w - 12} y={y + 17} textAnchor={left ? 'start' : 'end'} style={{ fill: C.muted, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </text>
    </g>
  );
}

/** prostokąt z tytułem (nazwą pliku) i kilkoma wierszami opisu */
function Box({ x, y, w, h, title, lines = [], mono = true, accent = false, n }: { x: number; y: number; w: number; h: number; title: string; lines?: string[]; mono?: boolean; accent?: boolean; n?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} style={{ fill: C.box, stroke: accent ? C.accent : C.line, strokeWidth: accent ? 1.8 : 1 }} />
      {n !== undefined && (
        <g>
          <circle cx={x + 16} cy={y + 17} r={10} style={{ fill: C.accent }} />
          <text x={x + 16} y={y + 21} textAnchor="middle" style={{ fill: 'var(--ifm-color-white, #fff)', fontSize: 11.5, fontWeight: 700 }}>
            {n}
          </text>
        </g>
      )}
      <text x={x + (n !== undefined ? 32 : 10)} y={y + 21} style={{ fill: C.text, fontSize: 13, fontWeight: 700, fontFamily: mono ? MONO : undefined }}>
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={i} x={x + 10} y={y + 40 + i * 15.5} style={{ fill: C.muted, fontSize: 11.5 }}>
          {l}
        </text>
      ))}
    </g>
  );
}

function Arrow({ d, muted = false, dashed = false }: { d: string; muted?: boolean; dashed?: boolean }) {
  return <path d={d} style={{ fill: 'none', stroke: muted ? C.line : C.accent, strokeWidth: 1.6, strokeDasharray: dashed ? '5 4' : undefined }} markerEnd={`url(#${muted ? 'sch-arr-m' : 'sch-arr'})`} />;
}

function Label({ x, y, children, anchor = 'start', muted = false }: { x: number; y: number; children: React.ReactNode; anchor?: 'start' | 'middle' | 'end'; muted?: boolean }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      style={{ fill: muted ? C.muted : C.text, fontSize: 11.5, fontWeight: muted ? 400 : 600, paintOrder: 'stroke', stroke: 'var(--ifm-background-color)', strokeWidth: 4, strokeLinejoin: 'round' }}
    >
      {children}
    </text>
  );
}

// ---------------------------------------------------------------------------------------------
// 1. Architektura: moduły i przepływ danych
// ---------------------------------------------------------------------------------------------

export function SchematArchitektury() {
  const o = 18; // przesunięcie pasów pod pasem osadzenia
  return (
    <Frame w={960} h={602} title="Rys. 1. Architektura symulatora – moduły i przepływ danych">
      {/* osadzenie */}
      <Band x={10} y={8} w={760} h={92} label="Osadzenie w Docusaurusie" />
      <Box x={24} y={32} w={196} h={40} title="index.tsx" />
      <text x={208} y={56} textAnchor="end" style={{ fill: C.muted, fontSize: 11.5 }}>
        BrowserOnly
      </text>
      <Box x={290} y={32} w={210} h={40} title="docs/sieci/*.mdx" />
      <Box x={540} y={32} w={216} h={40} title="src/pages/symulator.tsx" />
      <path d="M395 72 L395 88 L170 88" style={{ fill: 'none', stroke: C.accent, strokeWidth: 1.6 }} />
      <path d="M648 72 L648 88 L395 88" style={{ fill: 'none', stroke: C.accent, strokeWidth: 1.6 }} />
      <Arrow d="M170 88 L170 74" />
      <Label x={520} y={84} anchor="middle" muted>
        {'<NetworkSimulator /> – komponent do MDX i stron'}
      </Label>

      {/* interfejs */}
      <Band x={10} y={100 + o} w={760} h={146} label="Interfejs użytkownika (React)" />
      <Box x={24} y={124 + o} w={236} h={110} title="Simulator.tsx" accent lines={['układ ekranu, pakiety, scenariusze', 'schemat sieci i animacja ramek', 'lista zdarzeń, odtwarzanie', 'zapis stanu w przeglądarce']} />
      <Box x={272} y={124 + o} w={170} h={110} title="DeviceWindow.tsx" lines={['okna urządzeń', 'terminal CLI', 'każda zmiana w oknie', '= polecenie CLI']} />
      <Box x={454} y={124 + o} w={160} h={110} title="Details.tsx" lines={['ramka warstwa', 'po warstwie', 'diagram sekwencji']} />
      <Box x={626} y={124 + o} w={130} h={110} title="notes.tsx" lines={['opisy na', 'schemacie:', 'tekst i obszar']} />
      <Arrow d={`M60 72 L60 ${122 + o}`} />

      {/* polecenia i konfiguracja */}
      <Band x={10} y={276 + o} w={760} h={128} label="Polecenia i konfiguracja" />
      <Box x={24} y={300 + o} w={196} h={92} title="cli.ts" accent lines={['parser poleceń', 'pomoc i show config', 'zmiany konfiguracji']} />
      <Box x={248} y={300 + o} w={286} h={92} title="scenarios/" lines={['jeden plik = jeden scenariusz', 'urządzenia z konfiguracją CLI, kable,', 'warianty stanu, przykładowe zadania']} />
      <Box x={548} y={300 + o} w={208} h={92} title="packs.ts" lines={['pakiety protokołów i profile', 'włączają polecenia, okna', 'i protokoły w silniku']} />
      <Arrow d={`M248 ${346 + o} L222 ${346 + o}`} />

      {/* silnik */}
      <Band x={10} y={434 + o} w={760} h={142} label="Silnik symulacji" />
      <Box x={24} y={458 + o} w={430} h={106} title="engine.ts – klasa Sim" accent lines={['kolejka zdarzeń w czasie (1 krok = przejście ramki przez kabel)', 'Ethernet, przełączanie, VLAN, ARP / NDP, IPv4 / IPv6, routing, ICMP,', 'DHCP, DNS, NTP, TCP, UDP, tunele, NAT64, 802.1X, ochrona przełącznika', 'każda decyzja urządzenia zapisana w zdarzeniu (why, notes)']} />
      <Box x={468} y={458 + o} w={288} h={106} title="apps.ts" lines={['aplikacje na TCP:', 'HTTP, HTTPS (TLS 1.3), FTP,', 'SMTP, POP3, IPP, Discard']} />
      <Arrow d={`M454 ${511 + o} L466 ${511 + o}`} muted />

      {/* strzałki między warstwami */}
      <Arrow d={`M70 ${234 + o} L70 ${298 + o}`} />
      <Label x={78} y={262 + o}>polecenie</Label>
      <Label x={78} y={276 + o} muted>
        (terminal, okno)
      </Label>
      <Arrow d={`M357 ${234 + o} C 357 ${262 + o}, 200 ${262 + o}, 190 ${296 + o}`} muted dashed />
      <Arrow d={`M70 ${392 + o} L70 ${456 + o}`} />
      <Label x={78} y={420 + o}>akcja ruchu</Label>
      <Label x={78} y={434 + o} muted>
        (CliActions → zadanie)
      </Label>
      <Arrow d={`M234 ${458 + o} L234 ${236 + o}`} />
      <Label x={242} y={420 + o}>zdarzenia i wyniki</Label>
      <Label x={242} y={434 + o} muted>
        (SimEvent[], OutputLine[])
      </Label>

      {/* stan sieci */}
      <rect x={790} y={8} width={160} height={586} rx={10} style={{ fill: C.band, stroke: C.accent, strokeWidth: 1.4 }} />
      <text x={870} y={32} textAnchor="middle" style={{ fill: C.text, fontSize: 13, fontWeight: 700 }}>
        Stan sieci
      </text>
      <text x={870} y={50} textAnchor="middle" style={{ fill: C.text, fontSize: 12.5, fontWeight: 700, fontFamily: MONO }}>
        model.ts
      </text>
      {['urządzenia, interfejsy,', 'kable, adresy, trasy,', 'tablice ARP / ND / MAC,', 'dzierżawy DHCP, rekordy', 'DNS, konta, opisy'].map((l, i) => (
        <text key={l} x={870} y={70 + i * 15} textAnchor="middle" style={{ fill: C.muted, fontSize: 11 }}>
          {l}
        </text>
      ))}
      {[
        [178 + o, 'rysowanie i okna', 'czytają stan'],
        [340 + o, 'polecenia zmieniają', 'konfigurację'],
        [510 + o, 'silnik czyta i uczy się:', 'ARP, MAC, dzierżawy'],
      ].map(([y, a, b]) => (
        <g key={String(y)}>
          <Arrow d={`M770 ${y} L788 ${y}`} />
          <text x={800} y={(y as number) - 4} style={{ fill: C.text, fontSize: 11, fontWeight: 600 }}>
            {a}
          </text>
          <text x={800} y={(y as number) + 11} style={{ fill: C.muted, fontSize: 11 }}>
            {b}
          </text>
        </g>
      ))}
      <rect x={800} y={566} width={140} height={20} rx={5} style={{ fill: C.box, stroke: C.line }} />
      <text x={870} y={580} textAnchor="middle" style={{ fill: C.muted, fontSize: 10.5 }}>
        ipv6.ts · md5.ts
      </text>
    </Frame>
  );
}

// ---------------------------------------------------------------------------------------------
// 2. Przebieg jednego polecenia
// ---------------------------------------------------------------------------------------------

export function SchematPolecenia() {
  const W = 214;
  const xs = [14, 252, 490, 728];
  const row1 = 18;
  const row2 = 204;
  const H = 138;
  const loopY = row2 + H + 22;
  return (
    <Frame w={960} h={460} title="Rys. 2. Przebieg polecenia: od wpisania do animacji (silnik liczy na bieżąco, razem z odtwarzaniem)">
      <Box n={1} x={xs[0]} y={row1} w={W} h={H} mono={false} title="Użytkownik" lines={['terminal (Tab uzupełnia):', '  ping 192.168.1.11', 'albo przycisk w oknie', 'urządzenia (okno też', 'wysyła polecenie CLI)']} />
      <Box n={2} x={xs[1]} y={row1} w={W} h={H} title="runCommand()" lines={['cli.ts: rozbiór polecenia,', 'sprawdzenie pakietu i typu', 'urządzenia; konfiguracja', '(ip add, route…) zmienia się', 'od razu w modelu']} />
      <Box n={3} x={xs[2]} y={row1} w={W} h={H} title="CliActions" lines={['polecenie wywołujące ruch', '(ping, dhcp-client, http…)', 'staje się zadaniem (Job)', 'dla silnika; wynik tekstowy', 'trafia do terminala']} />
      <Box n={4} x={xs[3]} y={row1} w={W} h={H} title="Sim (na żywo)" accent lines={['engine.ts: jeden silnik na', 'całą sesję; zadanie startuje', 'w bieżącej chwili (setNow),', 'np. startPing() wysyła', 'Echo; polecenia równolegle']} />
      <Box n={5} x={xs[3]} y={row2} w={W} h={H} title="runUntil(chwila)" accent lines={['kolejka zdarzeń wykonywana', 'tylko do bieżącej chwili:', 'transmit → receive → …', 'każdy kabel = 1 krok;', 'urządzenia zapisują why']} />
      <Box n={6} x={xs[2]} y={row2} w={W} h={H} title="SimEvent[]" lines={['zdarzenia przybywają na', 'bieżąco: krok, skąd → dokąd,', 'ramka, protokół, decyzje', 'nadawcy i odbiorcy, czy', 'ramka odrzucona']} />
      <Box n={7} x={xs[1]} y={row2} w={W} h={H} mono={false} title="Odtwarzanie" lines={['wskaźnik czasu napędza', 'silnik: Symulacja – 1,6', 'kroku/s × tempo, krok', 'w przód i w tył; Czas', 'rzeczywisty – runAll()']} />
      <Box n={8} x={xs[0]} y={row2} w={W} h={H} mono={false} title="Widoki" lines={['koperty na kablach,', 'lista zdarzeń, diagram', 'sekwencji, szczegóły', 'ramki, terminal okna,', 'tablice urządzeń']} />
      <Arrow d={`M${xs[0] + W} ${row1 + 69} L${xs[1] - 2} ${row1 + 69}`} />
      <Arrow d={`M${xs[1] + W} ${row1 + 69} L${xs[2] - 2} ${row1 + 69}`} />
      <Arrow d={`M${xs[2] + W} ${row1 + 69} L${xs[3] - 2} ${row1 + 69}`} />
      <Arrow d={`M${xs[3] + W / 2} ${row1 + H} L${xs[3] + W / 2} ${row2 - 2}`} />
      <Arrow d={`M${xs[3]} ${row2 + 69} L${xs[2] + W + 2} ${row2 + 69}`} />
      <Arrow d={`M${xs[2]} ${row2 + 69} L${xs[1] + W + 2} ${row2 + 69}`} />
      <Arrow d={`M${xs[1]} ${row2 + 69} L${xs[0] + W + 2} ${row2 + 69}`} />
      <Label x={xs[3] + W / 2 + 8} y={(row1 + H + row2) / 2 + 4} muted>
        zadania w kolejce
      </Label>
      {/* pętla: każda klatka animacji przesuwa silnik do bieżącej chwili */}
      <path d={`M${xs[1] + W / 2} ${row2 + H} L${xs[1] + W / 2} ${loopY} L${xs[3] + W / 2} ${loopY}`} style={{ fill: 'none', stroke: C.accent, strokeWidth: 1.6, strokeDasharray: '5 4' }} />
      <Arrow d={`M${xs[3] + W / 2} ${loopY} L${xs[3] + W / 2} ${row2 + H + 2}`} dashed />
      <Label x={(xs[1] + xs[3] + W) / 2} y={loopY - 5} anchor="middle">
        każda klatka animacji: runUntil(bieżąca chwila)
      </Label>
      <rect x={14} y={398} width={928} height={52} rx={8} style={{ fill: C.band, stroke: C.bandEdge }} />
      <text x={28} y={418} style={{ fill: C.text, fontSize: 12, fontWeight: 700 }}>
        Ruch jest liczony na bieżąco, razem z animacją.
      </text>
      <text x={28} y={436} style={{ fill: C.muted, fontSize: 11.5 }}>
        Odłączenie kabla, wyłączenie portu albo usunięcie urządzenia w trakcie wymiany działa od razu: ramka w drodze przepada, a kolejne pakiety już nie przejdą.
      </text>
    </Frame>
  );
}

// ---------------------------------------------------------------------------------------------
// 3. Droga ramki przez silnik
// ---------------------------------------------------------------------------------------------

export function SchematRamki() {
  return (
    <Frame w={960} h={644} title="Rys. 3. Droga pakietu w silniku: nadawca → kabel → odbiorca (przełącznik, router albo host)">
      <Band x={10} y={8} w={290} h={596} label="Nadawca" />
      <Band x={314} y={8} w={250} h={596} label="Kabel" />
      <Band x={578} y={8} w={372} h={596} label="Odbiorca" />

      {/* nadawca */}
      <Box x={24} y={34} w={262} h={64} title="sendIp(pakiet)" lines={['adres źródłowy, pakiet', 'IPv4 / IPv6 włączony?']} />
      <Box x={24} y={124} w={262} h={80} title="route()" lines={['tablica routingu: najdłuższy', 'pasujący prefiks (lookupRoute);', 'broadcast, multicast, tunel']} />
      <Box x={24} y={230} w={262} h={96} title="toNextHop()" accent lines={['MAC następnego skoku', 'w tablicy ARP / sąsiadów?', 'nie → ARP Request albo Neighbor', 'Solicitation, pakiet czeka']} />
      <Box x={24} y={360} w={262} h={64} title="encap()" lines={['interfejs tunelu: pakiet', 'w pakiecie (6in4 / 4in6)']} />
      <Box x={24} y={450} w={262} h={80} title="tcpTimer()" lines={['TCP: brak ACK przez RTO', '→ retransmisja segmentu', '(RFC 6298)']} />
      <Arrow d="M155 98 L155 122" />
      <Arrow d="M155 204 L155 228" />
      <Arrow d="M110 326 L110 358" muted />
      <Label x={118} y={346} muted>
        interfejs tunelu
      </Label>
      <Arrow d="M286 392 C 298 392, 298 164, 288 164" muted />
      <Arrow d="M24 490 L16 490 L16 66 L22 66" muted dashed />

      {/* kabel */}
      <text x={439} y={70} textAnchor="middle" style={{ fill: C.muted, fontSize: 11.5 }}>
        każde przejście kabla
      </text>
      <text x={439} y={86} textAnchor="middle" style={{ fill: C.muted, fontSize: 11.5 }}>
        = 1 krok czasu
      </text>
      <Box x={328} y={230} w={222} h={110} title="transmit()" accent lines={['interfejs włączony?', 'kabel podłączony?', 'druga strona włączona?', 'utrata ramek na kablu?', '→ zdarzenie „hop”']} />
      <Box x={328} y={372} w={222} h={64} title="+1 krok" mono={false} lines={['ramka dociera na', 'drugi koniec kabla']} />
      <Arrow d="M286 278 L326 278" />
      <Arrow d="M439 340 L439 370" />
      <Box x={328} y={478} w={222} h={110} title="zdarzenie odrzucone" mono={false} lines={['dropped = true, powód', 'w notes: brak kabla,', 'wyłączony port, strata,', 'zły MAC, brak trasy…']} />
      <Arrow d="M352 340 L352 476" muted dashed />

      {/* odbiorca */}
      <Box x={592} y={34} w={344} h={140} title="switchRx() – przełącznik" lines={['802.1X: port autoryzowany?', 'limit adresów MAC na porcie', 'uczenie: MAC źródłowy → port (IEEE 802.1D)', 'ochrona DHCP, SAVI, RA-Guard', 'VLAN portu, przekazanie albo zalewanie']} />
      <Box x={592} y={198} w={344} h={64} title="receive() – karta sieciowa" lines={['docelowy MAC mój, broadcast albo', 'multicast mojej grupy? (inaczej odrzuć)']} />
      <Box x={592} y={286} w={166} h={64} title="arpRx / ndpRx" lines={['tablice ARP', 'i sąsiadów']} />
      <Box x={770} y={286} w={166} h={64} title="dhcpClientRx" lines={['klient DHCP', '(DORA)']} />
      <Box x={592} y={382} w={166} h={122} title="routerIpRx()" accent lines={['do mnie? → usługa', 'TTL / Hop Limit − 1', 'NAT64, koniec tunelu', 'trasa → następny skok']} />
      <Box x={770} y={382} w={166} h={122} title="hostIpRx()" lines={['adres mój? (host', 'nie przekazuje cudzych', 'pakietów, RFC 1122)', '→ ICMP, UDP, TCP']} />
      <Box x={770} y={528} w={166} h={64} title="tcpRx / udpRx" lines={['TCP: okno, ACK,', 'retransmisje; UDP']} />
      <Box x={592} y={528} w={166} h={64} title="apps.ts" lines={['HTTP, FTP, poczta,', 'IPP, Discard']} />

      {/* +1 krok → odbiorca */}
      <Arrow d="M550 398 C 572 398, 568 120, 590 120" />
      <Label x={572} y={112} anchor="end" muted>
        przełącznik
      </Label>
      <Arrow d="M550 410 C 576 410, 572 236, 590 236" />
      <Label x={572} y={228} anchor="end" muted>
        host, router
      </Label>
      {/* rozgałęzienia za kartą sieciową */}
      <Arrow d="M675 262 L675 284" muted />
      <Arrow d="M853 262 L853 284" muted />
      <path d="M764 262 L764 368" style={{ fill: 'none', stroke: C.line, strokeWidth: 1.6 }} />
      <Arrow d="M764 368 L690 368 L690 380" muted />
      <Arrow d="M764 368 L838 368 L838 380" muted />
      <Label x={764} y={366} anchor="middle" muted>
        IP
      </Label>
      <Arrow d="M853 504 L853 526" muted />
      <Arrow d="M770 560 L760 560" muted />

      {/* pętle */}
      <Arrow d="M592 150 C 520 150, 470 170, 460 228" dashed />
      <Label x={452} y={140} anchor="middle">
        przełącznik:
      </Label>
      <Label x={452} y={154} anchor="middle" muted>
        ta sama ramka,
      </Label>
      <Label x={452} y={168} anchor="middle" muted>
        kolejny kabel
      </Label>
      <Arrow d="M592 470 L571 470 L571 616 L307 616 L307 306 L288 306" dashed />
      <Label x={439} y={632} anchor="middle">
        router: nowa ramka i nowe adresy MAC, ten sam pakiet IP (TTL − 1)
      </Label>
    </Frame>
  );
}
