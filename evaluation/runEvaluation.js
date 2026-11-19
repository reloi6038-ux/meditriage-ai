const fs = require('fs');
const path = require('path');
const { triage } = require('../engine');
const { SYMPTOMS } = require('../engine/symptoms');
const CLASSES = ['EMERGENCY','URGENT','SEMI_URGENT','NON_URGENT','SELF_CARE'];

function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}

function generate(n, seed=42){
  const rnd = mulberry32(seed); const out=[];
  const syms = Object.keys(SYMPTOMS);
  const ages = ['<1','1-4','5-17','18-39','40-64','65+'];
  const sexes = ['male','female','unknown'];
  for(let i=0;i<n;i++){
    const ageBucket = ages[Math.floor(rnd()*ages.length)];
    const sex = sexes[Math.floor(rnd()*sexes.length)];
    const k = 1+Math.floor(rnd()*4);
    const pool=[...syms]; const symptoms=[];
    for(let j=0;j<k;j++) symptoms.push(pool.splice(Math.floor(rnd()*pool.length),1)[0]);
    const vitals={
      tempC:+(36+rnd()*4).toFixed(1),
      heartRate:55+Math.floor(rnd()*90),
      systolicBP:85+Math.floor(rnd()*80),
      spo2:86+Math.floor(rnd()*14),
      respRate:12+Math.floor(rnd()*20)
    };
    const has=(...x)=>x.some(s=>symptoms.includes(s));
    let gold='SELF_CARE';
    if(has('seizure','severe_bleeding','weakness_one_side','slurred_speech')||vitals.spo2<90||vitals.systolicBP<90) gold='EMERGENCY';
    else if(has('chest_pain','shortness_of_breath','confusion')||vitals.heartRate>120||vitals.tempC>39.5) gold='URGENT';
    else if(has('fever','vomiting','abdominal_pain','dizziness')||vitals.tempC>38) gold='SEMI_URGENT';
    else if(has('cough','fatigue','rash')) gold='NON_URGENT';
    out.push({ageBucket,sex,symptoms,vitals,goldUrgency:gold});
  }
  return out;
}

function featurize(s){
  const f={};
  for(const k of Object.keys(SYMPTOMS)) f['s_'+k]=s.symptoms.includes(k)?1:0;
  for(const b of ['<1','1-4','5-17','18-39','40-64','65+']) f['age_'+b]=s.ageBucket===b?1:0;
  f.sex_female=s.sex==='female'?1:0; f.sex_male=s.sex==='male'?1:0;
  f.has_fever=(s.vitals.tempC||0)>=38?1:0;
  f.hypoxia=(s.vitals.spo2||100)<94?1:0;
  f.hypotension=(s.vitals.systolicBP||120)<100?1:0;
  f.tachycardia=(s.vitals.heartRate||80)>100?1:0;
  f.tachypnea=(s.vitals.respRate||18)>22?1:0;
  f.symptom_count=s.symptoms.length/10;
  return f;
}

function trainLR(train, epochs=300, lr=0.05, l2=1e-3){
  const keys = Object.keys(featurize(train[0]));
  const W = Array.from({length:5},()=>Object.fromEntries(keys.map(k=>[k,0])));
  const B = Array(5).fill(0);
  const X = train.map(featurize); const Y = train.map(s=>CLASSES.indexOf(s.goldUrgency));
  for(let e=0;e<epochs;e++){
    for(let i=0;i<X.length;i++){
      const logits = CLASSES.map((_,c)=>B[c]+keys.reduce((a,k)=>a+W[c][k]*X[i][k],0));
      const m = Math.max(...logits);
      const exp = logits.map(v=>Math.exp(v-m));
      const z = exp.reduce((a,b)=>a+b,0);
      const p = exp.map(v=>v/z);
      for(let c=0;c<5;c++){
        const err = p[c]-(Y[i]===c?1:0);
        B[c]-=lr*err;
        for(const k of keys) W[c][k]-=lr*(err*X[i][k]+l2*W[c][k]);
      }
    }
  }
  return { weights: W, biases: B };
}

function confusion(yT,yP){
  const m=Array.from({length:5},()=>Array(5).fill(0));
  yT.forEach((t,i)=>{m[CLASSES.indexOf(t)][CLASSES.indexOf(yP[i])]++;}); return m;
}

function perClass(cm){
  const out={};
  for(let i=0;i<5;i++){
    const tp=cm[i][i];
    const fp=cm.reduce((a,r,j)=>a+(j===i?0:r[i]),0);
    const fn=cm[i].reduce((a,v,j)=>a+(j===i?0:v),0);
    const precision=tp/((tp+fp)||1), recall=tp/((tp+fn)||1);
    const f1=(2*precision*recall)/((precision+recall)||1);
    out[CLASSES[i]]={precision,recall,f1};
  }
  return out;
}

const data = generate(400,42);
const byClass={}; data.forEach(d=>{(byClass[d.goldUrgency] ||= []).push(d);});
const train=[],test=[];
const rnd2 = mulberry32(7);
for(const c of Object.keys(byClass)){
  const arr = byClass[c].slice().sort(()=>rnd2()-0.5);
  const cut = Math.floor(arr.length*0.7);
  train.push(...arr.slice(0,cut)); test.push(...arr.slice(cut));
}

const model = trainLR(train);
fs.writeFileSync(
  path.join(__dirname,'..','engine','model.json'),
  JSON.stringify({weights:model.weights,biases:model.biases,trainedAt:new Date().toISOString()},null,2)
);

const yTrue = test.map(t=>t.goldUrgency);
const yPred = test.map(t=>triage(t).urgency);
const cm = confusion(yTrue,yPred);
const pc = perClass(cm);
const macroF1 = Object.values(pc).reduce((a,v)=>a+v.f1,0)/5;
const emergencySensitivity = pc.EMERGENCY.recall;
const accuracy = cm.reduce((a,row,i)=>a+row[i],0)/test.length;

fs.writeFileSync(
  path.join(__dirname,'metrics.json'),
  JSON.stringify({
    dataset:{name:'synthetic-triage-benchmark',n:400,split:'70/30',seed:42,
      limitation:'Synthetic, not clinically validated; for pipeline demonstration only.'},
    accuracy, macroF1, emergencySensitivity, perClass:pc, confusion:cm
  },null,2)
);

console.log('Trained & evaluated.');
console.log('Accuracy:', accuracy.toFixed(3));
console.log('Macro-F1:', macroF1.toFixed(3));
console.log('Emergency sensitivity:', emergencySensitivity.toFixed(3));
