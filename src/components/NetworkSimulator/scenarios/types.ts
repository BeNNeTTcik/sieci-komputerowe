// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Format pliku scenariusza. Każdy scenariusz to osobny plik w tym folderze, opisany danymi:
// urządzenia (z konfiguracją w postaci poleceń CLI), połączenia, obszary na schemacie
// i warianty stanu początkowego. Kod symulatora nie wymaga zmian przy edycji scenariusza.

import type { DeviceType, Network, NoteColor } from '../model';
import type { PackId } from '../packs';
import type { SimEvent } from '../engine';

export interface CheckCtx {
  net: Network;
  events: SimEvent[];
}

export interface Task {
  text: string;
  hint?: string;
  /** automatyczne sprawdzenie (używane, gdy symulator ma włączone `showTasks`) */
  check?: (c: CheckCtx) => boolean;
}

/**
 * Konfiguracja urządzeń: nazwa urządzenia → polecenia CLI, jedno w wierszu.
 * Puste wiersze i wiersze zaczynające się od # są pomijane.
 */
export type DeviceConfig = Record<string, string>;

export interface DeviceSpec {
  type: DeviceType;
  /** położenie na schemacie (płótno projektowe 960 × 560) */
  x: number;
  y: number;
  /** polecenia CLI wykonywane przy każdym wariancie */
  config?: string;
  /** komputer czeka na adres z DHCP (uruchomi go `dhcp-client start`) */
  dhcp?: boolean;
}

export interface ZoneSpec {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: NoteColor;
}

/** Wariant stanu początkowego – polecenia dopisywane do konfiguracji bazowej. */
export interface Variant {
  id: string;
  /** nazwa widoczna w symulatorze (panel „Scenariusz” → „Stan początkowy”) */
  name: string;
  description?: string;
  config?: DeviceConfig;
}

export interface Scenario {
  id: string;
  /** scenariusz bazowy – zawsze widoczny na pasku */
  base?: boolean;
  /** krótka nazwa na przycisku */
  short: string;
  title: string;
  level: 'podstawowy' | 'średni' | 'zaawansowany';
  description: string;
  packs: PackId[];
  /** urządzenia w kolejności tworzenia i konfigurowania (najpierw serwery, potem klienci) */
  devices: Record<string, DeviceSpec>;
  /** kable: ['PC1:eth0', 'SW1:port1'] */
  links?: [string, string][];
  zones?: ZoneSpec[];
  variants?: Variant[];
  /** id wariantu, od którego scenariusz startuje (domyślnie pierwszy) */
  start?: string;
  tasks: Task[];
}

export const defineScenario = (s: Scenario): Scenario => s;
