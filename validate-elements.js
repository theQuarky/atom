const { getElectronConfig } = require('./src/electronConfig.ts');

const ELEMENTS = [
  { z: 1, symbol: 'H' }, { z: 2, symbol: 'He' }, { z: 3, symbol: 'Li' },
  { z: 24, symbol: 'Cr' }, { z: 29, symbol: 'Cu' }, { z: 46, symbol: 'Pd' },
  { z: 57, symbol: 'La' }, { z: 58, symbol: 'Ce' }, { z: 64, symbol: 'Gd' },
  { z: 79, symbol: 'Au' }, { z: 92, symbol: 'U' }, { z: 118, symbol: 'Og' }
];

console.log('🧪 Validating electron configurations...\n');

let passed = 0;
let failed = 0;

for (let z = 1; z <= 118; z++) {
  try {
    const cfg = getElectronConfig(z);
    const total = cfg.reduce((sum, s) => sum + s.electronCount, 0);
    
    if (total === z) {
      passed++;
    } else {
      failed++;
      const elem = ELEMENTS.find(e => e.z === z);
      console.log(`❌ Z=${z} (${elem?.symbol || '?'}): total=${total}, expected=${z}`);
    }
  } catch (error) {
    failed++;
    console.log(`❌ Z=${z}: ${error.message}`);
  }
}

console.log(`\n✅ Passed: ${passed}/118`);
console.log(`❌ Failed: ${failed}/118`);
console.log(`\n${failed === 0 ? '🎉 All elements correctly configured!' : 'Fix the errors above.'}`);
