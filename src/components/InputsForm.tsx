import { useCallback, useState, useEffect, useRef } from 'react';
import type { MortgageInputs, YearMode } from '../lib/types';

interface Props {
  inputs: MortgageInputs;
  onChange: (inputs: MortgageInputs) => void;
  errors: string[];
}

function PctField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(() => (value * 100).toFixed(2));
  const [editing, setEditing] = useState(false);
  const prevValue = useRef(value);

  // Sync from parent when not editing
  useEffect(() => {
    if (!editing && value !== prevValue.current) {
      setText((value * 100).toFixed(2));
      prevValue.current = value;
    }
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const raw = text.replace(',', '.');
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      const rounded = Math.round(parsed * 100) / 10000; // keep 2 decimal precision
      onCommit(rounded);
      setText((rounded * 100).toFixed(2));
      prevValue.current = rounded;
    } else {
      setText((value * 100).toFixed(2));
    }
  };

  return (
    <div className="field">
      <label>{label}</label>
      <div className="input-group">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onFocus={() => setEditing(true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
        <span className="suffix">%</span>
      </div>
    </div>
  );
}

export default function InputsForm({ inputs, onChange, errors }: Props) {
  const set = useCallback(
    <K extends keyof MortgageInputs>(key: K, value: MortgageInputs[K]) => {
      onChange({ ...inputs, [key]: value });
    },
    [inputs, onChange],
  );

  const pctInput = (label: string, key: keyof MortgageInputs) => (
    <PctField
      label={label}
      value={inputs[key] as number}
      onCommit={(v) => set(key, v)}
    />
  );

  const variableRate = inputs.euribor + inputs.spread;

  return (
    <section className="card inputs-form">
      <h2>⚙️ Configuración de hipoteca</h2>

      {errors.length > 0 && (
        <div className="errors">
          {errors.map((e, i) => (
            <p key={i}>⚠️ {e}</p>
          ))}
        </div>
      )}

      <div className="form-grid">
        {/* Principal */}
        <div className="field">
          <label>Principal (€)</label>
          <input
            type="number"
            step="100"
            min="0"
            value={inputs.principal}
            onChange={(e) => set('principal', parseFloat(e.target.value || '0'))}
          />
        </div>

        {/* Term */}
        <div className="field">
          <label>Plazo inicial (meses)</label>
          <input
            type="number"
            min="1"
            value={inputs.termMonths}
            onChange={(e) =>
              set('termMonths', parseInt(e.target.value || '1', 10))
            }
          />
        </div>

        {/* Fixed months */}
        <div className="field">
          <label>Tramo fijo (meses)</label>
          <input
            type="number"
            min="0"
            max={inputs.termMonths}
            value={inputs.fixedMonths}
            onChange={(e) =>
              set('fixedMonths', parseInt(e.target.value || '0', 10))
            }
          />
        </div>

        {/* Fixed rate */}
        {pctInput('Tipo fijo anual', 'fixedAnnualRate')}

        {/* Euribor */}
        {pctInput('Euríbor supuesto', 'euribor')}

        {/* Spread */}
        {pctInput('Diferencial', 'spread')}

        {/* Variable rate (computed) */}
        <div className="field">
          <label>Tipo variable anual (calc.)</label>
          <div className="computed">{(variableRate * 100).toFixed(2)} %</div>
        </div>

        {/* Cap */}
        {pctInput('Tope amort. anual', 'capRate')}

        {/* Year mode */}
        <div className="field">
          <label>Modo de año (tope)</label>
          <select
            value={inputs.yearMode}
            onChange={(e) => set('yearMode', e.target.value as YearMode)}
          >
            <option value="blocks">Bloques de 12 meses</option>
            <option value="natural">Año natural</option>
          </select>
        </div>

        {/* Start date (only for natural) */}
        {inputs.yearMode === 'natural' && (
          <div className="field">
            <label>Fecha inicio (YYYY-MM)</label>
            <input
              type="month"
              value={inputs.startYearMonth}
              onChange={(e) => set('startYearMonth', e.target.value)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
