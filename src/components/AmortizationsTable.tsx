import { useCallback, useState, useEffect, useRef } from 'react';
import type { AmortizationEntry, AmortizationMode } from '../lib/types';

/* Editable numeric cell – free typing, commits on blur / Enter */
function NumericCell({
  value,
  onCommit,
  className,
  min,
  step,
  integer,
}: {
  value: number;
  onCommit: (v: number) => void;
  className?: string;
  min?: number;
  step?: string;
  integer?: boolean;
}) {
  const [text, setText] = useState(() => String(value));
  const [editing, setEditing] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (!editing && value !== prev.current) {
      setText(String(value));
      prev.current = value;
    }
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const parsed = integer ? parseInt(text, 10) : parseFloat(text);
    if (!isNaN(parsed) && (min === undefined || parsed >= min)) {
      onCommit(parsed);
      setText(String(parsed));
      prev.current = parsed;
    } else {
      setText(String(value));
    }
  };

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      className={className}
      value={text}
      onFocus={() => setEditing(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

interface Props {
  entries: AmortizationEntry[];
  onChange: (entries: AmortizationEntry[]) => void;
}

function newEntry(): AmortizationEntry {
  return {
    id: crypto.randomUUID(),
    month: 1,
    amount: 0,
    mode: 'reduce-payment',
    comment: '',
  };
}

export default function AmortizationsTable({ entries, onChange }: Props) {
  const add = useCallback(() => {
    onChange([...entries, newEntry()]);
  }, [entries, onChange]);

  const remove = useCallback(
    (id: string) => {
      onChange(entries.filter((e) => e.id !== id));
    },
    [entries, onChange],
  );

  const duplicate = useCallback(
    (id: string) => {
      const src = entries.find((e) => e.id === id);
      if (!src) return;
      const dup: AmortizationEntry = { ...src, id: crypto.randomUUID() };
      onChange([...entries, dup]);
    },
    [entries, onChange],
  );

  const update = useCallback(
    (id: string, patch: Partial<AmortizationEntry>) => {
      onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [entries, onChange],
  );

  return (
    <section className="card amort-table">
      <h2>📋 Amortizaciones extraordinarias</h2>

      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Importe (€)</th>
            <th>Modo</th>
            <th>Comentario</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {entries
            .slice()
            .sort((a, b) => a.month - b.month)
            .map((e) => (
              <tr key={e.id}>
                <td>
                  <NumericCell
                    value={e.month}
                    className="narrow"
                    min={1}
                    integer
                    onCommit={(v) => update(e.id, { month: v })}
                  />
                </td>
                <td>
                  <NumericCell
                    value={e.amount}
                    className="medium"
                    min={0}
                    step="100"
                    onCommit={(v) => update(e.id, { amount: v })}
                  />
                </td>
                <td>
                  <select
                    value={e.mode}
                    onChange={(ev) =>
                      update(e.id, {
                        mode: ev.target.value as AmortizationMode,
                      })
                    }
                  >
                    <option value="reduce-payment">Reducir cuota</option>
                    <option value="reduce-term">Reducir plazo</option>
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={e.comment}
                    placeholder="Nota…"
                    onChange={(ev) =>
                      update(e.id, { comment: ev.target.value })
                    }
                  />
                </td>
                <td className="actions">
                  <button
                    className="btn-icon"
                    title="Duplicar"
                    onClick={() => duplicate(e.id)}
                  >
                    📄
                  </button>
                  <button
                    className="btn-icon danger"
                    title="Eliminar"
                    onClick={() => remove(e.id)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <button className="btn-primary" onClick={add}>
        ＋ Añadir amortización
      </button>
    </section>
  );
}
