// Prosty, W PEŁNI DETERMINISTYCZNY generator liczb na podstawie tekstu (hash
// djb2). Ta sama wartość `seed` zawsze da ten sam wynik — więc "losowo"
// przydzielona waga/koszt połączenia jest stabilna między odświeżeniami
// strony i między studentami otwierającymi tę samą stronę, ale RÓŻNA dla
// różnych połączeń (bo różni się seed, np. para grup + typ łącza).
//
// Dzięki temu nie trzeba nigdzie przechowywać wylosowanych wartości (nie ma
// czego zapisywać do localStorage, nie ma ryzyka niezgodności między
// urządzeniami) — wystarczy zawsze ten sam, jednoznaczny "klucz" połączenia.
// FNV-1a + finalizer Murmur3 — wybrane zamiast prostszego djb2, bo dla
// KRÓTKICH, PODOBNYCH seedów różniących się tylko końcową liczbą (a dokładnie
// tak wygląda `${storageKey}-grupa-${x}-...` w TopologyGenerator) djb2 dawał
// silnie okresowe wyniki (grupa 1 i grupa 5 wylosowywały identyczny zestaw
// parametrów) — za mało "rozchwiania" bitów niskiego rzędu. Ta wersja ma dużo
// lepszą lawinowość (drobna zmiana seeda = zupełnie inny wynik) przy tym
// samym kontrakcie: w pełni deterministyczna, bez zależności zewnętrznych.
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// Zwraca deterministyczną "pseudolosową" liczbę całkowitą z przedziału
// [min, max] (włącznie), wyznaczoną wyłącznie na podstawie `seed` (string
// albo cokolwiek dającego się zamienić na string, np. `${g1}-${g2}-w-gore`).
//
// Zastosowanie w laboratorium OSPF: przydzielanie zróżnicowanej wagi/kosztu
// (`ip ospf cost <n>`) każdemu połączeniu międzygrupowemu, tak aby najkrótsza
// ścieżka (SPF) wyliczana przez OSPF różniła się w zależności od tego, przez
// które grupy przechodzi ruch — a nie zawsze zbiegała do jednej, identycznej
// dla całej klasy trasy. To zamierzenie dydaktyczne: studenci mają zobaczyć
// w `show ip route ospf` i `traceroute` realnie różne ścieżki, a nie
// przepisywać wynik sąsiada.
export function pseudoRandomInt(seed, min, max) {
  const range = max - min + 1;
  return min + (hashString(String(seed)) % range);
}

// Wygodny wariant zwracający tekst z jednostką/opisem — przydatne jako
// gotowa wartość dla kolumny `readOnly` w `EditableTable`
// (`ip ospf cost 40`, `waga: 40`, itp.), żeby nie sklejać tego ręcznie
// w każdym miejscu użycia.
export function pseudoRandomCostLabel(seed, min = 1, max = 65535, prefix = '') {
  return `${prefix}${pseudoRandomInt(seed, min, max)}`;
}
