(async function () {
  const kpis = document.getElementById('kpis');
  const metrics = document.getElementById('model-metrics');
  const uChart = document.getElementById('urgency-chart');
  const dChart = document.getElementById('daily-chart');
  try {
    const [dash, evalMetrics] = await Promise.all([
      apiGet('/evaluation/dashboard'),
      apiGet('/evaluation'),
    ]);
    const byCount = dash.byUrgency.reduce((a,b)=>a+b.count,0);
    kpis.innerHTML = `
      <div class="stat"><strong>${dash.total}</strong><span>total assessments</span></div>
      <div class="stat"><strong>${byCount}</strong><span>results produced</span></div>
      <div class="stat"><strong>${(evalMetrics.macroF1*100).toFixed(1)}%</strong><span>macro F1</span></div>
      <div class="stat"><strong>${(evalMetrics.emergencySensitivity*100).toFixed(1)}%</strong><span>emergency sensitivity</span></div>`;
    metrics.innerHTML = Object.entries(evalMetrics.perClass).map(([k,v]) => `
      <article class="card">
        <h3>${k}</h3>
        <p>Precision <strong>${(v.precision*100).toFixed(1)}%</strong></p>
        <p>Recall <strong>${(v.recall*100).toFixed(1)}%</strong></p>
        <p>F1 <strong>${(v.f1*100).toFixed(1)}%</strong></p>
      </article>`).join('') +
      `<article class="card"><h3>Confusion matrix</h3>
        <table class="cm">${evalMetrics.confusion.map(row => `<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>
        <p class="muted" style="margin-top:.6rem;font-size:.78rem">${evalMetrics.dataset.limitation}</p>
      </article>`;
    const totalU = byCount || 1;
    uChart.innerHTML = dash.byUrgency.length
      ? dash.byUrgency.map(u => `
        <div class="hbar"><span>${u._id}</span>
          <div class="bar"><i style="width:${(u.count/totalU*100).toFixed(1)}%"></i></div>
          <b>${u.count}</b></div>`).join('')
      : '<div class="muted">No data yet.</div>';
    const maxD = Math.max(1, ...dash.daily.map(d => d.count));
    dChart.innerHTML = dash.daily.length
      ? dash.daily.map(d => `
        <div class="vbar" title="${d._id}: ${d.count}">
          <i style="height:${(d.count/maxD*100).toFixed(1)}%"></i>
          <span>${d._id.slice(5)}</span>
        </div>`).join('')
      : '<div class="muted">No data yet.</div>';
  } catch (e) {
    kpis.innerHTML = `<div class="error">${e.message}</div>`;
  }
})();