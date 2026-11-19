// WHO/IMCI general danger signs + major clinical red flags.
// Any single hit forces EMERGENCY.

const WHO_DANGER_SIGNS = new Set([
  "unable_to_drink","vomits_everything","convulsions","lethargic",
  "severe_chest_pain","severe_breathing","uncontrolled_bleeding",
  "sudden_weakness","sudden_speech","severe_dehydration",
  "stiff_neck","severe_allergic",
]);

// Symptom-level red flags (kept from v1 for backward compat)
const SYMPTOM_RED_FLAGS = new Set([
  "seizure","severe_bleeding","weakness_one_side","slurred_speech",
  "vision_loss","confusion",
]);

const RED_FLAG_COMBOS = [
  ["chest_pain","shortness_of_breath"],
  ["chest_pain","fainting"],
  ["severe_headache","confusion"],
];

// Clinical-sign red flags (hydration/perfusion)
const CLINICAL_RED_FLAGS = new Set(["delayed_cap_refill","cold_extremities","no_urine_12h"]);

function detectRedFlags(symptoms, vitals = {}, redFlags = [], clinical = [], context = {}) {
  const hits = [];

  // WHO danger signs (explicit checkboxes)
  for (const rf of redFlags) {
    if (WHO_DANGER_SIGNS.has(rf)) hits.push(`WHO danger sign: ${rf.replace(/_/g," ")}`);
  }

  // Symptom-level
  for (const s of symptoms) if (SYMPTOM_RED_FLAGS.has(s)) hits.push(`Red-flag symptom: ${s.replace(/_/g," ")}`);
  for (const combo of RED_FLAG_COMBOS)
    if (combo.every(c => symptoms.includes(c))) hits.push(`Dangerous combination: ${combo.join(" + ").replace(/_/g," ")}`);

  // Clinical signs
  for (const c of clinical) if (CLINICAL_RED_FLAGS.has(c)) hits.push(`Clinical red flag: ${c.replace(/_/g," ")}`);

  // AVPU
  if (vitals.avpu && ["voice","pain","unresponsive"].includes(vitals.avpu))
    hits.push(`Reduced consciousness (AVPU: ${vitals.avpu})`);

  // Vitals
  if (vitals.spo2 != null && vitals.spo2 < 90) hits.push(`SpO2 critically low (${vitals.spo2}%)`);
  if (vitals.systolicBP != null && vitals.systolicBP < 90) hits.push(`Hypotension (systolic ${vitals.systolicBP})`);
  if (vitals.heartRate != null && vitals.heartRate > 130) hits.push(`Tachycardia (${vitals.heartRate} bpm)`);
  if (vitals.heartRate != null && vitals.heartRate < 40) hits.push(`Severe bradycardia (${vitals.heartRate} bpm)`);
  if (vitals.respRate != null && vitals.respRate > 30) hits.push(`Tachypnea (${vitals.respRate})`);
  if (vitals.respRate != null && vitals.respRate < 8) hits.push(`Severe bradypnea (${vitals.respRate})`);
  if (vitals.glucose != null && vitals.glucose < 2.5) hits.push(`Severe hypoglycemia (${vitals.glucose} mmol/L)`);
  if (vitals.glucose != null && vitals.glucose > 25) hits.push(`Severe hyperglycemia (${vitals.glucose} mmol/L)`);
  if (vitals.tempC != null && vitals.tempC >= 40.5) hits.push(`Hyperpyrexia (${vitals.tempC}C)`);
  if (vitals.tempC != null && vitals.tempC < 35) hits.push(`Hypothermia (${vitals.tempC}C)`);

  // Pregnancy + fever = possible obstetric emergency
  const preg = context.pregnancy || "not_applicable";
  const isPregnant = preg.startsWith("yes") || preg === "postpartum";
  if (isPregnant && (symptoms.includes("fever") || (vitals.tempC != null && vitals.tempC >= 38)))
    hits.push(`Pregnancy/postpartum with fever - possible obstetric emergency`);

  return hits;
}

module.exports = { detectRedFlags, WHO_DANGER_SIGNS };