// SPDX-License-Identifier: MIT
// Szczegóły jednostki danych (enkapsulacja wg warstw) i diagram sekwencji.
import React from 'react';
import { BCAST_MAC, Network, PROTO_COLORS, PROTO_INFO, PROTO_LABEL, getDev, stdUrl } from './model';
import { IPP_PORT, SimEvent, fmtClock, icmpName, portProto } from './engine';
import styles from './styles.module.css';

type Row = [string, React.ReactNode, string?];

function Fields({ rows }: { rows: Row[] }) {
  return (
    <table className={styles.fields}>
      <tbody>
        {rows.map(([k, v, note], i) => (
          <tr key={i}>
            <th>{k}</th>
            <td>
              <code>{v}</code>
              {note && <span className={styles.fieldNote}>{note}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Layer({ n, title, color, children }: { n: string; title: string; color: string; children: React.ReactNode }) {
  return (
    <section className={styles.layer} style={{ borderLeftColor: color }}>
      <h4>
        <span className={styles.layerNo} style={{ background: color }}>{n}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}

const L2 = '#64748b';
const L3 = '#0d9488';
const L4 = '#2563eb';
const L7 = '#9333ea';

function macNote(mac: string) {
  if (mac === BCAST_MAC) return 'broadcast – do wszystkich';
  if (mac.startsWith('33:33:')) return 'multicast IPv6 (33:33 + końcówka adresu grupy)';
  return undefined;
}

export function EventDetails({ ev, net }: { ev: SimEvent | null; net: Network }) {
  if (!ev) {
    return (
      <div className={styles.empty}>
        Kliknij zdarzenie na liście, kopertę na schemacie albo strzałkę na diagramie sekwencji, aby zobaczyć zawartość ramki warstwa po warstwie i
        decyzje podjęte przez urządzenia.
      </div>
    );
  }
  const f = ev.frame;
  const p = f.ip;
  const from = getDev(net, ev.from)?.name ?? '?';
  const to = getDev(net, ev.to)?.name ?? '?';
  const info = PROTO_INFO[ev.protocol];
  const v6 = p?.v === 6;
  const ndp = v6 && p?.icmp && p.icmp.type >= 133 && p.icmp.type <= 137;
  const app = p?.tcp?.app;
  const blocks: { label: string; color: string; flex: number }[] = [{ label: 'Ethernet II', color: L2, flex: 2 }];
  if (f.arp) blocks.push({ label: 'ARP', color: PROTO_COLORS.ARP, flex: 3 });
  if (p) {
    blocks.push({ label: v6 ? 'IPv6' : 'IPv4', color: L3, flex: v6 ? 4 : 3 });
    if (p.icmp) blocks.push({ label: ndp ? 'ICMPv6 / NDP' : v6 ? 'ICMPv6' : 'ICMP', color: PROTO_COLORS[ndp ? 'NDP' : 'ICMP'], flex: 2 });
    if (p.udp) blocks.push({ label: 'UDP', color: L4, flex: 1 }, { label: p.udp.dhcp ? 'DHCP' : p.udp.dns ? 'DNS' : 'NTP', color: L7, flex: 3 });
    if (p.tcp) {
      blocks.push({ label: 'TCP', color: L4, flex: 2 });
      if (app?.tls || ev.protocol === 'HTTPS') blocks.push({ label: app?.enc ? 'TLS 🔒' : 'TLS', color: PROTO_COLORS.HTTPS, flex: app?.enc ? 4 : 3 });
      else if (app) blocks.push({ label: PROTO_LABEL[app.proto], color: L7, flex: 3 });
    }
  }
  blocks.push({ label: 'FCS', color: L2, flex: 1 });

  return (
    <div className={styles.details}>
      <div className={styles.detailsHead}>
        <span className={styles.chip} style={{ background: PROTO_COLORS[ev.protocol] }}>{PROTO_LABEL[ev.protocol]}</span>
        <strong>{ev.summary}</strong>
      </div>
      <div className={styles.muted}>
        krok {ev.t} · {ev.kind === 'drop' ? <>pakiet nie opuścił urządzenia {from}</> : <>{from} ({ev.fromIface}) → {to} ({ev.toIface})</>} ·{' '}
        {ev.dropped ? <span className={styles.bad}>✗ odrzucona</span> : <span className={styles.good}>✓ przyjęta</span>}
      </div>

      <div className={styles.encap} aria-label="Budowa ramki">
        {blocks.map((b, i) => (
          <div key={i} style={{ flex: b.flex, background: b.color }}>{b.label}</div>
        ))}
      </div>

      {ev.why.length > 0 && (
        <div className={styles.reason}>
          <h4>Nadawca ({from}) – dlaczego tak?</h4>
          <ul>{ev.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}
      {ev.notes.length > 0 && (
        <div className={`${styles.reason} ${ev.dropped ? styles.reasonBad : ''}`}>
          <h4>{ev.kind === 'drop' ? `Problem na ${from}` : `Odbiorca (${to}) – co zrobił?`}</h4>
          <ul>{ev.notes.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      <Layer n="2" title="Warstwa łącza danych – Ethernet II (IEEE 802.3)" color={L2}>
        <Fields
          rows={[
            ['MAC docelowy', f.dst, macNote(f.dst)],
            ['MAC źródłowy', f.src],
            ['EtherType', f.etherType === 'ARP' ? '0x0806' : f.etherType === 'IPv6' ? '0x86DD' : '0x0800', f.etherType],
          ]}
        />
      </Layer>

      {f.arp && (
        <Layer n="2½" title="ARP (RFC 826)" color={PROTO_COLORS.ARP}>
          <Fields
            rows={[
              ['Operacja', f.arp.op === 'request' ? '1 (request)' : '2 (reply)'],
              ['MAC nadawcy', f.arp.senderMac],
              ['IP nadawcy', f.arp.senderIp],
              ['MAC celu', f.arp.targetMac, f.arp.op === 'request' ? 'jeszcze nieznany' : undefined],
              ['IP celu', f.arp.targetIp],
            ]}
          />
        </Layer>
      )}

      {p && !v6 && (
        <Layer n="3" title="Warstwa sieciowa – IPv4 (RFC 791)" color={L3}>
          <Fields
            rows={[
              ['Adres źródłowy', p.src || '(uzupełni nadawca)', p.src === '0.0.0.0' ? 'host nie ma jeszcze adresu' : undefined],
              ['Adres docelowy', p.dst, p.dst === '255.255.255.255' ? 'broadcast ograniczony' : undefined],
              ['TTL', String(p.ttl), 'każdy router zmniejsza o 1'],
              ['Protokół', p.proto === 'ICMP' ? '1' : p.proto === 'TCP' ? '6' : '17', p.proto],
              ['Identyfikator', String(p.id), 'używany przy fragmentacji'],
              ['Suma kontrolna nagłówka', 'obecna', 'przeliczana na każdym routerze'],
            ]}
          />
        </Layer>
      )}
      {p && v6 && (
        <Layer n="3" title="Warstwa sieciowa – IPv6 (RFC 8200)" color={L3}>
          <Fields
            rows={[
              ['Adres źródłowy', p.src, p.src.startsWith('fe80') ? 'link-local' : undefined],
              ['Adres docelowy', p.dst, p.dst.startsWith('ff02') ? 'multicast w obrębie łącza' : undefined],
              ['Hop Limit', String(p.ttl), 'odpowiednik TTL'],
              ['Next Header', p.proto === 'ICMP' ? '58' : p.proto === 'TCP' ? '6' : '17', p.proto === 'ICMP' ? 'ICMPv6' : p.proto],
              ['Flow Label', '0'],
              ['Suma kontrolna nagłówka', 'brak', 'IPv6 jej nie ma – routery pracują szybciej'],
            ]}
          />
        </Layer>
      )}

      {p?.icmp && (
        <Layer n="3" title={ndp ? 'ICMPv6 – Neighbor Discovery (RFC 4861)' : v6 ? 'ICMPv6 (RFC 4443)' : 'ICMP (RFC 792)'} color={PROTO_COLORS[ndp ? 'NDP' : 'ICMP']}>
          <Fields
            rows={[
              ['Typ', String(p.icmp.type), icmpName(p.v, p.icmp.type)],
              ['Kod', String(p.icmp.code)],
              ...(p.icmp.target ? ([['Adres docelowy (target)', p.icmp.target]] as Row[]) : []),
              ...(p.icmp.lladdr ? ([['Opcja: adres warstwy łącza', p.icmp.lladdr]] as Row[]) : []),
              ...(p.icmp.type === 136 ? ([['Flagi', `${p.icmp.router ? 'R ' : ''}${p.icmp.solicited ? 'S ' : ''}O`, 'R – router, S – odpowiedź na pytanie']] as Row[]) : []),
              ...(p.icmp.prefixes ? ([['Opcja: prefiks', p.icmp.prefixes.map((x) => `${x.prefix}/${x.len}`).join(', ') || '-', 'flaga A – wolno użyć do SLAAC']] as Row[]) : []),
              ...([0, 8, 128, 129].includes(p.icmp.type) ? ([['Identyfikator', String(p.icmp.id)], ['Numer sekwencyjny', String(p.icmp.seq)]] as Row[]) : []),
              ...(p.icmp.orig ? ([['Dotyczy pakietu', `${p.icmp.orig.src} → ${p.icmp.orig.dst}`, 'nagłówek oryginału w treści']] as Row[]) : []),
            ]}
          />
        </Layer>
      )}

      {p?.udp && (
        <Layer n="4" title="Warstwa transportowa – UDP (RFC 768)" color={L4}>
          <Fields rows={[['Port źródłowy', String(p.udp.srcPort)], ['Port docelowy', String(p.udp.dstPort), { 67: 'serwer DHCP', 68: 'klient DHCP', 53: 'DNS', 123: 'NTP' }[p.udp.dstPort]]]} />
        </Layer>
      )}
      {p?.udp?.dhcp && (
        <Layer n="7" title="Warstwa aplikacji – DHCP (RFC 2131/2132)" color={L7}>
          <Fields
            rows={[
              ['Typ komunikatu (opcja 53)', `DHCP${p.udp.dhcp.msg}`],
              ['xid', `0x${p.udp.dhcp.xid.toString(16)}`, 'łączy pytanie z odpowiedzią'],
              ['chaddr', p.udp.dhcp.chaddr, 'MAC klienta'],
              ['yiaddr', p.udp.dhcp.yiaddr, 'adres dla klienta'],
              ['siaddr', p.udp.dhcp.siaddr],
              ['giaddr', p.udp.dhcp.giaddr || '0.0.0.0', p.udp.dhcp.giaddr && p.udp.dhcp.giaddr !== '0.0.0.0' ? 'adres przekaźnika – sieć klienta' : 'bez przekaźnika'],
              ...(p.udp.dhcp.requested ? ([['Żądany adres (opcja 50)', p.udp.dhcp.requested]] as Row[]) : []),
              ...(p.udp.dhcp.mask
                ? ([
                    ['Maska (opcja 1)', p.udp.dhcp.mask],
                    ['Router (opcja 3)', p.udp.dhcp.router || '-'],
                    ['DNS (opcja 6)', p.udp.dhcp.dns || '-'],
                    ['Czas dzierżawy (opcja 51)', `${p.udp.dhcp.lease} s`],
                  ] as Row[])
                : []),
            ]}
          />
        </Layer>
      )}
      {p?.udp?.dns && (
        <Layer n="7" title="Warstwa aplikacji – DNS (RFC 1035)" color={L7}>
          <Fields
            rows={[
              ['Identyfikator', String(p.udp.dns.id), 'łączy pytanie z odpowiedzią'],
              ['Rodzaj', p.udp.dns.qr === 'query' ? 'zapytanie (QR=0)' : 'odpowiedź (QR=1)'],
              ['Pytanie', `${p.udp.dns.name} ${p.udp.dns.qtype}`],
              ...(p.udp.dns.qr === 'response'
                ? ([
                    ['Kod odpowiedzi', p.udp.dns.rcode, p.udp.dns.rcode === 'NXDOMAIN' ? 'nazwa nie istnieje' : undefined],
                    ...p.udp.dns.answers.map((a) => [`Odpowiedź ${a.type}`, a.value] as Row),
                  ] as Row[])
                : []),
            ]}
          />
        </Layer>
      )}
      {p?.udp?.ntp && (
        <Layer n="7" title="Warstwa aplikacji – NTP (RFC 5905)" color={L7}>
          <Fields
            rows={[
              ['Tryb', p.udp.ntp.mode === 3 ? '3 (klient)' : '4 (serwer)'],
              ['t1 – wysłanie przez klienta', fmtClock(p.udp.ntp.t1).slice(11)],
              ...(p.udp.ntp.t2 ? ([['t2 – odbiór przez serwer', fmtClock(p.udp.ntp.t2).slice(11)], ['t3 – wysłanie przez serwer', fmtClock(p.udp.ntp.t3!).slice(11)], ['Stratum', String(p.udp.ntp.stratum), p.udp.ntp.ref]] as Row[]) : []),
            ]}
          />
        </Layer>
      )}

      {p?.tcp && (
        <Layer n="4" title="Warstwa transportowa – TCP (RFC 9293)" color={L4}>
          <Fields
            rows={[
              ['Port źródłowy', String(p.tcp.srcPort), portProto(p.tcp.srcPort) ? PROTO_LABEL[portProto(p.tcp.srcPort)!] : p.tcp.srcPort > 49151 ? 'port efemeryczny' : undefined],
              ['Port docelowy', String(p.tcp.dstPort), portProto(p.tcp.dstPort) ? PROTO_LABEL[portProto(p.tcp.dstPort)!] : p.tcp.dstPort === IPP_PORT ? 'IPP' : undefined],
              ['Flagi', p.tcp.flags.join(', ')],
              ['Numer sekwencyjny', String(p.tcp.seq)],
              ['Numer potwierdzenia', p.tcp.flags.includes('ACK') ? String(p.tcp.ack) : '—'],
              ['Długość danych', `${p.tcp.len} B`],
            ]}
          />
        </Layer>
      )}
      {app && (
        <Layer n="7" title={app.tls ? `TLS 1.3 (RFC 8446) – ${app.tls}` : `Warstwa aplikacji – ${PROTO_INFO[app.proto].name.split(' – ')[0]}`} color={app.tls ? PROTO_COLORS.HTTPS : L7}>
          {app.enc ? (
            <>
              <pre className={`${styles.payload} ${styles.cipher}`}>{cipherText(app.len)}</pre>
              <p className={styles.muted}>Tak widzi te dane każdy po drodze: tylko długość ({app.len} B). Treść zna wyłącznie nadawca i odbiorca.</p>
              <details className={styles.peek}>
                <summary>Co jest w środku (widzą to tylko końce połączenia)</summary>
                <pre className={styles.payload}>{app.text}</pre>
              </details>
            </>
          ) : (
            <pre className={styles.payload}>{app.text}</pre>
          )}
        </Layer>
      )}

      <div className={styles.about}>
        <h4>{info.name}</h4>
        <p>
          <em>{info.layer}.</em> {info.text}
        </p>
        <p className={styles.refs}>
          Źródła:{' '}
          {info.refs.map((r, i) => {
            const u = stdUrl(r.id);
            return (
              <React.Fragment key={r.id}>
                {i > 0 && ', '}
                {u ? <a href={u} target="_blank" rel="noreferrer" title={r.title}>{r.id}</a> : <span title={r.title}>{r.id}</span>}
              </React.Fragment>
            );
          })}
        </p>
      </div>
    </div>
  );
}

function cipherText(len: number) {
  const hex = '0123456789abcdef';
  let s = '';
  let x = len * 2654435761;
  for (let i = 0; i < Math.min(96, len * 2); i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    s += hex[x % 16];
    if (i % 32 === 31) s += '\n';
    else if (i % 2 === 1) s += ' ';
  }
  return s + (len > 48 ? ' …' : '');
}

// ---------- diagram sekwencji ----------

export function SequenceDiagram({
  events,
  net,
  playhead,
  selected,
  onSelect,
}: {
  events: SimEvent[];
  net: Network;
  playhead: number;
  selected: number | null;
  onSelect: (e: SimEvent) => void;
}) {
  if (!events.length) return <div className={styles.empty}>Tu pojawi się diagram sekwencji ostatniego polecenia: kto z kim i w jakiej kolejności wymienia komunikaty.</div>;
  const lanes: string[] = [];
  for (const e of events) for (const id of [e.from, e.to]) if (!lanes.includes(id)) lanes.push(id);
  const t0 = Math.min(...events.map((e) => e.t));
  const t1 = Math.max(...events.map((e) => e.t + 1));
  const col = 130;
  const row = 30;
  const top = 44;
  const W = Math.max(420, lanes.length * col + 20);
  const H = top + (t1 - t0) * row + 24;
  const lx = (id: string) => 10 + col / 2 + lanes.indexOf(id) * col;
  const y = (t: number) => top + (t - t0) * row;
  const phY = y(Math.min(Math.max(playhead, t0), t1));
  return (
    <svg className={styles.seq} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        {Object.entries(PROTO_COLORS).map(([k, c]) => (
          <marker key={k} id={`arr-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={c} />
          </marker>
        ))}
      </defs>
      {lanes.map((id) => (
        <g key={id}>
          <line x1={lx(id)} x2={lx(id)} y1={30} y2={H - 6} className={styles.seqLane} />
          <rect x={lx(id) - 50} y={6} width={100} height={22} rx={6} className={styles.seqHead} />
          <text x={lx(id)} y={21} textAnchor="middle" className={styles.seqHeadText}>
            {getDev(net, id)?.name ?? '?'}
          </text>
        </g>
      ))}
      {playhead >= t0 && playhead <= t1 && <line x1={0} x2={W} y1={phY} y2={phY} className={styles.seqPlay} />}
      {events.map((e) => {
        const c = PROTO_COLORS[e.protocol];
        const sel = e.id === selected;
        if (e.kind === 'drop') {
          return (
            <g key={e.id} onClick={() => onSelect(e)} className={styles.seqItem}>
              <circle cx={lx(e.from)} cy={y(e.t)} r={9} fill="#dc2626" stroke={sel ? 'currentColor' : 'none'} strokeWidth={2} />
              <path d={`M${lx(e.from) - 4} ${y(e.t) - 4} l8 8 m0 -8 l-8 8`} stroke="#fff" strokeWidth={2} />
              <text x={lx(e.from) + 13} y={y(e.t) + 4} className={styles.seqLabel}>{e.summary.slice(0, 34)}</text>
            </g>
          );
        }
        const x1 = lx(e.from);
        const x2 = lx(e.to);
        const y1 = y(e.t);
        const y2 = y(e.t + 1);
        return (
          <g key={e.id} onClick={() => onSelect(e)} className={styles.seqItem} opacity={e.dropped ? 0.55 : 1}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={sel ? 3.5 : 2} strokeDasharray={e.dropped ? '5 4' : undefined} markerEnd={`url(#arr-${e.protocol})`} />
            {e.dropped && <text x={x2 + (x2 > x1 ? -14 : 6)} y={y2 + 4} fill="#dc2626" fontWeight={700} fontSize={13}>✗</text>}
            <text x={x1 + (x2 >= x1 ? 8 : -8)} y={y1 - 4} textAnchor={x2 >= x1 ? 'start' : 'end'} className={styles.seqLabel} fontWeight={sel ? 700 : 400}>
              {e.summary.length > 34 ? e.summary.slice(0, 33) + '…' : e.summary}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
