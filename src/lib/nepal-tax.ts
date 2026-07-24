// Nepal income tax — FY 2082/83 (2025/26).
// Slabs verified against multiple Nepal tax/legal sources; unchanged from
// FY 2081/82. Rates apply to *taxable* income (after deductions).
//
// The first 1% slab is Social Security Tax (SST). Employees who contribute
// to the Social Security Fund (SSF) are exempt from that 1%, so their first
// slab is effectively 0%.

export type Status = 'individual' | 'couple';

interface Band {
  /** Width of this band in rupees; Infinity for the top band. */
  size: number;
  rate: number; // as a fraction, e.g. 0.10
  label: string;
}

// Bands are expressed as widths so the progressive walk is simple.
const INDIVIDUAL: Band[] = [
  { size: 500000, rate: 0.01, label: 'First Rs 5,00,000' },
  { size: 200000, rate: 0.10, label: 'Next Rs 2,00,000' },
  { size: 300000, rate: 0.20, label: 'Next Rs 3,00,000' },
  { size: 1000000, rate: 0.30, label: 'Next Rs 10,00,000' },
  { size: 3000000, rate: 0.36, label: 'Next Rs 30,00,000' },
  { size: Infinity, rate: 0.39, label: 'Above Rs 50,00,000' },
];

const COUPLE: Band[] = [
  { size: 600000, rate: 0.01, label: 'First Rs 6,00,000' },
  { size: 200000, rate: 0.10, label: 'Next Rs 2,00,000' },
  { size: 300000, rate: 0.20, label: 'Next Rs 3,00,000' },
  { size: 900000, rate: 0.30, label: 'Next Rs 9,00,000' },
  { size: 3000000, rate: 0.36, label: 'Next Rs 30,00,000' },
  { size: Infinity, rate: 0.39, label: 'Above Rs 50,00,000' },
];

export interface TaxInput {
  grossAnnual: number;
  status: Status;
  /** Retirement contribution: SSF / EPF / CIT. Deductible up to the cap. */
  retirement: number;
  /** Life + health insurance premiums paid. */
  insurance: number;
  /** SSF member? If so, the 1% SST on the first band is waived. */
  ssfMember: boolean;
}

export interface TaxBandResult {
  label: string;
  rate: number;
  taxable: number;
  tax: number;
}

export interface TaxResult {
  deductions: number;
  taxableIncome: number;
  bands: TaxBandResult[];
  totalTax: number;
  effectiveRate: number; // on gross
  takeHome: number;
}

const RETIREMENT_ABS_CAP = 500000;         // Rs 5 lakh
const INSURANCE_CAP = 60000;               // life 40k + health 20k

export function computeTax(input: TaxInput): TaxResult {
  const gross = Math.max(0, input.grossAnnual || 0);

  // Retirement deduction: min(contribution, Rs 5 lakh, 1/3 of gross).
  const retirementCap = Math.min(RETIREMENT_ABS_CAP, gross / 3);
  const retirement = Math.min(Math.max(0, input.retirement || 0), retirementCap);
  const insurance = Math.min(Math.max(0, input.insurance || 0), INSURANCE_CAP);
  const deductions = retirement + insurance;

  const taxable = Math.max(0, gross - deductions);
  const bands = input.status === 'couple' ? COUPLE : INDIVIDUAL;

  const results: TaxBandResult[] = [];
  let remaining = taxable;
  let totalTax = 0;

  bands.forEach((band, i) => {
    if (remaining <= 0) return;
    const inBand = Math.min(remaining, band.size);
    // First band 1% SST is waived for SSF members.
    const rate = i === 0 && input.ssfMember ? 0 : band.rate;
    const tax = inBand * rate;
    if (inBand > 0) {
      results.push({ label: band.label, rate, taxable: inBand, tax });
    }
    totalTax += tax;
    remaining -= inBand;
  });

  return {
    deductions,
    taxableIncome: taxable,
    bands: results,
    totalTax,
    effectiveRate: gross > 0 ? totalTax / gross : 0,
    takeHome: gross - totalTax,
  };
}

/** Nepali-style grouping: Rs 12,34,567 (lakh/crore comma placement). */
export function formatNpr(n: number): string {
  const rounded = Math.round(n);
  const s = Math.abs(rounded).toString();
  if (s.length <= 3) return `${rounded < 0 ? '-' : ''}Rs ${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rounded < 0 ? '-' : ''}Rs ${rest},${last3}`;
}
