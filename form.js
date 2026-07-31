import { initForm as initCoreForm, destroyForm } from "./form-core.js";
import { CONTACT_PHONE_SECTION, COMPANY_SECTION, QUESTION_SECTION } from "./shared-sections.js";

const params = new URLSearchParams(window.location.search);
const flag = (name, fallback) => {
  const value = params.get(name);
  return value === null ? fallback : !["0", "false", "no"].includes(value.toLowerCase());
};

export const FORM_SETUP = {
  tabs: flag("tabs", true),
  labelAbove: flag("labelAbove", false),
  debug: flag("debug", false),
  brand: params.get("brand") || "",
  marketing: flag("marketing", false),
  formName: "zapytanie",
  formType: "zapytanie",
  buttons: {
    submit: "Chcę otrzymać ofertę!",
    shortsubmit: "Zapytaj o ofertę",
  },
  legal: {
    companyName: params.get("company") || "Betterworkplace Sp. z o.o.",
    privacyUrl: "https://www.betterworkplace.pl/privacy-policy",
  },
  error: {
    email: "biuro@betterworkplace.pl",
  },
  success: {
    heading: "Dziękujemy!",
    subheading: "Twoje zapytanie zostało wysłane.",
    description:
      "Nasz konsultant skontaktuje się z Tobą w ciągu 24h (dni robocze), aby omówić szczegóły dostępnej oferty.",
  },
  sections: [CONTACT_PHONE_SECTION, COMPANY_SECTION, QUESTION_SECTION],
};

export function initForm() {
  return initCoreForm(FORM_SETUP);
}

export { destroyForm };

initForm();
