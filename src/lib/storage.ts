import type { MortgageInputs, AmortizationEntry } from './types';
import { exportScenarioJSON, importScenarioJSON, downloadBlob } from './export';

/**
 * Save current scenario as a JSON file downloaded to the user's PC.
 */
export function saveScenarioToFile(
  name: string,
  inputs: MortgageInputs,
  amortizations: AmortizationEntry[],
): void {
  const json = exportScenarioJSON(inputs, amortizations);
  const safeName = name.replace(/[^a-zA-Z0-9_\-áéíóúñÁÉÍÓÚÑ ]/g, '_').trim() || 'escenario';
  downloadBlob(json, `${safeName}.json`, 'application/json');
}

/**
 * Load a scenario from a user-selected JSON file.
 * Returns a promise that resolves with the parsed inputs & amortizations.
 */
export function loadScenarioFromFile(): Promise<{
  inputs: MortgageInputs;
  amortizations: AmortizationEntry[];
}> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No se seleccionó ningún archivo'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = importScenarioJSON(reader.result as string);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    };
    input.click();
  });
}
