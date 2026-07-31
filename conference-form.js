import { initForm as initCoreForm, destroyForm } from "./form-core.js";
import { CONTACT_SECTION, COMPANY_SECTION, CONSENTS_SECTION } from "./shared-sections.js";

const CONFERENCE_SECTION = {
  id: "conference",
  heading: "Wybierz konferencję",
  rows: [
    {
      fields: [
        {
          name: "conference",
          type: "select",
          label: "Termin i lokalizacja",
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
};

export const CONFERENCE_FORM_SETUP = {
  tabs: true,
  labelAbove: false,
  debug: false,
  brand: "BetterMinds",
  marketing: true,
  formName: "zapytanie",
  formType: "rejestracja-bmhr",
  buttons: {
    submit: "Wyślij zgłoszenie",
    shortsubmit: "Wyślij",
  },
  legal: {
    companyName: "Betterworkplace Sp. z o.o.",
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
  sections: [CONTACT_SECTION, CONFERENCE_SECTION, COMPANY_SECTION, CONSENTS_SECTION],
};

export function initForm() {
  return initCoreForm(CONFERENCE_FORM_SETUP);
}

export { destroyForm };

initForm();
