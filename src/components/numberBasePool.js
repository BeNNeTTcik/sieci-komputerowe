// Pula 90 zadań konwersji systemów liczbowych (dziesiętny/binarny/szesnastkowy),
// zakres 0–500, bez sztywnego dopełniania zerami (naturalna reprezentacja).
// Każde zadanie podaje liczbę w JEDNYM systemie, student uzupełnia DWA pozostałe.

const numberBasePool = [
  {
    id: 'num-000',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '147' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '327' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '101000111' },
    ],
  },
  {
    id: 'num-001',
    given: [
      { label: 'Liczba binarna (system 2)', value: '111001' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '57' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '39' },
    ],
  },
  {
    id: 'num-002',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '12' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '1100' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'C' },
    ],
  },
  {
    id: 'num-003',
    given: [
      { label: 'Liczba binarna (system 2)', value: '101111011' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '379' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '17B' },
    ],
  },
  {
    id: 'num-004',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '140' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '10001100' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '8C' },
    ],
  },
  {
    id: 'num-005',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '7D' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '125' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '1111101' },
    ],
  },
  {
    id: 'num-006',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '72' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '114' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '1110010' },
    ],
  },
  {
    id: 'num-007',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '71' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '1000111' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '47' },
    ],
  },
  {
    id: 'num-008',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '377' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '101111001' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '179' },
    ],
  },
  {
    id: 'num-009',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '34' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '52' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '110100' },
    ],
  },
  {
    id: 'num-010',
    given: [
      { label: 'Liczba binarna (system 2)', value: '101011010' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '346' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '15A' },
    ],
  },
  {
    id: 'num-011',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '1F1' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '497' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '111110001' },
    ],
  },
  {
    id: 'num-012',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '456' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '111001000' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '1C8' },
    ],
  },
  {
    id: 'num-013',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '279' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '100010111' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '117' },
    ],
  },
  {
    id: 'num-014',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '44' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '101100' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '2C' },
    ],
  },
  {
    id: 'num-015',
    given: [
      { label: 'Liczba binarna (system 2)', value: '100101110' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '302' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '12E' },
    ],
  },
  {
    id: 'num-016',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '216' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '11011000' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'D8' },
    ],
  },
  {
    id: 'num-017',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '16' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '10000' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '10' },
    ],
  },
  {
    id: 'num-018',
    given: [
      { label: 'Liczba binarna (system 2)', value: '1111' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '15' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'F' },
    ],
  },
  {
    id: 'num-019',
    given: [
      { label: 'Liczba binarna (system 2)', value: '101111' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '47' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '2F' },
    ],
  },
  {
    id: 'num-020',
    given: [
      { label: 'Liczba binarna (system 2)', value: '1101111' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '111' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '6F' },
    ],
  },
  {
    id: 'num-021',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '77' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '119' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '1110111' },
    ],
  },
  {
    id: 'num-022',
    given: [
      { label: 'Liczba binarna (system 2)', value: '100000010' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '258' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '102' },
    ],
  },
  {
    id: 'num-023',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '308' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '100110100' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '134' },
    ],
  },
  {
    id: 'num-024',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '13' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '1101' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'D' },
    ],
  },
  {
    id: 'num-025',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '287' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '100011111' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '11F' },
    ],
  },
  {
    id: 'num-026',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '65' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '101' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '1100101' },
    ],
  },
  {
    id: 'num-027',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '16E' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '366' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '101101110' },
    ],
  },
  {
    id: 'num-028',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '14C' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '332' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '101001100' },
    ],
  },
  {
    id: 'num-029',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '167' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '359' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '101100111' },
    ],
  },
  {
    id: 'num-030',
    given: [
      { label: 'Liczba binarna (system 2)', value: '111100111' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '487' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '1E7' },
    ],
  },
  {
    id: 'num-031',
    given: [
      { label: 'Liczba binarna (system 2)', value: '11010110' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '214' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'D6' },
    ],
  },
  {
    id: 'num-032',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '70' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '112' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '1110000' },
    ],
  },
  {
    id: 'num-033',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '229' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '11100101' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'E5' },
    ],
  },
  {
    id: 'num-034',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '301' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '100101101' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '12D' },
    ],
  },
  {
    id: 'num-035',
    given: [
      { label: 'Liczba binarna (system 2)', value: '10001110' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '142' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '8E' },
    ],
  },
  {
    id: 'num-036',
    given: [
      { label: 'Liczba binarna (system 2)', value: '110011110' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '414' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '19E' },
    ],
  },
  {
    id: 'num-037',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '1BD' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '445' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '110111101' },
    ],
  },
  {
    id: 'num-038',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '3' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '11' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '3' },
    ],
  },
  {
    id: 'num-039',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '388' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '110000100' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '184' },
    ],
  },
  {
    id: 'num-040',
    given: [
      { label: 'Liczba binarna (system 2)', value: '110011100' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '412' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '19C' },
    ],
  },
  {
    id: 'num-041',
    given: [
      { label: 'Liczba binarna (system 2)', value: '1010001' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '81' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '51' },
    ],
  },
  {
    id: 'num-042',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '165' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '357' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '101100101' },
    ],
  },
  {
    id: 'num-043',
    given: [
      { label: 'Liczba binarna (system 2)', value: '111100100' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '484' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '1E4' },
    ],
  },
  {
    id: 'num-044',
    given: [
      { label: 'Liczba binarna (system 2)', value: '10101110' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '174' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'AE' },
    ],
  },
  {
    id: 'num-045',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '1D1' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '465' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '111010001' },
    ],
  },
  {
    id: 'num-046',
    given: [
      { label: 'Liczba binarna (system 2)', value: '1001111' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '79' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '4F' },
    ],
  },
  {
    id: 'num-047',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '110' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '1101110' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '6E' },
    ],
  },
  {
    id: 'num-048',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '186' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '390' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '110000110' },
    ],
  },
  {
    id: 'num-049',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '172' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '10101100' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'AC' },
    ],
  },
  {
    id: 'num-050',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '1EB' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '491' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '111101011' },
    ],
  },
  {
    id: 'num-051',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '1E1' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '481' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '111100001' },
    ],
  },
  {
    id: 'num-052',
    given: [
      { label: 'Liczba binarna (system 2)', value: '11000010' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '194' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'C2' },
    ],
  },
  {
    id: 'num-053',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '49' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '110001' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '31' },
    ],
  },
  {
    id: 'num-054',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: 'B7' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '183' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '10110111' },
    ],
  },
  {
    id: 'num-055',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '1B1' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '433' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '110110001' },
    ],
  },
  {
    id: 'num-056',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '176' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '10110000' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'B0' },
    ],
  },
  {
    id: 'num-057',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '135' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '309' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '100110101' },
    ],
  },
  {
    id: 'num-058',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '87' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '135' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '10000111' },
    ],
  },
  {
    id: 'num-059',
    given: [
      { label: 'Liczba binarna (system 2)', value: '110011101' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '413' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '19D' },
    ],
  },
  {
    id: 'num-060',
    given: [
      { label: 'Liczba binarna (system 2)', value: '10110' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '22' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '16' },
    ],
  },
  {
    id: 'num-061',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '175' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '373' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '101110101' },
    ],
  },
  {
    id: 'num-062',
    given: [
      { label: 'Liczba binarna (system 2)', value: '11101011' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '235' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'EB' },
    ],
  },
  {
    id: 'num-063',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '274' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '100010010' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '112' },
    ],
  },
  {
    id: 'num-064',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '63' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '111111' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '3F' },
    ],
  },
  {
    id: 'num-065',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: 'C1' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '193' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '11000001' },
    ],
  },
  {
    id: 'num-066',
    given: [
      { label: 'Liczba binarna (system 2)', value: '101000' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '40' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '28' },
    ],
  },
  {
    id: 'num-067',
    given: [
      { label: 'Liczba binarna (system 2)', value: '100011010' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '282' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '11A' },
    ],
  },
  {
    id: 'num-068',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '150' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '10010110' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '96' },
    ],
  },
  {
    id: 'num-069',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '424' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '110101000' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '1A8' },
    ],
  },
  {
    id: 'num-070',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '321' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '101000001' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '141' },
    ],
  },
  {
    id: 'num-071',
    given: [
      { label: 'Liczba binarna (system 2)', value: '100111100' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '316' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '13C' },
    ],
  },
  {
    id: 'num-072',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '185' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '10111001' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'B9' },
    ],
  },
  {
    id: 'num-073',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '127' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '295' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '100100111' },
    ],
  },
  {
    id: 'num-074',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '62' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '98' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '1100010' },
    ],
  },
  {
    id: 'num-075',
    given: [
      { label: 'Liczba binarna (system 2)', value: '101101000' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '360' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '168' },
    ],
  },
  {
    id: 'num-076',
    given: [
      { label: 'Liczba binarna (system 2)', value: '100011' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '35' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '23' },
    ],
  },
  {
    id: 'num-077',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '17' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '23' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '10111' },
    ],
  },
  {
    id: 'num-078',
    given: [
      { label: 'Liczba binarna (system 2)', value: '101010010' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '338' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '152' },
    ],
  },
  {
    id: 'num-079',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '74' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '116' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '1110100' },
    ],
  },
  {
    id: 'num-080',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '395' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '110001011' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '18B' },
    ],
  },
  {
    id: 'num-081',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '94' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '148' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '10010100' },
    ],
  },
  {
    id: 'num-082',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '434' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '110110010' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '1B2' },
    ],
  },
  {
    id: 'num-083',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '1DF' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '479' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '111011111' },
    ],
  },
  {
    id: 'num-084',
    given: [
      { label: 'Liczba binarna (system 2)', value: '110011' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '51' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '33' },
    ],
  },
  {
    id: 'num-085',
    given: [
      { label: 'Liczba szesnastkowa (system 16)', value: '1C0' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '448' },
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '111000000' },
    ],
  },
  {
    id: 'num-086',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '455' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '111000111' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '1C7' },
    ],
  },
  {
    id: 'num-087',
    given: [
      { label: 'Liczba binarna (system 2)', value: '11101000' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '232' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'E8' },
    ],
  },
  {
    id: 'num-088',
    given: [
      { label: 'Liczba binarna (system 2)', value: '101000101' },
    ],
    blanks: [
      { key: 'dec', label: 'Liczba dziesiętna (system 10)', answer: '325' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: '145' },
    ],
  },
  {
    id: 'num-089',
    given: [
      { label: 'Liczba dziesiętna (system 10)', value: '186' },
    ],
    blanks: [
      { key: 'bin', label: 'Liczba binarna (system 2)', answer: '10111010' },
      { key: 'hex', label: 'Liczba szesnastkowa (system 16)', answer: 'BA' },
    ],
  },
];

export default numberBasePool;