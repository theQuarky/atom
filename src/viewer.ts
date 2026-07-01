import { getElectronConfig } from './electronConfig';

const CONFIG_PARAM = 'config';
const ATOMIC_NUMBER_PARAM = 'z';
const SYMBOL_PARAM = 'symbol';
const NAME_PARAM = 'name';
const EXCEPTION_PARAM = 'exception';

export interface ViewerConfig {
  atomicNumber: number;
  symbol: string;
  name: string;
  exceptionNote: boolean;
  config: Array<{ n: number; l: number; electronCount: number }>;
}

export function parseViewerConfig(): ViewerConfig {
  const params = new URLSearchParams(window.location.search);
  const atomicNumber = Number(params.get(ATOMIC_NUMBER_PARAM)) || 0;
  const symbol = params.get(SYMBOL_PARAM) || 'Atom';
  const name = params.get(NAME_PARAM) || 'Element';
  const exceptionNote = params.get(EXCEPTION_PARAM) === 'true';

  let config: ViewerConfig['config'] = [];
  try {
    const rawConfig = params.get(CONFIG_PARAM);
    if (rawConfig) {
      config = JSON.parse(decodeURIComponent(rawConfig));
    }
  } catch (error) {
    console.error('Unable to parse orbital configuration:', error);
  }

  return { atomicNumber, symbol, name, exceptionNote, config };
}

export function buildViewerHeader(viewerInfo: HTMLElement, config: ViewerConfig) {
  const totalElectrons = config.config.reduce((sum, s) => sum + (s.electronCount || 0), 0);
  const configLabel = config.config
    .map(s => `${s.n}${['s', 'p', 'd', 'f'][s.l] || `l${s.l}`}${s.electronCount}`)
    .join(' ');

  if (!config.atomicNumber || !config.config.length) {
    viewerInfo.innerHTML = `<div class="note">No orbital configuration was found in the URL. Please select an element from the periodic table first.</div>`;
    return;
  }

  viewerInfo.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; gap:14px; justify-content:space-between; align-items:flex-start;">
      <div>
        <div style="font-size:18px; font-weight:700;">${config.name} (${config.symbol}) — Z=${config.atomicNumber}</div>
        <div style="margin-top:6px; color:#bcdcff;">${configLabel}</div>
        <div style="margin-top:6px; color:#d8ebff; font-size:14px;">${totalElectrons} total electrons</div>
        ${config.exceptionNote ? `<div class="note" style="margin-top:14px;">This atom uses an Aufbau exception override and is rendered from the exact configuration.</div>` : ''}
      </div>
    </div>
  `;
}

export function getElementConfig(z: number) {
  return getElectronConfig(z);
}
