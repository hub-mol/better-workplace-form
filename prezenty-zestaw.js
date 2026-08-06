// Zestaw prezentowy wybrany na stronie produktu i przekazany w URL formularza:
//   /kontakt/zapytanie?product=Śnieżna+Rozkosz&product_id=342340943
//
// Nagłówki, karta CMS i alerty renderuje Webflow poza #app, więc moduł steruje nimi
// bezpośrednio. Do formularza trafiają tylko trzy wartości — przez getZestawFields()
// podpięte w setupie jako extraFields.

const state = { id: "", name: "", removed: false, changes: false };

let nodes = null;
let listeners = null;

// ─── DOM ─────────────────────────────────────────────────────────────
const pick = (value) => document.querySelector(`[data-form-zestaw="${value}"]`);

const show = (node) => node?.removeAttribute("hidden");
const hide = (node) => node?.setAttribute("hidden", "");
const toggle = (node, visible) => (visible ? show(node) : hide(node));

// ─── Widok ───────────────────────────────────────────────────────────
function apply() {
  const hasZestaw = Boolean(state.id);
  const visible = hasZestaw && !state.removed;
  toggle(nodes.headingDefault, !visible);
  toggle(nodes.headingZestaw, visible);
  toggle(nodes.wrapper, hasZestaw);
  toggle(nodes.cmsWrapper, visible);
  toggle(nodes.deleteAlert, hasZestaw && state.removed);
  toggle(nodes.changesAlert, visible && state.changes);
}

// ─── Init ────────────────────────────────────────────────────────────
export function initPrezentyZestaw() {
  destroyPrezentyZestaw();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("product_id")?.trim() || "";
  const card = id ? document.querySelector(`[data-zapytanie-product="${CSS.escape(id)}"]`) : null;

  nodes = {
    headingDefault: pick("heading-default"),
    headingZestaw: pick("heading-zestaw"),
    wrapper: pick("wrapper"),
    cmsWrapper: pick("cms-wrapper"),
    deleteAlert: pick("delete-alert"),
    changesAlert: pick("changes-alert"),
  };

  state.id = card ? id : "";
  state.name = card ? params.get("product")?.trim() || "" : "";
  state.removed = false;
  state.changes = false;

  if (!card) {
    apply();
    return;
  }

  // cała lista CMS siedzi w DOM — zostawiamy widoczny tylko wybrany zestaw
  document.querySelectorAll("[data-zapytanie-product]").forEach((item) => toggle(item, item === card));

  document.querySelectorAll('[data-form-zestaw="name"]').forEach((node) => (node.textContent = state.name));
  const deleteAlertName = nodes.deleteAlert?.querySelector("em");
  if (deleteAlertName) deleteAlertName.textContent = state.name;

  listeners = new AbortController();
  const { signal } = listeners;

  card.querySelector('[data-action="form-zestaw-delete"]')?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      state.removed = true;
      apply();
    },
    { signal },
  );

  nodes.deleteAlert?.querySelector("a")?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      state.removed = false;
      apply();
    },
    { signal },
  );

  // checkbox bywa odtworzony przez przeglądarkę po powrocie na stronę — czytamy jego stan.
  // Zaznaczenie rysuje Webflow klasą w--redirected-checked na ikonie, nie na samym inpucie
  const personalizacja = card.querySelector('input[name="personalizacja"]');
  const personalizacjaIcon = personalizacja?.closest("label")?.querySelector(".w-checkbox-input");
  const setChanges = (checked) => {
    state.changes = checked;
    personalizacjaIcon?.classList.toggle("w--redirected-checked", checked);
  };
  setChanges(personalizacja?.checked === true);
  personalizacja?.addEventListener(
    "change",
    (event) => {
      setChanges(event.target.checked);
      apply();
    },
    { signal },
  );

  apply();
}

// Barba podmienia kontener bez przeładowania — bez tego moduł trzyma odpięte węzły
export function destroyPrezentyZestaw() {
  listeners?.abort();
  listeners = null;
  nodes = null;
  Object.assign(state, { id: "", name: "", removed: false, changes: false });
}

// ─── Linki na stronie zestawu ────────────────────────────────────────
// Druga strona tego samego kontraktu: strona produktu dokleja zestaw do linku,
// initPrezentyZestaw() odczytuje go na formularzu. Idempotentne (set nadpisuje),
// więc przy nawigacji Barbą wystarczy wywołać ponownie.
export function initZestawLinks(root = document) {
  root.querySelectorAll('[data-zapytanie-card="card"]').forEach((card) => {
    const id = card.dataset.zapytanieProductId?.trim();
    const name = card.dataset.zapytanieProduct?.trim();
    if (!id) return;
    card.querySelectorAll('[data-zapytanie-card="button"] a').forEach((link) => {
      const url = new URL(link.href, window.location.href);
      if (name) url.searchParams.set("product", name);
      url.searchParams.set("product_id", id);
      link.href = url.toString();
    });
  });
}

// Czytane dopiero przy wysyłce, więc widzą aktualny stan po usunięciu/przywróceniu
export function getZestawFields() {
  const visible = Boolean(state.id) && !state.removed;
  return {
    prezenty_zestaw_id: visible ? state.id : "",
    prezenty_zestaw_nazwa: visible ? state.name : "",
    prezenty_zestaw_personalizacja: visible && state.changes ? "true" : "",
  };
}
