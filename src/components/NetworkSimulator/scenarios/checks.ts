// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Pomocnicze funkcje do automatycznego sprawdzania zadań.
import { getIface, hasIp } from '../model';
import type { SimEvent } from '../engine';
import type { CheckCtx } from './types';

export { getIface, hasIp };

export const dev = (c: CheckCtx, name: string) => c.net.devices.find((d) => d.name === name);

/** Czy do urządzenia `to` dotarł (i został przyjęty) komunikat ICMP danego typu od adresu `fromIp`? */
export function icmpArrived(c: CheckCtx, to: string, fromIp: string, types: number[]) {
  const d = dev(c, to);
  return !!d && c.events.some((e) => e.kind === 'hop' && e.to === d.id && !e.dropped && e.frame.ip?.icmp && types.includes(e.frame.ip.icmp.type) && e.frame.ip.src === fromIp);
}
/** Echo Reply (ICMP i ICMPv6) */
export const REPLY = [0, 129];
/** Time Exceeded (ICMP i ICMPv6) */
export const TIMEX = [11, 3];

export const hasRoute = (c: CheckCtx, r: string, network: string) => !!dev(c, r)?.routes.some((x) => x.network === network);

/** port przełącznika `sw`, do którego podłączono `host` */
export function portOf(c: CheckCtx, sw: string, host: string) {
  const s = dev(c, sw);
  const h = dev(c, host);
  if (!s || !h) return undefined;
  const l = c.net.links.find((x) => (x.a.dev === s.id && x.b.dev === h.id) || (x.b.dev === s.id && x.a.dev === h.id));
  if (!l) return undefined;
  return getIface(s, l.a.dev === s.id ? l.a.iface : l.b.iface);
}

/** Czy do urządzenia dotarło zdarzenie spełniające warunek? */
export function arrived(c: CheckCtx, to: string, pred: (e: SimEvent) => boolean) {
  const d = dev(c, to);
  return !!d && c.events.some((e) => e.kind === 'hop' && e.to === d.id && !e.dropped && pred(e));
}
