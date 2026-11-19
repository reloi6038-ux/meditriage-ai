const mongoose = require('mongoose');
const ClinicalRule = require('../models/ClinicalRule');

let cache = { rules: [], loadedAt: 0 };
const TTL_MS = 30 * 1000;

function dbReady() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

async function loadActiveRules() {
  // If the DB isn't connected, do not attempt a buffered query
  // (which would take 10 s to time out) — return empty immediately.
  if (!dbReady()) return [];
  if (Date.now() - cache.loadedAt < TTL_MS) return cache.rules;
  const rules = await ClinicalRule.find({ enabled: true }).sort({ priority: -1 }).lean();
  cache = { rules, loadedAt: Date.now() };
  return rules;
}

function invalidateCache() { cache.loadedAt = 0; }

function ruleMatches(rule, ctx) {
  const { symptoms = [], redFlags = [], vitals = {} } = ctx;

  if (rule.anyRedFlags?.length) {
    if (!rule.anyRedFlags.some(r => redFlags.includes(r))) return false;
  }
  if (rule.anySymptoms?.length) {
    if (!rule.anySymptoms.some(s => symptoms.includes(s))) return false;
  }
  if (rule.allSymptoms?.length) {
    if (!rule.allSymptoms.every(s => symptoms.includes(s))) return false;
  }

  const v = vitals;
  if (rule.minTempC    != null && !(v.tempC      >= rule.minTempC))    return false;
  if (rule.maxTempC    != null && !(v.tempC      <= rule.maxTempC))    return false;
  if (rule.minHeartRate!= null && !(v.heartRate >= rule.minHeartRate)) return false;
  if (rule.maxHeartRate!= null && !(v.heartRate <= rule.maxHeartRate)) return false;
  if (rule.minSysBP    != null && !(v.systolicBP>= rule.minSysBP))     return false;
  if (rule.maxSysBP    != null && !(v.systolicBP<= rule.maxSysBP))     return false;
  if (rule.minSpO2     != null && !(v.spo2     >= rule.minSpO2))       return false;
  if (rule.maxSpO2     != null && !(v.spo2     <= rule.maxSpO2))       return false;
  if (rule.minRespRate != null && !(v.respRate >= rule.minRespRate))   return false;
  if (rule.maxRespRate != null && !(v.respRate <= rule.maxRespRate))   return false;

  return true;
}

async function applyDynamicRules(ctx) {
  const rules = await loadActiveRules();
  if (!rules.length) return [];
  return rules.filter(r => ruleMatches(r, ctx));
}

module.exports = { loadActiveRules, applyDynamicRules, invalidateCache };