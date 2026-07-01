import { getElectronConfig } from './electronConfig';
import { getElement, formatSubshell, getOrbitalName, isExceptionAtom } from './elements';
import { renderPeriodicTable } from './periodicTable';

// Main app logic
function initApp() {
  const input = document.getElementById('atomicNumber') as HTMLInputElement;
  const outputDiv = document.getElementById('output') as HTMLDivElement;
  const testButton = document.getElementById('testButton') as HTMLButtonElement;
  const periodicTableDiv = document.getElementById('periodicTable') as HTMLDivElement;

  function displayConfig(z: number) {
    if (!z || z < 1 || z > 118) {
      outputDiv.innerHTML = '<p style="color: #ff6b6b;">Please enter an atomic number between 1 and 118</p>';
      return;
    }

    try {
      const config = getElectronConfig(z);
      const element = getElement(z);
      const total = config.reduce((sum, s) => sum + s.electronCount, 0);
      const isException = isExceptionAtom(z);

      let html = `<div class="output-panel">`;
      html += `<h3>${element?.name} (${element?.symbol}) — Z=${z}</h3>`;
      html += `<p><strong>Electron Configuration:</strong></p>`;
      html += `<div style="font-size: 18px; font-weight: bold; margin: 12px 0;">`;
      html += config.map(s => formatSubshell(s.n, s.l, s.electronCount)).join(' ');
      html += `</div>`;
      html += `<p><strong>Total electrons:</strong> ${total}</p>`;
      html += `<table class="data-table">`;
      html += `<tr><th>n</th><th>l (orbital)</th><th>Electrons</th></tr>`;
      config.forEach(s => {
        html += `<tr>`;
        html += `<td>${s.n}</td>`;
        html += `<td>${s.l} (${getOrbitalName(s.l)})</td>`;
        html += `<td>${s.electronCount}</td>`;
        html += `</tr>`;
      });
      html += `</table>`;
      html += `<button id="viewOrbital">View 3D orbital</button>`;
      if (isException) {
        html += `<div class="note" style="margin-top: 24px;">This atom uses an Aufbau exception override; the 3D viewer will render using the exact configuration.</div>`;
      }
      html += `</div>`;

      outputDiv.innerHTML = html;

      const viewOrbitalButton = document.getElementById('viewOrbital');
      if (viewOrbitalButton) {
        viewOrbitalButton.addEventListener('click', () => {
          const encodedConfig = encodeURIComponent(JSON.stringify(config));
          const viewerUrl = `./hydrogen.html?z=${z}&symbol=${encodeURIComponent(element?.symbol || '')}&name=${encodeURIComponent(element?.name || '')}&config=${encodedConfig}&exception=${isException}`;
          window.location.href = viewerUrl;
        });
      }
    } catch (error: any) {
      outputDiv.innerHTML = `<p style="color: #ff6b6b;">Error: ${error.message}</p>`;
    }
  }

  function updateConfig() {
    const z = parseInt(input.value, 10);
    displayConfig(z);
  }

  // Render periodic table and attach click handlers
  periodicTableDiv.innerHTML = renderPeriodicTable();

  function attachPeriodicTableHandlers() {
    document.querySelectorAll('.periodic-element').forEach(el => {
      el.addEventListener('click', () => {
        const z = parseInt((el as HTMLElement).getAttribute('data-z') || '0', 10);
        input.value = z.toString();
        displayConfig(z);
        outputDiv.scrollIntoView({ behavior: 'smooth' });
      });

      el.addEventListener('mouseenter', () => {
        (el as HTMLElement).style.transform = 'scale(1.1)';
        (el as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
      });

      el.addEventListener('mouseleave', () => {
        (el as HTMLElement).style.transform = 'scale(1)';
        (el as HTMLElement).style.boxShadow = 'none';
      });
    });
  }

  attachPeriodicTableHandlers();

  // Run tests
  function runTests() {
    let html = '<h3>Test Results</h3>';
    const tests = [
      { z: 1, name: 'H (Hydrogen)' },
      { z: 2, name: 'He (Helium)' },
      { z: 10, name: 'Ne (Neon)' },
      { z: 18, name: 'Ar (Argon)' },
      { z: 26, name: 'Fe (Iron)' },
      { z: 24, name: 'Cr (Chromium) - exception' },
      { z: 29, name: 'Cu (Copper) - exception' },
      { z: 46, name: 'Pd (Palladium) - exception' },
      { z: 79, name: 'Au (Gold) - exception' },
      { z: 118, name: 'Og (Oganesson)' }
    ];

    html += '<table class="data-table">';
    html += '<tr><th>Atomic #</th><th>Element</th><th>Total Electrons</th><th>Configuration</th></tr>';

    tests.forEach(test => {
      try {
        const config = getElectronConfig(test.z);
        const total = config.reduce((sum, s) => sum + s.electronCount, 0);
        const configStr = config.map(s => formatSubshell(s.n, s.l, s.electronCount)).join(' ');

        html += '<tr style="border-bottom: 1px solid #ddd;">';
        html += `<td style="padding: 8px; font-weight: bold;">${test.z}</td>`;
        html += `<td style="padding: 8px;">${test.name}</td>`;
        html += `<td style="padding: 8px;">${total}</td>`;
        html += `<td style="padding: 8px; font-family: monospace;">${configStr}</td>`;
        html += '</tr>';
      } catch (error: any) {
        html += '<tr style="border-bottom: 1px solid #ddd; background: #ffe0e0;">';
        html += `<td style="padding: 8px;">${test.z}</td>`;
        html += `<td style="padding: 8px; color: red;">❌ ${error.message}</td>`;
        html += '</tr>';
      }
    });

    html += '</table>';
    outputDiv.innerHTML = html;
  }

  // Event listeners
  input.addEventListener('input', updateConfig);
  input.addEventListener('change', updateConfig);
  testButton.addEventListener('click', runTests);

  // Render periodic table and initial config
  renderPeriodicTable();
  updateConfig();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
