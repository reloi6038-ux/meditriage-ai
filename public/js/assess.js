(function () {
  'use strict';

  var form = document.getElementById('assess-form');
  if (!form) return;

  var DRAFT_KEY = 'mt-assess-draft';
  var DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  var errEl = document.getElementById('form-error');
  var btn = document.getElementById('submit-btn');
  var summary = document.getElementById('summary');
  var progressFill = document.getElementById('progress-fill');
  var progressPct = document.getElementById('progress-pct');
  var draftPill = document.getElementById('draft-pill');
  var dangerLive = document.getElementById('danger-live');
  var resumeBanner = document.getElementById('resume-banner');
  var resumeMeta = document.getElementById('resume-meta');

  // ---------- Completeness meter ----------
  var ALL_FIELDS = [
    'ageBucket', 'sex', 'pregnancy',
    'tempC', 'heartRate', 'respRate', 'spo2', 'systolicBP',
    'diastolicBP', 'glucose', 'painScore', 'avpu', 'onset'
  ];
  function computeCompleteness() {
    var filled = 0, total = ALL_FIELDS.length + 1;
    for (var i = 0; i < ALL_FIELDS.length; i++) {
      var el = form.elements[ALL_FIELDS[i]];
      if (!el) continue;
      var v = el.value;
      if (v !== '' && v != null && v !== 'not_applicable') filled++;
    }
    if (form.querySelectorAll('input[name="symptoms"]:checked').length > 0) filled++;
    return Math.round((filled / total) * 100);
  }

  function updateProgress() {
    var pct = computeCompleteness();
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressPct) progressPct.textContent = pct + '%';
    if (summary) {
      if (pct < 30) summary.textContent = 'Complete more fields for a more reliable result.';
      else if (pct < 65) summary.textContent = 'Good. Add vitals to improve accuracy.';
      else summary.textContent = 'Excellent — enough data for a high-confidence result.';
    }
  }

  // ---------- Danger-sign live banner ----------
  var dangerBoxes = form.querySelectorAll('input[name="redFlags"]');
  var dangerDismissed = false;

  function updateDangerLive() {
    var any = false;
    for (var i = 0; i < dangerBoxes.length; i++) {
      if (dangerBoxes[i].checked) { any = true; break; }
    }
    if (any && !dangerDismissed) {
      dangerLive.classList.add('show');
    } else {
      dangerLive.classList.remove('show');
    }
    // Also update submit button label when not loading
    if (btn && !btn.classList.contains('is-loading')) {
      btn.textContent = any
        ? 'Get EMERGENCY recommendation'
        : 'Generate triage recommendation';
    }
  }
  dangerBoxes.forEach(function (box) { box.addEventListener('change', updateDangerLive); });
  document.getElementById('dl-dismiss').addEventListener('click', function () {
    dangerDismissed = true;
    dangerLive.classList.remove('show');
  });
  document.getElementById('dl-submit-now').addEventListener('click', function () {
    // Fill any missing required field with safe defaults
    var ageEl = form.elements.ageBucket;
    if (!ageEl.value) ageEl.value = '18-39';
    submitForm(true);
  });

  // ---------- Symptom search ----------
  var searchWrap = document.getElementById('symptom-search-wrap');
  var searchInput = document.getElementById('symptom-search');
  var searchClear = document.getElementById('symptom-search-clear');
  var symptomChips = document.querySelectorAll('#symptom-chips .check');

  function filterSymptoms() {
    var q = (searchInput.value || '').toLowerCase().trim();
    var visible = 0;
    symptomChips.forEach(function (chip) {
      var key = (chip.getAttribute('data-sym') || '').toLowerCase();
      var labelText = chip.textContent.toLowerCase();
      var match = !q || key.indexOf(q) !== -1 || labelText.indexOf(q) !== -1;
      chip.classList.toggle('hidden-by-search', !match);
      if (match) visible++;
    });
    searchWrap.classList.toggle('has-value', !!q);
    // Add "no results" note if needed
    var emptyNote = document.getElementById('chips-empty-note');
    if (visible === 0) {
      if (!emptyNote) {
        emptyNote = document.createElement('div');
        emptyNote.id = 'chips-empty-note';
        emptyNote.className = 'chips-empty-note';
        emptyNote.textContent = 'No matching symptoms. Try a different term.';
        document.getElementById('symptom-chips').appendChild(emptyNote);
      }
    } else if (emptyNote) {
      emptyNote.remove();
    }
  }
  searchInput.addEventListener('input', filterSymptoms);
  searchClear.addEventListener('click', function () {
    searchInput.value = '';
    filterSymptoms();
    searchInput.focus();
  });

  // ---------- Advanced vitals toggle ----------
  var advToggle = document.getElementById('advanced-toggle');
  var advPanel = document.getElementById('advanced-panel');
  advToggle.addEventListener('click', function () {
    var open = advPanel.classList.toggle('open');
    advToggle.classList.toggle('open', open);
    advToggle.querySelector('span').textContent = open
      ? '− Hide advanced measurements'
      : '+ Add advanced measurements (BP, glucose, pain, consciousness)';
  });

  // ---------- Auto-save draft ----------
  var draftSaveTimer = null;
  var draftLastSavedAt = 0;

  function serializeForm() {
    var data = {};
    // Selects & text inputs
    ['ageBucket','sex','pregnancy','onset','durationHours','notes',
     'tempC','heartRate','respRate','spo2','systolicBP',
     'diastolicBP','glucose','painScore','avpu'].forEach(function (name) {
      var el = form.elements[name];
      if (el && el.value !== '') data[name] = el.value;
    });
    // Checkbox groups
    ['conditions','redFlags','symptoms','clinical'].forEach(function (name) {
      var vals = [];
      form.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (c) {
        vals.push(c.value);
      });
      if (vals.length) data[name] = vals;
    });
    return data;
  }

  function saveDraft() {
    try {
      var data = serializeForm();
      // Don't save completely empty drafts
      var hasContent = Object.keys(data).some(function (k) {
        return k !== 'sex' && k !== 'pregnancy' && k !== 'avpu';
      });
      if (!hasContent) {
        localStorage.removeItem(DRAFT_KEY);
        if (draftPill) draftPill.classList.remove('show');
        return;
      }
      data._savedAt = Date.now();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      draftLastSavedAt = Date.now();
      if (draftPill) {
        draftPill.classList.add('show');
        clearTimeout(draftPill._hideTimer);
        draftPill._hideTimer = setTimeout(function () {
          draftPill.classList.remove('show');
        }, 2000);
      }
    } catch (_) {}
  }

  function scheduleSaveDraft() {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(saveDraft, 1500);
  }

  function restoreDraft(data) {
    // Selects & text inputs
    ['ageBucket','sex','pregnancy','onset','durationHours','notes',
     'tempC','heartRate','respRate','spo2','systolicBP',
     'diastolicBP','glucose','painScore','avpu'].forEach(function (name) {
      if (data[name] != null) {
        var el = form.elements[name];
        if (el) el.value = data[name];
      }
    });
    // Checkbox groups
    ['conditions','redFlags','symptoms','clinical'].forEach(function (name) {
      if (Array.isArray(data[name])) {
        form.querySelectorAll('input[name="' + name + '"]').forEach(function (c) {
          c.checked = data[name].indexOf(c.value) !== -1;
        });
      }
    });
    updateProgress();
    updateDangerLive();
  }

  function loadDraftOnStartup() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || !data._savedAt) return;
      // Expire after 24h
      if (Date.now() - data._savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      // Show resume banner
      var age = data.ageBucket || 'not selected';
      var symCount = (data.symptoms || []).length;
      var dangerCount = (data.redFlags || []).length;
      var parts = [];
      if (age !== 'not selected') parts.push('Age: ' + age);
      if (symCount) parts.push(symCount + ' symptom' + (symCount > 1 ? 's' : ''));
      if (dangerCount) parts.push(dangerCount + ' danger sign' + (dangerCount > 1 ? 's' : ''));
      if (!parts.length) parts.push('Incomplete draft');
      resumeMeta.textContent = parts.join(' · ') + ' — saved ' +
        new Date(data._savedAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });

      resumeBanner.classList.add('show');

      // Store data for later
      resumeBanner._data = data;
    } catch (_) {}
  }

  document.getElementById('resume-btn').addEventListener('click', function () {
    if (resumeBanner._data) {
      restoreDraft(resumeBanner._data);
      resumeBanner.classList.remove('show');
    }
  });
  document.getElementById('discard-btn').addEventListener('click', function () {
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
    resumeBanner.classList.remove('show');
    form.reset();
    updateProgress();
    updateDangerLive();
  });

  form.addEventListener('input', function () {
    updateProgress();
    scheduleSaveDraft();
  });
  form.addEventListener('change', function () {
    updateProgress();
    updateDangerLive();
    scheduleSaveDraft();
  });

  loadDraftOnStartup();
  updateProgress();
  updateDangerLive();

  // ---------- Submit ----------
  async function submitForm(force) {
    errEl.hidden = true;

    var fd = new FormData(form);
    var symptoms = fd.getAll('symptoms');
    var redFlags = fd.getAll('redFlags');
    var conditions = fd.getAll('conditions');
    var clinical = fd.getAll('clinical');

    if (!force && symptoms.length === 0 && redFlags.length === 0) {
      errEl.textContent = 'Select at least one symptom or danger sign.';
      errEl.hidden = false;
      errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Client-side vital range checks
    var ranges = {
      tempC: [25, 45], heartRate: [20, 250], respRate: [4, 80],
      spo2: [50, 100], systolicBP: [40, 300], diastolicBP: [20, 200],
      glucose: [1, 40], painScore: [0, 10]
    };
    for (var name in ranges) {
      var el = form.elements[name];
      if (!el || el.value === '') continue;
      var v = Number(el.value);
      if (isNaN(v) || v < ranges[name][0] || v > ranges[name][1]) {
        el.setAttribute('aria-invalid', 'true');
        errEl.textContent = name + ' must be between ' + ranges[name][0] + ' and ' + ranges[name][1] + '.';
        errEl.hidden = false;
        el.focus();
        return;
      }
      el.removeAttribute('aria-invalid');
    }

    // Build payload
    var vitals = {};
    ['tempC','heartRate','respRate','spo2','systolicBP','diastolicBP','glucose','painScore'].forEach(function (k) {
      var val = fd.get(k);
      if (val !== '' && val != null) vitals[k] = Number(val);
    });
    if (fd.get('avpu')) vitals.avpu = fd.get('avpu');

    var payload = {
      ageBucket: fd.get('ageBucket') || (force ? '18-39' : ''),
      sex: fd.get('sex') || 'unknown',
      pregnancy: fd.get('pregnancy') || 'not_applicable',
      conditions: conditions,
      clinical: clinical,
      symptoms: symptoms,
      redFlags: redFlags,
      vitals: vitals,
      notes: (fd.get('notes') || '').slice(0, 500)
    };
    var onset = fd.get('onset');
    if (onset) payload.onset = onset;
    var dur = fd.get('durationHours');
    if (dur) payload.durationHours = Number(dur);

    // Loading state
    var originalLabel = btn.textContent;
    btn.classList.add('is-loading');
    btn.textContent = 'Analysing…';
    btn.disabled = true;
    if (summary) summary.textContent = 'Sending clinical data to the engine…';

    try {
      var data = await apiPost('/assessments', payload);
      // Clear draft on success
      try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
      // Save to local history
      try {
        var prev = JSON.parse(localStorage.getItem('mt-history') || '[]');
        var entry = {
          id: data.id,
          reference: data.reference,
          createdAt: data.createdAt || new Date().toISOString(),
          result: data.result || {
            urgency: data.urgency,
            emergency: data.emergency,
            confidence: data.confidence,
            score: data.score,
            action: data.action
          },
          symptoms: payload.symptoms
        };
        var next = [entry].concat(prev.filter(function (x) { return x.id !== entry.id; })).slice(0, 100);
        localStorage.setItem('mt-history', JSON.stringify(next));
      } catch (_) {}
      sessionStorage.setItem('lastResult', JSON.stringify(data));
      window.location.href = '/results.html?id=' + data.id;
    } catch (err) {
      errEl.textContent = err.message || 'Request failed. Please try again.';
      errEl.hidden = false;
      errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.classList.remove('is-loading');
      btn.textContent = originalLabel;
      btn.disabled = false;
      updateProgress();
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitForm(false);
  });

  // Keyboard shortcut: Ctrl/Cmd+Enter submits
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submitForm(false);
    }
  });
})();