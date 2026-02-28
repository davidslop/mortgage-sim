/**
 * Financial functions for mortgage calculations.
 * All rates are MONTHLY unless stated otherwise.
 */

/**
 * PMT – fixed monthly payment for a fully amortizing loan.
 * @param rate  monthly interest rate (annualRate / 12)
 * @param nper  number of remaining periods (months)
 * @param pv    present value (outstanding balance)
 */
export function PMT(rate: number, nper: number, pv: number): number {
  if (nper <= 0) return 0;
  if (pv <= 0) return 0;
  if (rate === 0) return pv / nper;
  return (pv * rate) / (1 - Math.pow(1 + rate, -nper));
}

/**
 * NPER – number of periods needed to pay off a loan.
 * @param rate  monthly interest rate
 * @param pmt   monthly payment
 * @param pv    present value (outstanding balance)
 * @returns number of periods (may be fractional; caller should ceil)
 */
export function NPER(rate: number, pmt: number, pv: number): number {
  if (pv <= 0) return 0;
  if (pmt <= 0) return Infinity;
  if (rate === 0) return pv / pmt;
  const x = 1 - (pv * rate) / pmt;
  if (x <= 0) return Infinity;           // payment doesn't cover interest
  return -Math.log(x) / Math.log(1 + rate);
}
