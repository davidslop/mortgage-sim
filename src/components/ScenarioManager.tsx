import { useState } from 'react';
import type { MortgageInputs, AmortizationEntry, ScheduleRow } from '../lib/types';
import { saveScenarioToFile, loadScenarioFromFile } from '../lib/storage';
import { downloadCSV } from '../lib/export';

interface Props {
  inputs: MortgageInputs;
  amortizations: AmortizationEntry[];
  schedule: ScheduleRow[];
  onLoad: (inputs: MortgageInputs, amortizations: AmortizationEntry[]) => void;
}

export default function ScenarioManager({
  inputs,
  amortizations,
  schedule,
  onLoad,
}: Props) {
  const [name, setName] = useState('');

  // ── Save to file ───────────────────────────────────────────────────
  const handleSave = () => {
    const scenarioName = name.trim() || 'escenario_hipoteca';
    saveScenarioToFile(scenarioName, inputs, amortizations);
  };

  // ── Load from file ─────────────────────────────────────────────────
  const handleLoad = async () => {
    try {
      const { inputs: imp, amortizations: impA } = await loadScenarioFromFile();
      onLoad(imp, impA);
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== 'No se seleccionó ningún archivo') {
        alert('Error al cargar: ' + err.message);
      }
    }
  };

  // ── Export CSV ─────────────────────────────────────────────────────
  const handleExportCSV = () => downloadCSV(schedule);

  return (
    <section className="card scenario-manager">
      <h2>💾 Escenarios</h2>

      {/* Save */}
      <div className="scenario-row">
        <input
          type="text"
          placeholder="Nombre del fichero…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-primary" onClick={handleSave}>
          💾 Guardar en fichero
        </button>
      </div>

      {/* Load & Export */}
      <div className="export-row">
        <div className="export-buttons">
          <button onClick={handleLoad}>
            📂 Cargar desde fichero
          </button>
          <button onClick={handleExportCSV} disabled={schedule.length === 0}>
            📥 Exportar CSV cuadro
          </button>
        </div>
      </div>
    </section>
  );
}
