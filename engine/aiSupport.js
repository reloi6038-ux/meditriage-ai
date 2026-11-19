// Deterministic, non-diagnostic "clinical-assistance" layer.
// - Explains the result
// - Lists missing info that would improve confidence
// - Suggests follow-up questions
// It NEVER overrides emergency rules and NEVER diagnoses.

const SYMPTOM_LABELS = {
  fever:'fever', cough:'cough', chest_pain:'chest pain', shortness_of_breath:'shortness of breath',
  severe_headache:'severe headache', confusion:'confusion', weakness_one_side:'one-sided weakness',
  slurred_speech:'slurred speech', severe_bleeding:'severe bleeding', vomiting:'vomiting',
  diarrhea:'diarrhea', abdominal_pain:'abdominal pain', fatigue:'fatigue', dizziness:'dizziness',
  seizure:'seizure', fainting:'fainting', rash:'rash', joint_pain:'joint pain',
  sore_throat:'sore throat', runny_nose:'runny nose', palpitations:'palpitations',
  swollen_leg:'swollen leg', vision_loss:'sudden vision loss', chest_tightness:'chest tightness',
};

function summarize(result, input) {
  const parts = [];
  const symptoms = (input.symptoms || []).map(s => SYMPTOM_LABELS[s] || s);
  if (symptoms.length) parts.push(`Reported symptoms: ${symptoms.join(', ')}.`);

  if (result.redFlags?.length) {
    parts.push(`${result.redFlags.length} danger sign${result.redFlags.length > 1 ? 's' : ''} were detected, which strongly influenced the recommendation.`);
  }
  if (result.urgency === 'EMERGENCY') {
    parts.push('This assessment meets emergency criteria. Seek immediate in-person care.');
  } else if (result.urgency === 'URGENT') {
    parts.push('This assessment suggests you should be seen by a clinician within a few hours.');
  } else if (result.urgency === 'SEMI_URGENT') {
    parts.push('Same-day clinical review is recommended if symptoms persist or worsen.');
  } else if (result.urgency === 'NON_URGENT') {
    parts.push('A routine appointment is reasonable if you remain concerned.');
  } else if (result.urgency === 'SELF_CARE') {
    parts.push('Home monitoring is reasonable; seek care if symptoms worsen.');
  }
  return parts.join(' ');
}

function missingInfo(input) {
  const missing = [];
  if (!input.vitals || Object.keys(input.vitals).length === 0) missing.push('vital signs (temperature, heart rate, breathing rate, oxygen saturation)');
  if (!input.vitals?.tempC) missing.push('temperature');
  if (!input.vitals?.spo2) missing.push('oxygen saturation (SpO2)');
  if (!input.progression || input.progression === 'unknown') missing.push('whether symptoms are improving, stable, or worsening');
  if (!input.severity || input.severity === 'unknown') missing.push('symptom severity (mild / moderate / severe)');
  return missing;
}

function followUpQuestions(input) {
  const q = [];
  if (input.symptoms?.includes('fever') && !input.durationHours) q.push('How many hours or days has the fever lasted?');
  if (input.symptoms?.includes('chest_pain')) q.push('Does the chest pain radiate to the arm, jaw, or back?');
  if (input.symptoms?.includes('shortness_of_breath')) q.push('Is the breathing difficulty present at rest or only with activity?');
  if (input.symptoms?.includes('diarrhea') || input.symptoms?.includes('vomiting')) q.push('Can the person keep fluids down, and are they producing urine normally?');
  return q.slice(0, 4);
}

function buildAISummary(result, input) {
  return {
    summary: summarize(result, input),
    missing: missingInfo(input),
    followUp: followUpQuestions(input),
    disclaimer: 'This is a decision-support summary, not a medical diagnosis. It cannot override the triage result.',
  };
}

module.exports = { buildAISummary };