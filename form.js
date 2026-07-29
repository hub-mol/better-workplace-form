import { initForm as initCoreForm, destroyForm } from "./form-core.js";

export const FORM_SETUP = {
  formName: "zapytanie",
  formType: "zapytanie",
  buttons: {
    submit: "Chcę otrzymać ofertę!",
    shortsubmit: "Zapytaj o ofertę",
  },
  success: {
    heading: "Dziękujemy!",
    subheading: "Twoje zapytanie zostało wysłane.",
    description:
      "Nasz konsultant skontaktuje się z Tobą w ciągu 24h (dni robocze), aby omówić szczegóły dostępnej oferty.",
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
        {
          fields: [
            {
              name: "phone",
              type: "tel",
              label: "Telefon",
              placeholder: "111 222 333",
              autocomplete: "tel",
              minLength: 9,
              maxLength: 16,
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
      id: "question",
      heading: "Zadaj pytanie",
      consent: true,
      rows: [
        {
          fields: [
            {
              name: "f_message",
              type: "textarea",
              label: "Wiadomość (opcjonalnie)",
              placeholder: "Np. interesują nas owoce i kawa dla 50 osób w biurze w Warszawie.",
              maxLength: 5000,
              rows: 7,
              required: false,
              noIcon: true,
            },
          ],
        },
      ],
    },
  ],
};

export function initForm() {
  return initCoreForm(FORM_SETUP);
}

export { destroyForm };

initForm();
