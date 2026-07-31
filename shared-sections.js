const CONTACT_NAMES_ROW = {
  layout: "grid-2",
  fields: [
    { name: "first_name", type: "text", label: "Imię", required: true },
    { name: "last_name", type: "text", label: "Nazwisko", required: true },
  ],
};

const EMAIL_FIELD = {
  name: "email",
  type: "email",
  label: "Email służbowy",
  validation: "business",
  required: true,
};

export const CONTACT_SECTION = {
  id: "contact",
  heading: "Dane kontaktowe",
  rows: [CONTACT_NAMES_ROW, { fields: [EMAIL_FIELD] }],
};

export const CONTACT_PHONE_SECTION = {
  id: "contact",
  heading: "Dane kontaktowe",
  rows: [
    CONTACT_NAMES_ROW,
    {
      layout: "grid-2-1",
      fields: [
        EMAIL_FIELD,
        {
          name: "phone",
          type: "tel",
          label: "Telefon",
          minLength: 9,
          maxLength: 16,
          required: true,
        },
      ],
    },
  ],
};

export const COMPANY_SECTION = {
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
          required: true,
        },
        {
          name: "city",
          type: "text",
          label: "Miejscowość",
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
};

export const QUESTION_SECTION = {
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
          maxLength: 5000,
          rows: 7,
          required: false,
          noIcon: true,
        },
      ],
    },
  ],
};

export const CONSENTS_SECTION = {
  id: "consents",
  consent: true,
  rows: [],
};
