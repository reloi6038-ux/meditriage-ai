const SYMPTOMS = {
  fever:{label:"Fever",weight:3}, cough:{label:"Cough",weight:2},
  chest_pain:{label:"Chest pain",weight:8}, shortness_of_breath:{label:"Shortness of breath",weight:8},
  severe_headache:{label:"Severe headache",weight:6}, confusion:{label:"Confusion",weight:8},
  vision_loss:{label:"Sudden vision loss",weight:7}, weakness_one_side:{label:"Weakness on one side",weight:9},
  slurred_speech:{label:"Slurred speech",weight:9}, severe_bleeding:{label:"Severe bleeding",weight:10},
  vomiting:{label:"Vomiting",weight:3}, diarrhea:{label:"Diarrhea",weight:2},
  abdominal_pain:{label:"Abdominal pain",weight:4}, rash:{label:"Rash",weight:1},
  joint_pain:{label:"Joint pain",weight:1}, fatigue:{label:"Fatigue",weight:2},
  dizziness:{label:"Dizziness",weight:3}, sore_throat:{label:"Sore throat",weight:1},
  runny_nose:{label:"Runny nose",weight:1}, seizure:{label:"Seizure",weight:10},
  fainting:{label:"Fainting",weight:8}, chest_tightness:{label:"Chest tightness",weight:6},
  palpitations:{label:"Palpitations",weight:4}, swollen_leg:{label:"Swollen leg",weight:3},
};
const ALIASES = {
  "chest pain":"chest_pain","shortness of breath":"shortness_of_breath",
  "headache":"severe_headache","high temperature":"fever","temperature":"fever",
  "trouble breathing":"shortness_of_breath","cant breathe":"shortness_of_breath",
  "throwing up":"vomiting","loose stools":"diarrhea","tired":"fatigue",
  "fainted":"fainting","passed out":"fainting","fit":"seizure",
};
function canonicalize(list = []) {
  const out = new Set();
  for (const raw of list) {
    const k = String(raw).toLowerCase().trim().replace(/\s+/g, "_");
    if (SYMPTOMS[k]) out.add(k);
    else {
      const a = ALIASES[String(raw).toLowerCase().trim()];
      if (a) out.add(a);
    }
  }
  return [...out];
}
module.exports = { SYMPTOMS, canonicalize };