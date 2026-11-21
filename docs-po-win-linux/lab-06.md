---
sidebar_position: 6
title: "Laboratorium 6: Wirtualizacja, konteneryzacja i środowiska chmurowe"
---

<!--- import bibliotek -->

import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import EditableTable from '@site/src/components/EditableTable';
import KeywordAnswer from '@site/src/components/KeywordAnswer';
import OpenQuestion from '@site/src/components/OpenQuestion';
import Checklist from '@site/src/components/Checklist';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';

# Laboratorium 6: Wirtualizacja, konteneryzacja i środowiska chmurowe

<SprawozdanieHeader
  thema="Utwardzanie systemu Windows i Linux"
  exerciseTitle="Laboratorium 6: Wirtualizacja, konteneryzacja i środowiska chmurowe"
  storageKey="win-lab-6"
  solo
/>

<ProjectSaveLoad
  thema="Utwardzanie systemu Windows i Linux"
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="win-lab-6"
  storageKeys={['win-lab-6','win6-kontener','win6-chmura','win6-wnioski']}
  sharedPrefix="win6_"
/>

:::danger Pracuj na maszynie laboratoryjnej
Kontenery uruchamiaj na maszynie wirtualnej z migawką. Pobieraj obrazy wyłącznie z zaufanych źródeł (oficjalne repozytoria).
:::

## I. Wprowadzenie

<div className="justify">
Wirtualizacja, konteneryzacja i chmura zmieniły **sposób zarządzania systemami operacyjnymi**: zamiast utrzymywać pojedyncze, długowieczne maszyny, uruchamiamy wiele odizolowanych środowisk, odtwarzalnych z wzorca i skalowanych na żądanie. Różnią się jednak **poziomem izolacji** i **podziałem odpowiedzialności**, co wprost przekłada się na bezpieczeństwo.
</div>

<div className="justify">
**Maszyna wirtualna (VM)** ma własne jądro i jest oddzielona przez **hipernadzorcę** (*hypervisor*) od reszty systemu. Rozróżnia się hipernadzorców **typu 1**, który natywnie działa na sprzęcie, bez systemu operacyjnego pod spodem. Wykorzystywany jest na serwerach, czy w centrach danych, a przykładem są: VMware ESXi, KVM, Proxmox. Hipernadzorca **typu 2**, który jest hostowany na istniejącym systemie operacyjnym. Wykorzystywany jest na stacjach roboczych i przykładem są: VirtualBox, VMware Workstation. Względem bezpieczeństwa typ 1 ma mniejszą powierzchnię ataku, bo nie ma pod sobą całego systemu gospodarza z jego usługami i podatnościami. Dla typu 2 podatność w systemie gospodarza może zagrozić wszystkim maszynom wirtualnym na nim działającym [^nist-125].
</div>

<div className="justify">
**Kontener** współdzieli jądro gospodarza i izoluje jedynie przestrzeń procesów, plików (mechanizmy jądra: *namespaces* i *cgroups*) i sieci. Jest lekki i szybki, ale izolacja jest słabsza niż w VM. Błąd konfiguracji lub podatność jądra może pozwolić na ucieczkę do gospodarza. Z zarządzania OS dochodzą tu nowe elementy: **obrazy** (system plików wraz z metadanymi), **rejestry** (magazyny obrazów, gdzie każdy obraz identyfikuje się tagiem) i ich zaufanie. Z poziomu bezpieczeństwa kontenery uruchamiamia się bez roota, z minimalnym obrazem bazowym, odbierana się zbędne uprawnienia (capabilities), a system plików ustawiony tylko do odczytu [^nist-190]. Głównymi narzedziami do tworzenia i uruchamiania kontenerów są: **Docker** [^docker] i **Podman** [^podman].
</div>

<div className="justify">
Potoczne **chmura** to po prostu cudze serwery udostępnione w internecie znajdujące się w różnych częściach świata. Czyni to współczesne przetwarzanie danych w chmurze wyjątkowym. Chmura udostępnia modele usług na różnym poziomie odpowiedzialności za infrastrukture i sprzęt na jakim pracuje. Poniżej w Tabeli 1 przedstawiono **jak wiele odpowiedzialności** spoczywa na kliencie, co ma do dyspozycji oraz za co odpowiada dostawca chmury [^messier]. Im wyżej w stosie usług (IaaS → SaaS), tym mniej klient konfiguruje, ale tym mniejsza jego kontrola.
</div>

Tab. 1 Modele oferowane przez dostawców usług chmurowych
| Model | Co dostajesz | Za co odpowiada klient | Za co odpowiada dostawca |
|---|---|---|---|
| **IaaS** (Infrastructure as a Service) | Wirtualne maszyny, sieć, dyski, system operacyjny | OS i aktualizacje, konfiguracja sieci i portów, użytkownicy i tożsamości, dane, bezpieczeństwo aplikacji | Wirtualizacja, hosty fizyczne, sieć fizyczna, centrum danych |
| **PaaS** (Platform as a Service) | Platforma uruchomieniowa (runtime, middleware, baza danych) | Logika aplikacji, dane, konta i tożsamości; konfiguracje sieciowe pod aplikację *(dzielone)* | System operacyjny i infrastruktura; aplikacje oraz sterowanie siecią *(dzielone)* |
| **SaaS** (Software as a Service) | Gotowa aplikacja przez przeglądarkę | Dane oraz konta i dostęp użytkowników; tożsamość i katalog *(dzielone)* | Aplikacja, system operacyjny i cała infrastruktura |
| **STaaS** (Storage as a Service) | Przestrzeń dyskowa dostępna z wielu urządzeń | Dane i uprawnienia do współdzielenia | Infrastruktura pamięci masowej i warstwa fizyczna |

<div className="justify">
Dla dostawcy chmury głównym zadaniem bezpieczeństwa jest ochrona krytycznych zasobów biznesowych, czyli danych. Punktem wyjścia pozostaje **triada CIA**: poufność (*confidentiality*), integralność (*integrity*) i dostępność (*availability*) [^armitage]. Najczęstsze incydenty chmurowe wynikają z błędów klienta: publicznie wystawionych zasobów i zbyt szerokich uprawnień [^csa].
</div>

### Co to zmienia w zarządzaniu systemami

<div className="justify">
Zamiast „naprawiać” długowieczne maszyny, dąży się do **infrastruktury niemodyfikowalnej** (*immutable*): zmiana = **przebudowa z utwardzonego wzorca** (golden image / Dockerfile) i podmiana, a nie ręczne łatanie. Konfiguracja jest opisana **jako kod** (IaC), stosuje się **najmniejsze uprawnienia** i **centralne logowanie** we wszystkich tych środowiskach.
</div>

<div className="justify">
**Wirtualizacja** i **konteneryzacja** pozwalają uruchamiać wiele odizolowanych środowisk na jednym sprzęcie, ale różnią się poziomem izolacji od gospodarza. Natomiast w  **chmurze** obowiązuje **model współdzielonej odpowiedzialności** (*shared responsibility*): dostawca odpowiada za bezpieczeństwo samej infrastruktury, a klient za konfigurację tego, co w niej uruchamia.
</div>

## II. Zadania do wykonania

### Bezpieczna maszyna wirtualna

Na swojej maszynie w VirtualBox/Hyper-V sprawdź i ogranicz powierzchnię ataku.

<Checklist
title="Utwardzanie maszyny wirtualnej"
storageKey="l6z-vm"
sections={[
{ title: 'Izolacja i konfiguracja', items: [
'Minimalny obraz systemu - tylko potrzebne pakiety/role',
'System zaktualizowany',
'Wykonana migawka bazowa',
'Wyłączone zbędne funkcje integracji z gospodarzem (współdzielony schowek, foldery, drag&drop)',
'Oddzielona sieć VM od sieci zarządzania gospodarza',
'Zasada: jedna maszyna = jedna rola',
]},
{ title: 'Kopia zapasowa', items: [
'Eksport maszyny do pliku .ova (File → Export Appliance) jako trwały backup',
]},
]}
/>

### Bezpieczny kontener (Docker)

<StepByStep>
<Step title="Instalacja i pierwszy kontener">
Instalacja z oficjalnego repozytorium Dockera.

```bash
sudo apt install -y docker 2>/dev/null
sudo systemctl enable --now docker
docker run --rm hello-world         # test działania
```

<ScreenshotPaste label="Zrzut ekranu: test działania dockera" />
</Step>

<Step title="Uruchomienie bez roota i z minimalnymi uprawnieniami">
Porównaj uruchomienie domyślne i utwardzone.

```bash
# Domyślnie ustawienie kontenera 
docker run --rm alpine sh -c '
  echo "Użytkownik:      $(id)";
  touch /plik 2>/dev/null && echo "System plików:   zapisywalny" || echo "System plików:   tylko do odczytu";
  echo "CapEff:          $(grep CapEff /proc/self/status | cut -f2)";
  echo "NoNewPrivs:      $(grep NoNewPrivs /proc/self/status | cut -f2)  (0=eskalacja możliwa, 1=zablokowana)"
'

# Utwardzone: użytkownik bez uprawnień, system plików tylko do odczytu,
# odebrane wszystkie zbędne uprawnienia, brak eskalacji
docker run --rm \
  --user 1000:1000 \
  --read-only --tmpfs /tmp \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  alpine sh -c '
  echo "Użytkownik:      $(id)";
  touch /plik 2>/dev/null && echo "System plików:   zapisywalny" || echo "System plików:   tylko do odczytu";
  echo "CapEff:          $(grep CapEff /proc/self/status | cut -f2)";
  echo "NoNewPrivs:      $(grep NoNewPrivs /proc/self/status | cut -f2)  (0=eskalacja możliwa, 1=zablokowana)"
'
```

Następnie wypełnij Tabele 2.

<EditableTable
  title="Tab. 2 Kontener — domyślnie vs utwardzony"
  storageKey="l6z-kontener"
  columns={[
    {key: 'aspekt', label: 'Aspekt', readOnly: true},
    {key: 'domysl', label: 'Domyślnie'},
    {key: 'utward', label: 'Po utwardzeniu'},
  ]}
  initialRows={[
    {aspekt: 'Użytkownik procesu (id)'},
    {aspekt: 'System plików (zapis?)'},
    {aspekt: 'Capabilities'},
    {aspekt: 'Możliwość eskalacji uprawnień'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>

<Step title="Zaufane obrazy i skan podatności">
Obraz kontenera to cudzy kod. Używaj obrazów **oficjalnych/minimalnych** i **skanuj** je. Przeskanuj podany obraz oraz wybierz dowolny obraz z repozytorium [Docker Hub](https://hub.docker.com/search?badges=official) i równeż przeskanuj. Wyniki podaj w Tabeli 3.

```bash
# Skaner podatności obrazów (Trivy)
sudo apt install -y trivy 2>/dev/null
trivy image alpine:latest
```

<EditableTable
  title="Tab. 3 Skan obrazu"
  storageKey="l6z-skan"
  columns={[
    {key: 'obraz', label: 'Obraz'},
    {key: 'zrodlo', label: 'Źródło (oficjalne/zaufane?)'},
    {key: 'krytyczne', label: 'Liczba krytycznych podatności'},
  ]}
  initialRows={[
    {obraz: 'alpine:latest'},
    {obraz: '(obraz wybrany samodzielnie)'},
  ]}
  allowAddRows={true}
  allowRemoveRows={false}
/>

<div className="justify">
Zgodność hosta Dockera z benchmarkiem sprawdza **Docker Bench for Security** (wg CIS Docker Benchmark). W pliku **Dockerfile** dobrą praktyką jest `USER` inny niż root i minimalny obraz bazowy.
</div>

<KeywordAnswer
  title="Po co skanować obrazy?"
  question="Dlaczego obraz kontenera należy traktować jak kod z zewnątrz i skanować przed użyciem?"
  keywords={['cudz', 'kod', 'podatn', 'warstw', 'zaufan', 'niezaufan', 'malware']}
  explanation="Obraz zawiera cały system plików i oprogramowanie od kogoś innego — może mieć znane podatności w swoich warstwach, przestarzałe pakiety albo celowo wstrzyknięty złośliwy kod. Skan (np. Trivy) wykrywa znane podatności, a pobieranie z oficjalnych/zaufanych rejestrów ogranicza ryzyko obrazu spreparowanego."
  storageKey="l6z-skan-kw"
/>
</Step>
</StepByStep>

### Model współdzielonej odpowiedzialności w chmurze

<StepByStep>
<Step title="Kto za co odpowiada?">
Przyporządkuj elementy do odpowiedzialności dostawcy lub klienta (model **IaaS**) w Tabeli 4.

<EditableTable
  title="Tab. 4 Współdzielona odpowiedzialność (IaaS)"
  storageKey="win6-odpowiedzialnosc"
  columns={[
    {key: 'element', label: 'Element', readOnly: true},
    {key: 'kto', label: 'Dostawca czy klient?'},
  ]}
  initialRows={[
    {element: 'Fizyczne bezpieczeństwo centrum danych'},
    {element: 'Hipernadzorca i sprzęt'},
    {element: 'Aktualizacje systemu operacyjnego maszyny wirtualnej'},
    {element: 'Konfiguracja reguł sieciowych (security groups)'},
    {element: 'Uprawnienia kont (IAM) i klucze dostępu'},
    {element: 'Szyfrowanie i klasyfikacja danych klienta'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

<!-- Dostawca: fizyczne bezpieczeństwo, hipernadzorca i sprzęt. Klient: aktualizacje OS maszyny, reguły sieciowe, uprawnienia IAM i klucze, szyfrowanie i klasyfikacja danych. W modelu IaaS większość konfiguracji należy do klienta. -->
</Step>

<Step title="Najczęstsze błędy konfiguracji chmury">
<KeywordAnswer
  title="Publiczny zasobnik"
  question="Dlaczego publicznie dostępny zasobnik na dane (np. bucket) lub zbyt szerokie uprawnienia IAM to jedne z najczęstszych przyczyn wycieków w chmurze?"
  keywords={['publiczn', 'konfigur', 'dostep', 'dostęp', 'najmniejsz', 'uprawnien', 'blad', 'błąd', 'klient']}
  explanation="To błędy po stronie klienta (jego część współdzielonej odpowiedzialności): zasób wystawiony publicznie jest dostępny dla każdego w internecie, a zbyt szerokie uprawnienia IAM łamią zasadę najmniejszych uprawnień — przejęcie jednego konta daje dostęp do wielu zasobów. Oba wynikają z konfiguracji, nie z luki u dostawcy."
  storageKey="win6-chmura-blad"
/>
</Step>
</StepByStep>

### Zarządzanie: aktualizacje i wzorce

<StepByStep>
<Step title="Łatać czy przebudować?">
<OpenQuestion
  title="Immutable vs patching"
  question="Porównaj dwa podejścia do aktualizacji: ręczne łatanie długowiecznej maszyny vs przebudowa z utwardzonego wzorca (golden image / nowy obraz kontenera) i podmiana. Które lepiej pasuje do VM, a które do kontenerów i dlaczego? Jak wiąże się to z dryfem konfiguracji?"
  modelAnswer="Kontenery aktualizuje się przez przebudowę obrazu z nowej, załatanej warstwy bazowej i podmianę (infrastruktura niemodyfikowalna) — ręczne zmiany w działającym kontenerze giną i powodują dryf. VM można łatać na bieżąco, ale coraz częściej też traktuje się je jak wzorzec (golden image) odtwarzany z IaC. Przebudowa z wzorca eliminuje dryf konfiguracji i zapewnia, że każde środowisko startuje ze znanego, utwardzonego stanu; łatanie w miejscu jest prostsze doraźnie, ale z czasem prowadzi do rozjechania się maszyn."
  minLength={120}
  storageKey="l6z-zarzadzanie"
/>
</Step>

<Step title="Lista kontrolna bezpieczeństwa">
<Checklist
title="Wirtualizacja / kontenery / chmura - lista kontrolna"
storageKey="l6z-check"
sections={[
{ title: 'Wirtualizacja', items: [
'Minimalny, zaktualizowany obraz; migawka bazowa',
'Wyłączone zbędne funkcje integracji z gospodarzem',
'Oddzielone sieci; jedna maszyna = jedna rola',
]},
{ title: 'Kontenery', items: [
'Uruchamianie jako użytkownik bez uprawnień (--user)',
'--cap-drop ALL, --read-only, no-new-privileges',
'Obrazy z zaufanych źródeł, przeskanowane (Trivy)',
'USER inny niż root i minimalny obraz w Dockerfile',
]},
{ title: 'Chmura', items: [
'Brak publicznie wystawionych zasobów',
'Minimalne uprawnienia IAM (least privilege)',
'Szyfrowanie danych i reguły sieciowe skonfigurowane',
]},
]}
/>
</Step>
</StepByStep>

:::danger Po zajęciach
Przywróć maszyny wirtualne z migawki sprzed laboratorium albo pozostaw je w znanym, czystym stanie.
:::

[^nist-190]: M. Souppaya, J. Morello, K. Scarfone, [NIST SP 800-190 — Application Container Security Guide](https://csrc.nist.gov/pubs/sp/800/190/final), NIST, 2017.

[^csa]: Cloud Security Alliance, [Top Threats to Cloud Computing](https://cloudsecurityalliance.org/research/topthreats), cloudsecurityalliance.org — błędna konfiguracja i nadmiarowe uprawnienia jako główne zagrożenia.

[^docker]: Docker Inc., [Docker Documentation](https://docs.docker.com/).

[^podman]: Podman, [Podman Documentation](https://docs.podman.io/en/latest/).

[^nist-125]: NIST, [SP 800-125 — Guide to Security for Full Virtualization Technologies](https://csrc.nist.gov/pubs/sp/800/125/final), NIST, 2011.