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
<div id="app"></div>
<script type="module" src="https://cdn.jsdelivr.net/gh/hub-mol/better-workplace-form@1.0/form.js"></script>
```

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

## postMessage protocol

| Message | Direction | Payload |
|---------|-----------|---------|
| `bwp:request-info` | iframe → parent | — |
| `bwp:info` | parent → iframe | `{ url, brand?, referrer? }` |
| `bwp:resize` | iframe → parent | `{ height }` |

The iframe sends `bwp:request-info` on mount. The parent responds with `bwp:info` containing the current page URL. `brand` is optional — if omitted, it's extracted automatically from the hostname.
