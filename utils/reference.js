// Generates a short, human-friendly assessment reference like MTA-4F7A-9B3C
function genRef() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = n => Array.from({ length: n }, () => A[Math.floor(Math.random() * A.length)]).join('');
  return `MTA-${seg(4)}-${seg(4)}`;
}
module.exports = { genRef };