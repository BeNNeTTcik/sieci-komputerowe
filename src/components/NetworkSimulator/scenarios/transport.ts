// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { arrived } from './checks';

export default defineScenario({
  id: 'transport',
  short: 'TCP i UDP',
  title: 'Transport: TCP i UDP',
  level: 'średni',
  packs: ['ipv4', 'transport'],
  description:
    'Komputery wysyłają te same dane do serwera raz przez TCP, raz przez UDP (usługa Discard, port 9). Między routerami jest łącze, na którym można ustawić gubienie ramek. W widoku „TCP / UDP” na dole widać uzgadnianie, numery sekwencyjne, okno, potwierdzenia i retransmisje – albo ich brak w UDP.',

  devices: {
    SRV1: {
      type: 'server',
      x: 880,
      y: 150,
      config: `
        ip add 192.168.2.10/24 dev eth0
        route add default via 192.168.2.1
        # tylko odbiornik danych testowych
        service dns off
        service http off
        service https off
        service ftp off
        service mail off
        service ntp off
        service discard on
      `,
    },
    R1: {
      type: 'router',
      x: 380,
      y: 290,
      config: `
        ip add 192.168.1.1/24 dev eth0
        ip add 10.0.0.1/30 dev eth1
        interface eth0 up
        interface eth1 up
        route add 192.168.2.0/24 via 10.0.0.2
      `,
    },
    R2: {
      type: 'router',
      x: 600,
      y: 290,
      config: `
        ip add 10.0.0.2/30 dev eth0
        ip add 192.168.2.1/24 dev eth1
        interface eth0 up
        interface eth1 up
        route add 192.168.1.0/24 via 10.0.0.1
      `,
    },
    SW1: { type: 'switch', x: 200, y: 290 },
    SW2: { type: 'switch', x: 780, y: 290 },
    PC1: {
      type: 'pc',
      x: 80,
      y: 150,
      config: `
        ip add 192.168.1.10/24 dev eth0
        route add default via 192.168.1.1
        # rozgrzewka: tablice ARP wypełnione, więc w widoku TCP / UDP zostaje sam transport
        ping 192.168.2.10 count 1
      `,
    },
    PC2: {
      type: 'pc',
      x: 80,
      y: 440,
      config: `
        ip add 192.168.1.11/24 dev eth0
        route add default via 192.168.1.1
        ping 192.168.2.10 count 1
      `,
    },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['SW1:port8', 'R1:eth0'],
    ['R1:eth1', 'R2:eth0'],
    ['R2:eth1', 'SW2:port8'],
    ['SRV1:eth0', 'SW2:port1'],
  ],
  zones: [
    { text: 'Klienci · 192.168.1.0/24', x: 0, y: 72, w: 300, h: 468, color: 'blue' },
    { text: 'Łącze między routerami', x: 324, y: 216, w: 336, h: 150, color: 'amber' },
    { text: 'Serwer · 192.168.2.0/24', x: 696, y: 72, w: 276, h: 300, color: 'green' },
  ],

  start: 'bez-strat',
  variants: [
    { id: 'bez-strat', name: 'Łącze bez strat', description: 'Wszystkie ramki docierają – porównaj sam przebieg TCP i UDP.' },
    {
      id: 'straty',
      name: 'Łącze gubi 20% ramek',
      description: 'Co piąta ramka (średnio) ginie między R1 a R2. TCP retransmituje zgubione segmenty, UDP po prostu je traci.',
      config: { R1: 'interface eth1 loss 20' },
    },
    {
      id: 'straty-duze',
      name: 'Bardzo słabe łącze (50%)',
      description: 'Połowa ramek ginie – TCP wydłuża RTO i ponawia, aż w końcu może zerwać połączenie.',
      config: { R1: 'interface eth1 loss 50' },
    },
  ],

  tasks: [
    {
      text: 'Wyślij 4000 B przez TCP z PC1 do serwera i obejrzyj w widoku „TCP / UDP” uzgadnianie, okno i potwierdzenia.',
      hint: 'Terminal PC1: tcp-send 192.168.2.10 (albo okno PC1 → Narzędzia)',
      check: (c) => arrived(c, 'SRV1', (e) => !!e.frame.ip?.tcp && e.frame.ip.tcp.dstPort === 9 && e.frame.ip.tcp.len > 0),
    },
    {
      text: 'Wyślij to samo przez UDP. Ile pakietów i ile bajtów nagłówków transportowych potrzebował każdy protokół?',
      hint: 'udp-send 192.168.2.10 – podsumowanie jest nad diagramem w widoku „TCP / UDP”.',
      check: (c) => arrived(c, 'SRV1', (e) => !!e.frame.ip?.udp?.data),
    },
    {
      text: 'Wyślij datagram UDP na port 5000. Jak serwer informuje, że nic tam nie nasłuchuje? A jak robi to TCP (tcp-send … port 5000)?',
      hint: 'UDP: ICMP Port Unreachable, TCP: segment RST.',
      check: (c) => arrived(c, 'PC1', (e) => e.frame.ip?.icmp?.type === 3 && e.frame.ip.icmp.code === 3),
    },
    {
      text: 'Ustaw utratę 20% ramek na łączu R1 – R2 (albo wybierz wariant „Łącze gubi 20% ramek”).',
      hint: 'Terminal R1: interface eth1 loss 20',
      check: (c) => c.net.links.some((l) => (l.loss ?? 0) > 0),
    },
    {
      text: 'Powtórz tcp-send i udp-send. Ile datagramów UDP dotarło? Jak TCP odzyskał zgubione segmenty – po upływie RTO czy po trzech duplikatach ACK?',
      check: (c) => c.events.some((e) => !!e.frame.ip?.tcp?.retx),
    },
    { text: 'Dlaczego DNS, DHCP i NTP używają UDP, a WWW, poczta i FTP – TCP?' },
  ],
});
