// build: 2026-06-17

import { html, render, useState, useEffect, useCallback } from "https://unpkg.com/htm/preact/standalone.module.js";

const DEBUG = new URL(import.meta.url).searchParams.has("debug");
const log = (...args) => DEBUG && console.log("[bwp]", ...args);

// Only business emails allowed
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

// ─── copy ────────────────────────────────────────────────────────────────────

// shown in the step-3 consent text unless overridden via the `company` embed param
const DEFAULT_COMPANY = "Betterworkplace Sp. z o.o.";

const COPY = {
  steps: ["Dane kontaktowe", "Dane firmy", "Pytanie"],
  headings: {
    step1: "Dane kontaktowe",
    step2: "Dane firmy",
    step3: "Zadaj pytanie",
  },
  labels: {
    first_name: "Imię",
    last_name: "Nazwisko",
    email: "Email służbowy",
    phone: "Telefon",
    tax_number: "NIP",
    company_name: "Nazwa firmy",
    city: "Miejscowość",
    company_workers: "Liczba pracowników",
    department: "Reprezentowany dział (opcjonalnie)",
    f_message: "Wiadomość (opcjonalnie)",
  },
  placeholders: {
    first_name: "np. Jan",
    last_name: "np. Kowalski",
    email: "np. jan.kowalski@firma.pl",
    phone: "111 222 333",
    tax_number: "np. 6793077034",
    company_name: "np. Polnex",
    city: "np. Warszawa",
    company_workers: "Wybierz",
    department: "Wybierz dział",
    f_message: "Np. interesują nas owoce i kawa dla 50 osób w biurze w Warszawie.",
  },
  errors: {
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
    company_name_required: "Nazwa firmy jest wymagana",
    city_required: "Miejscowość firmy jest wymagana",
    company_workers_required: "Wybierz liczbę pracowników",
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
    shortsubmit: "Wyślij!",
  },
  legal: {
    newsletter: (company) => `Chcę otrzymywać od ${company || DEFAULT_COMPANY} newslettera o tematyce benefitów pozapłacowych`,
    privacy: (company) =>
      `Wysyłając ten formularz, wyrażasz zgodę na przetwarzanie Twoich danych przez ${company || DEFAULT_COMPANY} i kontakt z Tobą w celu realizacji Twojego zapytania. Aby dowiedzieć się więcej o tym, jak dbamy o ochronę i poszanowanie Twojej prywatności, zapoznaj się z naszą `,
    privacy_link_label: "Polityką prywatności",
    privacy_link_url: "https://www.betterworkplace.pl/privacy-policy",
  },
};

// ─── config ───────────────────────────────────────────────────────────────────

const WEBFLOW_SITE_ID = "698dfabcdd705500e5451b80";

const STEPS = [
  { id: 1, label: COPY.steps[0] },
  { id: 2, label: COPY.steps[1] },
  { id: 3, label: COPY.steps[2] },
];

const STEP_REQUIRED = {
  1: ["first_name", "last_name", "email", "phone"],
  2: ["tax_number", "company_name", "city", "company_workers"],
  3: [],
};

// true  = Next nieaktywny dopóki wszystkie wymagane pola nie przejdą walidacji (live)
// false = walidacja tylko po kliknięciu Next (poprzednie zachowanie)
const STRICT_NAV = true;

// true  = przyciski w stylu Webflow arrow (better-workplace--button-component)
// false = proste przyciski (button / button is-secondary)
const ARROW_BTN = true;

// ─── phone ───────────────────────────────────────────────────────────────────

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

// ─── validation ──────────────────────────────────────────────────────────────

function nipChecksum(nip) {
  const d = nip.replace(/\D/g, "");
  if (d.length !== 10) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * +d[i], 0);
  return sum % 11 === +d[9];
}

function validateField(name, value) {
  const v = String(value ?? "").trim();

  if (name === "first_name") {
    if (!v) return COPY.errors.first_name_required;
    if (v.length < 2) return COPY.errors.first_name_short;
    return null;
  }
  if (name === "last_name") {
    if (!v) return COPY.errors.last_name_required;
    if (v.length < 2) return COPY.errors.last_name_short;
    return null;
  }
  if (name === "email") {
    if (!v) return COPY.errors.email_required;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return COPY.errors.email_invalid;
    const domain = v.split("@")[1].toLowerCase();
    if (PERSONAL_EMAIL_DOMAINS.includes(domain)) return COPY.errors.email_personal;
    return null;
  }
  if (name === "phone") {
    if (!v) return COPY.errors.phone_required;
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
    if (!v) return COPY.errors.tax_number_required;
    const digits = v.replace(/\D/g, "");
    if (digits.length !== 10) return COPY.errors.tax_number_length;
    if (!nipChecksum(v)) return COPY.errors.tax_number_invalid;
    return null;
  }
  if (name === "company_name") return !v ? COPY.errors.company_name_required : null;
  if (name === "city") return !v ? COPY.errors.city_required : null;
  if (name === "company_workers") return !v ? COPY.errors.company_workers_required : null;

  return null;
}

function validateStep(step, data) {
  const errors = {};
  for (const field of STEP_REQUIRED[step] || []) {
    const err = validateField(field, data[field]);
    if (err) errors[field] = err;
  }
  return errors;
}

// ─── api ─────────────────────────────────────────────────────────────────────

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

// ─── progress ────────────────────────────────────────────────────────────────

// zwraca CSS width string: "X%", "0.675rem" (current + empty), lub "0"
function calcStepProgress(stepNum, currentStep, data, agreemrkChecked, done, marketing = false) {
  if (done) return "100%";
  if (stepNum > currentStep) return "0"; // next i dalsze: zawsze puste
  const valid = (f) => {
    const v = String(data[f] ?? "").trim();
    return v.length > 0 && validateField(f, v) === null;
  };
  let n = 0;
  let mul = 25;
  if (stepNum === 1) n = ["first_name", "last_name", "email", "phone"].filter(valid).length;
  else if (stepNum === 2) n = ["tax_number", "company_name", "city", "company_workers"].filter(valid).length;
  else if (stepNum === 3) {
    const messageFilled = String(data.f_message ?? "").trim() ? 1 : 0;
    // marketing checkbox shown only when explicitly enabled (default: hidden)
    n = marketing ? messageFilled + (agreemrkChecked ? 1 : 0) : messageFilled;
    mul = marketing ? 50 : 100;
  }
  if (stepNum === currentStep) return n > 0 ? n * mul + "%" : "0.675rem"; // current: min wskaźnik
  return n * mul + "%"; // past: rzeczywisty fill, może być 0%
}

// ─── components ──────────────────────────────────────────────────────────────

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

function Step1({ data, errors, onChange, onBlur }) {
  const input = (name, type, autocomplete, placeholder) => html`
    <input
      class=${"form_input w-input" + (errors[name] ? " is-validation-error" : "")}
      id=${name}
      name=${name}
      type=${type}
      autocomplete=${autocomplete}
      placeholder=${placeholder}
      maxlength=${name === "phone" ? "16" : "256"}
      minlength=${name === "phone" ? "9" : undefined}
      value=${data[name]}
      onInput=${(e) => onChange(name, e.target.value)}
      onBlur=${(e) => onBlur(name, e.target.value)}
    />
  `;
  return html`
    <fieldset class="flex-col gap-xs form-step">
      <div><legend class="heading-style-h5 text-color-card-heading">${COPY.headings.step1}</legend></div>
      <div class="grid-2 gap-xs">
        <${Field} id="first_name" label=${COPY.labels.first_name} required error=${errors.first_name}>
          ${input("first_name", "text", "given-name", COPY.placeholders.first_name)}
        </${Field}>
        <${Field} id="last_name" label=${COPY.labels.last_name} required error=${errors.last_name}>
          ${input("last_name", "text", "family-name", COPY.placeholders.last_name)}
        </${Field}>
      </div>
      <${Field} id="email" label=${COPY.labels.email} required error=${errors.email}>
        ${input("email", "email", "email", COPY.placeholders.email)}
      </${Field}>
      <${Field} id="phone" label=${COPY.labels.phone} required error=${errors.phone}>
        ${input("phone", "tel", "tel", COPY.placeholders.phone)}
      </${Field}>
    </fieldset>
  `;
}

function Step2({ data, errors, onChange, onBlur, onNipLookup, nipLoading, nipError, nipFilled }) {
  return html`
    <fieldset class="flex-col gap-xs form-step">
      <div><legend class="heading-style-h5 text-color-card-heading">${COPY.headings.step2}</legend></div>

      <div class="grid-2 gap-xs">
        <${Field} id="tax_number" label=${COPY.labels.tax_number} required error=${errors.tax_number}>
          <input class=${"form_input w-input" + (errors.tax_number ? " is-validation-error" : "")}
            id="tax_number" name="tax_number"
            type="text" autocomplete="off" maxlength="13" minlength="10"
            placeholder=${COPY.placeholders.tax_number}
            value=${data.tax_number}
            onInput=${(e) => onChange("tax_number", e.target.value)}
            onBlur=${(e) => onBlur("tax_number", e.target.value)} />
        </${Field}>
        <div class="form_field-wrapper">
          <div class="form_nip">
            <button type="button" onClick=${onNipLookup}
              class=${"better-workplace--button-component" + (nipLoading ? " is-loading" : "")}>
              <div data-wf--better-workplace--button-inside--variant="primary" class="better-workplace--button">
                <div data-button="padding" class="better-workplace--button_layout">
                  <div class="better-workplace--button_text">${nipLoading ? COPY.buttons.nip_loading : COPY.buttons.nip_fetch}</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      ${nipError &&
    html`
          <div
            data-wf--better-workplace--system-box--variant="error"
            class="better-workplace--info-callout w-variant-cebccc58-4999-fc0e-403f-40fd53f94f9e"
          >
            <div>
              <svg viewBox="0 0 24 24" class="better-workplace--icon-svg w-variant-e9c02736-dc0b-1e38-719f-d7ef475aed6f">
                <use href="#error" viewBox="0 0 32 32"></use>
              </svg>
            </div>
            <div class="better-workplace--info-callout-text"><p>${nipError}</p></div>
          </div>
        `
    }

      ${!nipFilled &&
    html`
          <div data-wf--better-workplace--system-box--variant="info" class="better-workplace--info-callout">
            <div>
              <svg viewBox="0 0 24 24" class="better-workplace--icon-svg w-variant-e9c02736-dc0b-1e38-719f-d7ef475aed6f">
                <use href="#info" viewBox="0 0 32 32"></use>
              </svg>
            </div>
            <div class="better-workplace--info-callout-text">
              <p>${COPY.callout.nip_info}</p>
            </div>
          </div>
        `
    }

      ${nipFilled &&
    html`
        <div class="grid-2-1 gap-xs">
          <${Field} id="company_name" label=${COPY.labels.company_name} required error=${errors.company_name}>
            <input class=${"form_input w-input" + (errors.company_name ? " is-validation-error" : "")}
              id="company_name" name="company_name"
              type="text" autocomplete="organization" maxlength="256" placeholder=${COPY.placeholders.company_name}
              value=${data.company_name}
              onInput=${(e) => onChange("company_name", e.target.value)}
              onBlur=${(e) => onBlur("company_name", e.target.value)} />
          </${Field}>
          <${Field} id="city" label=${COPY.labels.city} required error=${errors.city}>
            <input class=${"form_input w-input" + (errors.city ? " is-validation-error" : "")}
              id="city" name="city"
              type="text" autocomplete="off" maxlength="256" placeholder=${COPY.placeholders.city}
              value=${data.city}
              onInput=${(e) => onChange("city", e.target.value)}
              onBlur=${(e) => onBlur("city", e.target.value)} />
          </${Field}>
        </div>

        <div class="grid-1-2 gap-xs">
          <${Field} id="company_workers" label=${COPY.labels.company_workers} required noIcon
            error=${errors.company_workers}>
            <select id="company_workers" name="company_workers"
              class=${"form_input is-select w-select" + (errors.company_workers ? " is-validation-error" : "")}
              value=${data.company_workers}
              style=${{ color: data.company_workers ? "var(--better-workplace---strong--strong-100-primary)" : "" }}
              onChange=${(e) => onChange("company_workers", e.target.value)}
              onBlur=${(e) => onBlur("company_workers", e.target.value)}>
              <option value="" disabled hidden>${COPY.placeholders.company_workers}</option>
              <option value="10-100">10-100</option>
              <option value="100-200">100-200</option>
              <option value="200-500">200-500</option>
              <option value="500-1000">500-1000</option>
              <option value="1000-2000">1000-2000</option>
              <option value="2000+">2000+</option>
            </select>
          </${Field}>
          <div class="form_field-wrapper">
            <label for="department" class="form_field-label">${COPY.labels.department}</label>
            <select id="department" name="department"
              class="form_input is-select w-select"
              value=${data.department}
              style=${{ color: data.department ? "var(--better-workplace---strong--strong-100-primary)" : "" }}
              onChange=${(e) => onChange("department", e.target.value)}>
              <option value="" disabled hidden>${COPY.placeholders.department}</option>
              <option value="HR">HR</option>
              <option value="Office">Office</option>
              <option value="Zaopatrzenie">Zaopatrzenie</option>
              <option value="Facility">Facility</option>
              <option value="Inny">Inny</option>
            </select>
          </div>
        </div>
      `
    }
    </fieldset>
  `;
}

function Step3({ data, onChange, company, marketing }) {
  return html`
    <fieldset class="flex-col gap-xs form-step">
      <div>
        <legend class="heading-style-h5 text-color-card-heading">${COPY.headings.step3}</legend>
      </div>
      <div class="form_field-wrapper">
        <label for="f_message" class="form_field-label">${COPY.labels.f_message}</label>
        <textarea
          id="f_message"
          name="f_message"
          maxlength="5000"
          rows="7"
          placeholder=${COPY.placeholders.f_message}
          class="form_input is-text-area w-input"
          onInput=${(e) => onChange("f_message", e.target.value)}
        >
${data.f_message}</textarea
        >
      </div>
      ${marketing &&
    html`
        <label class="w-checkbox form_checkbox">
          <div class="w-checkbox-input w-checkbox-input--inputType-custom form_checkbox-icon"></div>
          <input type="checkbox" id="agreemrk" name="agreemrk" data-name="agreemrk" style="opacity:0;position:absolute;z-index:-1" />
          <span class="form_checkbox-label w-form-label" for="agreemrk"> ${COPY.legal.newsletter(company)} </span>
        </label>
      `}
      <p class="form_checkbox-label text-size-xs">
        ${COPY.legal.privacy(company)}
        <a href=${COPY.legal.privacy_link_url} class="text-style-link-sm">${COPY.legal.privacy_link_label}</a>.
      </p>
    </fieldset>
  `;
}

// ─── scroll ──────────────────────────────────────────────────────────────────

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

// ─── app ─────────────────────────────────────────────────────────────────────

function App({ noTabs = false, mountId }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    tax_number: "",
    company_name: "",
    city: "",
    company_workers: "",
    department: "",
    f_message: "",
    agreemrk: false,
    url: "",
    brand: "",
    referrer: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    gclid: "",
    fbclid: "",
  });
  const [errors, setErrors] = useState({});
  const [step3Key, setStep3Key] = useState(0);
  const [nipLoading, setNipLoading] = useState(false);
  const [nipError, setNipError] = useState("");
  const [nipFilled, setNipFilled] = useState(false);
  const [agreemrkChecked, setAgreemrkChecked] = useState(false);
  const [done, setDone] = useState(false);
  const [company, setCompany] = useState("");
  const [marketing, setMarketing] = useState(false);

  // company/marketing overrides come from this page's own URL — works the same
  // whether we're standalone or the src= of an iframe (location is the iframe's own)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("company")) setCompany(params.get("company"));
    if (params.has("marketing")) setMarketing(true);
  }, []);

  // Get parent page URL and brand — via postMessage when in iframe, directly otherwise
  useEffect(() => {
    if (window === window.parent) {
      const href = window.location.href;
      const utm = extractUtm(href);
      log("standalone mode", { url: href, brand: extractBrand(href), ...utm });
      setData((prev) => ({ ...prev, url: href, brand: extractBrand(href), referrer: document.referrer, ...utm }));
      return;
    }
    const handler = (e) => {
      if (e.data?.type !== "bwp:info") return;
      log("postMessage received", e.data);
      const utm = e.data.url ? extractUtm(e.data.url) : {};
      setData((prev) => ({
        ...prev,
        ...(e.data.url ? { url: e.data.url } : {}),
        ...(e.data.brand ? { brand: e.data.brand } : e.data.url ? { brand: extractBrand(e.data.url) } : {}),
        ...(e.data.referrer ? { referrer: e.data.referrer } : {}),
        ...utm,
      }));
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "bwp:request-info" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  // Tell the parent iframe how tall we are so it can resize
  // documentElement always reports the viewport height, so we
  // measure the actual mount node instead.
  const rootId = mountId ?? (noTabs ? "app-no-tabs" : "app");
  const formHeight = () => document.getElementById(rootId)?.scrollHeight ?? document.documentElement.scrollHeight;

  useEffect(() => {
    if (typeof ResizeObserver === "undefined" || window === window.parent) return;
    const target = document.getElementById(rootId) ?? document.documentElement;
    const obs = new ResizeObserver(() => {
      window.parent.postMessage({ type: "bwp:resize", height: formHeight() }, "*");
    });
    obs.observe(target);
    return () => obs.disconnect();
  }, []);

  // NIP lookup reveals/hides company fields — resize once that settles
  useEffect(() => {
    if (window === window.parent) return;
    window.parent.postMessage({ type: "bwp:resize", height: formHeight() }, "*");
  }, [nipFilled, nipError]);

  // Measure each field label and expose its width (in em) on the paired input as
  // --cutout-width, so the input's clip-path can notch its border to fit the label.
  // Skipped for dailyfruits, which uses a label-above layout instead of the notch.
  useEffect(() => {
    if (rootId === "app-dailyfruits") return;
    const root = document.getElementById(rootId);
    if (!root) return;
    const apply = () => {
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      root.querySelectorAll(".form_field-label").forEach((label) => {
        const input = label.closest(".form_field-wrapper")?.querySelector(".form_input");
        if (!input) return;
        // label is position:absolute on these forms, so its box hugs the text (+ its padding)
        input.style.setProperty("--cutout-width", ((label.getBoundingClientRect().width / rootPx) * 0.875).toFixed(3) + "em");
      });
    };
    apply();
    document.fonts?.ready.then(apply); // re-measure once the Webflow web font loads (shifts label width)
  }, [step, nipFilled, noTabs]);

  // Śledź stan checkboxa agreemrk (kontrolowanego przez Webflow.js)
  useEffect(() => {
    if (!noTabs && step !== 3) return;
    const el = document.querySelector('input[name="agreemrk"]');
    if (!el) return;
    const handler = (e) => setAgreemrkChecked(e.target.checked);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [step, noTabs]);

  const onChange = useCallback((field, value) => {
    let v = value;
    if (field === "phone") v = value.replace(/[^\d\s+]/g, "");
    if (field === "email") v = value.replace(/\s/g, "").toLowerCase();
    setData((prev) => ({ ...prev, [field]: v }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  }, []);

  const onBlur = useCallback((field, value) => {
    let v = value;
    if (field === "tax_number") v = value.replace(/\D/g, "");
    if (field === "phone" && value.trim()) v = formatPhone(value);
    if (v !== value) setData((prev) => ({ ...prev, [field]: v }));
    const err = validateField(field, v);
    setErrors((prev) => ({ ...prev, [field]: err || null }));
  }, []);

  const goNext = useCallback(() => {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (step === 2) setStep3Key((k) => k + 1);
    setStep((s) => s + 1);
    scrollToForm();
  }, [step, data]);

  const goBack = useCallback(() => {
    setStep((s) => s - 1);
    scrollToForm();
  }, []);

  const handleNipLookup = useCallback(async () => {
    const err = validateField("tax_number", data.tax_number);
    if (err) {
      setErrors((e) => ({ ...e, tax_number: err }));
      return;
    }
    setNipLoading(true);
    setNipError("");
    try {
      const result = await lookupNip(data.tax_number);
      setData((d) => ({ ...d, company_name: result.company_name, city: result.city }));
      setErrors((prev) => ({ ...prev, company_name: null, city: null }));
      setNipFilled(true);
    } catch (e) {
      setNipError(e.message);
      setErrors((prev) => ({ ...prev, tax_number: e.message }));
    } finally {
      setNipLoading(false);
    }
  }, [data.tax_number]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (data.website) return; // honeypot
      log("submit", data);

      const formEl = e.target;
      const wrapper = document.getElementById("form-component");
      const successEl = wrapper?.querySelector(".w-form-done");
      const failEl = wrapper?.querySelector(".w-form-fail");

      try {
        const res = await fetch(`https://webflow.com/api/v1/form/${WEBFLOW_SITE_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            name: "zapytanie",
            source: data.url || window.location.href,
            test: false,
            fields: {
              first_name: data.first_name,
              last_name: data.last_name,
              email: data.email,
              phone: data.phone,
              tax_number: data.tax_number,
              company_name: data.company_name,
              city: data.city,
              company_workers: data.company_workers,
              department: data.department,
              f_message: data.f_message,
              agreemrk: agreemrkChecked ? "on" : false,
              referrer: data.referrer,
              utm_source: data.utm_source,
              utm_medium: data.utm_medium,
              utm_campaign: data.utm_campaign,
              gclid: data.gclid,
              fbclid: data.fbclid,
              form_type: "zapytanie",
              brand: data.brand,
              url: data.url,
            },
            dolphin: false,
          }),
        });

        if (res.ok) {
          if (formEl) formEl.style.display = "none";
          if (successEl) {
            successEl.style.display = "block";
            setDone(true);
          }
          if (noTabs) window.scrollTo({ top: 0, behavior: "smooth" });
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: "form_success", formID: "zapytanie", url: data.url, brand: data.brand });
          log("submit success");
        } else {
          if (failEl) failEl.style.display = "block";
          log("submit error", res.status);
        }
      } catch (err) {
        if (failEl) failEl.style.display = "block";
        log("submit exception", err.message);
      }
    },
    [data, agreemrkChecked],
  );

  const requiredForNav = noTabs ? [...(STEP_REQUIRED[1] || []), ...(STEP_REQUIRED[2] || [])] : STEP_REQUIRED[step] || [];
  const canProceed = STRICT_NAV
    ? requiredForNav.every((f) => {
      const v = String(data[f] ?? "").trim();
      return v.length > 0 && validateField(f, v) === null;
    })
    : !requiredForNav.some((f) => errors[f]);
  const stepWidths = noTabs ? [] : [1, 2, 3].map((s) => calcStepProgress(s, step, data, agreemrkChecked, done, marketing));

  return html`
    <div class="padding-xl grid-1">
      <div id="form-component" class="form_component w-form">
        ${!noTabs && html`<${StepIndicator} widths=${stepWidths} />`}

        <form
          id="zapytanie"
          name="wf-form-zapytanie"
          data-name="zapytanie"
          method="post"
          novalidate
          class="flex-col gap-md"
          onSubmit=${handleSubmit}
        >
          ${noTabs
      ? html`
                <${Step1} data=${data} errors=${errors} onChange=${onChange} onBlur=${onBlur} />
                <${Step2}
                  data=${data}
                  errors=${errors}
                  onChange=${onChange}
                  onBlur=${onBlur}
                  onNipLookup=${handleNipLookup}
                  nipLoading=${nipLoading}
                  nipError=${nipError}
                  nipFilled=${nipFilled}
                />
                <${Step3} data=${data} onChange=${onChange} company=${company} marketing=${marketing} />
                <div style="display:none">
                  <input type="hidden" name="referrer" value=${data.referrer} />
                  <input type="hidden" name="utm_source" value=${data.utm_source} />
                  <input type="hidden" name="utm_medium" value=${data.utm_medium} />
                  <input type="hidden" name="utm_campaign" value=${data.utm_campaign} />
                  <input type="hidden" name="gclid" value=${data.gclid} />
                  <input type="hidden" name="fbclid" value=${data.fbclid} />
                </div>
              `
      : html`
                ${step === 1 && html`<${Step1} data=${data} errors=${errors} onChange=${onChange} onBlur=${onBlur} />`}
                ${step === 2 &&
        html`
                  <${Step2}
                    data=${data}
                    errors=${errors}
                    onChange=${onChange}
                    onBlur=${onBlur}
                    onNipLookup=${handleNipLookup}
                    nipLoading=${nipLoading}
                    nipError=${nipError}
                    nipFilled=${nipFilled}
                  />
                `}
                ${step === 3 && html`<${Step3} data=${data} onChange=${onChange} company=${company} marketing=${marketing} />`}
                ${step === 3 &&
        html`
                  <div key=${step3Key} style="display:none">
                    <input type="hidden" name="first_name" value=${data.first_name} />
                    <input type="hidden" name="last_name" value=${data.last_name} />
                    <input type="hidden" name="email" value=${data.email} />
                    <input type="hidden" name="phone" value=${data.phone} />
                    <input type="hidden" name="tax_number" value=${data.tax_number} />
                    <input type="hidden" name="company_name" value=${data.company_name} />
                    <input type="hidden" name="city" value=${data.city} />
                    <input type="hidden" name="company_workers" value=${data.company_workers} />
                    <input type="hidden" name="department" value=${data.department} />
                    <input type="hidden" name="referrer" value=${data.referrer} />
                    <input type="hidden" name="utm_source" value=${data.utm_source} />
                    <input type="hidden" name="utm_medium" value=${data.utm_medium} />
                    <input type="hidden" name="utm_campaign" value=${data.utm_campaign} />
                    <input type="hidden" name="gclid" value=${data.gclid} />
                    <input type="hidden" name="fbclid" value=${data.fbclid} />
                  </div>
                `}
              `}

          <div class="form-nav">
            <div class="form-nav_left">
              ${!noTabs &&
    step > 1 &&
    (ARROW_BTN
      ? html`
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
                  `
      : html` <button type="button" class="button is-secondary" onClick=${goBack}>${COPY.buttons.back}</button> `)}
            </div>
            <div class="form-nav_right">
              ${!noTabs &&
    step < 3 &&
    (ARROW_BTN
      ? html`
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
                  `
      : html`
                    <button type="button" class=${"button" + (!canProceed ? " is-inactive" : "")} onClick=${goNext}>
                      ${COPY.buttons.next}
                    </button>
                  `)}
              ${(noTabs || step === 3) &&
    (ARROW_BTN
      ? html`
                    <button
                      type="submit"
                      class=${"better-workplace--button-component w-variant-8f17e49d-0f24-b779-ff5c-6a22df9ce1a0 w-inline-block" +
        (!canProceed ? " is-inactive" : "")}
                    >
                      <div data-wf--better-workplace--button-inside--variant="primary" class="better-workplace--button">
                        <div data-button="padding" class="better-workplace--button_layout">
                          <div class="better-workplace--button_text">
                            <span class="hide-mobile-portrait">${COPY.buttons.submit}</span>
                            <span class="show-mobile">${COPY.buttons.shortsubmit}</span>
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
                    </button>
                  `
      : html`<button type="submit" class=${"button" + (!canProceed ? " is-inactive" : "")}>${COPY.buttons.submit}</button>`)}
            </div>
          </div>

          <div class="hide">
            <input type="hidden" name="form_type" value="zapytanie" />
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

        <div class="form_message-success w-form-done" tabindex="-1" role="region" aria-label="zapytanie success" style="display:none">
          <div data-wf--better-workplace--form-success-error-message--form-type="zapytanie" class="better-workplace--form_message">
            <img
              width="200"
              loading="lazy"
              alt=""
              src="https://cdn.prod.website-files.com/698dfabcdd705500e5451b80/69bf0c5d6a239b30c2a0bdb7_8545e3aafd9ab74c802300e1c7cfe012_mail-success.avif"
              class="better-workplace--form_message_img"
            />
            <div class="better-workplace--form_message_text flex-col gap-xs">
              <p class="heading-style-h5 text-color-card-heading">Dziękujemy!<br />Twoje zapytanie zostało wysłane.</p>
              <p class="better-workplace--text-size-md">
                Nasz konsultant skontaktuje się z Tobą w ciągu 24h (dni robocze), aby omówić szczegóły dostępnej oferty.
              </p>
            </div>
          </div>
        </div>

        <div class="form_message-error w-form-fail" tabindex="-1" role="region" aria-label="zapytanie failure" style="display:none">
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
                <a href="mailto:biuro@betterworkplace.pl?subject=B%C5%82%C4%85d%20formularza">biuro@betterworkplace.pl</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initForm() {
  const el = document.getElementById("app");
  const elNoTabs = document.getElementById("app-no-tabs");
  const elDaily = document.getElementById("app-dailyfruits"); // themed variant — colors via scoped CSS on the page
  if (el) render(html`<${App} />`, el);
  if (elNoTabs) render(html`<${App} noTabs=${true} />`, elNoTabs);
  if (elDaily) render(html`<${App} noTabs=${true} mountId="app-dailyfruits" />`, elDaily);
}

export function destroyForm() {
  for (const id of ["app", "app-no-tabs", "app-dailyfruits"]) {
    const el = document.getElementById(id);
    if (el) render(null, el);
  }
}

initForm();
