---
sidebar_position: 1
title: "Ćwiczenie 1: Model OSI. Enkapsulacja danych oraz warstwa fizyaczna"
---

<!--- import bibliotek -->
import OsiMatchingExercise from '@site/src/components/OsiMatchingExercise';


# Ćwiczenie 1: Model OSI. Enkapsulacja danych oraz warstwa fizyczna

*Część I — Model ISO/OSI oraz warstwa fizyczna*

## I. Wprowadzenie

<div className="justify">
Założeniem **modelu OSI** jest podział sieci komputerowej na 7 warstw [[1](#bib1)]. Każda z warstw pełni dedykowaną rolę, na każdej działają inne protokoły, wymienne w ramach warstwy bez wpływu na działanie pozostałych warstw [[2](#bib2)]. Poszczególne warstwy komunikują się wyłącznie z warstwami sąsiednimi, a dane przechodzące między nimi podlegają procesowi enkapsulacji — dodawania nagłówków właściwych dla danej warstwy [[3](#bib3)]. 
</div>

- warstwa 1. — **fizyczna** — zapewnia przesył danych poprzez wskazane medium transmisyjne,
- warstwa 2. — **łącza danych** — ma za zadanie przekazać dane wewnątrz sieci lokalnej, zarządza dostępem do medium transmisyjnego; najpopularniejszym protokołem na tej warstwie jest **Ethernet**,
- warstwa 3. — **sieciowa** — odpowiada za adresację logiczną (**IP**) oraz trasowanie (**routing**) pakietów między odrębnymi sieciami,
- warstwa 4. — **transportowa** — zapewnia dostarczenie danych między aplikacjami końcowymi, z podziałem na protokoły połączeniowe (**TCP**) i bezpołączeniowe (**UDP**),
- warstwa 5. — **sesji** — odpowiada za nawiązywanie, utrzymywanie i kończenie sesji komunikacyjnych między aplikacjami,
- warstwa 6. — **prezentacji** — zajmuje się kodowaniem, kompresją oraz szyfrowaniem danych,
- warstwa 7. — **aplikacji** — dostarcza usługi sieciowe bezpośrednio programom użytkownika, np. **HTTP, DNS, FTP**.

<div className="justify">
Proces **enkapsulacji** polega na dołączaniu przez każdą kolejną warstwę własnego nagłówka (a niekiedy stopki) do danych otrzymanych z warstwy wyższej — w efekcie dane aplikacji przekształcane są kolejno w **segment** (dane z warstwy aplikacji do warstwy sesji zamykane są na warstwie transportowej), **pakiet** (segmenty z warstwy transportowej stanową zawartość pakietów), **ramkę** (pakiet otoczony nagłówkiem wartswy łącza danych tworzy), a na końcu w strumień bitów wysyłany medium transmisyjnym. Po stronie odbiorcy zachodzi proces odwrotny — **dekapsulacja** [[2](#bib2)]. Oba procesy zostały przedstawione na Rysunek 1.
</div>

![Rys1](/img/1/osi.png)
<div className="text-center">
Rys.1 Proces enkapsulacji i dekapsulacji danych [[4](#bib4)]
</div>

---

<div className="justify">
**Warstwa fizyczna** odpowiada za przesył sygnału poprzez medium transmisyjne — skrętkę, światłowód lub fale radiowe — i determinuje takie parametry jak przepustowość czy tłumienie [[2](#bib2)]. Jednym z rodzajów mediów transmisyjnych jest medium przewodowe, którego reprezentantem jest 8-żyłowy kabel miedziany, popularnie nazywany skrętką. W zależności od tego, czy kabel został dodatkowo ekranowany (co chroni przesyłane kablem sygnały przed zakłóceniami z zewnątrz), czy też nie, możemy podzielić skrętki na 3 rodzaje ze wzgledu na ekranowanie pary skręconej:

- UTP (unshielded twisted pair ) — kabel bez ekranowania (ani całości, ani każdej z żył z osobna),

- FTP (foiled twisted pair ) — kabel posiadający ekranowanie folią,

- STP (shielded twisted pair ) — kabel posiadający ekranowanie siatką.

Natomiast dla ekranowanie całego przewodu można wyróżnić 3 typy:

- U (Unshielded) - brak ekranu

- F (Foiled) - ekran z foli

- S (Shielded) - ekran w postaci siatki

Po połączniu niniejszego nazewniztwa otrzymujemy np. S/FTP – gdzie pary żył skrętki ekranowane są folią, a cały przewód ekranowany jest siatką.
</div>

<div className="justify">
Zakończenie kabla stanowi złącze 8P8C (popularnie, lecz niepoprawnie nazywane RJ-45). Standard TIA/EIA-568-B opisuje 2 rodzaje zakończeń przewodów w złączu: T568A oraz T568B, które różnią się kolejnością ułożenia żył pomarańczowych i zielonych (Rys. 2).
</div>

![Rys2](/img/1/tia_eia.png)
<div className="text-center">
Rys. 2 Standard TIA/EIA-568-A i TIA/EIA-568-B [[4](#bib4)]
</div>
## II. Zadania do wykonania

### Model OSI

<OsiMatchingExercise title="Przyporządkuj przykładowe urządzenia i protokoły do właściwych warstw modelu OSI" />

### Warstwa fizyczna

Przygotowanie kabla ethernetowego do pracy w standardzie B - [Link do przewodnika krok po kroku jak wykonać ćwiczenie](https://www.youtube.com/watch?v=XQar5hCQyaQ).

## III. Bibliografia

<a id="bib1"></a>[1] [ISO/IEC 7498-1:1994](https://www.iso.org/standard/20269.html), Information technology — Open Systems Interconnection — Basic Reference Model: The Basic Model, International Organization for Standardization, 1994.

<a id="bib2"></a>[2] A. S. Tanenbaum, D. J. Wetherall, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Tanenbaum+Wetherall+Helion+wydanie+V), wyd. V, Helion, Gliwice 2012.

<a id="bib3"></a>[3] J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 3, Helion, Gliwice 2006.

<a id="bib4"></a>[4] Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

