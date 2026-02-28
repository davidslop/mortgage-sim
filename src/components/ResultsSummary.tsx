import type { KPIs } from '../lib/types';

interface Props {
  kpis: KPIs | null;
}

function eur(n: number): string {
  return n.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

export default function ResultsSummary({ kpis }: Props) {
  if (!kpis) {
    return (
      <section className="card kpis">
        <h2>📊 Resumen</h2>
        <p className="muted">Introduce los datos para ver los KPIs.</p>
      </section>
    );
  }

  return (
    <section className="card kpis">
      <h2>📊 Resumen (KPIs)</h2>
      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-label">Intereses totales</span>
          <span className="kpi-value">{eur(kpis.totalInterest)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Total amort. extra aplicada</span>
          <span className="kpi-value">{eur(kpis.totalExtraApplied)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Total pagos (cuotas)</span>
          <span className="kpi-value">{eur(kpis.totalPayments)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Total pagos (cuotas + extras)</span>
          <span className="kpi-value">{eur(kpis.totalPaymentsWithExtra)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Mes de cancelación</span>
          <span className="kpi-value">
            {kpis.cancellationMonth !== null
              ? `Mes ${kpis.cancellationMonth}`
              : '—'}
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Años restantes</span>
          <span className="kpi-value">
            {kpis.remainingYears !== null
              ? `${kpis.remainingYears.toFixed(1)} años`
              : '—'}
          </span>
        </div>
      </div>
    </section>
  );
}
