import { useState, useMemo } from 'react';
import type { ScheduleRow } from '../lib/types';

interface Props {
  schedule: ScheduleRow[];
}

function eur(n: number): string {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pct(n: number): string {
  return (n * 100).toFixed(3) + ' %';
}

const PAGE_SIZE = 60;

export default function ScheduleTable({ schedule }: Props) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'extras' | 'flags'>('all');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'extras':
        return schedule.filter((r) => r.extraApplied > 0);
      case 'flags':
        return schedule.filter((r) => r.flags.length > 0);
      default:
        return schedule;
    }
  }, [schedule, filter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section className="card schedule-table">
      <div className="schedule-header">
        <h2>📅 Cuadro de amortización mensual</h2>
        <div className="schedule-controls">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as typeof filter);
              setPage(0);
            }}
          >
            <option value="all">Todos ({schedule.length} meses)</option>
            <option value="extras">
              Con extras ({schedule.filter((r) => r.extraApplied > 0).length})
            </option>
            <option value="flags">
              Con avisos ({schedule.filter((r) => r.flags.length > 0).length})
            </option>
          </select>
        </div>
      </div>

      <div className="table-scroll">
        <table className="schedule">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Año</th>
              <th>Tipo</th>
              <th>Cuota</th>
              <th>Plazo rest.</th>
              <th>Saldo inicial</th>
              <th>Extra aplic.</th>
              <th>Saldo tras extra</th>
              <th>Interés</th>
              <th>Amort. ppal.</th>
              <th>Saldo final</th>
              <th>Extra acum. año</th>
              <th>Tope año</th>
              <th>Avisos</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr
                key={r.month}
                className={
                  r.flags.length > 0
                    ? 'row-warning'
                    : r.extraApplied > 0
                    ? 'row-extra'
                    : ''
                }
              >
                <td className="num">{r.month}</td>
                <td className="num">{r.year}</td>
                <td className="num">{pct(r.annualRate)}</td>
                <td className="num">{eur(r.payment)}</td>
                <td className="num">{r.remainingTerm}</td>
                <td className="num">{eur(r.openingBalance)}</td>
                <td className="num">{r.extraApplied > 0 ? eur(r.extraApplied) : '—'}</td>
                <td className="num">{eur(r.balanceAfterExtra)}</td>
                <td className="num">{eur(r.interest)}</td>
                <td className="num">{eur(r.principalInPayment)}</td>
                <td className="num">{eur(r.closingBalance)}</td>
                <td className="num">{eur(r.extraAccumulatedYear)}</td>
                <td className="num">{eur(r.yearCap)}</td>
                <td className="flags">
                  {r.flags.map((f) => (
                    <span key={f} className="flag" title={f}>
                      {f === 'EXTRA_RECORTADA_POR_TOPE' ? '⚠️ Tope' : '⚠️'}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            ← Anterior
          </button>
          <span>
            Página {page + 1} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}
    </section>
  );
}
