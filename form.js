// build: 2026-05-30

import { html, render, useState, useEffect, useCallback } from "https://unpkg.com/htm/preact/standalone.module.js";

const SITE_ID = "698dfabcdd705500e5451b80";

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

const STEPS = [
  { id: 1, label: "Dane kontaktowe" },
  { id: 2, label: "Dane firmy" },
  { id: 3, label: "Pytanie" },
];

const STEP_REQUIRED = {
  1: ["first_name", "last_name", "email", "phone"],
  2: ["tax_number", "company_name", "city", "company_workers"],
  3: [],
};

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
    if (!v) return "Imię jest wymagane";
    if (v.length < 2) return "Imię musi mieć co najmniej 2 znaki";
    return null;
  }
  if (name === "last_name") {
    if (!v) return "Nazwisko jest wymagane";
    if (v.length < 2) return "Nazwisko musi mieć co najmniej 2 znaki";
    return null;
  }
  if (name === "email") {
    if (!v) return "Email jest wymagany";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Podaj prawidłowy adres email";
    const domain = v.split("@")[1].toLowerCase();
    if (PERSONAL_EMAIL_DOMAINS.includes(domain)) return "Podaj służbowy adres email";
    return null;
  }
  if (name === "phone") {
    if (!v) return "Telefon jest wymagany";
    const allDigits = v.replace(/\D/g, "");
    const hasPlus = v.startsWith("+");
    if (allDigits.length > 15) return "Numer telefonu jest za długi";
    if (!hasPlus) {
      if (!/^\d{9}$/.test(allDigits)) return "Numer telefonu powinien składać się z 9 cyfr";
      return null;
    }
    const cc = detectCountryCode("+" + allDigits);
    if (cc?.prefix === "+48") {
      if (allDigits.slice(cc.ccLen).length !== 9) return "Numer telefonu powinien składać się z 9 cyfr";
    }
    return null;
  }
  if (name === "tax_number") {
    if (!v) return "NIP jest wymagany";
    const digits = v.replace(/\D/g, "");
    if (digits.length !== 10) return "NIP musi składać się z 10 cyfr";
    if (!nipChecksum(v)) return "Podany NIP jest nieprawidłowy";
    return null;
  }
  if (name === "company_name") return !v ? "Nazwa firmy jest wymagana" : null;
  if (name === "city") return !v ? "Miejscowość firmy jest wymagana" : null;
  if (name === "company_workers") return !v ? "Wybierz liczbę pracowników" : null;

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
  if (!res.ok) throw new Error("Błąd podczas pobierania danych NIP");
  const data = await res.json();
  if (data.ErrorCode) throw new Error("Podany NIP nie istnieje");
  return {
    company_name: data.Nazwa ?? "",
    city: data.Miejscowosc ?? "",
  };
}

async function submitToWebflow(data) {
  const res = await fetch(`https://webflow.com/api/v1/form/${SITE_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "zapytanie",
      source: data.url,
      test: /webflow\.io|localhost|127\.0\.0\.1/.test(window.location.hostname),
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
        agreemrk: data.agreemrk ? "true" : "",
        form_type: "zapytanie",
        brand: data.brand,
        url: data.url,
      },
      dolphin: false,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

function extractBrand(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return "";
  }
}

// ─── components ──────────────────────────────────────────────────────────────

function StepIndicator({ current }) {
  return html`
    <div class="form-stepper" role="progressbar" aria-valuenow=${current} aria-valuemin="1" aria-valuemax="3">
      ${STEPS.map(
        (step) => html`
          <div
            key=${step.id}
            class=${"form-stepper_pill" + (step.id < current ? " is-done" : step.id === current ? " is-active" : "")}
          ></div>
        `,
      )}
    </div>
  `;
}

function Field({ id, label, required, error, noIcon, children }) {
  return html`
    <div class="form_field-wrapper">
      <label for=${id} class="form_field-label">
        ${required && html`<span class="form_required" aria-hidden="true">*</span>`} ${label}
      </label>
      ${children}
      ${!noIcon && html`
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
      <div><legend class="heading-style-h5">Dane kontaktowe</legend></div>
      <div class="grid-2 gap-xs">
        <${Field} id="first_name" label="Imię" required error=${errors.first_name}>
          ${input("first_name", "text", "given-name", "np. Jan")}
        </${Field}>
        <${Field} id="last_name" label="Nazwisko" required error=${errors.last_name}>
          ${input("last_name", "text", "family-name", "np. Kowalski")}
        </${Field}>
      </div>
      <div class="grid-2-1 gap-xs">
        <${Field} id="email" label="Email służbowy" required error=${errors.email}>
          ${input("email", "email", "email", "np. jan.kowalski@firma.pl")}
        </${Field}>
        <${Field} id="phone" label="Telefon" required error=${errors.phone}>
          ${input("phone", "tel", "tel", "111 222 333")}
        </${Field}>
      </div>
    </fieldset>
  `;
}

function Step2({ data, errors, onChange, onBlur, onNipLookup, nipLoading, nipError, nipFilled }) {
  return html`
    <fieldset class="flex-col gap-xs form-step">
      <div><legend class="heading-style-h5">Dane firmy</legend></div>

      <div class="grid-2 gap-xs">
        <${Field} id="tax_number" label="NIP" required error=${errors.tax_number}>
          <input class=${"form_input w-input" + (errors.tax_number ? " is-validation-error" : "")}
            id="tax_number" name="tax_number"
            type="text" autocomplete="off" maxlength="13" minlength="10"
            placeholder="np. 6793077034"
            value=${data.tax_number}
            onInput=${(e) => onChange("tax_number", e.target.value)}
            onBlur=${(e) => onBlur("tax_number", e.target.value)} />
        </${Field}>
        <div class="form_field-wrapper">
          <div class="flex-col">
            <button type="button" onClick=${onNipLookup}
              class=${"button is-secondary" + (nipLoading ? " is-loading" : "")}>
              ${nipLoading ? "Pobieranie…" : "Pobierz dane"}
            </button>
          </div>
        </div>
      </div>

      ${
        nipError &&
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

      ${
        !nipFilled &&
        html`
          <div data-wf--better-workplace--system-box--variant="info" class="better-workplace--info-callout">
            <div>
              <svg viewBox="0 0 24 24" class="better-workplace--icon-svg w-variant-e9c02736-dc0b-1e38-719f-d7ef475aed6f">
                <use href="#info" viewBox="0 0 32 32"></use>
              </svg>
            </div>
            <div class="better-workplace--info-callout-text">
              <p>Podaj NIP, resztę uzupełnimy z GUS. Sprawdź czy dane są poprawne.</p>
            </div>
          </div>
        `
      }

      ${
        nipFilled &&
        html`
        <div class="grid-2-1 gap-xs">
          <${Field} id="company_name" label="Nazwa firmy" required error=${errors.company_name}>
            <input class=${"form_input w-input" + (errors.company_name ? " is-validation-error" : "")}
              id="company_name" name="company_name"
              type="text" autocomplete="organization" maxlength="256" placeholder="np. Polnex"
              value=${data.company_name}
              onInput=${(e) => onChange("company_name", e.target.value)}
              onBlur=${(e) => onBlur("company_name", e.target.value)} />
          </${Field}>
          <${Field} id="city" label="Miejscowość" required error=${errors.city}>
            <input class=${"form_input w-input" + (errors.city ? " is-validation-error" : "")}
              id="city" name="city"
              type="text" autocomplete="off" maxlength="256" placeholder="np. Warszawa"
              value=${data.city}
              onInput=${(e) => onChange("city", e.target.value)}
              onBlur=${(e) => onBlur("city", e.target.value)} />
          </${Field}>
        </div>

        <div class="grid-1-2 gap-xs">
          <${Field} id="company_workers" label="Liczba pracowników" required noIcon
            error=${errors.company_workers}>
            <select id="company_workers" name="company_workers"
              class=${"form_input is-select w-select" + (errors.company_workers ? " is-validation-error" : "")}
              value=${data.company_workers}
              style=${{ color: data.company_workers ? "var(--better-workplace---strong--strong-100-primary)" : "" }}
              onChange=${(e) => onChange("company_workers", e.target.value)}
              onBlur=${(e) => onBlur("company_workers", e.target.value)}>
              <option value="" disabled hidden>Wybierz</option>
              <option value="10-100">10-100</option>
              <option value="100-200">100-200</option>
              <option value="200-500">200-500</option>
              <option value="500-1000">500-1000</option>
              <option value="1000-2000">1000-2000</option>
              <option value="2000+">2000+</option>
            </select>
          </${Field}>
          <div class="form_field-wrapper">
            <label for="department" class="form_field-label">
              Reprezentowany dział (opcjonalnie)
            </label>
            <select id="department" name="department"
              class="form_input is-select w-select"
              value=${data.department}
              style=${{ color: data.department ? "var(--better-workplace---strong--strong-100-primary)" : "" }}
              onChange=${(e) => onChange("department", e.target.value)}>
              <option value="" disabled hidden>Wybierz dział</option>
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

function Step3({ data, onChange }) {
  return html`
    <fieldset class="flex-col gap-xs form-step">
      <div>
        <legend class="heading-style-h5">Zadaj pytanie lub zostaw sam kontakt</legend>
      </div>
      <div class="form_field-wrapper">
        <label for="f_message" class="form_field-label">Wiadomość (opcjonalnie)</label>
        <textarea
          id="f_message"
          name="f_message"
          maxlength="5000"
          rows="7"
          placeholder="Np. interesują nas owoce i kawa dla 50 osób w biurze w Warszawie."
          class="form_input is-text-area w-input"
          onInput=${(e) => onChange("f_message", e.target.value)}
        >
${data.f_message}</textarea
        >
      </div>
      <label class="w-checkbox form_checkbox">
        <div
          class=${"w-checkbox-input w-checkbox-input--inputType-custom form_checkbox-icon" +
          (data.agreemrk ? " w--redirected-checked" : "")}
        ></div>
        <input
          type="checkbox"
          id="agreemrk"
          name="agreemrk"
          checked=${data.agreemrk}
          onChange=${(e) => onChange("agreemrk", e.target.checked)}
          style="opacity:0;position:absolute;z-index:-1"
        />
        <span class="form_checkbox-label w-form-label" for="agreemrk">
          Chcę otrzymywać od Betterworkplace Sp. z o.o. newslettera o tematyce benefitów pozapłacowych
        </span>
      </label>
      <p class="form_checkbox-label text-size-xs">
        Wysyłając ten formularz, wyrażasz zgodę na przetwarzanie Twoich danych przez Betterworkplace Sp. z o.o. i kontakt z Tobą w celu
        realizacji Twojego zapytania. Aby dowiedzieć się więcej o tym, jak dbamy o ochronę i poszanowanie Twojej prywatności, zapoznaj się z
        naszą${" "}
        <a href="https://www.betterworkplace.pl/privacy-policy" class="text-style-link-sm">Polityką prywatności</a>.
      </p>
    </fieldset>
  `;
}

// ─── app ─────────────────────────────────────────────────────────────────────

function App() {
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
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [nipLoading, setNipLoading] = useState(false);
  const [nipError, setNipError] = useState("");
  const [nipFilled, setNipFilled] = useState(false);

  // Get parent page URL and brand — via postMessage when in iframe, directly otherwise
  useEffect(() => {
    if (window === window.parent) {
      const href = window.location.href;
      setData((prev) => ({ ...prev, url: href, brand: extractBrand(href) }));
      return;
    }
    const handler = (e) => {
      if (e.data?.type !== "bwp:info") return;
      setData((prev) => ({
        ...prev,
        ...(e.data.url ? { url: e.data.url } : {}),
        ...(e.data.brand ? { brand: e.data.brand } : e.data.url ? { brand: extractBrand(e.data.url) } : {}),
      }));
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "bwp:request-info" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  // Tell the parent iframe how tall we are so it can resize
  useEffect(() => {
    if (typeof ResizeObserver === "undefined" || window === window.parent) return;
    const obs = new ResizeObserver(() => {
      window.parent.postMessage({ type: "bwp:resize", height: document.documentElement.scrollHeight }, "*");
    });
    obs.observe(document.documentElement);
    return () => obs.disconnect();
  }, []);

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
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  }, [step, data]);

  const goBack = useCallback(() => {
    setStep((s) => s - 1);
    window.scrollTo(0, 0);
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
      if (data.website) {
        setStatus("success");
        return;
      } // honeypot
      setStatus("submitting");
      try {
        await submitToWebflow(data);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    },
    [data],
  );

  if (status === "success") {
    return html`
      <div class="padding-xs">
        <div class="form_message-success w-form-done" style="display:block">
          <div data-wf--better-workplace--form-success-error-message--form-type="zapytanie" class="better-workplace--form_message">
            <img
              width="200"
              loading="lazy"
              alt=""
              src="https://cdn.prod.website-files.com/698dfabcdd705500e5451b80/69bf0c5d6a239b30c2a0bdb7_8545e3aafd9ab74c802300e1c7cfe012_mail-success.avif"
              class="better-workplace--form_message_img"
            />
            <div class="better-workplace--form_message_text">
              <p class="better-workplace--heading-style-h5">Dziękujemy!<br />Twoje zapytanie zostało wysłane.</p>
              <p class="better-workplace--text-size-md">
                Nasz konsultant skontaktuje się z Tobą w ciągu 24h (dni robocze), aby omówić szczegóły dostępnej oferty.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const currentStepHasErrors = (STEP_REQUIRED[step] || []).some((f) => errors[f]);

  return html`
    <div class="padding-xs">
      <div id="form-component" class="form_component w-form">
        <${StepIndicator} current=${step} />

        <form
          id="zapytanie"
          method="post"
          novalidate
          class="flex-col gap-md"
          onSubmit=${handleSubmit}
        >
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
          ${step === 3 && html`<${Step3} data=${data} onChange=${onChange} />`}

          <div class="form-nav">
            <div class="form-nav_left">
              ${step > 1 && html` <button type="button" class="button is-secondary" onClick=${goBack}>Wstecz</button> `}
            </div>
            <div class="form-nav_right">
              ${step < 3 &&
              html`
                <button type="button" class=${"button" + (currentStepHasErrors ? " is-inactive" : "")} onClick=${goNext}>Dalej</button>
              `}
              ${step === 3 &&
              html`
                <button
                  type="submit"
                  class=${"button" + (currentStepHasErrors || status === "submitting" ? " is-inactive" : "")}
                  disabled=${status === "submitting"}
                >
                  ${status === "submitting" ? "Wysyłam…" : "Chcę otrzymać ofertę!"}
                </button>
              `}
            </div>
          </div>

          ${status === "error" &&
          html`
            <div class="form_message-error w-form-fail" style="display:block">
              <div data-wf--better-workplace--system-box--variant="error" class="better-workplace--info-callout">
                <div>
                  <svg viewBox="0 0 24 24" class="better-workplace--icon-svg">
                    <use href="#error" viewBox="0 0 32 32"></use>
                  </svg>
                </div>
                <div class="better-workplace--info-callout-text">
                  <p>
                    Nie udało się wysłać. Spróbuj ponownie lub napisz:${" "}
                    <a href="mailto:biuro@betterworkplace.pl?subject=B%C5%82%C4%85d%20formularza"> biuro@betterworkplace.pl </a>
                  </p>
                </div>
              </div>
            </div>
          `}

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
      </div>
    </div>
  `;
}

// <p class="form_checkbox-label" style="display:none">
//   <span class="form_required">*</span>pola wymagane
// </p>

render(html`<${App} />`, document.getElementById("app"));
