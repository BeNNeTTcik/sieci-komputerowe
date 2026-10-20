// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Okienkowa konfiguracja urządzeń. Każda akcja w oknie jest tłumaczona na polecenie CLI
// i wykonywana tak samo, jak wpisana w terminalu – stopka okna pokazuje to polecenie.
import React, { useEffect, useRef, useState } from 'react';
import {
  Device,
  Network,
  SERVICES,
  SERVICE_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  broadcastOf,
  cidr,
  fam,
  getDev,
  hasIp,
  ifaceStatus,
  maskToPrefix,
  netOf,
  networkOf,
  parseAddr,
  peerOf,
  prefixToMask,
  routingTable,
} from './model';
import { CliResult, prompt } from './cli';
import type { OutputLine } from './engine';
import { PackSet, serviceEnabled } from './packs';
import { DeviceIcon } from './icons';
import styles from './styles.module.css';

export type WinTab =
  | 'tools' | 'browser' | 'mail' | 'services' | 'dnsrec' | 'web' | 'files' | 'users'
  | 'ifaces' | 'ip' | 'routes' | 'dhcpc' | 'dhcps' | 'arp' | 'jobs' | 'ports' | 'vlans' | 'mac' | 'term' | 'xlat' | 'security';

export const TAB_LABEL: Record<WinTab, string> = {
  tools: 'Narzędzia',
  browser: 'Przeglądarka',
  mail: 'Poczta',
  services: 'Usługi',
  dnsrec: 'Strefa DNS',
  web: 'Strony WWW',
  files: 'Pliki FTP',
  users: 'Konta',
  ifaces: 'Interfejsy',
  ip: 'Adresy IP',
  routes: 'Trasy',
  dhcpc: 'Klient DHCP',
  dhcps: 'Serwer DHCP',
  arp: 'Sąsiedzi',
  jobs: 'Kolejka wydruku',
  ports: 'Porty',
  vlans: 'VLAN',
  mac: 'Tablica MAC',
  term: 'Terminal',
  xlat: 'Tunele i NAT64',
  security: 'Bezpieczeństwo',
};

export function tabsFor(d: Device, p: PackSet): WinTab[] {
  const t: WinTab[] = [];
  const add = (cond: boolean, ...x: WinTab[]) => cond && t.push(...x);
  switch (d.type) {
    case 'pc':
      add(true, 'tools');
      add(p.web, 'browser');
      add(p.mail, 'mail');
      add(true, 'ifaces', 'ip', 'routes');
      add(p.dhcp, 'dhcpc');
      add(true, 'arp', 'term');
      break;
    case 'server':
      add(true, 'services');
      add(p.dns, 'dnsrec');
      add(p.web, 'web');
      add(p.ftp, 'files');
      add(p.ftp || p.mail, 'users');
      add(p.dhcp, 'dhcps');
      add(true, 'ifaces', 'ip', 'routes', 'arp', 'tools', 'term');
      break;
    case 'printer':
      add(p.print, 'jobs');
      add(true, 'ifaces', 'ip', 'routes');
      add(p.dhcp, 'dhcpc');
      add(true, 'arp', 'tools', 'term');
      break;
    case 'router':
      add(true, 'ifaces', 'ip', 'routes');
      add(p.transition, 'xlat');
      add(p.dhcp, 'dhcps');
      add(true, 'arp', 'tools', 'term');
      break;
    case 'switch':
      add(true, 'ports');
      add(p.security, 'security');
      add(p.vlan, 'vlans');
      add(true, 'mac', 'term');
      break;
  }
  return t;
}

export interface Win {
  id: string;
  x: number;
  y: number;
  z: number;
  tab: WinTab;
}

export interface LastCmd {
  line: string;
  res: CliResult;
}

type Gui = (line: string) => CliResult | null;

interface Props {
  net: Network;
  dev: Device;
  win: Win;
  packs: PackSet;
  compact: boolean;
  lines: OutputLine[];
  last?: LastCmd;
  exec: (line: string, source: 'gui' | 'cli') => CliResult | null;
  onFocus: () => void;
  onClose: () => void;
  onMove: (x: number, y: number) => void;
  onTab: (t: WinTab) => void;
}

export function DeviceWindow(p: Props) {
  const { dev, win } = p;
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const gui: Gui = (line) => p.exec(line, 'gui');
  const tabs = tabsFor(dev, p.packs);
  const tab = tabs.includes(win.tab) ? win.tab : tabs[0];
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(dev.name);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    p.onFocus();
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    p.onMove(Math.max(0, e.clientX - drag.current.dx), Math.max(0, e.clientY - drag.current.dy));
  };
  const commitName = () => {
    setEditing(false);
    const n = nameDraft.trim();
    if (n && n !== dev.name) gui(`set hostname ${n}`);
  };

  const style: React.CSSProperties = p.compact ? { zIndex: win.z } : { left: win.x, top: win.y, zIndex: win.z };

  return (
    <div className={`${styles.win} ${p.compact ? styles.winCompact : ''}`} style={style} onPointerDown={p.onFocus}>
      <div className={styles.winTitle} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onDoubleClick={() => setEditing(true)}>
        <DeviceIcon type={dev.type} size={20} />
        {editing ? (
          <input
            className={styles.nameInput}
            value={nameDraft}
            autoFocus
            aria-label="Nazwa urządzenia"
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <strong>{dev.name}</strong>
        )}
        <span className={styles.muted}>{TYPE_LABEL[dev.type]}</span>
        <span className={styles.spacer} />
        <button type="button" className={styles.winBtn} onClick={() => { setNameDraft(dev.name); setEditing(true); }} title="Zmień nazwę">✎</button>
        <button type="button" className={styles.winBtn} onClick={p.onClose} title="Zamknij">✕</button>
      </div>
      <div className={styles.winBody}>
        <nav className={styles.winNav}>
          {tabs.map((t) => (
            <button type="button" key={t} className={t === tab ? styles.navOn : ''} onClick={() => p.onTab(t)}>
              {t === 'arp' ? (p.packs.ipv4 && !p.packs.ipv6 ? 'Tablica ARP' : !p.packs.ipv4 ? 'Sąsiedzi (NDP)' : 'ARP / NDP') : TAB_LABEL[t]}
            </button>
          ))}
        </nav>
        <div className={styles.winContent}>
          <Panel {...p} tab={tab} gui={gui} />
        </div>
      </div>
      <div className={styles.winFoot}>
        {p.last ? (
          <>
            <span className={styles.muted}>CLI:</span> <code>{p.last.line}</code>
            {p.last.res.lines[0] && <span className={p.last.res.error ? styles.bad : styles.good}> — {p.last.res.lines[0].text}</span>}
          </>
        ) : (
          <span className={styles.muted}>Zmiany w oknie są wykonywane jako polecenia CLI – tu zobaczysz ich składnię.</span>
        )}
      </div>
    </div>
  );
}

// ---------- elementy wspólne ----------

function T({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) {
  return (
    <div className={styles.gridWrap}>
      <table className={styles.grid}>
        <thead>
          <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)
          ) : (
            <tr>
              <td colSpan={head.length} className={styles.muted}>{empty ?? '(pusto)'}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Dot({ s }: { s: 'disabled' | 'no-link' | 'up' }) {
  return <span className={`${styles.dot} ${s === 'up' ? styles.dotUp : s === 'disabled' ? styles.dotOff : styles.dotWarn}`} title={STATUS_LABEL[s]} />;
}

function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${styles.btn} ${props.className ?? ''}`} />;
}

function Form({ onSubmit, children }: { onSubmit: () => void; children: React.ReactNode }) {
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

function Field({ label, value, onChange, placeholder, size, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; size?: number; type?: string }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} size={size} type={type} spellCheck={false} autoComplete="off" />
    </label>
  );
}

function Six({ packs, v6, set }: { packs: PackSet; v6: boolean; set: (b: boolean) => void }) {
  if (!(packs.ipv4 && packs.ipv6)) return null;
  return (
    <label className={styles.check}>
      <input type="checkbox" checked={v6} onChange={(e) => set(e.target.checked)} /> IPv6
    </label>
  );
}

const ok = (r: CliResult | null) => !!r && !r.error;

// ---------- panele ----------

function Panel(p: Props & { tab: WinTab; gui: Gui }) {
  const { net, dev, gui, packs } = p;
  switch (p.tab) {
    case 'ifaces':
    case 'ports':
      return <IfacesPanel net={net} dev={dev} gui={gui} packs={packs} />;
    case 'ip':
      return <IpPanel dev={dev} gui={gui} packs={packs} />;
    case 'routes':
      return <RoutesPanel net={net} dev={dev} gui={gui} packs={packs} />;
    case 'dhcpc':
      return (
        <div className={styles.panel}>
          <p>
            Tryb: <strong>{dev.dhcp ? 'automatyczny (DHCP)' : 'statyczny'}</strong> · adres: <code>{hasIp(dev.ifaces[0]) ? cidr(dev.ifaces[0].ip, dev.ifaces[0].mask) : '—'}</code> · brama:{' '}
            <code>{dev.gateway || '—'}</code>
            {packs.dns && <> · DNS: <code>{dev.dns || '—'}</code></>}
          </p>
          <div className={styles.row}>
            <Btn className={styles.primary} onClick={() => gui('dhcp-client start')}>Pobierz adres z DHCP</Btn>
            <Btn onClick={() => gui('dhcp-client release')}>Zwolnij adres</Btn>
          </div>
          <p className={styles.muted}>Klient wyśle DHCPDISCOVER jako broadcast (z adresu 0.0.0.0), serwer odpowie ofertą, klient poprosi o nią (REQUEST), a serwer potwierdzi (ACK).</p>
        </div>
      );
    case 'dhcps':
      return <DhcpServerPanel dev={dev} gui={gui} />;
    case 'arp':
      return (
        <div className={styles.panel}>
          {packs.ipv4 && (
            <>
              <div className={styles.row}>
                <h5>Tablica ARP (IPv4)</h5>
                <span className={styles.spacer} />
                <Btn onClick={() => gui('arp flush')}>Wyczyść</Btn>
              </div>
              <T head={['Adres IP', 'Adres MAC', 'Interfejs']} rows={dev.arp.map((a) => [a.ip, <code>{a.mac}</code>, a.iface])} empty="Pusta – wpisy pojawią się po pierwszej komunikacji." />
            </>
          )}
          {packs.ipv6 && (
            <>
              <div className={styles.row}>
                <h5>Sąsiedzi IPv6 (NDP)</h5>
                <span className={styles.spacer} />
                <Btn onClick={() => gui('neighbors flush')}>Wyczyść</Btn>
              </div>
              <T head={['Adres IPv6', 'Adres MAC', 'Interfejs']} rows={dev.nd.map((a) => [a.ip, <code>{a.mac}</code>, a.iface])} empty="Pusta – wypełnia ją Neighbor Discovery." />
            </>
          )}
          {packs.dns && dev.type !== 'router' && (
            <>
              <div className={styles.row}>
                <h5>Pamięć podręczna DNS</h5>
                <span className={styles.spacer} />
                <Btn onClick={() => gui('dns flush')}>Wyczyść</Btn>
              </div>
              <T head={['Nazwa', 'Typ', 'Wartość']} rows={dev.dnsCache.map((r) => [r.name, r.type, r.value])} empty="Pusta." />
            </>
          )}
        </div>
      );
    case 'mac':
      return (
        <div className={styles.panel}>
          <div className={styles.row}>
            <Btn onClick={() => gui('mac flush')}>Wyczyść tablicę MAC</Btn>
          </div>
          <T head={[...(packs.vlan ? ['VLAN'] : []), 'Adres MAC', 'Port', 'Urządzenie']} rows={dev.macTable.map((m) => [...(packs.vlan ? [m.vlan] : []), <code>{m.mac}</code>, m.port, ownerOf(net, m.mac)])} empty="Przełącznik jeszcze nikogo nie poznał – tablica wypełnia się z adresów źródłowych ramek." />
        </div>
      );
    case 'vlans':
      return <VlanPanel dev={dev} gui={gui} />;
    case 'jobs':
      return (
        <div className={styles.panel}>
          <T head={['Nr', 'Dokument', 'Od', 'Krok']} rows={dev.jobs.map((j) => [j.id, j.doc, j.from, j.t])} empty="Brak wydruków. Wyślij zadanie z komputera: print <adres drukarki>." />
          <p className={styles.muted}>Drukarka przyjmuje zadania przez IPP (RFC 8011) na porcie TCP 631.</p>
        </div>
      );
    case 'tools':
      return <ToolsPanel dev={dev} gui={gui} lines={p.lines} packs={packs} />;
    case 'browser':
      return <BrowserPanel dev={dev} gui={gui} packs={packs} />;
    case 'mail':
      return <MailPanel dev={dev} gui={gui} lines={p.lines} />;
    case 'services':
      return (
        <div className={styles.panel}>
          <T
            head={['Usługa', 'Stan', '']}
            rows={SERVICES.filter((s) => serviceEnabled(packs, s)).map((s) => [
              SERVICE_LABEL[s],
              dev.services[s] ? <span className={styles.good}>włączona</span> : <span className={styles.muted}>wyłączona</span>,
              <Btn onClick={() => gui(`service ${s} ${dev.services[s] ? 'off' : 'on'}`)}>{dev.services[s] ? 'Wyłącz' : 'Włącz'}</Btn>,
            ])}
            empty="Włącz pakiety usług (DNS, WWW, FTP…) w menu „Pakiety”."
          />
          <p className={styles.muted}>Wyłączona usługa zamyka swój port – klient dostanie TCP RST albo brak odpowiedzi UDP.</p>
        </div>
      );
    case 'dnsrec':
      return <DnsPanel dev={dev} gui={gui} packs={packs} />;
    case 'web':
      return <WebPanel dev={dev} gui={gui} />;
    case 'files':
      return <FilesPanel dev={dev} gui={gui} />;
    case 'users':
      return <UsersPanel dev={dev} gui={gui} packs={packs} />;
    case 'term':
      return <Terminal dev={dev} lines={p.lines} exec={(l) => p.exec(l, 'cli')} />;
    case 'xlat':
      return <XlatPanel dev={dev} gui={gui} />;
    case 'security':
      return <SecurityPanel net={net} dev={dev} gui={gui} />;
  }
}

// ---------- tunele i NAT64 (router) ----------

function XlatPanel({ dev, gui }: { dev: Device; gui: Gui }) {
  const v4 = dev.ifaces.filter((i) => !i.tunnel && hasIp(i)).map((i) => i.ip);
  const v6 = dev.ifaces.filter((i) => !i.tunnel).flatMap((i) => i.ip6.filter((a) => a.origin !== 'link').map((a) => a.addr));
  const nextName = () => {
    let n = 0;
    while (dev.ifaces.some((i) => i.name === `tun${n}`)) n++;
    return `tun${n}`;
  };
  const [t, setT] = useState({ name: nextName(), mode: '6in4', local: v4[0] ?? '', remote: '' });
  const [pfx, setPfx] = useState(dev.nat64 ? `${dev.nat64.prefix}/${dev.nat64.len}` : '64:ff9b::/96');
  const [pool, setPool] = useState(dev.nat64?.pool ?? v4[v4.length - 1] ?? '');
  const locals = t.mode === '6in4' ? v4 : v6;
  const tunnels = dev.ifaces.filter((i) => i.tunnel);
  return (
    <div className={styles.panel}>
      <h5>Tunele</h5>
      <T
        head={['Tunel', 'Tryb', 'Lokalny', 'Zdalny', 'Adresy', '']}
        rows={tunnels.map((i) => [
          <strong>{i.name}</strong>,
          i.tunnel!.mode,
          i.tunnel!.local,
          i.tunnel!.remote,
          [...(hasIp(i) ? [cidr(i.ip, i.mask)] : []), ...i.ip6.filter((a) => a.origin !== 'link').map((a) => `${a.addr}/${a.prefix}`)].join(', ') || <span className={styles.muted}>brak – dodaj w „Adresy IP”</span>,
          <Btn onClick={() => gui(`tunnel del ${i.name}`)}>Usuń</Btn>,
        ])}
        empty="Brak tuneli."
      />
      <Form onSubmit={() => ok(gui(`tunnel add ${t.name.trim()} mode ${t.mode} local ${t.local.trim()} remote ${t.remote.trim()}`)) && setT({ ...t, name: nextName(), remote: '' })}>
        <Field label="Nazwa" value={t.name} onChange={(v) => setT({ ...t, name: v })} size={6} />
        <label>
          Tryb
          <select value={t.mode} onChange={(e) => setT({ ...t, mode: e.target.value, local: (e.target.value === '6in4' ? v4 : v6)[0] ?? '' })}>
            <option value="6in4">6in4 – IPv6 w IPv4</option>
            <option value="4in6">4in6 – IPv4 w IPv6</option>
          </select>
        </label>
        <label>
          Lokalny koniec
          <select value={t.local} onChange={(e) => setT({ ...t, local: e.target.value })}>
            {locals.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <Field label="Zdalny koniec" value={t.remote} onChange={(v) => setT({ ...t, remote: v })} placeholder={t.mode === '6in4' ? '198.51.100.2' : '2001:db8:ff::2'} size={16} />
        <Btn type="submit" className={styles.primary} disabled={!t.local || !t.remote.trim()}>Utwórz tunel</Btn>
      </Form>
      <p className={styles.muted}>Po utworzeniu nadaj tunelowi adres (zakładka Adresy IP) i dodaj trasę do sieci za drugim końcem przez adres drugiego końca tunelu.</p>
      <h5>NAT64</h5>
      <div className={styles.row}>
        {dev.nat64 ? (
          <>
            <span className={styles.good}>włączony</span>
            <span>
              {dev.nat64.prefix}/{dev.nat64.len} → IPv4 z {dev.nat64.pool}
            </span>
            <span className={styles.spacer} />
            <Btn onClick={() => gui('nat64 flush')}>Wyczyść tablicę</Btn>
            <Btn onClick={() => gui('nat64 disable')}>Wyłącz</Btn>
          </>
        ) : (
          <span className={styles.muted}>wyłączony</span>
        )}
      </div>
      {!dev.nat64 && (
        <Form onSubmit={() => gui(`nat64 enable prefix ${pfx.trim()} pool ${pool}`)}>
          <Field label="Prefiks NAT64" value={pfx} onChange={setPfx} size={14} />
          <label>
            Adres IPv4 routera
            <select value={pool} onChange={(e) => setPool(e.target.value)}>
              {v4.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <Btn type="submit" className={styles.primary} disabled={!pool}>Włącz NAT64</Btn>
        </Form>
      )}
      <T
        head={['Protokół', 'Strona IPv6', 'Strona IPv4', 'Cel']}
        rows={dev.natTable.map((e) => [
          e.proto,
          <code className={styles.small}>{`[${e.v6}]${e.proto === 'ICMP' ? ` id ${e.v6port}` : `:${e.v6port}`}`}</code>,
          <code className={styles.small}>{`${dev.nat64?.pool ?? '?'}${e.proto === 'ICMP' ? ` id ${e.v4port}` : `:${e.v4port}`}`}</code>,
          `${e.v4}${e.proto === 'ICMP' ? '' : `:${e.port}`}`,
        ])}
        empty="Tablica translacji jest pusta – wpisy powstają przy pierwszym pakiecie połączenia."
      />
      <p className={styles.muted}>Prefiks 64:ff9b::/96 (RFC 6052): ostatnie 32 bity adresu IPv6 to adres IPv4, np. 64:ff9b::192.0.2.80. Hosty IPv6 dostają takie adresy od DNS64.</p>
    </div>
  );
}

// ---------- bezpieczeństwo przełącznika ----------

function SecurityPanel({ net, dev, gui }: { net: Network; dev: Device; gui: Gui }) {
  const sec = dev.security;
  const [b, setB] = useState({ mac: '', ip: '', port: dev.ifaces[0].name });
  const [u, setU] = useState({ name: '', pass: '' });
  const toggle = (label: string, key: 'dhcp-guard' | 'savi' | 'ra-guard', on: boolean, desc: string) => (
    <label className={styles.secToggle}>
      <input type="checkbox" checked={on} onChange={() => gui(`security ${key} ${on ? 'off' : 'on'}`)} />
      <span>
        <strong>{label}</strong>
        <br />
        <span className={styles.muted}>{desc}</span>
      </span>
    </label>
  );
  return (
    <div className={styles.panel}>
      <div className={styles.secToggles}>
        {toggle('Ochrona DHCP', 'dhcp-guard', sec.dhcpGuard, 'Odpowiedzi DHCP tylko z portów zaufanych; z ACK powstają powiązania IP ↔ MAC ↔ port (RFC 7513).')}
        {toggle('Weryfikacja źródła (SAVI)', 'savi', sec.savi, 'Na portach niezaufanych ARP i IPv4 tylko z powiązanych adresów (RFC 7039).')}
        {toggle('RA-Guard', 'ra-guard', sec.raGuard, 'Ogłoszenia routera IPv6 tylko z portów zaufanych (RFC 6105).')}
      </div>
      <h5>Porty</h5>
      <T
        head={['Port', 'Połączony z', 'Zaufany', 'Limit MAC', 'Reakcja', '802.1X', 'Stan']}
        rows={dev.ifaces.map((i) => {
          const peer = peerOf(net, dev.id, i.name);
          const pd = peer && getDev(net, peer.dev);
          return [
            <strong>{i.name}</strong>,
            pd ? pd.name : <span className={styles.muted}>—</span>,
            <input type="checkbox" aria-label={`${i.name} zaufany`} checked={!!i.trusted} onChange={() => gui(`security port ${i.name} ${i.trusted ? 'untrusted' : 'trusted'}`)} />,
            <select aria-label={`${i.name} limit MAC`} value={i.maxMac ?? 0} onChange={(e) => gui(`security port ${i.name} max-mac ${e.target.value === '0' ? 'off' : `${e.target.value} action ${i.onViolation ?? 'drop'}`}`)}>
              <option value={0}>bez limitu</option>
              {[1, 2, 3, 4, 8].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>,
            i.maxMac ? (
              <select aria-label={`${i.name} reakcja`} value={i.onViolation ?? 'drop'} onChange={(e) => gui(`security port ${i.name} max-mac ${i.maxMac} action ${e.target.value}`)}>
                <option value="drop">odrzucaj</option>
                <option value="shutdown">wyłącz port</option>
              </select>
            ) : (
              <span className={styles.muted}>—</span>
            ),
            <input type="checkbox" aria-label={`${i.name} 802.1X`} checked={!!i.dot1x} onChange={() => gui(`security port ${i.name} dot1x ${i.dot1x ? 'off' : 'on'}`)} />,
            i.errDisabled ? (
              <span>
                <span className={styles.bad}>wyłączony</span> <Btn onClick={() => gui(`security port ${i.name} reset`)}>Przywróć</Btn>
              </span>
            ) : i.dot1x ? (
              i.authMac ? <span className={styles.good}>autoryzowany ({i.authUser})</span> : <span className={styles.bad}>nieautoryzowany</span>
            ) : i.violations ? (
              <span className={styles.bad}>naruszenia: {i.violations}</span>
            ) : (
              <span className={styles.muted}>ok</span>
            ),
          ];
        })}
      />
      <h5>Powiązania IP ↔ MAC ↔ port</h5>
      <T
        head={['Adres IP', 'MAC', 'Port', 'Źródło', '']}
        rows={dev.bindings.map((x) => [x.ip, <code className={styles.small}>{x.mac}</code>, x.port, x.origin === 'dhcp' ? 'DHCP' : 'ręcznie', <Btn onClick={() => gui(`security binding del ${x.ip}`)}>Usuń</Btn>])}
        empty="Brak – powstaną z odpowiedzi DHCP przy włączonej ochronie DHCP albo dodasz je ręcznie."
      />
      <Form onSubmit={() => ok(gui(`security binding add ${b.mac.trim()} ${b.ip.trim()} port ${b.port}`)) && setB({ ...b, mac: '', ip: '' })}>
        <Field label="MAC" value={b.mac} onChange={(v) => setB({ ...b, mac: v })} placeholder="02:AB:CD:00:00:01" size={17} />
        <Field label="Adres IP" value={b.ip} onChange={(v) => setB({ ...b, ip: v })} placeholder="192.168.1.40" size={13} />
        <label>
          Port
          <select value={b.port} onChange={(e) => setB({ ...b, port: e.target.value })}>
            {dev.ifaces.map((i) => <option key={i.name}>{i.name}</option>)}
          </select>
        </label>
        <Btn type="submit">Dodaj powiązanie</Btn>
      </Form>
      <h5>Konta 802.1X</h5>
      <T head={['Login', 'Hasło', '']} rows={sec.users.map((x) => [x.name, <code>{x.pass}</code>, <Btn onClick={() => gui(`security user del ${x.name}`)}>Usuń</Btn>])} empty="Brak kont." />
      <Form onSubmit={() => ok(gui(`security user add ${u.name.trim()} ${u.pass.trim()}`)) && setU({ name: '', pass: '' })}>
        <Field label="Login" value={u.name} onChange={(v) => setU({ ...u, name: v })} size={10} />
        <Field label="Hasło" value={u.pass} onChange={(v) => setU({ ...u, pass: v })} size={10} />
        <Btn type="submit">Dodaj konto</Btn>
      </Form>
      <p className={styles.muted}>
        W sieciach firmowych konta 802.1X trzyma serwer RADIUS (RFC 2865), a zamiast EAP-MD5 stosuje się EAP-TLS. Limit adresów MAC to lokalna funkcja przełącznika – nie wymaga żadnego protokołu.
      </p>
    </div>
  );
}

function ownerOf(net: Network, mac: string) {
  return net.devices.find((d) => d.ifaces.some((i) => i.mac === mac))?.name ?? '?';
}

function IfacesPanel({ net, dev, gui, packs }: { net: Network; dev: Device; gui: Gui; packs: PackSet }) {
  const sw = dev.type === 'switch';
  return (
    <div className={styles.panel}>
      <T
        head={['', 'Nazwa', ...(sw ? (packs.vlan ? ['VLAN'] : []) : ['Adresy']), 'MAC', 'Połączenie', '']}
        rows={dev.ifaces.map((i) => {
          const peer = peerOf(net, dev.id, i.name);
          const pd = peer && getDev(net, peer.dev);
          const addrs = [...(packs.ipv4 && hasIp(i) ? [cidr(i.ip, i.mask)] : []), ...(packs.ipv6 ? i.ip6.filter((a) => a.origin !== 'link').map((a) => `${a.addr}/${a.prefix}`) : [])];
          return [
            <Dot s={ifaceStatus(net, dev, i)} />,
            <strong>{i.name}</strong>,
            ...(sw
              ? packs.vlan
                ? [
                    <select value={i.vlan} onChange={(e) => gui(`interface ${i.name} vlan ${e.target.value}`)} aria-label={`VLAN portu ${i.name}`}>
                      {dev.vlans.map((v) => <option key={v.id} value={v.id}>{v.id} {v.name}</option>)}
                    </select>,
                  ]
                : []
              : [addrs.length ? addrs.map((a) => <div key={a}>{a}</div>) : <span className={styles.muted}>—</span>]),
            <code className={styles.small}>{i.mac}</code>,
            i.tunnel ? `tunel ${i.tunnel.mode} → ${i.tunnel.remote}` : pd ? `${pd.name} ${peer!.iface}` : <span className={styles.muted}>brak kabla</span>,
            <Btn onClick={() => gui(`interface ${i.name} ${i.up ? 'down' : 'up'}`)}>{i.up ? 'Wyłącz' : 'Włącz'}</Btn>,
          ];
        })}
      />
      <p className={styles.muted}>
        <Dot s="up" /> aktywny · <Dot s="no-link" /> włączony, brak łącza · <Dot s="disabled" /> wyłączony
      </p>
    </div>
  );
}

function IpPanel({ dev, gui, packs }: { dev: Device; gui: Gui; packs: PackSet }) {
  const router = dev.type === 'router';
  const [ifn, setIfn] = useState(dev.ifaces[0].name);
  const [addr, setAddr] = useState('');
  const [dns, setDns] = useState(dev.dns);
  const c = parseAddr(addr.trim());
  let calc = '';
  if (c?.fam === 4 && c.prefix < 31) {
    const m = prefixToMask(c.prefix);
    calc = `maska ${m} · sieć ${networkOf(c.ip, m)} · broadcast ${broadcastOf(c.ip, m)} · hostów: ${2 ** (32 - c.prefix) - 2}`;
  } else if (c?.fam === 6) calc = `prefiks ${netOf(c.ip, c.prefix)}/${c.prefix} · identyfikator interfejsu: ostatnie ${128 - c.prefix} bitów`;
  else if (addr) calc = 'Format: adres/prefiks, np. 192.168.1.10/24 albo 2001:db8:1::10/64';
  const ph = packs.ipv4 ? (packs.ipv6 ? '192.168.1.10/24 lub 2001:db8::10/64' : '192.168.1.10/24') : '2001:db8:1::10/64';
  const rows: React.ReactNode[][] = [];
  for (const i of dev.ifaces) {
    if (packs.ipv4 && hasIp(i)) rows.push([i.name, cidr(i.ip, i.mask), `${networkOf(i.ip, i.mask)}/${maskToPrefix(i.mask)}`, 'IPv4', <Btn onClick={() => gui(`ip del ${i.ip}`)}>Usuń</Btn>]);
    if (packs.ipv6)
      for (const a of i.ip6)
        rows.push([
          i.name,
          `${a.addr}/${a.prefix}`,
          a.origin === 'link' ? 'fe80::/64' : `${netOf(a.addr, a.prefix)}/${a.prefix}`,
          a.origin === 'link' ? 'IPv6 link-local' : a.origin === 'auto' ? 'IPv6 SLAAC' : 'IPv6',
          a.origin === 'link' ? <span className={styles.muted} title="Powstaje sam z adresu MAC (EUI-64)">auto</span> : <Btn onClick={() => gui(`ip del ${a.addr}`)}>Usuń</Btn>,
        ]);
  }
  return (
    <div className={styles.panel}>
      <T head={['Interfejs', 'Adres', 'Sieć / prefiks', 'Rodzaj', '']} rows={rows} empty="Brak adresów." />
      <Form
        onSubmit={() => {
          if (ok(gui(`ip add ${addr.trim()} dev ${ifn}`))) setAddr('');
        }}
      >
        {router && (
          <label>
            Interfejs
            <select value={ifn} onChange={(e) => setIfn(e.target.value)}>
              {dev.ifaces.map((i) => <option key={i.name}>{i.name}</option>)}
            </select>
          </label>
        )}
        <Field label="Adres / prefiks" value={addr} onChange={setAddr} placeholder={ph} size={24} />
        <Btn type="submit" className={styles.primary} disabled={!c}>Dodaj adres</Btn>
      </Form>
      {calc && <p className={styles.calc}>{calc}</p>}
      {!router && packs.ipv6 && (
        <div className={styles.row}>
          <Btn onClick={() => gui('ipv6 autoconf')}>Autokonfiguracja IPv6 (SLAAC)</Btn>
          {dev.slaac && <Btn onClick={() => gui('ipv6 autoconf off')}>Wyłącz SLAAC</Btn>}
        </div>
      )}
      {!router && packs.dns && (
        <Form onSubmit={() => gui(`dns set ${dns.trim()}`)}>
          <Field label="Serwer DNS" value={dns} onChange={setDns} placeholder="192.168.1.10" size={18} />
          <Btn type="submit">Ustaw DNS</Btn>
        </Form>
      )}
    </div>
  );
}

function RoutesPanel({ net, dev, gui, packs }: { net: Network; dev: Device; gui: Gui; packs: PackSet }) {
  const router = dev.type === 'router';
  const [dst, setDst] = useState('');
  const [via, setVia] = useState('');
  const [via6, setVia6] = useState('');
  const rt = routingTable(net, dev).filter((e) => (e.fam === 4 ? packs.ipv4 : packs.ipv6));
  const label = { connected: 'C', static: 'S', default: 'S*', nat64: 'N' } as const;
  return (
    <div className={styles.panel}>
      <T
        head={['Typ', 'Sieć docelowa', 'Następny skok', 'Interfejs', 'Stan', '']}
        rows={rt.map((e) => [
          <span title={e.kind}>{label[e.kind]}</span>,
          `${e.network}/${e.prefix}`,
          e.nextHop || 'bezpośrednio',
          e.iface || '?',
          e.active ? <span className={styles.good}>aktywna</span> : <span className={styles.bad}>nieaktywna</span>,
          e.kind === 'connected' || e.kind === 'nat64' ? '' : <Btn onClick={() => gui(`route del ${e.kind === 'default' ? `default${e.fam === 6 ? ' -6' : ''}` : `${e.network}/${e.prefix}`}`)}>Usuń</Btn>,
        ])}
        empty="Tablica routingu jest pusta – nadaj adres interfejsowi."
      />
      {router ? (
        <Form
          onSubmit={() => {
            if (ok(gui(`route add ${dst.trim()} via ${via.trim()}`))) {
              setDst('');
              setVia('');
            }
          }}
        >
          <Field label="Sieć docelowa" value={dst} onChange={setDst} placeholder={packs.ipv4 ? '10.0.2.0/24 lub default' : '2001:db8:2::/64'} size={20} />
          <Field label="Przez (next hop)" value={via} onChange={setVia} placeholder={packs.ipv4 ? '10.0.0.2' : '2001:db8:ff::2'} size={18} />
          <Btn type="submit" className={styles.primary}>Dodaj trasę</Btn>
        </Form>
      ) : (
        <>
          {packs.ipv4 && (
            <Form onSubmit={() => ok(gui(`route add default via ${via.trim()}`)) && setVia('')}>
              <Field label="Brama domyślna IPv4" value={via} onChange={setVia} placeholder="192.168.1.1" size={18} />
              <Btn type="submit" className={styles.primary}>Ustaw bramę</Btn>
            </Form>
          )}
          {packs.ipv6 && (
            <Form onSubmit={() => ok(gui(`route add default via ${via6.trim()}`)) && setVia6('')}>
              <Field label="Brama domyślna IPv6" value={via6} onChange={setVia6} placeholder="2001:db8:1::1 lub fe80::…" size={22} />
              <Btn type="submit" className={styles.primary}>Ustaw bramę</Btn>
            </Form>
          )}
        </>
      )}
      <p className={styles.muted}>C – sieć podłączona bezpośrednio, S – trasa statyczna, S* – trasa domyślna. Wygrywa najdłuższy pasujący prefiks.</p>
    </div>
  );
}

function DhcpServerPanel({ dev, gui }: { dev: Device; gui: Gui }) {
  const first = dev.ifaces.find(hasIp);
  const base = first ? networkOf(first.ip, first.mask)! : '';
  const pref = first ? maskToPrefix(first.mask) : 24;
  const stem = base.split('.').slice(0, 3).join('.');
  const [f, setF] = useState({ name: 'LAN', net: base ? `${base}/${pref}` : '', gw: dev.type === 'router' ? first?.ip ?? '' : dev.gateway, from: stem ? `${stem}.100` : '', to: stem ? `${stem}.150` : '', dns: '' });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const [rIf, setRIf] = useState(dev.ifaces[0].name);
  const [rSrv, setRSrv] = useState('');
  return (
    <div className={styles.panel}>
      {dev.type === 'server' && !dev.services.dhcp && (
        <div className={styles.row}>
          <span className={styles.bad}>Usługa DHCP jest wyłączona.</span>
          <Btn onClick={() => gui('service dhcp on')}>Włącz</Btn>
        </div>
      )}
      <h5>Pule adresów</h5>
      <T
        head={['Nazwa', 'Sieć', 'Brama', 'Zakres', 'DNS', '']}
        rows={dev.pools.map((pl) => [pl.name, cidr(pl.network, pl.mask), pl.gateway, `${pl.start} – ${pl.end}`, pl.dns || '—', <Btn onClick={() => gui(`dhcp-server del ${pl.name}`)}>Usuń</Btn>])}
        empty="Brak pul – serwer nie odpowiada klientom."
      />
      <Form onSubmit={() => gui(`dhcp-server add ${f.name.trim()} net ${f.net.trim()} gw ${f.gw.trim()} range ${f.from.trim()}-${f.to.trim()}${f.dns.trim() ? ` dns ${f.dns.trim()}` : ''}`)}>
        <Field label="Nazwa" value={f.name} onChange={set('name')} size={6} />
        <Field label="Sieć" value={f.net} onChange={set('net')} placeholder="192.168.1.0/24" size={14} />
        <Field label="Brama" value={f.gw} onChange={set('gw')} size={12} />
        <Field label="Od" value={f.from} onChange={set('from')} size={12} />
        <Field label="Do" value={f.to} onChange={set('to')} size={12} />
        <Field label="DNS (opcja)" value={f.dns} onChange={set('dns')} size={12} />
        <Btn type="submit" className={styles.primary}>Dodaj pulę</Btn>
      </Form>
      {dev.type === 'router' && (
        <>
          <h5>Przekaźnik DHCP (relay)</h5>
          <T
            head={['Interfejs', 'Serwer DHCP', '']}
            rows={dev.ifaces.filter((i) => i.relay).map((i) => [i.name, i.relay, <Btn onClick={() => gui(`dhcp-relay del dev ${i.name}`)}>Usuń</Btn>])}
            empty="Brak – broadcasty DHCP kończą się na routerze."
          />
          <Form onSubmit={() => ok(gui(`dhcp-relay set dev ${rIf} server ${rSrv.trim()}`)) && setRSrv('')}>
            <label>
              Interfejs klientów
              <select value={rIf} onChange={(e) => setRIf(e.target.value)}>
                {dev.ifaces.map((i) => <option key={i.name}>{i.name}</option>)}
              </select>
            </label>
            <Field label="Adres serwera DHCP" value={rSrv} onChange={setRSrv} placeholder="10.0.10.10" size={14} />
            <Btn type="submit" className={styles.primary}>Włącz przekaźnik</Btn>
          </Form>
        </>
      )}
      <h5>Dzierżawy</h5>
      <T head={['Adres IP', 'MAC klienta', 'Host', 'Pula']} rows={dev.leases.map((l) => [l.ip, <code className={styles.small}>{l.mac}</code>, l.host, l.pool])} empty="Brak przydzielonych adresów." />
    </div>
  );
}

function VlanPanel({ dev, gui }: { dev: Device; gui: Gui }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  return (
    <div className={styles.panel}>
      <T
        head={['VLAN', 'Nazwa', 'Porty', '']}
        rows={dev.vlans.map((v) => [v.id, v.name, dev.ifaces.filter((i) => i.vlan === v.id).map((i) => i.name).join(', ') || '—', v.id === 1 ? '' : <Btn onClick={() => gui(`vlan del ${v.id}`)}>Usuń</Btn>])}
      />
      <Form
        onSubmit={() => {
          if (ok(gui(`vlan add ${id.trim()}${name.trim() ? ` name ${name.trim()}` : ''}`))) {
            setId('');
            setName('');
          }
        }}
      >
        <Field label="ID" value={id} onChange={setId} placeholder="10" size={5} />
        <Field label="Nazwa" value={name} onChange={setName} placeholder="BIURO" size={10} />
        <Btn type="submit" className={styles.primary}>Dodaj VLAN</Btn>
      </Form>
      <p className={styles.muted}>Port przypiszesz do VLAN-u w zakładce Porty. Ramki – także rozgłoszeniowe – trafiają tylko do portów tego samego VLAN-u (IEEE 802.1Q).</p>
    </div>
  );
}

function DnsPanel({ dev, gui, packs }: { dev: Device; gui: Gui; packs: PackSet }) {
  const [f, setF] = useState({ name: '', type: packs.ipv4 ? 'A' : 'AAAA', value: '' });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const types = [...(packs.ipv4 ? ['A'] : []), ...(packs.ipv6 ? ['AAAA'] : []), ...(packs.mail ? ['MX'] : [])];
  return (
    <div className={styles.panel}>
      {!dev.services.dns && (
        <div className={styles.row}>
          <span className={styles.bad}>Usługa DNS jest wyłączona.</span>
          <Btn onClick={() => gui('service dns on')}>Włącz</Btn>
        </div>
      )}
      {packs.transition && (
        <div className={styles.row}>
          <span>
            <strong>DNS64</strong>: {dev.dns64 ? <span className={styles.good}>włączony ({dev.dns64.prefix}/{dev.dns64.len})</span> : <span className={styles.muted}>wyłączony</span>}
          </span>
          <Btn onClick={() => gui(dev.dns64 ? 'dns64 disable' : 'dns64 enable prefix 64:ff9b::/96')}>{dev.dns64 ? 'Wyłącz' : 'Włącz DNS64'}</Btn>
          <span className={styles.muted}>Brakujący rekord AAAA składa z prefiksu NAT64 i rekordu A (RFC 6147).</span>
        </div>
      )}
      <T head={['Nazwa', 'Typ', 'Wartość', '']} rows={dev.records.map((r) => [r.name, r.type, r.value, <Btn onClick={() => gui(`dns-record del ${r.name} ${r.type}`)}>Usuń</Btn>])} empty="Strefa jest pusta." />
      <Form onSubmit={() => ok(gui(`dns-record add ${f.name.trim()} ${f.type} ${f.value.trim()}`)) && setF({ ...f, name: '', value: '' })}>
        <Field label="Nazwa" value={f.name} onChange={set('name')} placeholder="www.szkola.lab" size={16} />
        <label>
          Typ
          <select value={f.type} onChange={(e) => set('type')(e.target.value)}>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <Field label={f.type === 'MX' ? 'Serwer poczty (nazwa)' : 'Adres'} value={f.value} onChange={set('value')} placeholder={f.type === 'MX' ? 'mail.szkola.lab' : f.type === 'AAAA' ? '2001:db8:1::10' : '192.168.1.10'} size={18} />
        <Btn type="submit" className={styles.primary}>Dodaj rekord</Btn>
      </Form>
      <p className={styles.muted}>A – adres IPv4, AAAA – adres IPv6, MX – serwer poczty domeny.</p>
    </div>
  );
}

function WebPanel({ dev, gui }: { dev: Device; gui: Gui }) {
  const [path, setPath] = useState('/');
  const [body, setBody] = useState('');
  const [cert, setCert] = useState(dev.certName);
  return (
    <div className={styles.panel}>
      <T head={['Ścieżka', 'Treść', '']} rows={dev.web.map((w) => [<code>{w.path}</code>, w.body.slice(0, 60), <Btn onClick={() => gui(`web del ${w.path}`)}>Usuń</Btn>])} empty="Brak stron." />
      <Form onSubmit={() => ok(gui(`web set ${path.trim()} ${body.replace(/\s+/g, ' ').trim()}`)) && setBody('')}>
        <Field label="Ścieżka" value={path} onChange={setPath} size={10} />
        <Field label="Treść strony" value={body} onChange={setBody} placeholder="Witaj!" size={30} />
        <Btn type="submit" className={styles.primary}>Zapisz stronę</Btn>
      </Form>
      <Form onSubmit={() => gui(`set certificate ${cert.trim()}`)}>
        <Field label="Certyfikat TLS wystawiony dla" value={cert} onChange={setCert} size={20} />
        <Btn type="submit">Ustaw</Btn>
      </Form>
      <p className={styles.muted}>Jeśli nazwa w certyfikacie nie zgadza się z adresem wpisanym w przeglądarce, klient HTTPS pokaże ostrzeżenie.</p>
    </div>
  );
}

function FilesPanel({ dev, gui }: { dev: Device; gui: Gui }) {
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  return (
    <div className={styles.panel}>
      <T head={['Plik', 'Rozmiar', 'Treść', '']} rows={dev.files.map((f) => [f.name, `${f.body.length} B`, f.body.slice(0, 40), <Btn onClick={() => gui(`ftp-file del ${f.name}`)}>Usuń</Btn>])} empty="Brak plików." />
      <Form onSubmit={() => ok(gui(`ftp-file add ${name.trim()} ${body.replace(/\s+/g, ' ').trim()}`)) && (setName(''), setBody(''))}>
        <Field label="Nazwa pliku" value={name} onChange={setName} placeholder="notatki.txt" size={14} />
        <Field label="Treść" value={body} onChange={setBody} size={26} />
        <Btn type="submit" className={styles.primary}>Udostępnij</Btn>
      </Form>
    </div>
  );
}

function UsersPanel({ dev, gui, packs }: { dev: Device; gui: Gui; packs: PackSet }) {
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [dom, setDom] = useState(dev.mailDomain);
  return (
    <div className={styles.panel}>
      <T
        head={['Login', 'Hasło', ...(packs.mail ? ['Skrzynka', 'Wiadomości'] : []), '']}
        rows={dev.users.map((u) => [u.name, <code>{u.pass}</code>, ...(packs.mail ? [`${u.name}@${dev.mailDomain}`, u.mail.length] : []), <Btn onClick={() => gui(`user del ${u.name}`)}>Usuń</Btn>])}
        empty="Brak kont."
      />
      <Form onSubmit={() => ok(gui(`user add ${name.trim()} ${pass.trim()}`)) && (setName(''), setPass(''))}>
        <Field label="Login" value={name} onChange={setName} size={12} />
        <Field label="Hasło" value={pass} onChange={setPass} size={12} />
        <Btn type="submit" className={styles.primary}>Dodaj konto</Btn>
      </Form>
      {packs.mail && (
        <Form onSubmit={() => gui(`set mail-domain ${dom.trim()}`)}>
          <Field label="Domena poczty" value={dom} onChange={setDom} size={14} />
          <Btn type="submit">Ustaw</Btn>
        </Form>
      )}
      <p className={styles.muted}>Konta służą do logowania FTP{packs.mail ? ' i jako skrzynki pocztowe' : ''}. Hasła w FTP i POP3 płyną siecią jawnym tekstem – sprawdź w szczegółach pakietu.</p>
    </div>
  );
}

function ToolsPanel({ dev, gui, lines, packs }: { dev: Device; gui: Gui; lines: OutputLine[]; packs: PackSet }) {
  const [host, setHost] = useState('');
  const [count, setCount] = useState('1');
  const [v6, setV6] = useState(!packs.ipv4);
  const [doc, setDoc] = useState('referat.pdf');
  const [file, setFile] = useState('zadanie.txt');
  const [user, setUser] = useState('uczen');
  const [pass, setPass] = useState('haslo123');
  const h = host.trim();
  const flag = v6 && packs.ipv4 ? ' -6' : '';
  return (
    <div className={styles.panel}>
      <Form onSubmit={() => h && gui(`ping ${h} count ${count}${flag}`)}>
        <Field label={packs.dns ? 'Adres lub nazwa' : 'Adres docelowy'} value={host} onChange={setHost} placeholder={packs.ipv4 ? '192.168.1.1' : '2001:db8:1::1'} size={20} />
        <label>
          Pakiety
          <select value={count} onChange={(e) => setCount(e.target.value)}>
            {['1', '2', '4'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <Six packs={packs} v6={v6} set={setV6} />
        <Btn type="submit" className={styles.primary} disabled={!h}>Ping</Btn>
        <Btn disabled={!h} onClick={() => gui(`trace ${h}${flag}`)}>Trace</Btn>
        {packs.dns && <Btn disabled={!h || !!fam(h)} onClick={() => gui(`nslookup ${h} ${v6 ? 'AAAA' : 'A'}`)}>nslookup</Btn>}
        {packs.ntp && <Btn disabled={!h} onClick={() => gui(`ntp sync ${h}`)}>Synchronizuj czas</Btn>}
      </Form>
      {packs.security && dev.type !== 'router' && (
        <Form onSubmit={() => gui(`dot1x login user ${user.trim()} pass ${pass.trim()}`)}>
          <span className={styles.formTitle}>802.1X</span>
          <Field label="Login" value={user} onChange={setUser} size={9} />
          <Field label="Hasło" value={pass} onChange={setPass} size={9} type="password" />
          <Btn type="submit">Zaloguj do sieci</Btn>
          <Btn onClick={() => gui('dot1x logoff')}>Wyloguj</Btn>
        </Form>
      )}
      {dev.type === 'pc' && packs.print && (
        <Form onSubmit={() => h && gui(`print ${h} doc ${doc.trim() || 'dokument.pdf'}`)}>
          <Field label="Dokument" value={doc} onChange={setDoc} size={14} />
          <Btn type="submit" disabled={!h}>🖨 Drukuj na tym adresie</Btn>
        </Form>
      )}
      {dev.type === 'pc' && packs.ftp && (
        <Form onSubmit={() => h && gui(`ftp ${h} get ${file.trim()} user ${user.trim()} pass ${pass.trim()}${flag}`)}>
          <Field label="Plik FTP" value={file} onChange={setFile} size={12} />
          <Field label="Login" value={user} onChange={setUser} size={8} />
          <Field label="Hasło" value={pass} onChange={setPass} size={8} />
          <Btn type="submit" disabled={!h}>Pobierz przez FTP</Btn>
          <Btn disabled={!h} onClick={() => gui(`ftp ${h} list user ${user.trim()} pass ${pass.trim()}${flag}`)}>Lista plików</Btn>
        </Form>
      )}
      <div className={`${styles.term} ${styles.termMini}`}>
        {lines.slice(-14).map((l, i) => <div key={i} className={styles['t_' + l.kind]}>{l.text || ' '}</div>)}
        {!lines.length && <div className={styles.t_hint}>Wyniki pojawią się tutaj (i w zakładce Terminal).</div>}
      </div>
    </div>
  );
}

function BrowserPanel({ dev, gui, packs }: { dev: Device; gui: Gui; packs: PackSet }) {
  const [secure, setSecure] = useState(false);
  const [host, setHost] = useState(packs.dns ? 'www.szkola.lab' : '');
  const [path, setPath] = useState('/');
  const [v6, setV6] = useState(!packs.ipv4);
  const page = dev.page;
  const go = () => host.trim() && gui(`${secure ? 'https' : 'http'} ${host.trim()} ${path.trim() || '/'}${v6 && packs.ipv4 ? ' -6' : ''}`);
  return (
    <div className={styles.panel}>
      <Form onSubmit={go}>
        <label>
          Protokół
          <select value={secure ? 'https' : 'http'} onChange={(e) => setSecure(e.target.value === 'https')}>
            <option value="http">http://</option>
            <option value="https">https://</option>
          </select>
        </label>
        <Field label="Serwer" value={host} onChange={setHost} size={18} />
        <Field label="Ścieżka" value={path} onChange={setPath} size={8} />
        <Six packs={packs} v6={v6} set={setV6} />
        <Btn type="submit" className={styles.primary}>Otwórz</Btn>
      </Form>
      <div className={styles.browser}>
        <div className={styles.browserBar}>
          {page ? (
            <>
              <span title={page.secure ? 'Połączenie szyfrowane (TLS)' : 'Połączenie nieszyfrowane'}>{page.secure ? (page.warning ? '⚠️' : '🔒') : 'ⓘ'}</span>
              <code>{page.url}</code>
              <span className={styles.spacer} />
              <span className={page.status.startsWith('200') ? styles.good : styles.bad}>{page.status}</span>
            </>
          ) : (
            <span className={styles.muted}>Wpisz adres i kliknij „Otwórz”.</span>
          )}
        </div>
        {page?.warning && <div className={styles.browserWarn}>{page.warning}</div>}
        <div className={styles.browserPage}>{page ? page.body : <span className={styles.muted}>Strona pojawi się tutaj po zakończeniu animacji.</span>}</div>
      </div>
    </div>
  );
}

function MailPanel({ dev, gui, lines }: { dev: Device; gui: Gui; lines: OutputLine[] }) {
  const [addr, setAddr] = useState(dev.mailAccount.addr);
  const [pass, setPass] = useState(dev.mailAccount.pass);
  const [to, setTo] = useState('');
  const [subj, setSubj] = useState('');
  return (
    <div className={styles.panel}>
      <Form onSubmit={() => gui(`mail account ${addr.trim()} pass ${pass.trim()}`)}>
        <Field label="Moje konto" value={addr} onChange={setAddr} placeholder="uczen@szkola.lab" size={18} />
        <Field label="Hasło" value={pass} onChange={setPass} size={10} />
        <Btn type="submit">Zapisz konto</Btn>
      </Form>
      <Form onSubmit={() => ok(gui(`mail send ${to.trim()} ${subj.trim() || '(bez tematu)'}`)) && setSubj('')}>
        <Field label="Do" value={to} onChange={setTo} placeholder="nauczyciel@szkola.lab" size={18} />
        <Field label="Temat" value={subj} onChange={setSubj} size={18} />
        <Btn type="submit" className={styles.primary} disabled={!to.includes('@') || !dev.mailAccount.addr}>Wyślij (SMTP)</Btn>
      </Form>
      <div className={styles.row}>
        <h5>Odebrane</h5>
        <span className={styles.spacer} />
        <Btn onClick={() => gui('mail check')} disabled={!dev.mailAccount.addr}>Odbierz (POP3)</Btn>
      </div>
      <T head={['Od', 'Temat', 'Treść']} rows={dev.inbox.map((m) => [m.from, m.subject, m.body.slice(0, 50)])} empty="Brak wiadomości." />
      <div className={`${styles.term} ${styles.termMini}`}>
        {lines.slice(-8).map((l, i) => <div key={i} className={styles['t_' + l.kind]}>{l.text || ' '}</div>)}
      </div>
    </div>
  );
}

export function Terminal({ dev, lines, exec }: { dev: Device; lines: OutputLine[]; exec: (l: string) => CliResult | null }) {
  const [v, setV] = useState('');
  const hist = useRef<string[]>([]);
  const hi = useRef(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [lines.length]);
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (v.trim()) hist.current.push(v);
      hi.current = -1;
      exec(v);
      setV('');
    } else if (e.key === 'ArrowUp' && hist.current.length) {
      e.preventDefault();
      hi.current = hi.current < 0 ? hist.current.length - 1 : Math.max(0, hi.current - 1);
      setV(hist.current[hi.current]);
    } else if (e.key === 'ArrowDown' && hi.current >= 0) {
      e.preventDefault();
      hi.current = hi.current + 1;
      if (hi.current >= hist.current.length) {
        hi.current = -1;
        setV('');
      } else setV(hist.current[hi.current]);
    }
  };
  return (
    <div className={styles.term} ref={box} onClick={() => input.current?.focus()}>
      {!lines.length && <div className={styles.t_hint}>Wpisz „help”, aby zobaczyć polecenia. Strzałki ↑/↓ przywołują historię.</div>}
      {lines.map((l, i) => <div key={i} className={styles['t_' + l.kind]}>{l.text || ' '}</div>)}
      <div className={styles.termLine}>
        <span>{prompt(dev)}</span>
        <input ref={input} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={onKey} spellCheck={false} autoComplete="off" aria-label="Polecenie" />
      </div>
    </div>
  );
}
