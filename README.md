# BetterWorkplace form

Formularze Preact osadzane bezpośrednio lub w `iframe`.

## Struktura

```text
form-core.js          — renderowanie, walidacja, NIP/GUS i wysyłka
shared-sections.js    — wspólne sekcje: kontakt, firma, pytanie i zgody
form.js               — domyślny formularz sterowany parametrami URL
conference-form.js    — formularz konferencji
dailyfruits-form.js   — formularz Dailyfruits
prezenty-zestaw.js    — zestaw prezentowy z URL, sterowanie widokiem poza formularzem
examples/             — lokalne strony testowe
```

Każdy formularz ma jeden własny plik zawierający setup i uruchomienie. Wspólne sekcje importuje z `shared-sections.js`, a działanie z `form-core.js`.

## Webflow

Domyślny formularz:

```html
<div id="app"></div>
<script
  type="module"
  src="https://rawcdn.githack.com/hub-mol/better-workplace-form/COMMIT_SHA/form.js"
></script>
```

Formularz konferencji:

```html
<div id="app"></div>
<script
  type="module"
  src="https://rawcdn.githack.com/hub-mol/better-workplace-form/COMMIT_SHA/conference-form.js"
></script>
```

Po commicie i pushu `COMMIT_SHA` należy zastąpić pełnym hashem commita. Dzięki temu opublikowany formularz nie zmieni się po kolejnych zmianach na branchu.

## Domyślny formularz z URL

`form.js` przyjmuje parametry:

| Parametr | Domyślnie | Znaczenie |
| --- | --- | --- |
| `tabs` | `true` | formularz krokowy |
| `labelAbove` | `false` | etykieta nad polem |
| `debug` | `false` | logi `[bwp]` w konsoli |
| `brand` | z wiadomości rodzica lub domeny | wartość pola `brand` |
| `marketing` | `false` | pokazanie zgody marketingowej |
| `company` | `Betterworkplace Sp. z o.o.` | spółka w zgodach |

Wartości `0`, `false` i `no` wyłączają parametr logiczny. Przykład:

```text
https://example.com/formularz?tabs=false&labelAbove=true&brand=Dailyfruits&marketing=true&company=Dailyfruits%20Sp.%20z%20o.o.
```

Parametry interpretuje wyłącznie `form.js`; `form-core.js` nie czyta konfiguracji z URL ani z atrybutów `data-form-*`.

## Własny formularz

```js
import { initForm } from "./form-core.js";
import { CONTACT_PHONE_SECTION, COMPANY_SECTION, QUESTION_SECTION } from "./shared-sections.js";

const SETUP = {
  tabs: true,
  labelAbove: false,
  debug: false,
  brand: "BetterWorkplace",
  marketing: false,
  formName: "zapytanie",
  formType: "zapytanie",
  buttons: {
    submit: "Chcę otrzymać ofertę!",
    shortsubmit: "Zapytaj o ofertę",
  },
  legal: {
    companyName: "Betterworkplace Sp. z o.o.",
    privacyUrl: "https://www.betterworkplace.pl/privacy-policy",
  },
  error: {
    email: "biuro@betterworkplace.pl",
  },
  success: {
    heading: "Dziękujemy!",
    subheading: "Twoje zapytanie zostało wysłane.",
    description: "Nasz konsultant skontaktuje się z Tobą w ciągu 24h (dni robocze).",
  },
  sections: [CONTACT_PHONE_SECTION, COMPANY_SECTION, QUESTION_SECTION],
};

initForm(SETUP);
```

Przy starcie core sprawdza minimalną strukturę sekcji i pól. Błąd setupu zatrzymuje formularz z komunikatem `[bwp setup]` w konsoli.

Placeholdery i `autocomplete` są dobierane w core na podstawie nazwy pola. Dla emaila `validation: "business"` dodatkowo blokuje prywatne domeny; usunięcie tej właściwości pozostawia tylko sprawdzenie wymagalności i formatu adresu.

Tekst prawny jest renderowany automatycznie raz, na końcu formularza nad przyciskiem. `marketing: true` dodaje nad nim checkbox marketingowy. Nazwę spółki i link polityki prywatności ustawia się w `legal`.

`extraFields` dokłada do wysyłki wartości spoza sekcji. Obiekt jest stały, funkcja jest wywoływana dopiero przy wysyłce — dzięki temu moduł spoza formularza może oddać swój aktualny stan.

## Zestaw prezentowy

`prezenty-zestaw.js` obsługuje wejście na formularz z konkretnym zestawem:

```text
/kontakt/zapytanie?product=Śnieżna+Rozkosz&product_id=342340943
```

Nagłówki, karta CMS i alerty leżą w Webflow poza `#app`, więc moduł steruje nimi bezpośrednio — Preact nie może być właścicielem tego DOM-u. Formularz dostaje z modułu tylko trzy wartości.

```js
import { initForm } from "./form-core.js";
import { CONTACT_PHONE_SECTION, COMPANY_SECTION } from "./shared-sections.js";
import { initPrezentyZestaw, getZestawFields } from "./prezenty-zestaw.js";

initPrezentyZestaw();
initForm({ marketing: true, sections: [CONTACT_PHONE_SECTION, COMPANY_SECTION], extraFields: getZestawFields });
```

Bez `product_id` (albo gdy żaden element CMS nie pasuje) zostaje widok domyślny. Cała lista CMS jest ładowana przez Webflow, moduł zostawia widoczny tylko pasujący element. Widoczność jest sterowana wyłącznie atrybutem `hidden`.

| Atrybut | Rola |
| --- | --- |
| `data-form-zestaw="heading-default"` | nagłówek bez zestawu |
| `data-form-zestaw="heading-zestaw"` | nagłówek z zestawem |
| `data-form-zestaw="name"` | nazwa zestawu z URL (może być kilka) |
| `data-form-zestaw="wrapper"` | całość sekcji zestawu |
| `data-form-zestaw="cms-wrapper"` | lista CMS, chowana po usunięciu |
| `data-form-zestaw="delete-alert"` | komunikat o usunięciu; `em` = nazwa, `a` = przywróć |
| `data-form-zestaw="changes-alert"` | komunikat o zmianie składu |
| `data-zapytanie-product="ID"` | element CMS, dopasowywany do `product_id` |
| `data-action="form-zestaw-delete"` | usunięcie zestawu |
| `input[name="personalizacja"]` | checkbox „Chcę zmienić skład” wewnątrz elementu CMS |

Po stronie produktu link do formularza buduje `initZestawLinks()` — ta sama para parametrów, którą czyta `initPrezentyZestaw()`, więc kontrakt URL jest w jednym pliku:

```js
import { initZestawLinks } from "./prezenty-zestaw.js";

initZestawLinks(); // domyślnie document; można podać kontener Barby
```

| Atrybut | Rola |
| --- | --- |
| `data-zapytanie-card="card"` | karta zestawu; nosi `data-zapytanie-product` i `data-zapytanie-product-id` |
| `data-zapytanie-card="button"` | wrapper linku do formularza — każdy `a` w środku dostaje parametry |

Funkcja jest idempotentna i obsługuje wiele kart naraz, więc nadaje się i na stronę zestawu, i na listing.

Pola w wysyłce: `prezenty_zestaw_id`, `prezenty_zestaw_nazwa`, `prezenty_zestaw_personalizacja` (`true` albo pusto). Po usunięciu zestawu wszystkie trzy są puste.

`initPrezentyZestaw()` jest idempotentne — samo woła `destroyPrezentyZestaw()` i odpina stare listenery, więc przy nawigacji Barbą wystarczy wywołać je ponownie w hooku wejścia. `destroyPrezentyZestaw()` przydaje się osobno tylko przy wyjściu ze strony bez wejścia na kolejny formularz.

## `iframe`

```html
<iframe
  id="bwp-form"
  title="Formularz kontaktowy"
  src="https://betterworkplace.pl/kontakt/zapytanie-embeded"
  style="width:100%;border:none;display:block;min-height:320px;"
  scrolling="no"
></iframe>

<script>
  const iframe = document.getElementById("bwp-form");
  const formOrigin = new URL(iframe.src).origin;

  window.addEventListener("message", function (event) {
    if (event.source !== iframe.contentWindow || event.origin !== formOrigin) return;

    if (event.data?.type === "bwp:request-info") {
      event.source.postMessage(
        {
          type: "bwp:info",
          url: window.location.href,
          referrer: document.referrer,
        },
        formOrigin,
      );
    }

    if (event.data?.type === "bwp:resize") {
      iframe.style.height = event.data.height + "px";
    }
  });
</script>
```

| Wiadomość | Kierunek | Dane |
| --- | --- | --- |
| `bwp:request-info` | iframe → rodzic | — |
| `bwp:info` | rodzic → iframe | `{ url, brand?, referrer? }` |
| `bwp:resize` | iframe → rodzic | `{ height }` |
