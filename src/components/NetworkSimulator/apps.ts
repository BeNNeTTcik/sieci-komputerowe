// SPDX-License-Identifier: MIT
// Protokoły aplikacji działające nad TCP: HTTP (RFC 9110/9112), HTTPS z TLS 1.3 (RFC 8446),
// FTP z trybem EPSV (RFC 959, RFC 2428), SMTP (RFC 5321), POP3 (RFC 1939) i IPP (RFC 8010/8011).
// Każda wymiana to wiadomości tekstowe przesyłane funkcjami silnika tcpSend/tcpClose.

import type { AppData, Conn, ConnHandlers, Sim } from './engine';
import { Device, Mail, Protocol, fam } from './model';

const MAX_PASV = 999;

function app(proto: Protocol, text: string, extra: Partial<AppData> = {}): AppData {
  return { proto, text, len: Math.max(1, new TextEncoder().encode(text).length), ...extra };
}

/** Usługa nasłuchująca na porcie TCP urządzenia (albo null, gdy port jest zamknięty). */
export function serverListener(sim: Sim, d: Device, port: number): ConnHandlers | null {
  if (d.type === 'printer' && port === 631 && sim.has('print')) return ippServer(sim, d);
  if (d.type !== 'server') return null;
  const s = d.services;
  if (port === 80 && s.http && sim.has('web')) return httpServer(sim, d, false);
  if (port === 443 && s.https && sim.has('web')) return httpServer(sim, d, true);
  if (port === 21 && s.ftp && sim.has('ftp')) return ftpServer(sim, d);
  if (port === 25 && s.mail && sim.has('mail')) return smtpServer(sim, d);
  if (port === 110 && s.mail && sim.has('mail')) return pop3Server(sim, d);
  return null;
}

// ---------- HTTP / HTTPS ----------

function httpServer(sim: Sim, d: Device, tls: boolean): ConnHandlers {
  const proto: Protocol = tls ? 'HTTPS' : 'HTTP';
  return {
    proto,
    data(c, a) {
      if (tls && a.tls === 'ClientHello') {
        sim.tcpSend(
          c,
          app(proto, `TLS 1.3 ServerHello\nwybrany szyfr: TLS_AES_128_GCM_SHA256\nkey_share: X25519\nCertificate: CN=${d.certName}\nwystawca: Szkolne CA\nFinished`, {
            tls: 'ServerHello, Certificate, Finished',
            len: 2400,
          }),
          ['TLS krok 2: serwer wybiera szyfr, odsyła swój klucz, certyfikat i Finished. Od tej chwili obie strony znają wspólny klucz sesji.'],
        );
        return;
      }
      const req = a.text.split('\n').find((l) => /^(GET|POST) /.test(l)) ?? 'GET / HTTP/1.1';
      const path = req.split(' ')[1] ?? '/';
      const page = d.web.find((w) => w.path === path);
      const status = page ? '200 OK' : '404 Not Found';
      const body = page ? page.body : `Nie znaleziono strony ${path} na serwerze ${d.name}.`;
      const text = `HTTP/1.1 ${status}\nContent-Type: text/plain; charset=utf-8\nContent-Length: ${body.length}\n\n${body}`;
      sim.tcpSend(c, app(proto, text, tls ? { enc: true, tls: 'Application Data' } : {}), [
        tls ? `Zaszyfrowana odpowiedź HTTP ${status} – podsłuchujący zobaczy tylko długość.` : `Odpowiedź HTTP ${status} – jawnym tekstem, każdy na trasie może ją przeczytać.`,
      ]);
    },
  };
}

export function startHttp(sim: Sim, d: Device, host: string, path: string, secure: boolean, want: 4 | 6) {
  const proto: Protocol = secure ? 'HTTPS' : 'HTTP';
  const port = secure ? 443 : 80;
  const url = `${secure ? 'https' : 'http'}://${host}${path}`;
  sim.out(d.id, `${proto}: otwieram ${url}`);
  sim.resolveHost(d, host, want, (ip) => {
    if (!ip) return;
    const get = `GET ${path} HTTP/1.1\nHost: ${host}\nUser-Agent: SymulatorSieci/1.0`;
    sim.tcpConnect(
      d,
      ip,
      port,
      {
        proto,
        open(c) {
          if (secure) {
            sim.tcpSend(
              c,
              app(proto, `TLS 1.3 ClientHello\nSNI: ${host}\nszyfry: TLS_AES_128_GCM_SHA256, TLS_CHACHA20_POLY1305_SHA256\nkey_share: X25519`, { tls: 'ClientHello', len: 517 }),
              ['TLS krok 1: ClientHello – proponuję szyfry i przesyłam swoją część klucza. Nazwa serwera (SNI) jest jeszcze jawna.'],
            );
          } else {
            sim.tcpSend(c, app(proto, get), ['Żądanie HTTP GET – jawnym tekstem.']);
          }
        },
        data(c, a) {
          if (secure && a.tls?.startsWith('ServerHello')) {
            const cn = /CN=(\S+)/.exec(a.text)?.[1] ?? '';
            if (fam(host) || cn.toLowerCase() !== host.toLowerCase()) {
              c.ctx.warning = fam(host)
                ? `Łączysz się po adresie IP, a certyfikat wystawiono dla nazwy ${cn} – przeglądarka nie może potwierdzić tożsamości serwera.`
                : `Certyfikat wystawiono dla ${cn}, a nie dla ${host}.`;
              sim.out(d.id, `HTTPS: uwaga – ${c.ctx.warning}`, 'err');
            } else {
              sim.out(d.id, `HTTPS: certyfikat ${cn} zgodny z adresem, połączenie szyfrowane`);
            }
            sim.tcpSend(c, app(proto, `Finished\n${get}`, { enc: true, tls: 'Finished + Application Data', len: 140 }), [
              'TLS krok 3: kończę uzgodnienie (Finished) i od razu wysyłam zaszyfrowane żądanie GET.',
            ]);
            return;
          }
          const [head, ...rest] = a.text.split('\n\n');
          const status = head.split('\n')[0].replace('HTTP/1.1 ', '');
          const body = rest.join('\n\n');
          d.page = { url, status, body, secure, warning: c.ctx.warning as string | undefined };
          sim.out(d.id, `${proto}: ${status}, ${a.len} B`);
          for (const l of body.split('\n').slice(0, 4)) sim.out(d.id, `  ${l}`);
          sim.tcpClose(c);
        },
        fail(_c, why) {
          sim.out(d.id, `${proto}: nie można połączyć z ${host} – ${why}`, 'err');
          if (why.includes('RST')) sim.out(d.id, `Czy na serwerze włączona jest usługa ${proto} (port ${port})?`, 'hint');
        },
      },
      [`Przeglądarka: łączę się z ${host} (${ip}) na porcie ${port}.`],
    );
  });
}

// ---------- FTP (tryb pasywny EPSV) ----------

function ftpServer(sim: Sim, d: Device): ConnHandlers {
  const say = (c: Conn, text: string, why: string) => sim.tcpSend(c, app('FTP', text), [why]);
  return {
    proto: 'FTP',
    open(c) {
      say(c, '220 Serwer FTP gotowy', 'Powitanie serwera FTP (kod 220) na połączeniu sterującym.');
    },
    data(c, a) {
      const line = a.text.trim();
      const [cmdRaw, ...args] = line.split(' ');
      const cmd = cmdRaw.toUpperCase();
      const arg = args.join(' ');
      const dc = c.ctx.dataConn as Conn | undefined;
      switch (cmd) {
        case 'USER':
          c.ctx.user = arg;
          return say(c, `331 Podaj hasło dla ${arg}`, 'Serwer zna już nazwę użytkownika i czeka na hasło.');
        case 'PASS': {
          const ok = d.users.some((u) => u.name === c.ctx.user && u.pass === arg);
          c.ctx.auth = ok;
          return ok
            ? say(c, '230 Zalogowano', 'Hasło poprawne – sesja zalogowana.')
            : say(c, '530 Błędny login lub hasło', 'Nieprawidłowe dane logowania.');
        }
        case 'EPSV': {
          if (!c.ctx.auth) return say(c, '530 Najpierw się zaloguj', 'Polecenie wymaga zalogowania.');
          const port = 50000 + Math.floor(Math.random() * MAX_PASV);
          c.ctx.dataPort = port;
          sim.listen(d, port, {
            proto: 'FTP',
            open(x) {
              c.ctx.dataConn = x;
            },
          });
          return say(c, `229 Tryb pasywny (|||${port}|)`, `EPSV: otwieram port danych ${port} i podaję go klientowi.`);
        }
        case 'LIST':
        case 'RETR': {
          if (!c.ctx.auth) return say(c, '530 Najpierw się zaloguj', 'Polecenie wymaga zalogowania.');
          if (!dc) return say(c, '425 Brak połączenia danych', 'Klient nie otworzył połączenia danych.');
          const file = cmd === 'RETR' ? d.files.find((f) => f.name === arg) : undefined;
          if (cmd === 'RETR' && !file) {
            say(c, `550 Nie ma pliku ${arg}`, 'Plik nie istnieje – zamykam połączenie danych.');
            sim.at(1, () => sim.tcpClose(dc, ['Brak danych do wysłania – zamykam połączenie danych.']));
            return;
          }
          const content = cmd === 'LIST' ? d.files.map((f) => `${String(f.body.length).padStart(6)}  ${f.name}`).join('\n') || '(katalog pusty)' : file!.body;
          say(c, '150 Otwieram połączenie danych', `${cmd === 'LIST' ? 'Lista plików' : `Plik ${arg}`} pójdzie osobnym połączeniem danych.`);
          sim.at(1, () => {
            sim.tcpSend(dc, app('FTP', content), [`Połączenie danych: ${cmd === 'LIST' ? 'lista plików' : `zawartość pliku ${arg}`} – jawnym tekstem.`]);
            sim.at(1, () => sim.tcpClose(dc, ['Koniec danych – serwer zamyka połączenie danych (FIN).']));
            sim.at(4, () => say(c, '226 Transfer zakończony', 'Potwierdzenie zakończenia transferu na połączeniu sterującym.'));
          });
          return;
        }
        case 'QUIT':
          return say(c, '221 Do widzenia', 'Koniec sesji FTP.');
        default:
          return say(c, `502 Nieznane polecenie ${cmd}`, 'Polecenie nieobsługiwane.');
      }
    },
  };
}

export function startFtp(sim: Sim, d: Device, host: string, op: { cmd: 'get' | 'list'; file?: string; user: string; pass: string }, want: 4 | 6) {
  sim.out(d.id, `FTP: łączę się z ${host} jako ${op.user}`);
  sim.resolveHost(d, host, want, (ip) => {
    if (!ip) return;
    const send = (c: Conn, text: string, why: string) => sim.tcpSend(c, app('FTP', text), [why]);
    sim.tcpConnect(
      d,
      ip,
      21,
      {
        proto: 'FTP',
        data(c, a) {
          const code = a.text.slice(0, 3);
          sim.out(d.id, `  < ${a.text.split('\n')[0]}`);
          switch (code) {
            case '220':
              return send(c, `USER ${op.user}`, 'Logowanie: nazwa użytkownika.');
            case '331':
              return send(c, `PASS ${op.pass}`, 'Logowanie: hasło – UWAGA, w FTP płynie ono jawnym tekstem!');
            case '230':
              return send(c, 'EPSV', 'Proszę serwer o port do połączenia danych (tryb pasywny, działa też w IPv6).');
            case '229': {
              const port = Number(/\|\|\|(\d+)\|/.exec(a.text)?.[1]);
              sim.tcpConnect(
                d,
                ip,
                port,
                {
                  proto: 'FTP',
                  open() {
                    send(c, op.cmd === 'get' ? `RETR ${op.file}` : 'LIST', op.cmd === 'get' ? `Proszę o plik ${op.file}.` : 'Proszę o listę plików.');
                  },
                  data(_dc, x) {
                    c.ctx.content = ((c.ctx.content as string) ?? '') + x.text;
                  },
                },
                [`Otwieram osobne połączenie danych na port ${port} podany przez serwer.`],
              );
              return;
            }
            case '226': {
              const content = (c.ctx.content as string) ?? '';
              if (op.cmd === 'get') {
                d.downloads = d.downloads.filter((f) => f.name !== op.file);
                d.downloads.push({ name: op.file!, from: host, body: content });
                sim.out(d.id, `FTP: pobrano ${op.file} (${content.length} B): ${content.slice(0, 60)}`);
              } else for (const l of content.split('\n')) sim.out(d.id, `  ${l}`);
              return send(c, 'QUIT', 'Kończę sesję FTP.');
            }
            case '150':
              return;
            case '221':
              return sim.tcpClose(c);
            default:
              if (code.startsWith('5') || code.startsWith('4')) {
                sim.out(d.id, `FTP: błąd ${a.text}`, 'err');
                return send(c, 'QUIT', 'Błąd – kończę sesję.');
              }
          }
        },
        fail(_c, why) {
          sim.out(d.id, `FTP: nie można połączyć z ${host} – ${why}`, 'err');
        },
      },
      [`Klient FTP: połączenie sterujące z ${host} (${ip}) na port 21.`],
    );
  });
}

// ---------- poczta: SMTP i POP3 ----------

function parseMail(text: string): Mail {
  const [head, ...rest] = text.split('\n\n');
  const h = (k: string) => new RegExp(`^${k}: (.*)$`, 'mi').exec(head)?.[1] ?? '';
  return { from: h('From'), to: h('To'), subject: h('Subject'), body: rest.join('\n\n').replace(/\n\.$/, '') };
}

function smtpServer(sim: Sim, d: Device): ConnHandlers {
  const say = (c: Conn, text: string, why: string) => sim.tcpSend(c, app('EMAIL', text), [why]);
  return {
    proto: 'EMAIL',
    open(c) {
      say(c, `220 ${d.mailDomain} SMTP gotowy`, 'Powitanie serwera SMTP.');
    },
    data(c, a) {
      if (c.ctx.inData) {
        c.ctx.inData = false;
        const m = parseMail(a.text);
        const user = d.users.find((u) => u.name === c.ctx.rcpt);
        user?.mail.push(m);
        return say(c, '250 Wiadomość przyjęta do doręczenia', `Zapisuję wiadomość w skrzynce ${c.ctx.rcpt}@${d.mailDomain}.`);
      }
      const line = a.text.trim();
      const up = line.toUpperCase();
      if (up.startsWith('HELO') || up.startsWith('EHLO')) return say(c, `250 Witaj ${line.split(' ')[1] ?? ''}`, 'Klient się przedstawił.');
      if (up.startsWith('MAIL FROM')) return say(c, '250 Nadawca OK', 'Zapamiętuję nadawcę.');
      if (up.startsWith('RCPT TO')) {
        const addr = /<([^>]+)>/.exec(line)?.[1] ?? '';
        const [u, dom] = addr.split('@');
        if (dom?.toLowerCase() === d.mailDomain.toLowerCase() && d.users.some((x) => x.name === u)) {
          c.ctx.rcpt = u;
          return say(c, '250 Odbiorca OK', `Skrzynka ${addr} istnieje.`);
        }
        return say(c, `550 Brak skrzynki ${addr}`, `Nie obsługuję skrzynki ${addr}.`);
      }
      if (up === 'DATA') {
        c.ctx.inData = true;
        return say(c, '354 Wpisz treść, zakończ wierszem z kropką', 'Czekam na treść wiadomości.');
      }
      if (up === 'QUIT') return say(c, '221 Zamykam połączenie', 'Koniec sesji SMTP.');
      return say(c, '500 Nieznane polecenie', 'Polecenie nieobsługiwane.');
    },
  };
}

function withMailServer(sim: Sim, d: Device, domain: string, cb: (ip: string) => void) {
  sim.resolve(d, domain, 'MX', (mx, err) => {
    if (!mx) {
      sim.out(d.id, `poczta: nie znaleziono serwera poczty domeny ${domain}`, 'err');
      if (err) sim.out(d.id, `${err} Serwer DNS musi mieć rekord MX dla domeny.`, 'hint');
      return;
    }
    sim.out(d.id, `poczta: serwer domeny ${domain} (rekord MX) to ${mx}`);
    sim.resolveHost(d, mx, 4, (ip) => ip && cb(ip));
  });
}

export function startMailSend(sim: Sim, d: Device, to: string, subject: string, body: string) {
  const from = d.mailAccount.addr;
  if (!from) {
    sim.out(d.id, 'poczta: najpierw ustaw konto: mail account <użytkownik@domena> pass <hasło>', 'err');
    return;
  }
  const domain = to.split('@')[1] ?? '';
  sim.out(d.id, `SMTP: wysyłam wiadomość do ${to}`);
  withMailServer(sim, d, domain, (ip) => {
    const steps = [
      `HELO ${d.name.toLowerCase()}`,
      `MAIL FROM:<${from}>`,
      `RCPT TO:<${to}>`,
      'DATA',
      `From: ${from}\nTo: ${to}\nSubject: ${subject}\n\n${body}\n.`,
      'QUIT',
    ];
    const why = ['Przedstawiam się serwerowi.', 'Podaję nadawcę.', 'Podaję odbiorcę.', 'Zaczynam przesyłanie treści.', 'Treść wiadomości (nagłówki RFC 5322 + kropka na końcu).', 'Kończę sesję.'];
    sim.tcpConnect(
      d,
      ip,
      25,
      {
        proto: 'EMAIL',
        data(c, a) {
          const code = a.text.slice(0, 3);
          sim.out(d.id, `  < ${a.text}`);
          if (code === '221') return sim.tcpClose(c);
          if (code.startsWith('5')) {
            sim.out(d.id, 'SMTP: serwer odrzucił wiadomość', 'err');
            c.ctx.step = steps.length - 1;
          }
          const i = (c.ctx.step as number) ?? 0;
          if (code === '250' && i === 5) sim.out(d.id, 'SMTP: wiadomość wysłana');
          c.ctx.step = i + 1;
          sim.tcpSend(c, app('EMAIL', steps[i]), [why[i]]);
        },
        fail(_c, why2) {
          sim.out(d.id, `SMTP: brak połączenia – ${why2}`, 'err');
        },
      },
      [`Klient poczty: łączę się z serwerem SMTP ${ip} (port 25).`],
    );
  });
}

function pop3Server(sim: Sim, d: Device): ConnHandlers {
  const say = (c: Conn, text: string, why: string) => sim.tcpSend(c, app('EMAIL', text), [why]);
  return {
    proto: 'EMAIL',
    open(c) {
      say(c, '+OK POP3 gotowy', 'Powitanie serwera POP3.');
    },
    data(c, a) {
      const [cmd, ...args] = a.text.trim().split(' ');
      const C = cmd.toUpperCase();
      if (C === 'USER') {
        c.ctx.user = args[0];
        return say(c, '+OK podaj hasło', 'Czekam na hasło.');
      }
      if (C === 'PASS') {
        const u = d.users.find((x) => x.name === c.ctx.user && x.pass === args[0]);
        if (!u) return say(c, '-ERR błędne hasło', 'Logowanie nieudane.');
        c.ctx.auth = u.name;
        return say(c, `+OK zalogowano, wiadomości: ${u.mail.length}`, `Skrzynka ${u.name} ma ${u.mail.length} wiadomości.`);
      }
      if (C === 'RETR') {
        const u = d.users.find((x) => x.name === c.ctx.auth);
        const m = u?.mail[Number(args[0]) - 1];
        if (!m) return say(c, '-ERR brak wiadomości', 'Nie ma takiej wiadomości.');
        return say(c, `+OK\nFrom: ${m.from}\nTo: ${m.to}\nSubject: ${m.subject}\n\n${m.body}\n.`, `Wysyłam wiadomość nr ${args[0]}.`);
      }
      if (C === 'QUIT') return say(c, '+OK do widzenia', 'Koniec sesji POP3.');
      return say(c, '-ERR nieznane polecenie', 'Polecenie nieobsługiwane.');
    },
  };
}

export function startMailCheck(sim: Sim, d: Device) {
  const { addr, pass } = d.mailAccount;
  if (!addr) {
    sim.out(d.id, 'poczta: najpierw ustaw konto: mail account <użytkownik@domena> pass <hasło>', 'err');
    return;
  }
  const [user, domain] = addr.split('@');
  sim.out(d.id, `POP3: sprawdzam skrzynkę ${addr}`);
  withMailServer(sim, d, domain ?? '', (ip) => {
    sim.tcpConnect(
      d,
      ip,
      110,
      {
        proto: 'EMAIL',
        data(c, a) {
          const first = a.text.split('\n')[0];
          const step = (c.ctx.step as string) ?? 'banner';
          const got = (c.ctx.got as Mail[]) ?? [];
          c.ctx.got = got;
          if (first.startsWith('-ERR')) {
            sim.out(d.id, `POP3: ${first}`, 'err');
            c.ctx.step = 'quit';
            return sim.tcpSend(c, app('EMAIL', 'QUIT'), ['Błąd – kończę sesję.']);
          }
          if (step === 'banner') {
            c.ctx.step = 'user';
            return sim.tcpSend(c, app('EMAIL', `USER ${user}`), ['Logowanie: użytkownik.']);
          }
          if (step === 'user') {
            c.ctx.step = 'pass';
            return sim.tcpSend(c, app('EMAIL', `PASS ${pass}`), ['Logowanie: hasło (w POP3 bez TLS – jawnym tekstem).']);
          }
          if (step === 'pass') {
            const n = Number(/wiadomości: (\d+)/.exec(first)?.[1] ?? 0);
            c.ctx.total = n;
            c.ctx.next = 1;
            sim.out(d.id, `POP3: ${first.slice(4)}`);
            if (!n) {
              c.ctx.step = 'quit';
              return sim.tcpSend(c, app('EMAIL', 'QUIT'), ['Skrzynka pusta – kończę.']);
            }
            c.ctx.step = 'retr';
            return sim.tcpSend(c, app('EMAIL', 'RETR 1'), ['Pobieram wiadomość nr 1.']);
          }
          if (step === 'retr') {
            got.push(parseMail(a.text.split('\n').slice(1).join('\n')));
            const next = (c.ctx.next as number) + 1;
            c.ctx.next = next;
            if (next <= (c.ctx.total as number)) return sim.tcpSend(c, app('EMAIL', `RETR ${next}`), [`Pobieram wiadomość nr ${next}.`]);
            c.ctx.step = 'quit';
            d.inbox = got;
            for (const m of got) sim.out(d.id, `  od ${m.from}: „${m.subject}”`);
            return sim.tcpSend(c, app('EMAIL', 'QUIT'), ['Wszystko pobrane – kończę sesję.']);
          }
          if (step === 'quit') return sim.tcpClose(c);
        },
        fail(_c, why) {
          sim.out(d.id, `POP3: brak połączenia – ${why}`, 'err');
        },
      },
      [`Klient poczty: łączę się z serwerem POP3 ${ip} (port 110).`],
    );
  });
}

// ---------- IPP (drukowanie) ----------

function ippServer(sim: Sim, d: Device): ConnHandlers {
  return {
    proto: 'IPP',
    data(c, a) {
      const doc = /document-name="([^"]*)"/.exec(a.text)?.[1] ?? 'dokument';
      const id = d.jobs.length + 1;
      d.jobs.push({ id, from: c.remote, doc, t: sim.t });
      sim.out(d.id, `Drukowanie „${doc}” od ${c.remote} (zadanie ${id})`);
      sim.tcpSend(c, app('IPP', `HTTP/1.1 200 OK · successful-ok\njob-id=${id}`), [`Drukarka przyjęła zadanie nr ${id} i potwierdza je odpowiedzią IPP.`]);
    },
  };
}

export function startPrint(sim: Sim, d: Device, host: string, doc: string, want: 4 | 6 = 4) {
  sim.out(d.id, `IPP: wysyłam „${doc}” do ${host}`);
  sim.resolveHost(d, host, want, (ip) => {
    if (!ip) return;
    sim.tcpConnect(
      d,
      ip,
      631,
      {
        proto: 'IPP',
        open(c) {
          sim.tcpSend(c, app('IPP', `POST /ipp/print · Print-Job\ndocument-name="${doc}"`, { len: 1200 + doc.length }), [
            'Żądanie IPP Print-Job (z treścią dokumentu) w ciele HTTP POST.',
          ]);
        },
        data(c, a) {
          sim.out(d.id, `IPP: drukarka przyjęła zadanie (${a.text.split('\n')[1] ?? ''})`);
          sim.tcpClose(c);
        },
        fail(_c, why) {
          sim.out(d.id, `IPP: nie można wysłać zadania – ${why}`, 'err');
          if (why.includes('RST')) sim.out(d.id, 'Pod tym adresem nie działa usługa drukowania (port 631).', 'hint');
        },
      },
      ['Drukowanie przez IPP: najpierw połączenie TCP z portem 631.'],
    );
  });
}
