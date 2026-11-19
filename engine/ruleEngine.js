const { SYMPTOMS } = require("./symptoms");

function vitalScore(v = {}) {
  let s = 0; const reasons = [];
  if (v.tempC != null) {
    if (v.tempC >= 39.5) { s += 5; reasons.push(`High fever (${v.tempC}C)`); }
    else if (v.tempC >= 38) { s += 3; reasons.push(`Fever (${v.tempC}C)`); }
    else if (v.tempC < 35) { s += 4; reasons.push(`Hypothermia (${v.tempC}C)`); }
  }
  if (v.heartRate != null) {
    if (v.heartRate > 120) { s += 5; reasons.push(`Heart rate ${v.heartRate} bpm`); }
    else if (v.heartRate > 100) { s += 2; reasons.push(`Elevated heart rate ${v.heartRate} bpm`); }
    else if (v.heartRate < 50) { s += 3; reasons.push(`Bradycardia ${v.heartRate} bpm`); }
  }
  if (v.systolicBP != null) {
    if (v.systolicBP < 90) { s += 5; reasons.push(`Low systolic BP ${v.systolicBP}`); }
    else if (v.systolicBP > 180) { s += 5; reasons.push(`Very high systolic BP ${v.systolicBP}`); }
    else if (v.systolicBP > 140) { s += 2; reasons.push(`High systolic BP ${v.systolicBP}`); }
  }
  if (v.diastolicBP != null) {
    if (v.diastolicBP > 120) { s += 4; reasons.push(`Very high diastolic BP ${v.diastolicBP}`); }
    else if (v.diastolicBP > 90) { s += 2; reasons.push(`High diastolic BP ${v.diastolicBP}`); }
  }
  if (v.spo2 != null) {
    if (v.spo2 < 90) { s += 8; reasons.push(`SpO2 ${v.spo2}%`); }
    else if (v.spo2 < 94) { s += 3; reasons.push(`Low SpO2 ${v.spo2}%`); }
    else if (v.spo2 < 96) { s += 1; reasons.push(`Borderline SpO2 ${v.spo2}%`); }
  }
  if (v.respRate != null) {
    if (v.respRate > 30) { s += 5; reasons.push(`Resp. rate ${v.respRate}`); }
    else if (v.respRate > 22) { s += 2; reasons.push(`Elevated resp. rate ${v.respRate}`); }
    else if (v.respRate < 10) { s += 3; reasons.push(`Low resp. rate ${v.respRate}`); }
  }
  if (v.glucose != null) {
    if (v.glucose < 3.9) { s += 4; reasons.push(`Hypoglycemia (${v.glucose} mmol/L)`); }
    else if (v.glucose > 11) { s += 2; reasons.push(`Hyperglycemia (${v.glucose} mmol/L)`); }
  }
  if (v.painScore != null && v.painScore >= 7) {
    s += 3; reasons.push(`Severe pain (${v.painScore}/10)`);
  }
  return { score: s, reasons };
}

function symptomScore(symptoms) {
  let s = 0; const reasons = [];
  for (const key of symptoms) {
    const sym = SYMPTOMS[key];
    if (sym) { s += sym.weight; reasons.push(`${sym.label} (+${sym.weight})`); }
  }
  return { score: s, reasons };
}

function toUrgency(score, redFlagHits) {
  if (redFlagHits.length > 0) return "EMERGENCY";
  if (score >= 25) return "EMERGENCY";
  if (score >= 15) return "URGENT";
  if (score >= 8)  return "SEMI_URGENT";
  if (score >= 3)  return "NON_URGENT";
  return "SELF_CARE";
}

module.exports = { vitalScore, symptomScore, toUrgency };