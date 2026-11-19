const mongoose = require('mongoose');
const { canonicalize } = require('./symptoms');
const { detectRedFlags } = require('./redFlags');
const { symptomScore, vitalScore, toUrgency } = require('./ruleEngine');
const ml = require('./mlCalibrator');
const { applyDynamicRules } = require('./dynamicRules');

const RESULT_META = {
  EMERGENCY:   { action: 'Seek emergency care immediately.',                               timeframe: 'Now',              watchFor: ['Loss of consciousness','Breathing difficulty','Chest pain worsening'] },
  URGENT:      { action: 'See a clinician within a few hours.',                            timeframe: 'Within 2-6 hours', watchFor: ['Worsening pain','New breathing difficulty','Confusion'] },
  SEMI_URGENT: { action: 'Book a same-day clinical review if symptoms persist or worsen.', timeframe: 'Within 24 hours',  watchFor: ['Fever rising above 39.5 C','Inability to keep fluids down'] },
  NON_URGENT:  { action: 'Routine appointment is appropriate if concerned.',               timeframe: 'Within 3-7 days',  watchFor: ['Any sudden worsening','New severe symptoms'] },
  SELF_CARE:   { action: 'Monitor at home. Seek care if symptoms worsen.',                 timeframe: 'As needed',        watchFor: ['Fever above 39 C','Difficulty breathing','Chest pain'] },
};

const RANK = { EMERGENCY: 5, URGENT: 4, SEMI_URGENT: 3, NON_URGENT: 2, SELF_CARE: 1 };

// ML may only move the result by at most 1 rank step, and only into an
// "adjacent" class. It can never escalate to EMERGENCY from a score < 15.
function clampMLOverride(ruleClass, mlClass, score, redFlagCount) {
  if (redFlagCount > 0) return ruleClass; // red flags decide EMERGENCY, period
  if (RANK[mlClass] == null || RANK[ruleClass] == null) return ruleClass;

  // Never allow ML to choose EMERGENCY unless score is meaningful
  if (mlClass === 'EMERGENCY' && score < 15) return ruleClass;

  // Never allow ML to jump more than 1 step
  const delta = Math.abs(RANK[mlClass] - RANK[ruleClass]);
  if (delta > 1) return ruleClass;

  // Never allow ML to *downgrade* an EMERGENCY ruleClass
  if (ruleClass === 'EMERGENCY' && RANK[mlClass] < RANK.EMERGENCY) return ruleClass;

  return mlClass;
}

async function triage(input) {
  const symptoms = canonicalize(input.symptoms || []);
  const vitals   = input.vitals || {};
  const redFlags = Array.isArray(input.redFlags) ? input.redFlags : [];
  const clinical = Array.isArray(input.clinical) ? input.clinical : [];

  const redFlagHits = detectRedFlags(symptoms, vitals, redFlags, clinical, {
    pregnancy: input.pregnancy,
  });

  const sym = symptomScore(symptoms);
  const vit = vitalScore(vitals);

  const preg = input.pregnancy || 'not_applicable';
  const isPregnant = preg.startsWith('yes') || preg === 'postpartum';
  const pregBonus = isPregnant ? 4 : 0;

  const conditions = Array.isArray(input.conditions) ? input.conditions : [];
  let condBonus = 0;
  if (conditions.includes('immunocompromised')) condBonus += 4;
  if (conditions.includes('heart_disease'))     condBonus += 2;
  if (conditions.includes('diabetes'))          condBonus += 1;

  const dangerBonus = redFlags.length > 0 ? 10 : 0;
  const progressionBonus = input.progression === 'worsening' ? 3 : 0;

  const score = sym.score + vit.score + pregBonus + condBonus + dangerBonus + progressionBonus;
  const ruleClass = toUrgency(score, redFlagHits);
  const mlOut = ml.predict({ ...input, symptoms, vitals });

  let finalUrgency = ruleClass;
  const reasons = [...redFlagHits, ...sym.reasons, ...vit.reasons];
  if (isPregnant) reasons.push(`Pregnancy/postpartum baseline risk (+${pregBonus})`);
  if (conditions.includes('immunocompromised')) reasons.push('Immunocompromised (+4)');
  if (redFlags.length > 0) reasons.push(`WHO danger signs checked: ${redFlags.length} (+${dangerBonus})`);
  if (input.progression === 'worsening') reasons.push('Symptoms reported as worsening (+3)');

  const borderline = Math.abs(score - 25) <= 3 || Math.abs(score - 15) <= 3
                  || Math.abs(score - 8) <= 2 || Math.abs(score - 3) <= 1;

  if (borderline && redFlagHits.length === 0) {
    const safe = clampMLOverride(ruleClass, mlOut.class, score, redFlagHits.length);
    if (safe !== ruleClass) {
      finalUrgency = safe;
      reasons.push(`Calibrated to ${safe} by logistic-regression model (borderline score, bounded).`);
    }
  }

  // ---- Dynamic rules (DB only; skip if not connected) ----
  if (mongoose.connection.readyState === 1) {
    try {
      const hits = await applyDynamicRules({
        symptoms,
        redFlags: [...redFlags, ...redFlagHits],
        vitals,
      });
      if (hits.length) {
        const top = hits.sort((a, b) =>
          (RANK[b.urgency] - RANK[a.urgency]) || (b.priority - a.priority)
        )[0];
        if (RANK[top.urgency] > RANK[finalUrgency]) {
          reasons.push(`Clinical rule applied: ${top.name} -> ${top.urgency}`);
          finalUrgency = top.urgency;
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Dynamic rules load failed:', e.message);
      }
    }
  }

  // Emergency is absolute
  const emergency = finalUrgency === 'EMERGENCY' || redFlagHits.length > 0;
  if (emergency) finalUrgency = 'EMERGENCY';

  const confidence = redFlagHits.length > 0 ? 0.99 : mlOut.confidence;
  const meta = RESULT_META[finalUrgency] || RESULT_META.NON_URGENT;

  const factors = [];
  if (redFlagHits.length) factors.push(`${redFlagHits.length} danger sign(s) detected`);
  for (const s of symptoms.slice(0, 4)) factors.push(`Symptom: ${s.replace(/_/g, ' ')}`);
  if (vitals.spo2      != null && vitals.spo2 < 94)   factors.push(`Low oxygen saturation (${vitals.spo2}%)`);
  if (vitals.tempC     != null && vitals.tempC >= 38) factors.push(`Fever (${vitals.tempC}C)`);
  if (vitals.heartRate != null && vitals.heartRate > 100) factors.push(`Elevated heart rate (${vitals.heartRate} bpm)`);
  if (vitals.systolicBP!= null && vitals.systolicBP < 90) factors.push(`Low blood pressure (${vitals.systolicBP})`);

  return {
    urgency: finalUrgency,
    emergency,
    confidence,
    score,
    redFlags: redFlagHits,
    reasons,
    factors,
    action: meta.action,
    timeframe: meta.timeframe,
    watchFor: meta.watchFor,
    probabilities: mlOut.probabilities,
    disclaimer: 'Decision-support only. Not a diagnosis. Seek professional care for urgent symptoms.',
  };
}

module.exports = { triage };