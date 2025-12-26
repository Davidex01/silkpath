export interface HSCodeMeta {
  code: string;
  label: string;
  duty: number;
  vat: number;
}

export const HS_CODES: HSCodeMeta[] = [
  {
    code: '8518.30',
    label: '8518.30 — Headphones & Earphones',
    duty: 0.05,
    vat: 0.2,
  },
  {
    code: '8517.62',
    label: '8517.62 — Wireless communication devices',
    duty: 0.1,
    vat: 0.2,
  },
  {
    code: '3923.21',
    label: '3923.21 — Plastic bags/packaging',
    duty: 0.06,
    vat: 0.2,
  },
];