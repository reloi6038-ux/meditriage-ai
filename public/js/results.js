(function () {
  'use strict';

  var META = {
    EMERGENCY:   { label:'EMERGENCY',   color:'#b91c1c' },
    URGENT:      { label:'URGENT',      color:'#ea580c' },
    SEMI_URGENT: { label:'SEMI-URGENT', color:'#ca8a04' },
    NON_URGENT:  { label:'NON-URGENT',  color:'#16a34a' },
    SELF_CARE:   { label:'SELF-CARE',   color:'#0891b2' }
  };

  var URGENCY_DEFAULT_ACTION = {
    EMERGENCY:   'Seek emergency care immediately.',
    URGENT:      'See a clinician within a few hours.',
    SEMI_URGENT: 'Book a same-day clinical review if symptoms persist or worsen.',
    NON_URGENT:  'Routine appointment is appropriate if concerned.',
    SELF_CARE:   'Monitor at home. Seek care if symptoms worsen.'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, {
        year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
      });
    } catch (_) { return iso; }
  }

  async function resolvePayload() {
    var id = new URLSearchParams(location.search).get('id');
    var ref = new URLSearchParams(location.search).get('ref');
    var data = null;
    if (id) { try { data = await apiGet('/assessments/' + id); } catch (_) {} }
    if (!data && ref) { try { data = await apiGet('/assessments/by-ref/' + encodeURIComponent(ref)); } catch (_) {} }
    if (!data) {
      var raw = sessionStorage.getItem('lastResult');
      if (raw) { try { data = JSON.parse(raw); } catch (_) {} }
    }
    return data;
  }

  // ---------- On-screen renders ----------
  function renderBanner(r, resources) {
    var phone = (resources && resources[0] && resources[0].phone) || '112';
    return '' +
      '<div class="emergency-banner" role="alert">' +
        '<div class="icon">!</div>' +
        '<div>' +
          '<h2>Emergency symptoms detected</h2>' +
          '<p>Seek immediate in-person medical care. Call <a href="tel:' + esc(phone) + '">' + esc(phone) + '</a> or your local emergency number now.</p>' +
        '</div>' +
      '</div>';
  }

  function renderHeader(data, r) {
    var m = META[r.urgency] || META.NON_URGENT;
    var ref = data.reference || '';
    var when = data.createdAt || new Date().toISOString();
    var action = r.action || URGENCY_DEFAULT_ACTION[r.urgency] || '';
    var timeframe = r.timeframe || '';
    var conf = (typeof r.confidence === 'number' && r.confidence > 0)
      ? (r.confidence * 100).toFixed(0) + '%' : '\u2014';
    return '' +
      '<header class="result-header" style="--accent:' + m.color + '">' +
        '<div class="top-row">' +
          '<span class="pill" style="background:' + m.color + '">' + esc(m.label) + '</span>' +
          '<div class="meta-badges">' +
            (ref ? '<span class="meta-badge">Reference <code>' + esc(ref) + '</code></span>' : '') +
            '<span class="meta-badge">Confidence <strong>' + conf + '</strong></span>' +
            (when ? '<span class="meta-badge">' + esc(fmtDate(when)) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<h1>' + esc(action) + '</h1>' +
        '<div class="action-meta">' +
          (timeframe ? '<div class="action-meta-cell"><div class="label">Recommended timeframe</div><div class="value">' + esc(timeframe) + '</div></div>' : '') +
          '<div class="action-meta-cell"><div class="label">Urgency score</div><div class="value">' + (Number.isFinite(r.score) ? r.score : '\u2014') + '</div></div>' +
          '<div class="action-meta-cell"><div class="label">Red flags</div><div class="value">' + ((r.redFlags && r.redFlags.length) || 0) + '</div></div>' +
        '</div>' +
      '</header>';
  }

  function renderWatchFor(r) {
    var items = Array.isArray(r.watchFor) ? r.watchFor : [];
    if (!items.length) return '';
    return '<section class="result-section" data-reveal>' +
      '<h2><span class="icon-wrap">!</span> Watch for these warning signs</h2>' +
      '<ul class="watchfor">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
    '</section>';
  }

  function renderFactors(r) {
    var items = Array.isArray(r.factors) ? r.factors : [];
    if (!items.length) return '';
    return '<section class="result-section" data-reveal>' +
      '<h2><span class="icon-wrap">i</span> Main factors</h2>' +
      '<div class="factors">' + items.map(function (x) { return '<span class="factor">' + esc(x) + '</span>'; }).join('') + '</div>' +
    '</section>';
  }

  function renderReasons(r) {
    var items = Array.isArray(r.reasons) ? r.reasons : [];
    if (!items.length) return '';
    return '<section class="result-section" data-reveal>' +
      '<h2><span class="icon-wrap">?</span> Why this result</h2>' +
      '<ul class="reasons">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
    '</section>';
  }

  function renderProbs(r) {
    var p = r.probabilities || {};
    var entries = Object.entries(p);
    if (!entries.length) return '';
    return '<section class="result-section" data-reveal>' +
      '<h2><span class="icon-wrap">%</span> Probability breakdown</h2>' +
      '<div class="prob-bars">' +
        entries.map(function (e) {
          var k = e[0], v = Number(e[1]);
          return '<div class="prob"><span>' + esc(k.replace('_', ' ')) + '</span>' +
            '<div class="bar"><i style="width:' + (v * 100).toFixed(1) + '%"></i></div>' +
            '<b>' + (v * 100).toFixed(1) + '%</b></div>';
        }).join('') +
      '</div>' +
    '</section>';
  }

  function renderAI(ai) {
    if (!ai) return '';
    var missing = Array.isArray(ai.missing) ? ai.missing : [];
    var followUp = Array.isArray(ai.followUp) ? ai.followUp : [];
    return '<section class="result-section ai-card" data-reveal>' +
      '<span class="ai-label">AI support &mdash; not a diagnosis</span>' +
      '<h2 style="margin-top:.4rem"><span class="icon-wrap">AI</span> Summary</h2>' +
      '<p>' + esc(ai.summary || '') + '</p>' +
      (missing.length ? '<h3 style="font-size:.92rem;margin:1rem 0 .4rem">Missing information</h3><ul>' + missing.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (followUp.length ? '<h3 style="font-size:.92rem;margin:1rem 0 .4rem">Follow-up questions</h3><ul>' + followUp.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      '<p class="ai-disclaimer">' + esc(ai.disclaimer || 'AI-generated information. Cannot override the triage result.') + '</p>' +
    '</section>';
  }

  function renderResources(resources) {
    if (!resources || !resources.length) return '';
    return '<section class="result-section" data-reveal>' +
      '<h2><span class="icon-wrap">+</span> Emergency resources</h2>' +
      '<div class="resources-grid">' +
        resources.map(function (r) {
          return '<div class="resource-card">' +
            '<div class="service">' + esc(r.serviceName || 'Emergency service') + '</div>' +
            '<a class="phone" href="tel:' + esc(r.phone || '') + '">' + esc(r.phone || '') + '</a>' +
            (r.facility ? '<div class="detail">' + esc(r.facility) + '</div>' : '') +
            (r.address ? '<div class="detail">' + esc(r.address) + '</div>' : '') +
            (r.availability ? '<div class="detail">Availability: ' + esc(r.availability) + '</div>' : '') +
          '</div>';
        }).join('') +
      '</div>' +
    '</section>';
  }

  function renderActions(data) {
    var ref = data.reference || '';
    return '<div class="actions-bar no-print">' +
      '<a class="cta" href="/assess.html">\u2190 New assessment</a>' +
      '<button class="cta ghost" id="btn-pdf" type="button">Download PDF</button>' +
      '<button class="cta ghost" id="btn-json" type="button" style="font-size:.85rem">Raw JSON</button>' +
      (ref ? '<a class="cta ghost" href="/history.html">History</a>' : '') +
    '</div>';
  }

  function renderFeedback(data) {
    return '<section class="result-section no-print" data-reveal>' +
      '<h2><span class="icon-wrap">\u2605</span> Was this result helpful?</h2>' +
      '<div id="fb-form" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">' +
        '<select id="fb-rating" aria-label="Rating" style="padding:.6rem .8rem;border:1.5px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--ink);font-family:inherit">' +
          '<option value="5">5 \u2014 very helpful</option>' +
          '<option value="4">4</option><option value="3">3</option><option value="2">2</option>' +
          '<option value="1">1 \u2014 not helpful</option>' +
        '</select>' +
        '<button class="cta" id="fb-submit" type="button">Send feedback</button>' +
        '<span id="fb-status" class="muted" style="font-size:.85rem"></span>' +
      '</div>' +
    '</section>';
  }

  // ---------- PDF report ----------
  function buildPrintReport(data, r) {
    var old = document.getElementById('mt-print-report');
    if (old) old.remove();

    var m = META[r.urgency] || META.NON_URGENT;
    var ref = data.reference || '\u2014';
    var when = data.createdAt || new Date().toISOString();
    var action = r.action || URGENCY_DEFAULT_ACTION[r.urgency] || '';
    var timeframe = r.timeframe || '\u2014';
    var conf = (typeof r.confidence === 'number' && r.confidence > 0)
      ? (r.confidence * 100).toFixed(0) + '%' : '\u2014';

    var watchFor = Array.isArray(r.watchFor) ? r.watchFor : [];
    var factors = Array.isArray(r.factors) ? r.factors : [];
    var reasons = Array.isArray(r.reasons) ? r.reasons : [];
    var probs = r.probabilities || {};
    var ai = data.ai || null;

    var html = '';

    // Header
    html += '<header class="rp-header">' +
      '<div class="rp-brand">' +
        '<svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">' +
          '<rect x="2" y="2" width="36" height="36" rx="10" fill="#0e7490"/>' +
          '<path d="M17 9h6v8h8v6h-8v8h-6v-8H9v-6h8z" fill="#fff"/>' +
        '</svg>' +
        '<div>' +
          '<div class="rp-brand-name">MediTriage AI</div>' +
          '<div class="rp-brand-tag">Clinical triage report</div>' +
        '</div>' +
      '</div>' +
      '<div class="rp-meta">' +
        '<div><span class="rp-k">Reference</span> <span class="rp-v rp-mono">' + esc(ref) + '</span></div>' +
        '<div><span class="rp-k">Date</span> <span class="rp-v">' + esc(fmtDate(when)) + '</span></div>' +
      '</div>' +
    '</header>';

    // Banner
    html += '<div class="rp-banner" style="border-left-color:' + m.color + '">' +
      '<div class="rp-pill" style="background:' + m.color + '">' + esc(m.label) + '</div>' +
      '<div class="rp-action">' + esc(action) + '</div>' +
    '</div>';

    // Summary table
    html += '<table class="rp-table">' +
      '<tr><th>Timeframe</th><td>' + esc(timeframe) + '</td></tr>' +
      '<tr><th>Urgency score</th><td>' + (Number.isFinite(r.score) ? r.score : '\u2014') + '</td></tr>' +
      '<tr><th>Confidence</th><td>' + conf + '</td></tr>' +
      '<tr><th>Red flags</th><td>' + ((r.redFlags && r.redFlags.length) || 0) + '</td></tr>' +
    '</table>';

    // Watch for
    if (watchFor.length) {
      html += '<section class="rp-section">' +
        '<h2>Watch for these warning signs</h2>' +
        '<ul class="rp-warn">' +
          watchFor.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
        '</ul>' +
      '</section>';
    }

    // Factors
    if (factors.length) {
      html += '<section class="rp-section">' +
        '<h2>Main factors</h2>' +
        '<ul>' + factors.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '</section>';
    }

    // Reasons
    if (reasons.length) {
      html += '<section class="rp-section">' +
        '<h2>Why this result</h2>' +
        '<ul>' + reasons.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '</section>';
    }

    // Probabilities
    var entries = Object.entries(probs);
    if (entries.length) {
      html += '<section class="rp-section">' +
        '<h2>Probability breakdown</h2>' +
        '<table class="rp-probs">' +
          entries.map(function (e) {
            var k = e[0], v = Number(e[1]);
            return '<tr>' +
              '<td class="rp-prob-label">' + esc(k.replace('_', ' ')) + '</td>' +
              '<td class="rp-prob-bar"><div style="width:' + (v * 100).toFixed(1) + '%"></div></td>' +
              '<td class="rp-prob-val">' + (v * 100).toFixed(1) + '%</td>' +
            '</tr>';
          }).join('') +
        '</table>' +
      '</section>';
    }

    // AI
    if (ai) {
      html += '<section class="rp-section rp-ai">' +
        '<h2>AI summary <span class="rp-tag">Not a diagnosis</span></h2>' +
        '<p>' + esc(ai.summary || '') + '</p>';
      if (Array.isArray(ai.missing) && ai.missing.length) {
        html += '<p class="rp-sub">Missing information that would improve accuracy</p>' +
          '<ul>' + ai.missing.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      }
      if (Array.isArray(ai.followUp) && ai.followUp.length) {
        html += '<p class="rp-sub">Follow-up questions</p>' +
          '<ul>' + ai.followUp.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      }
      html += '</section>';
    }

    // Inputs
    if (data.symptoms || data.vitals || data.ageBucket) {
      html += '<section class="rp-section">' +
        '<h2>Inputs recorded</h2>' +
        '<table class="rp-table">';
      if (data.ageBucket) html += '<tr><th>Age group</th><td>' + esc(data.ageBucket) + '</td></tr>';
      if (data.sex && data.sex !== 'unknown') html += '<tr><th>Sex</th><td>' + esc(data.sex) + '</td></tr>';
      if (data.pregnancy && data.pregnancy !== 'not_applicable') html += '<tr><th>Pregnancy</th><td>' + esc(data.pregnancy.replace(/_/g, ' ')) + '</td></tr>';
      if (Array.isArray(data.symptoms) && data.symptoms.length) {
        html += '<tr><th>Symptoms</th><td>' + data.symptoms.map(function (s) { return esc(s.replace(/_/g, ' ')); }).join(', ') + '</td></tr>';
      }
      if (Array.isArray(data.redFlags) && data.redFlags.length) {
        html += '<tr><th>Danger signs</th><td>' + data.redFlags.map(function (s) { return esc(s.replace(/_/g, ' ')); }).join(', ') + '</td></tr>';
      }
      if (data.vitals && Object.keys(data.vitals).length) {
        var v = data.vitals;
        var vparts = [];
        if (v.tempC != null)       vparts.push('Temp ' + v.tempC + ' \u00B0C');
        if (v.heartRate != null)   vparts.push('HR ' + v.heartRate + ' bpm');
        if (v.respRate != null)    vparts.push('RR ' + v.respRate + '/min');
        if (v.spo2 != null)        vparts.push('SpO\u2082 ' + v.spo2 + '%');
        if (v.systolicBP != null)  vparts.push('SBP ' + v.systolicBP + ' mmHg');
        if (v.diastolicBP != null) vparts.push('DBP ' + v.diastolicBP + ' mmHg');
        if (v.glucose != null)     vparts.push('Glucose ' + v.glucose + ' mmol/L');
        if (v.painScore != null)   vparts.push('Pain ' + v.painScore + '/10');
        if (v.avpu)                vparts.push('AVPU ' + v.avpu);
        if (vparts.length) html += '<tr><th>Vitals</th><td>' + vparts.join(' \u00B7 ') + '</td></tr>';
      }
      html += '</table></section>';
    }

    // Footer
    html += '<footer class="rp-footer">' +
      '<p><strong>Medical disclaimer:</strong> MediTriage AI is a decision-support and educational tool. ' +
      'It does not diagnose disease and is not a substitute for professional medical advice, diagnosis, or treatment. ' +
      'If this may be an emergency, call your local emergency number immediately.</p>' +
      '<p class="rp-footer-meta">Generated by MediTriage AI \u00B7 Reference ' + esc(ref) + ' \u00B7 ' + esc(fmtDate(new Date().toISOString())) + '</p>' +
    '</footer>';

    var wrap = document.createElement('div');
    wrap.id = 'mt-print-report';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    return wrap;
  }

  function triggerPDF(data, r) {
    var report = buildPrintReport(data, r);
    document.body.classList.add('printing-report');
    requestAnimationFrame(function () {
      setTimeout(function () {
        window.print();
        setTimeout(function () {
          report.remove();
          document.body.classList.remove('printing-report');
        }, 500);
      }, 100);
    });
  }

  function downloadJSON(data, r) {
    var summary = {
      reference: data.reference,
      createdAt: data.createdAt || new Date().toISOString(),
      urgency: r.urgency,
      emergency: r.emergency,
      confidence: r.confidence,
      score: r.score,
      action: r.action,
      timeframe: r.timeframe,
      watchFor: r.watchFor,
      redFlags: r.redFlags,
      factors: r.factors,
      reasons: r.reasons,
      probabilities: r.probabilities,
      ai: data.ai || null,
      disclaimer: 'Decision-support only. Not a diagnosis. Not a substitute for professional medical advice.'
    };
    var blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'MediTriage-' + (data.reference || 'assessment') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  async function fetchResources() {
    try {
      var items = await apiGet('/resources');
      return Array.isArray(items) ? items.slice(0, 6) : [];
    } catch (_) { return []; }
  }

  (async function main() {
    var root = document.getElementById('result-root');
    var data = await resolvePayload();
    if (!data) {
      root.innerHTML = '<div class="result-section"><h2>No result found</h2>' +
        '<p class="muted">This page shows a triage result from an assessment.</p>' +
        '<p style="margin-top:1rem"><a class="cta" href="/assess.html">Start an assessment \u2192</a></p></div>';
      return;
    }

    var r = data.result || data;
    var resources = (r.urgency === 'EMERGENCY' || r.emergency) ? await fetchResources() : [];
    var primaryPhone = (resources[0] && resources[0].phone) || '112';

    root.innerHTML = '' +
      (r.emergency ? renderBanner(r, resources) : '') +
      renderHeader(data, r) +
      renderWatchFor(r) +
      renderFactors(r) +
      renderReasons(r) +
      renderProbs(r) +
      renderAI(data.ai) +
      renderResources(resources) +
      '<section class="result-section" data-reveal style="font-size:.85rem;color:var(--muted)">' +
        '<strong style="color:var(--ink)">Medical disclaimer:</strong> ' +
        'MediTriage AI is a decision-support and educational tool. It does not diagnose disease and is not a substitute for professional medical advice. ' +
        'If this may be an emergency, call <a href="tel:' + esc(primaryPhone) + '">' + esc(primaryPhone) + '</a> or your local emergency number now.' +
      '</section>' +
      renderActions(data) +
      renderFeedback(data);

    var pdfBtn = document.getElementById('btn-pdf');
    if (pdfBtn) pdfBtn.addEventListener('click', function () { triggerPDF(data, r); });

    var jsonBtn = document.getElementById('btn-json');
    if (jsonBtn) jsonBtn.addEventListener('click', function () { downloadJSON(data, r); });

    var fbBtn = document.getElementById('fb-submit');
    if (fbBtn) {
      fbBtn.addEventListener('click', async function () {
        var rating = Number(document.getElementById('fb-rating').value);
        var status = document.getElementById('fb-status');
        try {
          fbBtn.disabled = true;
          if (status) status.textContent = 'Sending\u2026';
          var body = { rating: rating };
          if (data.id || data._id) body.assessmentId = data.id || data._id;
          await apiPost('/feedback', body);
          if (status) status.textContent = '\u2713 Thank you.';
          fbBtn.textContent = 'Sent';
        } catch (e) {
          if (status) status.textContent = '\u2717 ' + (e.message || 'Failed.');
          fbBtn.disabled = false;
        }
      });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) en.target.classList.add('is-visible'); });
      }, { threshold: 0.1 });
      document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-visible'); });
    }
  })();
})();