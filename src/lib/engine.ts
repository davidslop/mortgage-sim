import {
  type MortgageInputs,
  type AmortizationEntry,
  type AmortizationMode,
  type ScheduleRow,
  type KPIs,
  variableAnnualRate,
} from './types';
import { PMT, NPER } from './finance';

// ── Helpers ──────────────────────────────────────────────────────────

interface MonthExtra {
  totalAmount: number;
  mode: AmortizationMode;
}

/**
 * Group amortization entries by month.
 * If a month has mixed modes, priority: reduce-payment wins.
 */
function groupByMonth(entries: AmortizationEntry[]): Map<number, MonthExtra> {
  const map = new Map<number, MonthExtra>();
  // sort by month, then reduce-payment first (priority)
  const sorted = [...entries].sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    return a.mode === 'reduce-payment' ? -1 : 1;
  });
  for (const e of sorted) {
    const existing = map.get(e.month);
    if (existing) {
      existing.totalAmount += e.amount;
      // keep the first mode (reduce-payment has priority because of sort)
    } else {
      map.set(e.month, { totalAmount: e.amount, mode: e.mode });
    }
  }
  return map;
}

/**
 * Compute calendar year for a given mortgage month in "natural" mode.
 */
function calendarYear(m: number, startYear: number, startMonth: number): number {
  return startYear + Math.floor((startMonth - 1 + m - 1) / 12);
}

function calendarMonth(m: number, startMonth: number): number {
  return ((startMonth - 1 + m - 1) % 12) + 1;
}

// ── Engine ───────────────────────────────────────────────────────────

export interface CalculationResult {
  schedule: ScheduleRow[];
  kpis: KPIs;
}

export function calculateSchedule(
  inputs: MortgageInputs,
  amortizations: AmortizationEntry[],
): CalculationResult {
  const THRESHOLD = 0.01;
  const schedule: ScheduleRow[] = [];
  const extraByMonth = groupByMonth(amortizations);

  const varRate = variableAnnualRate(inputs);

  let balance = inputs.principal;
  let remainingTerm = inputs.termMonths;

  // Initial monthly rate & payment
  const initialAnnualRate =
    inputs.fixedMonths > 0 ? inputs.fixedAnnualRate : varRate;
  const initialMonthlyRate = initialAnnualRate / 12;
  let currentPayment = PMT(initialMonthlyRate, remainingTerm, balance);
  let prevMonthlyRate = initialMonthlyRate;

  // Year tracking for annual cap
  let yearBaseBalance = balance;
  let extraAccumulatedYear = 0;
  let currentYearTag = -1; // sentinel

  // Natural year parsing
  let sYear = 0;
  let sMonth = 1;
  if (inputs.yearMode === 'natural' && inputs.startYearMonth) {
    const parts = inputs.startYearMonth.split('-').map(Number);
    sYear = parts[0];
    sMonth = parts[1];
  }

  // Safety limit to avoid infinite loops
  const maxIterations = inputs.termMonths + 1000;

  for (let m = 1; m <= maxIterations && remainingTerm > 0 && balance > THRESHOLD; m++) {
    const flags: string[] = [];

    // 1. Determine annual rate
    const isFixed = m <= inputs.fixedMonths;
    const annualRate = isFixed ? inputs.fixedAnnualRate : varRate;
    const monthlyRate = annualRate / 12;

    // Rate transition → recalculate payment
    if (Math.abs(monthlyRate - prevMonthlyRate) > 1e-12) {
      currentPayment = PMT(monthlyRate, remainingTerm, balance);
      prevMonthlyRate = monthlyRate;
    }

    // 2. Determine year tag
    let yearTag: number;
    if (inputs.yearMode === 'blocks') {
      yearTag = Math.ceil(m / 12);
    } else {
      yearTag = calendarYear(m, sYear, sMonth);
    }

    // New year boundary
    if (yearTag !== currentYearTag) {
      yearBaseBalance = balance;
      extraAccumulatedYear = 0;
      currentYearTag = yearTag;
    }

    const yearCap = inputs.capRate * yearBaseBalance;
    const capRemaining = Math.max(0, yearCap - extraAccumulatedYear);

    // 3. Planned extra
    const info = extraByMonth.get(m);
    const extraPlanned = info?.totalAmount ?? 0;
    const extraMode: AmortizationMode = info?.mode ?? 'reduce-payment';

    // 4. Applicable extra (respecting cap & balance)
    const extraApplied = Math.min(extraPlanned, capRemaining, balance);
    const extraNotApplied = extraPlanned - extraApplied;
    if (extraNotApplied > 0.001) {
      flags.push('EXTRA_RECORTADA_POR_TOPE');
    }
    extraAccumulatedYear += extraApplied;

    // 5. Apply extra at start of month
    const openingBalance = balance;
    balance -= extraApplied;
    const balanceAfterExtra = balance;

    // 6. Recalculate payment or term if extra applied
    if (extraApplied > 0.001 && balance > THRESHOLD) {
      if (extraMode === 'reduce-payment') {
        // keep remaining term, recalculate payment
        currentPayment = PMT(monthlyRate, remainingTerm, balance);
        prevMonthlyRate = monthlyRate;
      } else {
        // keep payment, recalculate remaining term
        const raw = NPER(monthlyRate, currentPayment, balance);
        if (!isFinite(raw) || raw <= 0) {
          remainingTerm = 1;
        } else {
          remainingTerm = Math.max(1, Math.ceil(raw));
        }
      }
    }

    // 7. Monthly interest
    const interest = balance * monthlyRate;

    // 8. Principal in payment + handle last-month / insufficient payment
    let actualPayment: number;
    let principalInPayment: number;

    if (currentPayment <= interest && balance > THRESHOLD) {
      flags.push('CUOTA_INSUFICIENTE');
      actualPayment = currentPayment;
      principalInPayment = Math.max(0, currentPayment - interest);
    } else {
      // Normal case (possibly last month)
      actualPayment = Math.min(currentPayment, interest + balance);
      principalInPayment = Math.max(0, actualPayment - interest);
    }

    // 9. Closing balance
    balance = Math.max(0, balance - principalInPayment);

    schedule.push({
      month: m,
      year: yearTag,
      annualRate,
      payment: actualPayment,
      remainingTerm,
      openingBalance,
      balanceAfterExtra,
      closingBalance: balance,
      interest,
      principalInPayment,
      extraPlanned,
      extraApplied,
      extraAccumulatedYear,
      yearCap,
      extraNotApplied,
      flags,
    });

    remainingTerm--;

    if (balance <= THRESHOLD) break;
  }

  // ── KPIs ──────────────────────────────────────────────────────────
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);
  const totalExtraApplied = schedule.reduce((s, r) => s + r.extraApplied, 0);
  const totalPayments = schedule.reduce((s, r) => s + r.payment, 0);
  const totalPaymentsWithExtra = totalPayments + totalExtraApplied;

  const lastRow = schedule.length > 0 ? schedule[schedule.length - 1] : null;
  const cancellationMonth =
    lastRow && lastRow.closingBalance <= THRESHOLD ? lastRow.month : null;
  const remainingYears = cancellationMonth !== null ? cancellationMonth / 12 : null;

  return {
    schedule,
    kpis: {
      totalInterest,
      totalExtraApplied,
      totalPayments,
      totalPaymentsWithExtra,
      cancellationMonth,
      remainingYears,
    },
  };
}
