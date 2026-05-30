# BetterWorkplace — embed form

Multi-step inquiry form built with Preact (no build step). Designed to run inside an `<iframe>` and communicate with the parent page via `postMessage`.

## Files

```
form.js           — full form logic (Preact, validation, NIP lookup, Webflow submit)
examples/
  embed.html      — standalone HTML for local dev
```

## Adding to Webflow

The SVG sprite and styles are already on the Webflow page — you only need to add the script tag and a `div#app`:

```html
<div id="app"></div>
<script type="module" src="https://cdn.jsdelivr.net/gh/USER/REPO@VERSION/form.js"></script>
```

Replace `USER`, `REPO`, and `VERSION` with your GitHub username, repository name, and tag (e.g. `v1.0`).

## Embedding on other pages

On any page where you want the form, paste:

```html
<iframe
  id="bwp-form"
  src="https://twojadomena.pl/zapytanie"
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
| `bwp:info` | parent → iframe | `{ url, brand? }` |
| `bwp:resize` | iframe → parent | `{ height }` |

The iframe sends `bwp:request-info` on mount. The parent responds with `bwp:info` containing the current page URL. `brand` is optional — if omitted, it's extracted automatically from the hostname.

## Releases

Tag a release when the form is ready to ship:

```bash
git tag v1.0
git push --tags
```

Update the `VERSION` in the Webflow script tag to load the new version. Pages that aren't updated keep loading the previous tag unchanged.
