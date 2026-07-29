# BetterWorkplace — embed form

Multi-step form built with Preact. Designed to run inside an `<iframe>` and communicate with the parent page via `postMessage`.

## Files

```
form-core.js      — shared Preact components, validation, NIP lookup and Webflow submit
form.js           — standard contact-form setup
conference-form.js — conference registration setup
examples/
  embed.html            — standard stepped form for local dev
  embed-conference.html — conference form without steps
```

## Adding to Webflow

The SVG sprite and styles are already on the Webflow page — you only need to add the script tag and a `div#app`:

```html
<div id="app" data-form-steps="true"></div>
<script type="module" src="https://cdn.jsdelivr.net/gh/hub-mol/better-workplace-form@1.0/form.js"></script>
```

A custom setup can switch between a stepped and a single-page form with `tabs: true` or `tabs: false`. When `tabs` is omitted, `data-form-steps="true"` enables the stepped layout.

### Form variants (attributes on `#app`)

There is a single mount (`<div id="app">`); the variant is configured with data attributes:

| Attribute                     | Effect                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `data-form-steps="true"`      | 3-step form with a progress stepper. Without it, all fields render on one page.          |
| `data-form-label-above`       | Label sits above the input (no border notch / `--cutout-width`). Style it via page CSS.  |
| `data-form-company-name="…"`  | Company name in the consent texts. Default: "Betterworkplace Sp. z o.o.".                |
| `data-form-marketing`         | Shows the newsletter opt-in checkbox. Hidden by default.                                 |
| `data-form-brand="…"`         | Lead-attribution brand. Default: from `bwp:info` or the hostname.                        |
| `data-form-debug`             | Enables `[bwp]` console logging.                                                         |

Query params on the form's own URL (`?company=…`, `?marketing=1`) still work as per-embed overrides and win over the attributes.

### Conference registration setup

The conference variant is configured separately in `conference-form.js` and uses the shared `form-core.js`.

```html
<div id="app"></div>
<script type="module" src="./conference-form.js"></script>
```

It renders one page with:

- **Dane kontaktowe** — first name, last name and business email;
- **Dane firmy** — the existing NIP/GUS company flow;
- **Wybierz konferencję** — required **Termin i lokalizacja** dropdown;
- marketing opt-in;
- **Wyślij zgłoszenie** submit button (**Wyślij** on mobile).

All sections, rows, fields, labels, placeholders and select options live in `CONFERENCE_FORM_SETUP`. Validation rules and error messages stay in `form-core.js`.
The post-submit copy is configured with `success.heading`, `success.subheading` and `success.description`.

#### Webflow Code Embed

For Webflow, the setup can live directly in a Code Embed while the shared core is loaded from a fixed commit:

```html
<div id="app"></div>

<script type="module">
  import { initForm } from "https://rawcdn.githack.com/hub-mol/better-workplace-form/COMMIT_SHA/form-core.js";

  const CONFERENCE_FORM_SETUP = {
    tabs: false,
    marketing: true,
    formName: "zapytanie",
    formType: "rejestracja-bmhr",
    buttons: {
      submit: "Wyślij zgłoszenie",
      shortsubmit: "Wyślij",
    },
    success: {
      heading: "Dziękujemy!",
      subheading: "Twoje zapytanie zostało wysłane.",
      description:
        "Nasz konsultant skontaktuje się z Tobą w ciągu 24h (dni robocze), aby omówić szczegóły dostępnej oferty.",
    },
    sections: [
      {
        id: "contact",
        heading: "Dane kontaktowe",
        rows: [
          {
            layout: "grid-2",
            fields: [
              {
                name: "first_name",
                type: "text",
                label: "Imię",
                placeholder: "np. Jan",
                autocomplete: "given-name",
                required: true,
              },
              {
                name: "last_name",
                type: "text",
                label: "Nazwisko",
                placeholder: "np. Kowalski",
                autocomplete: "family-name",
                required: true,
              },
            ],
          },
          {
            fields: [
              {
                name: "email",
                type: "email",
                label: "Email służbowy",
                placeholder: "np. jan.kowalski@firma.pl",
                autocomplete: "email",
                required: true,
              },
            ],
          },
        ],
      },
      {
        id: "company",
        heading: "Dane firmy",
        lookup: {
          field: "tax_number",
          reveal: ["company_name", "city", "company_workers", "department"],
        },
        rows: [
          {
            layout: "grid-2",
            fields: [
              {
                name: "tax_number",
                type: "text",
                label: "NIP",
                placeholder: "np. 6793077034",
                minLength: 10,
                maxLength: 13,
                required: true,
              },
            ],
          },
          {
            layout: "grid-2-1",
            fields: [
              {
                name: "company_name",
                type: "text",
                label: "Nazwa firmy",
                placeholder: "np. Polnex",
                autocomplete: "organization",
                required: true,
              },
              {
                name: "city",
                type: "text",
                label: "Miejscowość",
                placeholder: "np. Warszawa",
                required: true,
              },
            ],
          },
          {
            layout: "grid-1-2",
            fields: [
              {
                name: "company_workers",
                type: "select",
                label: "Liczba pracowników",
                placeholder: "Wybierz",
                required: true,
                options: [
                  { value: "10-100", label: "10-100" },
                  { value: "100-200", label: "100-200" },
                  { value: "200-500", label: "200-500" },
                  { value: "500-1000", label: "500-1000" },
                  { value: "1000-2000", label: "1000-2000" },
                  { value: "2000+", label: "2000+" },
                ],
              },
              {
                name: "department",
                type: "select",
                label: "Reprezentowany dział (opcjonalnie)",
                placeholder: "Wybierz dział",
                required: false,
                options: [
                  { value: "HR", label: "HR" },
                  { value: "Office", label: "Office" },
                  { value: "Zaopatrzenie", label: "Zaopatrzenie" },
                  { value: "Facility", label: "Facility" },
                  { value: "Inny", label: "Inny" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "conference",
        heading: "Wybierz konferencję",
        consent: true,
        rows: [
          {
            fields: [
              {
                name: "conference",
                type: "select",
                label: "Termin i lokalizacja",
                placeholder: "Wybierz termin",
                required: true,
                options: [
                  { value: "2026-10-05-wroclaw", label: "05.10 Wrocław" },
                  { value: "2026-10-06-katowice", label: "06.10 Katowice" },
                  { value: "2026-10-12-poznan", label: "12.10 Poznań" },
                  { value: "2026-10-13-warszawa", label: "13.10 Warszawa" },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  initForm(CONFERENCE_FORM_SETUP);
</script>
```

Replace `COMMIT_SHA` after committing and pushing the branch. There must be only one element with `id="app"` on the page.

Migration from the old mount ids:

| Old                          | New                                    |
| ---------------------------- | -------------------------------------- |
| `<div id="app">`             | `<div id="app" data-form-steps="true">` |
| `<div id="app-no-tabs">`     | `<div id="app">`                        |
| `<div id="app-dailyfruits">` | `<div id="app" data-form-label-above>` (theme CSS now scoped to `#app`) |

## Embedding on other pages

On any page where you want the form, paste:

```html
<iframe 
  id="bwp-form"
  src="https://betterworkplace.pl/kontakt/zapytanie-embeded"
  style="width:100%;border:none;display:block;"
  scrolling="no">
</iframe>

<script>
  const BRAND = 'BetterWorkplace'

  window.addEventListener('message', function(e) {
    if (e.data?.type === 'bwp:request-info') {
      e.source.postMessage({
        type: 'bwp:info',
        url: window.location.href,
        referrer: document.referrer,
        brand: BRAND
      }, '*');
    }
    if (e.data?.type === 'bwp:resize') {
      document.getElementById('bwp-form').style.height = e.data.height + 'px';
    }
  });
</script>
```

### Branding overrides

Add `company` and/or `marketing` as query params on the iframe's `src` — no script changes needed:

```html
<iframe
  id="bwp-form"
  src="https://betterworkplace.pl/kontakt/zapytanie-embeded?company=Dailyfruits+Sp.+z+o.o.&marketing=1"
  style="width:100%;border:none;display:block;"
  scrolling="no">
</iframe>
```

- **`company`** — replaces "Betterworkplace Sp. z o.o." in the step-3 consent text.
- **`marketing`** (any value, e.g. `marketing=1`) — shows the newsletter opt-in checkbox. Hidden by default.

## postMessage protocol

| Message | Direction | Payload |
|---------|-----------|---------|
| `bwp:request-info` | iframe → parent | — |
| `bwp:info` | parent → iframe | `{ url, brand?, referrer? }` |
| `bwp:resize` | iframe → parent | `{ height }` |

The iframe sends `bwp:request-info` on mount. The parent responds with `bwp:info` containing the current page URL. `brand` is optional — if omitted, it's extracted automatically from the hostname.
