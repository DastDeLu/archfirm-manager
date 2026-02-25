import { calculateCashForecast } from './cashForecast.js';
import assert from 'node:assert';

// Scenario di Settembre
const scenarioSettembre = {
  meseCorrente: 9,
  cassaAttuale: 73404,
  riporti: 75000,
  percentualeIncasso: 0.70,
  baseAnnoPrecedente: 107000,
  growthRate: 0.35,
  speseAnnuePreviste: 117000,
  cfIncassiYTD: 60000,
  cfSpeseYTD: 95000
};

// Esegui il calcolo
const risultato = calculateCashForecast(scenarioSettembre);

console.log('\n🧪 Test Scenario Settembre\n');
console.log('Input:', JSON.stringify(scenarioSettembre, null, 2));
console.log('\nRisultato:', JSON.stringify(risultato, null, 2));

// Asserzioni
try {
  // Test 1: Verifica cassaFineAnnoPrevista
  assert.strictEqual(
    risultato.cassaFineAnnoPrevista,
    145019,
    'cassaFineAnnoPrevista deve essere uguale a 145019'
  );
  console.log('\n✅ Test 1 PASSED: cassaFineAnnoPrevista = 145019');

  // Test 2: Verifica alert incassi
  const alertIncassi = risultato.alerts.find(a => a.id === 'incassi');
  assert.strictEqual(
    alertIncassi?.level,
    'attention',
    "L'alert 'incassi' deve avere level === 'attention'"
  );
  console.log('✅ Test 2 PASSED: alert incassi level = "attention"');

  // Test 3: Verifica alert spese
  const alertSpese = risultato.alerts.find(a => a.id === 'spese');
  assert.strictEqual(
    alertSpese?.level,
    'ok',
    "L'alert 'spese' deve avere level === 'ok'"
  );
  console.log('✅ Test 3 PASSED: alert spese level = "ok"');

  console.log('\n✨ TUTTI I TEST SONO PASSATI CON SUCCESSO!\n');
} catch (error) {
  console.error('\n❌ TEST FALLITO:', error.message);
  process.exit(1);
}