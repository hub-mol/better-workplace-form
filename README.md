# BetterWorkplace — embed form

Multi-step form built with Preact. Designed to run inside an `<iframe>` and communicate with the parent page via `postMessage`.

## Files

```
form.js           — full form logic (Preact, validation, tax number lookup, Webflow submit)
examples/
  embed.html      — standalone HTML for local dev
```

## Adding to Webflow

The SVG sprite and styles are already on the Webflow page — you only need to add the script tag and a `div#app`:

```html
<div id="app" data-form-steps="true"></div>
<script type="module" src="https://cdn.jsdelivr.net/gh/hub-mol/better-workplace-form@1.0/form.js"></script>
```

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
