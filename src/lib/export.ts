import type { MortgageInputs, AmortizationEntry, ScheduleRow } from './types';

// ── CSV Export ───────────────────────────────────────────────────────

const CSV_HEADERS = [
  'Mes', 'Año', 'Tipo anual %', 'Cuota', 'Plazo restante',
  'Saldo inicial', 'Saldo tras extra', 'Saldo final',
  'Interés', 'Amort. principal', 'Extra planif.', 'Extra aplicada',
  'Extra acum. año', 'Tope año', 'Extra no aplicada', 'Avisos',
];

function formatNum(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

export function scheduleToCSV(schedule: ScheduleRow[]): string {
  const lines: string[] = [CSV_HEADERS.join(';')];
  for (const r of schedule) {
    lines.push([
      r.month,
      r.year,
      (r.annualRate * 100).toFixed(3).replace('.', ','),
      formatNum(r.payment),
      r.remainingTerm,
      formatNum(r.openingBalance),
      formatNum(r.balanceAfterExtra),
      formatNum(r.closingBalance),
      formatNum(r.interest),
      formatNum(r.principalInPayment),
      formatNum(r.extraPlanned),
      formatNum(r.extraApplied),
      formatNum(r.extraAccumulatedYear),
      formatNum(r.yearCap),
      formatNum(r.extraNotApplied),
      r.flags.join(' | '),
    ].join(';'));
  }
  return lines.join('\n');
}

// ── JSON Export / Import ─────────────────────────────────────────────

export interface ScenarioJSON {
  version: string;
  exportedAt: string;
  inputs: MortgageInputs;
  amortizations: AmortizationEntry[];
}

const CURRENT_VERSION = '1.0';

export function exportScenarioJSON(
  inputs: MortgageInputs,
  amortizations: AmortizationEntry[],
): string {
  const data: ScenarioJSON = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    inputs,
    amortizations,
  };
  return JSON.stringify(data, null, 2);
}

export function importScenarioJSON(
  json: string,
): { inputs: MortgageInputs; amortizations: AmortizationEntry[] } {
  const data = JSON.parse(json) as ScenarioJSON;
  if (!data.version) throw new Error('Archivo no válido: falta versión');
  if (!data.inputs || !data.amortizations)
    throw new Error('Archivo no válido: faltan datos');
  return { inputs: data.inputs, amortizations: data.amortizations };
}

// ── File download helpers ────────────────────────────────────────────

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(schedule: ScheduleRow[]) {
  downloadBlob(scheduleToCSV(schedule), 'cuadro_hipoteca.csv', 'text/csv;charset=utf-8');
}

export function downloadJSON(inputs: MortgageInputs, amortizations: AmortizationEntry[]) {
  downloadBlob(
    exportScenarioJSON(inputs, amortizations),
    'escenario_hipoteca.json',
    'application/json',
  );
}
