import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { MortgageInputs, AmortizationEntry } from './lib/types';
import { calculateSchedule } from './lib/engine';
import InputsForm from './components/InputsForm';
import AmortizationsTable from './components/AmortizationsTable';
import ResultsSummary from './components/ResultsSummary';
import ScheduleTable from './components/ScheduleTable';
import ScenarioManager from './components/ScenarioManager';
import './App.css';

// ── Default inputs ───────────────────────────────────────────────────

const DEFAULT_INPUTS: MortgageInputs = {
  principal: 0,
  termMonths: 0,
  fixedMonths: 0,
  fixedAnnualRate: 0,
  euribor: 0,
  spread: 0,
  capRate: 0,
  yearMode: 'blocks',
  startYearMonth: '',
};

// ── Validation ───────────────────────────────────────────────────────

function validate(inputs: MortgageInputs): string[] {
  const errs: string[] = [];
  if (inputs.principal <= 0) errs.push('El principal debe ser mayor que 0.');
  if (inputs.termMonths < 1) errs.push('El plazo debe ser al menos 1 mes.');
  if (inputs.fixedMonths > inputs.termMonths)
    errs.push('El tramo fijo no puede superar el plazo total.');
  if (inputs.fixedMonths < 0) errs.push('El tramo fijo no puede ser negativo.');
  if (inputs.fixedAnnualRate < 0) errs.push('El tipo fijo no puede ser negativo.');
  if (inputs.spread < 0) errs.push('El diferencial no puede ser negativo.');
  if (inputs.capRate < 0 || inputs.capRate > 1)
    errs.push('El tope de amortización debe estar entre 0 % y 100 %.');
  if (inputs.yearMode === 'natural' && !inputs.startYearMonth)
    errs.push('Indica la fecha de inicio para el modo año natural.');
  return errs;
}

// ── App ──────────────────────────────────────────────────────────────

export default function App() {
  const [inputs, setInputs] = useState<MortgageInputs>(DEFAULT_INPUTS);
  const [amortizations, setAmortizations] = useState<AmortizationEntry[]>([]);

  // Debounced calculation
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [calcInputs, setCalcInputs] = useState(inputs);
  const [calcAmorts, setCalcAmorts] = useState(amortizations);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCalcInputs(inputs);
      setCalcAmorts(amortizations);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputs, amortizations]);

  const errors = useMemo(() => validate(calcInputs), [calcInputs]);

  const result = useMemo(() => {
    if (errors.length > 0) return null;
    return calculateSchedule(calcInputs, calcAmorts);
  }, [calcInputs, calcAmorts, errors]);

  const handleLoad = useCallback(
    (imp: MortgageInputs, impA: AmortizationEntry[]) => {
      setInputs(imp);
      setAmortizations(impA);
    },
    [],
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏠 Simulador de Hipoteca</h1>
        <p>Simula tu hipoteca con Fija, mixta o variable</p>
      </header>

      <main className="app-main">
        <div className="top-panels">
          <InputsForm inputs={inputs} onChange={setInputs} errors={errors} />
          <AmortizationsTable entries={amortizations} onChange={setAmortizations} />
        </div>

        <ResultsSummary kpis={result?.kpis ?? null} />

        {result && result.schedule.length > 0 && (
          <ScheduleTable schedule={result.schedule} />
        )}

        <ScenarioManager
          inputs={inputs}
          amortizations={amortizations}
          schedule={result?.schedule ?? []}
          onLoad={handleLoad}
        />
      </main>

      <footer className="app-footer">
        <p>Simulador de hipoteca v1.0.</p>
        <p>© {new Date().getFullYear()} David Somoza López. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
