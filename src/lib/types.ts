// ── Types ─────────────────────────────────────────────────────────────

export type AmortizationMode = 'reduce-payment' | 'reduce-term';
export type YearMode = 'blocks' | 'natural';

/** Mortgage configuration inputs */
export interface MortgageInputs {
  principal: number;            // EUR
  termMonths: number;           // total months
  fixedMonths: number;          // months in fixed-rate tranche
  fixedAnnualRate: number;      // e.g. 0.014 for 1.40 %
  euribor: number;              // e.g. 0.03 for 3.00 %
  spread: number;               // e.g. 0.0035 for 0.35 %
  capRate: number;              // annual extra-amortization cap, e.g. 0.20
  yearMode: YearMode;
  startYearMonth: string;       // YYYY-MM  (required when yearMode === 'natural')
}

/** Computed convenience field */
export function variableAnnualRate(inputs: MortgageInputs): number {
  return inputs.euribor + inputs.spread;
}

/** Single extra-amortization entry */
export interface AmortizationEntry {
  id: string;
  month: number;
  amount: number;
  mode: AmortizationMode;
  comment: string;
}

/** One row of the monthly schedule */
export interface ScheduleRow {
  month: number;
  year: number;
  annualRate: number;
  payment: number;
  remainingTerm: number;
  openingBalance: number;
  balanceAfterExtra: number;
  closingBalance: number;
  interest: number;
  principalInPayment: number;
  extraPlanned: number;
  extraApplied: number;
  extraAccumulatedYear: number;
  yearCap: number;
  extraNotApplied: number;
  flags: string[];
}

/** Aggregate KPIs */
export interface KPIs {
  totalInterest: number;
  totalExtraApplied: number;
  totalPayments: number;
  totalPaymentsWithExtra: number;
  cancellationMonth: number | null;
  remainingYears: number | null;
}
