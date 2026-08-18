import { html, render, useState, useEffect, useCallback, useRef } from "https://unpkg.com/htm@3.1.1/preact/standalone.module.js";

let DEBUG = false;
const log = (...args) => DEBUG && console.log("[bwp]", ...args);

function getParentOrigin() {
  if (!document.referrer) return "*";
  try {
    return new URL(document.referrer).origin;
  } catch {
    return "*";
  }
}

function postToParent(message) {
  window.parent.postMessage(message, getParentOrigin());
}

export function emitFormSuccess({ formID, url, brand }) {
  const eventData = { event: "form_success", formID, url, brand };

  if (window === window.parent) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(eventData);
    return;
  }

  postToParent({ type: "bwp:form-success", payload: eventData });
}

const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "wp.pl",
  "onet.pl",
  "interia.pl",
  "o2.pl",
  "icloud.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "protonmail.com",
];

const DEFAULT_COMPANY = "Betterworkplace Sp. z o.o.";
const DEFAULT_ERROR_EMAIL = "biuro@betterworkplace.pl";

const COPY = {
  errors: {
    required: "To pole jest wymagane",
    first_name_required: "Imię jest wymagane",
    first_name_short: "Imię musi mieć co najmniej 2 znaki",
    last_name_required: "Nazwisko jest wymagane",
    last_name_short: "Nazwisko musi mieć co najmniej 2 znaki",
    email_required: "Email jest wymagany",
    email_invalid: "Podaj prawidłowy adres email",
    email_personal: "Podaj służbowy adres email",
    phone_required: "Telefon jest wymagany",
    phone_too_long: "Numer telefonu jest za długi",
    phone_invalid: "Numer telefonu jest niepoprawny",
    tax_number_required: "NIP jest wymagany",
    tax_number_length: "NIP musi składać się z 10 cyfr",
    tax_number_invalid: "Podany NIP jest nieprawidłowy",
    tax_number_not_found: "Podany NIP nie istnieje",
    tax_number_fetch_error: "Błąd podczas pobierania danych NIP",
    tax_number_lookup_required: "Kliknij „Pobierz dane”, aby uzupełnić dane firmy",
    company_name_required: "Nazwa firmy jest wymagana",
    city_required: "Miejscowość firmy jest wymagana",
    company_workers_required: "Wybierz liczbę pracowników",
    conference_required: "Wybierz termin konferencji",
  },
  callout: {
    nip_info: "Podaj NIP, resztę uzupełnimy z GUS. Sprawdź czy dane są poprawne.",
  },
  buttons: {
    nip_fetch: "Pobierz dane",
    nip_loading: "Pobieram…",
    back: "Wstecz",
    next: "Dalej",
    submit: "Chcę otrzymać ofertę!",
    shortsubmit: "Zapytaj o ofertę",
  },
  legal: {
    newsletter: (company) => `Chcę otrzymywać od ${company || DEFAULT_COMPANY} newslettera o tematyce benefitów pozapłacowych`,
    privacy: (company) =>
      `Wysyłając ten formularz, wyrażasz zgodę na przetwarzanie Twoich danych przez ${company || DEFAULT_COMPANY} i kontakt z Tobą w celu realizacji Twojego zapytania. Aby dowiedzieć się więcej o tym, jak dbamy o ochronę i poszanowanie Twojej prywatności, zapoznaj się z naszą `,
    privacy_link_label: "Polityką prywatności",
    privacy_link_url: "https://www.betterworkplace.pl/privacy-policy",
  },
};

const FIELD_META = {
  first_name: { placeholder: "np. Jan", autocomplete: "given-name" },
  last_name: { placeholder: "np. Kowalski", autocomplete: "family-name" },
  email: { placeholder: "np. jan.kowalski@firma.pl", autocomplete: "email" },
  phone: { placeholder: "111 222 333", autocomplete: "tel" },
  tax_number: { placeholder: "np. 6793077034" },
  company_name: { placeholder: "np. Polnex", autocomplete: "organization" },
  city: { placeholder: "np. Warszawa" },
  company_workers: { placeholder: "Wybierz" },
  department: { placeholder: "Wybierz dział" },
  conference: { placeholder: "Wybierz termin" },
  f_message: { placeholder: "Np. interesują nas owoce i kawa dla 50 osób w biurze w Warszawie." },
};

const WEBFLOW_SITE_ID = "698dfabcdd705500e5451b80";

// fixed: true = group subscriber digits in 3s; false = just separate CC from number
const PHONE_CODES = {
  "+1": { ccLen: 1, fixed: false }, // USA / Kanada
  "+31": { ccLen: 2, fixed: true }, // Holandia
  "+32": { ccLen: 2, fixed: false }, // Belgia
  "+33": { ccLen: 2, fixed: true }, // Francja
  "+34": { ccLen: 2, fixed: true }, // Hiszpania
  "+36": { ccLen: 2, fixed: false }, // Węgry
  "+39": { ccLen: 2, fixed: false }, // Włochy (variable length)
  "+40": { ccLen: 2, fixed: true }, // Rumunia
  "+43": { ccLen: 2, fixed: false }, // Austria
  "+44": { ccLen: 2, fixed: false }, // UK
  "+45": { ccLen: 2, fixed: true }, // Dania
  "+46": { ccLen: 2, fixed: false }, // Szwecja
  "+47": { ccLen: 2, fixed: true }, // Norwegia
  "+48": { ccLen: 2, fixed: true }, // Polska
  "+49": { ccLen: 2, fixed: false }, // Niemcy
  "+370": { ccLen: 3, fixed: true }, // Litwa
  "+371": { ccLen: 3, fixed: true }, // Łotwa
  "+372": { ccLen: 3, fixed: false }, // Estonia
  "+380": { ccLen: 3, fixed: true }, // Ukraina
  "+385": { ccLen: 3, fixed: false }, // Chorwacja
  "+386": { ccLen: 3, fixed: false }, // Słowenia
  "+420": { ccLen: 3, fixed: true }, // Czechy
  "+421": { ccLen: 3, fixed: true }, // Słowacja
};

function validateSetup(setup) {
  const fail = (message) => {
    throw new Error(`[bwp setup] ${message}`);
  };
  if (!Array.isArray(setup.sections) || !setup.sections.length) fail("sections must be a non-empty array");
  const names = new Set();
  for (const section of setup.sections) {
    if (!section?.id || !Array.isArray(section.rows)) fail("every section needs id and rows");
    for (const row of section.rows) {
      if (!Array.isArray(row.fields)) fail(`section "${section.id}" has a row without fields`);
      for (const field of row.fields) {
        if (!field?.name || !field.type || !field.label) fail(`section "${section.id}" has an incomplete field`);
        if (names.has(field.name)) fail(`duplicate field "${field.name}"`);
        if (field.type === "select" && !Array.isArray(field.options)) fail(`select "${field.name}" needs options`);
        names.add(field.name);
      }
    }
  }
  for (const section of setup.sections.filter((item) => item.lookup)) {
    if (!names.has(section.lookup.field)) fail(`lookup field "${section.lookup.field}" does not exist`);
    for (const name of section.lookup.reveal || []) {
      if (!names.has(name)) fail(`lookup reveal field "${name}" does not exist`);
    }
  }
}

function detectCountryCode(stripped) {
  for (const len of [4, 3, 2]) {
    const prefix = stripped.slice(0, len);
    if (PHONE_CODES[prefix]) return { prefix, ...PHONE_CODES[prefix] };
  }
  return null;
}

function formatPhone(value) {
  const hasPlus = value.trimStart().startsWith("+");
  const allDigits = value.replace(/\D/g, "");

  if (!hasPlus) {
    const d = allDigits.slice(0, 9);
    return (d.match(/.{1,3}/g) || []).join(" ");
  }

  const stripped = "+" + allDigits;
  const cc = detectCountryCode(stripped);
  if (!cc) return stripped;

  const { prefix, ccLen, fixed } = cc;
  const sub = allDigits.slice(ccLen);
  if (!fixed) return `${prefix} ${sub}`;
  return `${prefix} ${(sub.match(/.{1,3}/g) || []).join(" ")}`;
}

function nipChecksum(nip) {
  const d = nip.replace(/\D/g, "");
  if (d.length !== 10) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * +d[i], 0);
  return sum % 11 === +d[9];
}

function validateField(field, value) {
  const name = field.name;
  const v = String(value ?? "").trim();

  if (name === "first_name") {
    if (!v) return field.required ? COPY.errors.first_name_required : null;
    if (v.length < 2) return COPY.errors.first_name_short;
    return null;
  }
  if (name === "last_name") {
    if (!v) return field.required ? COPY.errors.last_name_required : null;
    if (v.length < 2) return COPY.errors.last_name_short;
    return null;
  }
  if (name === "email") {
    if (!v) return field.required ? COPY.errors.email_required : null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return COPY.errors.email_invalid;
    const domain = v.split("@")[1].toLowerCase();
    if (field.validation === "business" && PERSONAL_EMAIL_DOMAINS.includes(domain)) {
      return COPY.errors.email_personal;
    }
    return null;
  }
  if (name === "phone") {
    if (!v) return field.required ? COPY.errors.phone_required : null;
    const allDigits = v.replace(/\D/g, "");
    const hasPlus = v.startsWith("+");
    if (allDigits.length > 15) return COPY.errors.phone_too_long;
    if (!hasPlus) {
      if (!/^\d{9}$/.test(allDigits)) return COPY.errors.phone_invalid;
      return null;
    }
    const cc = detectCountryCode("+" + allDigits);
    if (cc?.prefix === "+48") {
      if (allDigits.slice(cc.ccLen).length !== 9) return COPY.errors.phone_invalid;
    }
    return null;
  }
  if (name === "tax_number") {
    if (!v) return field.required ? COPY.errors.tax_number_required : null;
    const digits = v.replace(/\D/g, "");
    if (digits.length !== 10) return COPY.errors.tax_number_length;
    if (!nipChecksum(v)) return COPY.errors.tax_number_invalid;
    return null;
  }
  if (name === "company_name") return !v && field.required ? COPY.errors.company_name_required : null;
  if (name === "city") return !v && field.required ? COPY.errors.city_required : null;
  if (name === "company_workers") return !v && field.required ? COPY.errors.company_workers_required : null;
  if (name === "conference") return !v && field.required ? COPY.errors.conference_required : null;
  if (field.required && !v) return COPY.errors.required;

  return null;
}

function validateFields(fields, data) {
  const errors = {};
  for (const field of fields.filter((item) => item.required)) {
    const error = validateField(field, data[field.name]);
    if (error) errors[field.name] = error;
  }
  return errors;
}

function validateGroup(fields, data, lookup, lookupFilled) {
  const visibleFields =
    lookup && !lookupFilled ? fields.filter((field) => !lookup.reveal.includes(field.name)) : fields;
  const errors = validateFields(visibleFields, data);
  if (lookup && !lookupFilled && !errors[lookup.field]) {
    errors[lookup.field] = COPY.errors.tax_number_lookup_required;
  }
  return { fields: visibleFields, errors };
}

async function lookupNip(nip) {
  const digits = nip.replace(/\D/g, "");
  const res = await fetch(`https://n.betterworkplace.pl/webhook/webflow-nip?nip=${digits}`);
  if (!res.ok) throw new Error(COPY.errors.tax_number_fetch_error);
  const data = await res.json();
  if (data.ErrorCode) throw new Error(COPY.errors.tax_number_not_found);
  return {
    company_name: data.Nazwa ?? "",
    city: data.Miejscowosc ?? "",
  };
}

function extractBrand(url) {
  try {
    const name = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : "BetterWorkplace";
  } catch {
    return "BetterWorkplace";
  }
}

function extractUtm(url) {
  try {
    const p = new URL(url).searchParams;
    return {
      utm_source: p.get("utm_source") || "",
      utm_medium: p.get("utm_medium") || "",
      utm_campaign: p.get("utm_campaign") || "",
      gclid: p.get("gclid") || "",
      fbclid: p.get("fbclid") || "",
    };
  } catch {
    return { utm_source: "", utm_medium: "", utm_campaign: "", gclid: "", fbclid: "" };
  }
}

function calcStepProgress(stepNum, currentStep, section, data, done) {
  if (done) return "100%";
  if (stepNum > currentStep) return "0";
  if (stepNum < currentStep) return "100%";
  const fields = section.rows.flatMap((row) => row.fields);
  const progressFields = fields.filter((field) => field.required);
  const valid = (field) => {
    const value = String(data[field.name] ?? "").trim();
    return value.length > 0 && validateField(field, value) === null;
  };
  if (!progressFields.length) return "0.675rem";
  const completed = progressFields.filter(valid).length;
  return completed ? `${(completed / progressFields.length) * 100}%` : "0.675rem";
}

function LoadingBar({ width }) {
  return html`
    <div class="form-loader">
      <div class="form-loader_fill" style=${{ width }}></div>
    </div>
  `;
}

function StepIndicator({ widths }) {
  return html` <div class="form-stepper">${widths.map((w, i) => html`<${LoadingBar} key=${i} width=${w} />`)}</div> `;
}

function Field({ id, label, required, error, noIcon, children }) {
  return html`
    <div class="form_field-wrapper">
      <label for=${id} class="form_field-label">
        ${label}${required && html`<span class="form_required" aria-hidden="true">*</span>`}
      </label>
      ${children}
      ${!noIcon &&
    html`
        <div class="form_validation-error-icon" style=${{ visibility: error ? "visible" : "hidden" }}>
          <svg
            data-wf--better-workplace--icon--variant="md"
            viewBox="0 0 24 24"
            class="better-workplace--icon-svg w-variant-e9c02736-dc0b-1e38-719f-d7ef475aed6f"
          >
            <use href="#error" viewBox="0 0 32 32"></use>
          </svg>
        </div>
      `}
      <span aria-live="polite" class="form_validation-error-text" style=${{ visibility: error ? "visible" : "hidden" }}>
        ${error || ""}
      </span>
    </div>
  `;
}

function FormControl({ field, value, error, onChange, onBlur }) {
  const meta = FIELD_META[field.name] || {};
  const className =
    "form_input" +
    (field.type === "select" ? " is-select w-select" : field.type === "textarea" ? " is-text-area w-input" : " w-input") +
    (error ? " is-validation-error" : "");
  const common = {
    id: field.name,
    name: field.name,
    value,
    placeholder: meta.placeholder || (field.type === "select" ? "Wybierz" : ""),
    class: className,
    onBlur: (event) => onBlur(field, event.target.value),
  };

  if (field.type === "select") {
    return html`
      <select
        ...${common}
        style=${{ color: value ? "var(--better-workplace---strong--strong-100-primary)" : "" }}
        onChange=${(event) => onChange(field, event.target.value)}
      >
        <option value="" disabled hidden>${common.placeholder}</option>
        ${field.options.map((option) => html`<option value=${option.value}>${option.label}</option>`)}
      </select>
    `;
  }

  if (field.type === "textarea") {
    return html`
      <textarea
        ...${common}
        rows=${field.rows || 7}
        maxlength=${field.maxLength || 5000}
        onInput=${(event) => onChange(field, event.target.value)}
      ></textarea>
    `;
  }

  return html`
    <input
      ...${common}
      type=${field.type || "text"}
      autocomplete=${meta.autocomplete || "off"}
      maxlength=${field.maxLength || 256}
      minlength=${field.minLength}
      onInput=${(event) => onChange(field, event.target.value)}
    />
  `;
}

function ConfiguredField({ field, data, errors, onChange, onBlur }) {
  return html`
    <${Field}
      id=${field.name}
      label=${field.label}
      required=${field.required}
      noIcon=${field.noIcon ?? field.type === "select"}
      error=${errors[field.name]}
    >
      <${FormControl}
        field=${field}
        value=${data[field.name]}
        error=${errors[field.name]}
        onChange=${onChange}
        onBlur=${onBlur}
      />
    </${Field}>
  `;
}

function NipLookupButton({ onClick, loading }) {
  return html`
    <div class="form_field-wrapper">
      <div class="form_nip">
        <button
          type="button"
          onClick=${onClick}
          class=${"better-workplace--button-component" + (loading ? " is-loading" : "")}
        >
          <div data-wf--better-workplace--button-inside--variant="primary" class="better-workplace--button">
            <div data-button="padding" class="better-workplace--button_layout">
              <div class="better-workplace--button_text">${loading ? COPY.buttons.nip_loading : COPY.buttons.nip_fetch}</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  `;
}

function NipCallout({ error, filled }) {
  if (error) {
    return html`
      <div
        data-wf--better-workplace--system-box--variant="error"
        class="better-workplace--info-callout w-variant-cebccc58-4999-fc0e-403f-40fd53f94f9e"
      >
        <div>
          <svg viewBox="0 0 24 24" class="better-workplace--icon-svg w-variant-e9c02736-dc0b-1e38-719f-d7ef475aed6f">
            <use href="#error" viewBox="0 0 32 32"></use>
          </svg>
        </div>
        <div class="better-workplace--info-callout-text"><p>${error}</p></div>
      </div>
    `;
  }
  if (filled) return null;
  return html`
    <div data-wf--better-workplace--system-box--variant="info" class="better-workplace--info-callout">
      <div>
        <svg viewBox="0 0 24 24" class="better-workplace--icon-svg w-variant-e9c02736-dc0b-1e38-719f-d7ef475aed6f">
          <use href="#info" viewBox="0 0 32 32"></use>
        </svg>
      </div>
      <div class="better-workplace--info-callout-text"><p>${COPY.callout.nip_info}</p></div>
    </div>
  `;
}

function Consent({ company, privacyUrl, marketing, checked, onChange }) {
  return html`
    ${marketing &&
    html`
      <label class="w-checkbox form_checkbox">
        <div class="w-checkbox-input w-checkbox-input--inputType-custom form_checkbox-icon"></div>
        <input
          type="checkbox"
          id="agreemrk"
          name="agreemrk"
          data-name="agreemrk"
          checked=${checked}
          onChange=${(event) => onChange(event.target.checked)}
          style="opacity:0;position:absolute;z-index:-1"
        />
        <span class="form_checkbox-label w-form-label" for="agreemrk"> ${COPY.legal.newsletter(company)} </span>
      </label>
    `}
    <p class="form_checkbox-label text-size-xs">
      ${COPY.legal.privacy(company)}
      <a href=${privacyUrl} class="text-style-link-sm">${COPY.legal.privacy_link_label}</a>.
    </p>
  `;
}

function FormSection({
  section,
  data,
  errors,
  onChange,
  onBlur,
  onNipLookup,
  nipLoading,
  nipError,
  nipFilled,
}) {
  const lookup = section.lookup;
  return html`
    <fieldset class="flex-col gap-xs form-step">
      ${section.heading &&
      html`<div><legend class="heading-style-h5 text-color-card-heading">${section.heading}</legend></div>`}
      ${section.rows.map((row) => {
        const visibleFields = row.fields.filter((field) => !lookup || nipFilled || !lookup.reveal.includes(field.name));
        const hasLookup = lookup && row.fields.some((field) => field.name === lookup.field);
        if (!visibleFields.length && !hasLookup) return null;
        const controls = html`
          ${visibleFields.map(
            (field) =>
              html`<${ConfiguredField}
                key=${field.name}
                field=${field}
                data=${data}
                errors=${errors}
                onChange=${onChange}
                onBlur=${onBlur}
              />`,
          )}
          ${hasLookup && html`<${NipLookupButton} onClick=${onNipLookup} loading=${nipLoading} />`}
        `;
        return html`
          ${row.layout ? html`<div class=${`${row.layout} gap-xs`}>${controls}</div>` : controls}
          ${hasLookup && html`<${NipCallout} error=${nipError} filled=${nipFilled} />`}
        `;
      })}
    </fieldset>
  `;
}

function scrollToForm() {
  if (window.innerWidth >= 720) return;
  const el = document.getElementById("app") ?? document.getElementById("form-component");
  if (!el) return;
  const offset = 100;
  const rect = el.getBoundingClientRect();
  if (window !== window.parent) {
    try {
      const top = window.parent.scrollY + (window.frameElement?.getBoundingClientRect().top ?? 0) - offset;
      window.parent.scrollTo({ left: 0, top, behavior: "smooth" });
    } catch { }
  } else {
    window.scrollTo({ left: rect.left, top: rect.top + window.scrollY - offset, behavior: "smooth" });
  }
}

function App({ setup = {} }) {
  const tabs = setup.tabs === true;
  const labelAbove = setup.labelAbove === true;
  const setupBrand = setup.brand || "";
  const setupCompany = setup.legal?.companyName || DEFAULT_COMPANY;
  const sections = setup.sections || [];
  const formFields = sections.flatMap((section) => section.rows.flatMap((row) => row.fields));
  const requiredFields = formFields.filter((field) => field.required);
  const fieldByName = Object.fromEntries(formFields.map((field) => [field.name, field]));
  const lookupSection = sections.find((section) => section.lookup);
  const lookup = lookupSection?.lookup || null;
  const formName = setup.formName || "zapytanie";
  const formType = setup.formType || formName;
  const buttons = { ...COPY.buttons, ...setup.buttons };
  const privacyUrl = setup.legal?.privacyUrl || COPY.legal.privacy_link_url;
  const errorEmail = setup.error?.email || DEFAULT_ERROR_EMAIL;
  // dodatkowe pola spoza sekcji; funkcja pozwala oddać stan modułu z chwili wysyłki
  const extraFields = () => (typeof setup.extraFields === "function" ? setup.extraFields() : setup.extraFields || {});
  const errorMailto = `mailto:${errorEmail}?subject=${encodeURIComponent("Błąd formularza")}`;
  const success = {
    heading: "Dziękujemy!",
    subheading: "Twoje zapytanie zostało wysłane.",
    description:
      "Nasz konsultant skontaktuje się z Tobą w ciągu 24h (dni robocze), aby omówić szczegóły dostępnej oferty.",
    ...setup.success,
  };
  const [step, setStep] = useState(1);
  const [data, setData] = useState(() => ({
    ...Object.fromEntries(formFields.map((field) => [field.name, field.defaultValue ?? ""])),
    url: "",
    brand: setupBrand,
    referrer: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    gclid: "",
    fbclid: "",
  }));
  const [errors, setErrors] = useState({});
  const [nipLoading, setNipLoading] = useState(false);
  const [nipError, setNipError] = useState("");
  const [nipFilled, setNipFilled] = useState(false);
  const [agreemrkChecked, setAgreemrkChecked] = useState(false);
  const [company, setCompany] = useState(setupCompany);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const submittingRef = useRef(false);
  const marketing = setup.marketing === true;

  useEffect(() => {
    if (window === window.parent) {
      const href = window.location.href;
      const utm = extractUtm(href);
      const brand = setupBrand || extractBrand(href);
      log("standalone mode", { url: href, brand, ...utm });
      setData((prev) => ({ ...prev, url: href, brand, referrer: document.referrer, ...utm }));
      return;
    }
    const parentOrigin = getParentOrigin();
    const handler = (e) => {
      if (e.source !== window.parent) return;
      if (parentOrigin !== "*" && e.origin !== parentOrigin) return;
      if (e.data?.type !== "bwp:info") return;
      log("postMessage received", e.data);
      const utm = e.data.url ? extractUtm(e.data.url) : {};
      if (typeof e.data.companyName === "string" && e.data.companyName.trim()) {
        setCompany(e.data.companyName.trim());
      }
      setData((prev) => ({
        ...prev,
        ...(e.data.url ? { url: e.data.url } : {}),
        ...(setupBrand ? {} : e.data.brand ? { brand: e.data.brand } : e.data.url ? { brand: extractBrand(e.data.url) } : {}),
        ...(e.data.referrer ? { referrer: e.data.referrer } : {}),
        ...utm,
      }));
    };
    window.addEventListener("message", handler);
    postToParent({ type: "bwp:request-info" });
    return () => window.removeEventListener("message", handler);
  }, []);

  // Tell the parent iframe how tall we are so it can resize
  // documentElement always reports the viewport height, so we
  // measure the actual mount node instead.
  const formHeight = () => document.getElementById("app")?.scrollHeight ?? document.documentElement.scrollHeight;

  useEffect(() => {
    if (typeof ResizeObserver === "undefined" || window === window.parent) return;
    const target = document.getElementById("app") ?? document.documentElement;
    const obs = new ResizeObserver(() => {
      postToParent({ type: "bwp:resize", height: formHeight() });
    });
    obs.observe(target);
    return () => obs.disconnect();
  }, []);

  // NIP lookup reveals/hides company fields — resize once that settles
  useEffect(() => {
    if (window === window.parent) return;
    postToParent({ type: "bwp:resize", height: formHeight() });
  }, [nipFilled, nipError]);

  // Measure each field label and expose its width (in em) on the paired input as
  // --cutout-width, so the input's clip-path can notch its border to fit the label.
  // Labels above inputs do not need a border cutout.
  useEffect(() => {
    if (labelAbove) return;
    const root = document.getElementById("app");
    if (!root) return;
    const apply = () => {
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      root.querySelectorAll(".form_field-label").forEach((label) => {
        const input = label.closest(".form_field-wrapper")?.querySelector(".form_input");
        if (!input) return;
        let em = (label.getBoundingClientRect().width / rootPx) * 0.875;
        if (!label.querySelector(".form_required")) em += 1; // optional labels ("(opcjonalnie)", no asterisk) get extra room
        input.style.setProperty("--cutout-width", em.toFixed(3) + "em");
      });
    };
    apply();
    document.fonts?.ready.then(apply); // re-measure once the Webflow web font loads (shifts label width)
  }, [step, nipFilled, tabs]);

  const onChange = useCallback((field, value) => {
    let v = value;
    if (field.name === "phone") v = value.replace(/[^\d\s+]/g, "");
    if (field.name === "email") v = value.replace(/\s/g, "").toLowerCase();
    setData((prev) => ({ ...prev, [field.name]: v }));
    setErrors((prev) => ({ ...prev, [field.name]: null }));
  }, []);

  const onBlur = useCallback((field, value) => {
    let v = value;
    if (field.name === "tax_number") v = value.replace(/\D/g, "");
    if (field.name === "phone" && value.trim()) v = formatPhone(value);
    if (v !== value) setData((prev) => ({ ...prev, [field.name]: v }));
    const err = validateField(field, v);
    setErrors((prev) => ({ ...prev, [field.name]: err || null }));
  }, []);

  const goNext = useCallback(() => {
    const section = sections[step - 1];
    const fields = section.rows.flatMap((row) => row.fields);
    const { errors: errs } = validateGroup(fields, data, section.lookup, nipFilled);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setStep((s) => s + 1);
    scrollToForm();
  }, [step, data, nipFilled, sections]);

  const goBack = useCallback(() => {
    setStep((s) => s - 1);
    scrollToForm();
  }, []);

  const handleNipLookup = useCallback(async () => {
    if (!lookup) return;
    const lookupField = fieldByName[lookup.field];
    const err = validateField(lookupField, data[lookup.field]);
    if (err) {
      setErrors((current) => ({ ...current, [lookup.field]: err }));
      return;
    }
    setNipLoading(true);
    setNipError("");
    try {
      const result = await lookupNip(data[lookup.field]);
      setData((current) => ({ ...current, ...result }));
      setErrors((prev) => ({ ...prev, company_name: null, city: null }));
      setNipFilled(true);
    } catch (e) {
      setNipError(e.message);
      setErrors((prev) => ({ ...prev, tax_number: e.message }));
    } finally {
      setNipLoading(false);
    }
  }, [data, fieldByName, lookup]);

  const showSubmitErrors = useCallback(() => {
    const { fields, errors: submitErrors } = validateGroup(requiredFields, data, lookup, nipFilled);
    setErrors((current) => {
      const next = { ...current };
      for (const field of requiredFields) next[field.name] = null;
      return { ...next, ...submitErrors };
    });

    const firstInvalid = fields.find((field) => submitErrors[field.name]);
    if (firstInvalid) {
      requestAnimationFrame(() => {
        const field = document.getElementById(firstInvalid.name);
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
        field?.focus({ preventScroll: true });
      });
    }
    return Object.keys(submitErrors).length === 0;
  }, [data, nipFilled, lookup, requiredFields]);

  const handleInactiveSubmitKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      showSubmitErrors();
    },
    [showSubmitErrors],
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation(); // this form uses Webflow's own .w-form/data-name markup for its CSS,
      // which means Webflow's native runtime also auto-binds a submit handler to it —
      // without this, that handler independently double-posts the same submission
      if (data.website) return; // honeypot
      if (submittingRef.current) return; // drugi klik, gdy POST jeszcze w locie
      if (!showSubmitErrors()) return;
      submittingRef.current = true;
      setFailed(false);
      log("submit", data);

      try {
        const res = await fetch(`https://webflow.com/api/v1/form/${WEBFLOW_SITE_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            name: formName,
            source: data.url || window.location.href,
            test: false,
            fields: {
              ...Object.fromEntries(formFields.map((field) => [field.name, data[field.name]])),
              ...extraFields(),
              agreemrk: agreemrkChecked ? "on" : false,
              referrer: data.referrer,
              utm_source: data.utm_source,
              utm_medium: data.utm_medium,
              utm_campaign: data.utm_campaign,
              gclid: data.gclid,
              fbclid: data.fbclid,
              form_type: formType,
              brand: data.brand,
              url: data.url,
            },
            dolphin: false,
          }),
        });

        if (res.ok) {
          setDone(true);
          if (!tabs) window.scrollTo({ top: 0, behavior: "smooth" });
          emitFormSuccess({ formID: formName, url: data.url, brand: data.brand });
          log("submit success");
        } else {
          setFailed(true);
          log("submit error", res.status);
        }
      } catch (err) {
        setFailed(true);
        log("submit exception", err.message);
      } finally {
        submittingRef.current = false;
      }
    },
    [data, agreemrkChecked, showSubmitErrors, formName, formType, formFields],
  );

  const currentSection = sections[step - 1];
  const requiredForNav = !tabs
    ? requiredFields
    : currentSection.rows.flatMap((row) => row.fields).filter((field) => field.required);
  const currentLookup = !tabs ? lookup : currentSection.lookup;
  const canProceed =
    (!currentLookup || nipFilled) &&
    requiredForNav.every((field) => {
      const value = String(data[field.name] ?? "").trim();
      return value.length > 0 && validateField(field, value) === null;
    });
  const canSubmit = (!lookup || nipFilled) && requiredFields.every((field) => {
    const value = String(data[field.name] ?? "").trim();
    return value.length > 0 && validateField(field, value) === null;
  });
  const stepWidths = tabs
    ? sections.map((section, index) => calcStepProgress(index + 1, step, section, data, done))
    : [];

  const backBtn =
    tabs &&
    step > 1 &&
    html`
      <button
        type="button"
        onClick=${goBack}
        class="better-workplace--button-component w-variant-8f17e49d-0f24-b779-ff5c-6a22df9ce1a0 w-inline-block"
      >
        <div class="better-workplace--button w-variant-e5b64a72-f673-3169-40ad-1f06b1232785">
          <div class="better-workplace--button_layout">
            <div class="better-workplace--button_relative">
              <svg
                data-wf--better-workplace--icon--variant="md"
                viewBox="0 0 24 24"
                class="better-workplace--icon-svg w-variant-e9c02736-dc0b-1e38-719f-d7ef475aed6f"
              >
                <use href="#arrow-left" viewBox="0 0 32 32"></use>
              </svg>
            </div>
            <div data-button="text" class="better-workplace--button_text">${COPY.buttons.back}</div>
          </div>
        </div>
      </button>
    `;

  const nextBtn =
    tabs &&
    step < sections.length &&
    html`
      <button
        type="button"
        onClick=${goNext}
        class=${"better-workplace--button-component w-variant-8f17e49d-0f24-b779-ff5c-6a22df9ce1a0 w-inline-block" +
        (!canProceed ? " is-inactive" : "")}
      >
        <div data-wf--better-workplace--button-inside--variant="primary" class="better-workplace--button">
          <div data-button="padding" class="better-workplace--button_layout">
            <div class="better-workplace--button_text">${COPY.buttons.next}</div>
            <div class="better-workplace--button_relative">
              <svg
                data-wf--better-workplace--icon--variant="md"
                viewBox="0 0 24 24"
                class="better-workplace--icon-svg w-variant-e9c02736-dc0b-1e38-719f-d7ef475aed6f"
              >
                <use href="#arrow-right" viewBox="0 0 32 32"></use>
              </svg>
              <div data-button="circle" class="better-workplace--button_icon-bg"></div>
            </div>
          </div>
        </div>
      </button>
    `;

  const submitBtn =
    (!tabs || step === sections.length) &&
    html`
      <${canSubmit ? "button" : "div"}
        key=${canSubmit ? "submit-active" : "submit-inactive"}
        type=${canSubmit ? "submit" : undefined}
        role=${canSubmit ? undefined : "button"}
        tabindex=${canSubmit ? undefined : "0"}
        aria-disabled=${canSubmit ? undefined : "true"}
        onClick=${canSubmit ? undefined : showSubmitErrors}
        onKeyDown=${canSubmit ? undefined : handleInactiveSubmitKeyDown}
        style=${canSubmit ? undefined : { pointerEvents: "auto" }}
        class=${"better-workplace--button-component w-variant-8f17e49d-0f24-b779-ff5c-6a22df9ce1a0 w-inline-block" +
        (!canSubmit ? " is-inactive" : "")}
      >
        <div data-wf--better-workplace--button-inside--variant="primary" class="better-workplace--button">
          <div data-button="padding" class="better-workplace--button_layout">
            <div class="better-workplace--button_text">
              <span class="hide-mobile-tiny">${buttons.submit}</span>
              <span class="show-mobile-tiny">${buttons.shortsubmit}</span>
            </div>
            <div class="better-workplace--button_relative">
              <svg
                data-wf--better-workplace--icon--variant="md"
                viewBox="0 0 24 24"
                class="better-workplace--icon-svg w-variant-e9c02736-dc0b-1e38-719f-d7ef475aed6f"
              >
                <use href="#mail" viewBox="0 0 32 32"></use>
              </svg>
              <div data-button="circle" class="better-workplace--button_icon-bg"></div>
            </div>
          </div>
        </div>
      </${canSubmit ? "button" : "div"}>
    `;

  return html`
    <div class="padding-xl grid-1">
      <div id="form-component" class="form_component w-form">
        ${tabs && html`<${StepIndicator} widths=${stepWidths} />`}

        <form
          id=${formName}
          name=${`wf-form-${formName}`}
          data-name=${formName}
          method="post"
          novalidate
          class="flex-col gap-md"
          style=${{ display: done ? "none" : "" }}
          onSubmit=${handleSubmit}
        >
          ${(!tabs ? sections : [currentSection]).map(
            (section) => html`
              <${FormSection}
                key=${section.id}
                section=${section}
                data=${data}
                errors=${errors}
                onChange=${onChange}
                onBlur=${onBlur}
                onNipLookup=${handleNipLookup}
                nipLoading=${nipLoading}
                nipError=${nipError}
                nipFilled=${nipFilled}
              />
            `,
          )}

          ${tabs &&
          html`
            <div style="display:none">
              ${formFields
                .filter((field) => !currentSection.rows.some((row) => row.fields.includes(field)))
                .map((field) => html`<input type="hidden" name=${field.name} value=${data[field.name]} />`)}
            </div>
          `}

          ${(!tabs || step === sections.length) &&
          html`
            <div class="flex-col gap-xs form-consents">
              <${Consent}
                company=${company}
                privacyUrl=${privacyUrl}
                marketing=${marketing}
                checked=${agreemrkChecked}
                onChange=${setAgreemrkChecked}
              />
            </div>
          `}

          <div class="form-nav">
            ${!tabs
              ? submitBtn
              : html`
                  <div class="form-nav_left">${backBtn}</div>
                  <div class="form-nav_right">${nextBtn}${submitBtn}</div>
                `}
          </div>

          <div class="hide">
            <input type="hidden" name="form_type" value=${formType} />
            <input type="hidden" name="brand" value=${data.brand} />
            <input type="hidden" name="url" value=${data.url} />
          </div>
          <input
            class="form-helper"
            name="website"
            tabindex="-1"
            autocomplete="new-password"
            value=${data.website ?? ""}
            onInput=${(e) => setData((d) => ({ ...d, website: e.target.value }))}
          />
        </form>

        <div
          class="form_message-success w-form-done"
          tabindex="-1"
          role="region"
          aria-label="zapytanie success"
          style=${{ display: done ? "block" : "none" }}
        >
          <div data-wf--better-workplace--form-success-error-message--form-type="zapytanie" class="better-workplace--form_message">
            <img
              width="200"
              loading="lazy"
              alt=""
              src="https://cdn.prod.website-files.com/698dfabcdd705500e5451b80/69bf0c5d6a239b30c2a0bdb7_8545e3aafd9ab74c802300e1c7cfe012_mail-success.avif"
              class="better-workplace--form_message_img"
            />
            <div class="better-workplace--form_message_text flex-col gap-xs">
              <p class="heading-style-h5 text-color-card-heading">${success.heading}<br />${success.subheading}</p>
              <p class="better-workplace--text-size-md">${success.description}</p>
            </div>
          </div>
        </div>

        <div
          class="form_message-error w-form-fail"
          tabindex="-1"
          role="region"
          aria-label="zapytanie failure"
          style=${{ display: failed ? "block" : "none" }}
        >
          <div
            data-wf--better-workplace--system-box--variant="error"
            class="better-workplace--info-callout w-variant-cebccc58-4999-fc0e-403f-40fd53f94f9e"
          >
            <div>
              <svg viewBox="0 0 32 32" class="better-workplace--icon-svg w-variant-e9c02736-dc0b-1e38-719f-d7ef475aed6f">
                <use href="#error"></use>
              </svg>
            </div>
            <div class="better-workplace--info-callout-text">
              <p>
                Nie udało się wysłać. Spróbuj ponownie lub napisz:${" "}
                <a href=${errorMailto}>${errorEmail}</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Start from a clean mount after duplicate embeds or external DOM changes.
function mount(el, props) {
  render(null, el);
  el.replaceChildren();
  render(html`<${App} ...${props} />`, el);
}

export function initForm(setup = {}) {
  const el = document.getElementById("app");
  if (!el) return;
  validateSetup(setup);
  DEBUG = setup.debug === true;
  mount(el, { setup });
}

export function destroyForm() {
  const el = document.getElementById("app");
  if (el) render(null, el);
}
