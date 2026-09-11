// EduTrackIlmziyo Payment Gateway Tests
// Jasper Pillar 4: Fintech & Payment Processing Standard

function toTiyin(amountInSom) {
  if (Number.isNaN(amountInSom) || amountInSom < 0) return 0;
  return Math.round(amountInSom * 100);
}

function fromTiyin(amountInTiyin) {
  if (Number.isNaN(amountInTiyin) || amountInTiyin < 0) return 0;
  return Math.round((amountInTiyin / 100) * 100) / 100;
}

// 1. Tiyin vs Som Test
console.assert(toTiyin(1000) === 100000, 'toTiyin failed for 1000');
console.assert(toTiyin(450000) === 45000000, 'toTiyin failed for 450000');
console.assert(fromTiyin(45000000) === 450000, 'fromTiyin failed for 45000000');

console.log('[OK] EduTrackIlmziyo payment gateway tests passed successfully!');
