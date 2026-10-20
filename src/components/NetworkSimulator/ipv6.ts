// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Adresy IPv6: zapis (RFC 4291, RFC 5952), identyfikator EUI-64, adresy multicast używane przez NDP (RFC 4861).

const B = BigInt;
const ZERO = B(0);
const ALL128 = (B(1) << B(128)) - B(1);

export const ALL_NODES = 'ff02::1';
export const ALL_ROUTERS = 'ff02::2';
export const UNSPECIFIED = '::';

function v4int(s: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const p = m.slice(1).map(Number);
  if (p.some((x) => x > 255)) return null;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}

export function parse6(input: string): bigint | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (!s.includes(':')) return null;
  if (s.includes('%')) s = s.split('%')[0];
  // zapis mieszany z adresem IPv4 na końcu, np. 64:ff9b::192.0.2.80 (RFC 4291, 2.2)
  if (s.includes('.')) {
    const i = s.lastIndexOf(':');
    const n = v4int(s.slice(i + 1));
    if (n === null) return null;
    s = `${s.slice(0, i + 1)}${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const parts = s.split('::');
  if (parts.length > 2) return null;
  const head = parts[0] ? parts[0].split(':') : [];
  const tail = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
  if (parts.length === 1 && head.length !== 8) return null;
  if (parts.length === 2 && head.length + tail.length > 7) return null;
  const groups = [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail];
  let v = ZERO;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    v = (v << B(16)) | B(parseInt(g, 16));
  }
  return v;
}

/** Zapis kanoniczny wg RFC 5952: małe litery, bez wiodących zer, najdłuższy ciąg zer jako „::”. */
export function fmt6(v: bigint): string {
  const g: number[] = [];
  for (let i = 7; i >= 0; i--) g.push(Number((v >> B(i * 16)) & B(0xffff)));
  let bestS = -1;
  let bestL = 0;
  for (let i = 0; i < 8; ) {
    if (g[i] !== 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && g[j] === 0) j++;
    if (j - i > bestL && j - i >= 2) {
      bestS = i;
      bestL = j - i;
    }
    i = j;
  }
  const hex = g.map((x) => x.toString(16));
  if (bestS < 0) return hex.join(':');
  const left = hex.slice(0, bestS).join(':');
  const right = hex.slice(bestS + bestL).join(':');
  return `${left}::${right}`;
}

export const isIp6 = (s: string) => parse6(s) !== null;
export const norm6 = (s: string) => {
  const v = parse6(s);
  return v === null ? s : fmt6(v);
};

export function mask6(prefix: number): bigint {
  if (prefix <= 0) return ZERO;
  return ALL128 ^ ((B(1) << B(128 - prefix)) - B(1));
}

export function inPrefix6(a: string, net: string, prefix: number): boolean {
  const x = parse6(a);
  const n = parse6(net);
  if (x === null || n === null) return false;
  const m = mask6(prefix);
  return (x & m) === (n & m);
}

export function net6(a: string, prefix: number): string {
  const x = parse6(a);
  return x === null ? a : fmt6(x & mask6(prefix));
}

function macBytes(mac: string): number[] {
  return mac.split(':').map((h) => parseInt(h, 16));
}

/** Identyfikator interfejsu EUI-64 z adresu MAC (RFC 4291, dodatek A): odwrócony bit U/L i FFFE w środku. */
export function eui64(mac: string): bigint {
  const b = macBytes(mac);
  const id = [b[0] ^ 0x02, b[1], b[2], 0xff, 0xfe, b[3], b[4], b[5]];
  return id.reduce((acc, x) => (acc << B(8)) | B(x), ZERO);
}

export function linkLocal(mac: string): string {
  return fmt6((B(0xfe80) << B(112)) | eui64(mac));
}

export function withIid(prefixAddr: string, mac: string): string {
  const n = parse6(prefixAddr) ?? ZERO;
  return fmt6((n & mask6(64)) | eui64(mac));
}

/** Adres multicast węzła żądanego: ff02::1:ffXX:XXXX (ostatnie 24 bity adresu). */
export function solicitedNode(a: string): string {
  const x = parse6(a) ?? ZERO;
  const base = parse6('ff02::1:ff00:0')!;
  return fmt6(base | (x & B(0xffffff)));
}

/** Adres MAC grupy multicast IPv6: 33:33 + ostatnie 32 bity adresu (RFC 2464). */
export function mcastMac(a: string): string {
  const x = parse6(a) ?? ZERO;
  const bytes = [0x33, 0x33];
  for (let i = 3; i >= 0; i--) bytes.push(Number((x >> B(i * 8)) & B(0xff)));
  return bytes.map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join(':');
}

export const isLinkLocal6 = (a: string) => {
  const x = parse6(a);
  return x !== null && x >> B(118) === B(0x3fa);
};

export const isMulticast6 = (a: string) => {
  const x = parse6(a);
  return x !== null && x >> B(120) === B(0xff);
};

export const isMcastMac = (mac: string) => mac.startsWith('33:33:');

/** Adres IPv6 z osadzonym adresem IPv4 dla prefiksu /96 (RFC 6052), np. 64:ff9b:: + 192.0.2.80. */
export function embed4(prefix: string, v4: string): string {
  const p = parse6(prefix) ?? ZERO;
  const n = v4int(v4) ?? 0;
  return fmt6((p & mask6(96)) | B(n));
}

/** Ostatnie 32 bity adresu IPv6 jako adres IPv4. */
export function extract4(a: string): string {
  const x = parse6(a) ?? ZERO;
  const n = Number(x & B(0xffffffff));
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

/** Zapis mieszany: 64:ff9b::192.0.2.80 (czytelniejszy dla adresów NAT64). */
export function mixed4(a: string): string {
  const x = parse6(a);
  if (x === null) return a;
  const head = fmt6(x & mask6(96));
  return head.endsWith('::') ? `${head}${extract4(a)}` : fmt6(x);
}
