import { initForm as initCoreForm, destroyForm } from "./form-core.js";
import { CONTACT_SECTION, COMPANY_SECTION, QUESTION_SECTION } from "./shared-sections.js";

export const DAILYFRUITS_FORM_SETUP = {
  tabs: false,
  labelAbove: true,
  debug: false,
  brand: "Dailyfruits",
  marketing: true,
  formName: "zapytanie",
  formType: "zapytanie",
  buttons: {
    submit: "Chcę otrzymać ofertę!",
    shortsubmit: "Zapytaj o ofertę",
  },
  legal: {
    companyName: "Dailyfruits Sp. z o.o.",
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
  sections: [CONTACT_SECTION, COMPANY_SECTION, QUESTION_SECTION],
};

export function initForm() {
  return initCoreForm(DAILYFRUITS_FORM_SETUP);
}

export { destroyForm };

initForm();
