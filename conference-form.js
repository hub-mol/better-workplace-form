import { initForm as initCoreForm, destroyForm } from "./form-core.js";

export const CONFERENCE_FORM_SETUP = {
  noTabs: true,
  marketing: true,
  formName: "zapytanie",
  formType: "rejestracja-bmhr",
  buttons: {
    submit: "Wyślij zgłoszenie",
    shortsubmit: "Wyślij",
  },
  sections: [
    {
      id: "contact",
      heading: "Dane kontaktowe",
      rows: [
        {
          layout: "grid-2",
          fields: [
            {
              name: "first_name",
              type: "text",
              label: "Imię",
              placeholder: "np. Jan",
              autocomplete: "given-name",
              required: true,
            },
            {
              name: "last_name",
              type: "text",
              label: "Nazwisko",
              placeholder: "np. Kowalski",
              autocomplete: "family-name",
              required: true,
            },
          ],
        },
        {
          fields: [
            {
              name: "email",
              type: "email",
              label: "Email służbowy",
              placeholder: "np. jan.kowalski@firma.pl",
              autocomplete: "email",
              required: true,
            },
          ],
        },
      ],
    },
    {
      id: "company",
      heading: "Dane firmy",
      lookup: {
        field: "tax_number",
        reveal: ["company_name", "city", "company_workers", "department"],
      },
      rows: [
        {
          layout: "grid-2",
          fields: [
            {
              name: "tax_number",
              type: "text",
              label: "NIP",
              placeholder: "np. 6793077034",
              minLength: 10,
              maxLength: 13,
              required: true,
            },
          ],
        },
        {
          layout: "grid-2-1",
          fields: [
            {
              name: "company_name",
              type: "text",
              label: "Nazwa firmy",
              placeholder: "np. Polnex",
              autocomplete: "organization",
              required: true,
            },
            {
              name: "city",
              type: "text",
              label: "Miejscowość",
              placeholder: "np. Warszawa",
              required: true,
            },
          ],
        },
        {
          layout: "grid-1-2",
          fields: [
            {
              name: "company_workers",
              type: "select",
              label: "Liczba pracowników",
              placeholder: "Wybierz",
              required: true,
              options: [
                { value: "10-100", label: "10-100" },
                { value: "100-200", label: "100-200" },
                { value: "200-500", label: "200-500" },
                { value: "500-1000", label: "500-1000" },
                { value: "1000-2000", label: "1000-2000" },
                { value: "2000+", label: "2000+" },
              ],
            },
            {
              name: "department",
              type: "select",
              label: "Reprezentowany dział (opcjonalnie)",
              placeholder: "Wybierz dział",
              required: false,
              options: [
                { value: "HR", label: "HR" },
                { value: "Office", label: "Office" },
                { value: "Zaopatrzenie", label: "Zaopatrzenie" },
                { value: "Facility", label: "Facility" },
                { value: "Inny", label: "Inny" },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "conference",
      heading: "Wybierz konferencję",
      consent: true,
      rows: [
        {
          fields: [
            {
              name: "conference",
              type: "select",
              label: "Termin i lokalizacja",
              placeholder: "Wybierz termin",
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
    },
  ],
};

export function initForm() {
  return initCoreForm(CONFERENCE_FORM_SETUP);
}

export { destroyForm };

initForm();
