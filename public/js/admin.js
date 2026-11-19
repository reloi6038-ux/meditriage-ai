(function () {
  'use strict';

  var TOKEN_KEY = 'mt-token';
  var URGENCY = ['EMERGENCY','URGENT','SEMI_URGENT','NON_URGENT','SELF_CARE'];
  var URGENCY_COLORS = {
    EMERGENCY:   '#b91c1c',
    URGENT:      '#ea580c',
    SEMI_URGENT: '#ca8a04',
    NON_URGENT:  '#16a34a',
    SELF_CARE:   '#0891b2'
  };

  function token() { return localStorage.getItem(TOKEN_KEY) || ''; }

  function apiFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers || {}, {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token()
    });
    return fetch('/api/v1' + path, opts).then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok) {
          var err = new Error((body && body.error) || ('HTTP ' + r.status));
          err.status = r.status;
          throw err;
        }
        return body.data;
      });
    });
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (children) [].concat(children).forEach(function (c) {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, {
        year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'
      });
    } catch(_) { return iso; }
  }

  function toast(msg, kind) {
    var t = el('div', { class: 'toast ' + (kind || 'ok') }, msg);
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 3000);
  }

  // ---------- Root renderer ----------
  async function render() {
    var root = document.getElementById('admin-root');

    // 1. Check auth
    if (!token()) {
      root.innerHTML = renderAuthGate('Sign in required',
        'The admin panel requires an admin account. Sign in to continue.',
        'No admin yet? Run <code>npm run seed:admin</code> locally to create one, then log in with <code>/api/v1/auth/login</code>.');
      return;
    }

    var me;
    try { me = await apiFetch('/auth/me').then(function (d) { return d.user; }); }
    catch (e) {
      if (e.status === 401) {
        root.innerHTML = renderAuthGate('Session expired',
          'Your sign-in token is no longer valid.',
          'Sign in again to continue. You can log in with <code>POST /api/v1/auth/login</code>.');
        return;
      }
      root.innerHTML = renderAuthGate('Connection error',
        'Could not reach the backend.',
        escapeHtml(e.message));
      return;
    }

    if (!me || me.role !== 'admin') {
      root.innerHTML = renderAuthGate('Admin access required',
        'You are signed in, but your account does not have the admin role.',
        'Ask an existing admin to promote your account, or seed a new admin with <code>npm run seed:admin</code>.');
      return;
    }

    // 2. Render shell
    root.innerHTML = '';
    root.appendChild(renderHeader(me));
    var tabs = renderTabs();
    root.appendChild(tabs.bar);
    tabs.panels.forEach(function (p) { root.appendChild(p); });

    // 3. Load initial tab
    activateTab('overview');
    document.querySelectorAll('.admin-tab').forEach(function (b) {
      b.addEventListener('click', function () { activateTab(b.getAttribute('data-tab')); });
    });
  }

  function renderAuthGate(title, message, hint) {
    return '<div class="auth-gate">' +
      '<div class="icon-wrap">&#128274;</div>' +
      '<h2>' + escapeHtml(title) + '</h2>' +
      '<p>' + escapeHtml(message) + '</p>' +
      '<p>' + (hint || '') + '</p>' +
      '<a class="cta" href="/">Back to home</a>' +
    '</div>';
  }

  function renderHeader(me) {
    return el('header', { class: 'admin-header' }, [
      el('div', null, [
        el('h1', { text: 'Admin' }),
        el('p', { text: 'Signed in as ' + me.email + ' · role: ' + me.role })
      ]),
      el('div', { class: 'actions' }, [
        el('a', { class: 'cta ghost', href: '/' }, '← Home'),
        el('button', { class: 'cta ghost', onclick: function () {
          localStorage.removeItem(TOKEN_KEY);
          location.reload();
        }}, 'Sign out')
      ])
    ]);
  }

  function renderTabs() {
    var tabs = [
      { id: 'overview',  label: 'Overview',            icon: '📊' },
      { id: 'rules',     label: 'Clinical rules',      icon: '🚨' },
      { id: 'resources', label: 'Emergency resources', icon: '🏥' },
      { id: 'users',     label: 'Users',               icon: '👥' },
      { id: 'audit',     label: 'Audit log',           icon: '📋' }
    ];
    var bar = el('div', { class: 'admin-tabs', role: 'tablist' });
    tabs.forEach(function (t) {
      bar.appendChild(el('button', {
        class: 'admin-tab',
        'data-tab': t.id,
        role: 'tab'
      }, [document.createTextNode(t.icon + ' '), document.createTextNode(t.label)]));
    });

    var panels = tabs.map(function (t) {
      return el('section', { class: 'panel', 'data-panel': t.id, id: 'panel-' + t.id });
    });

    return { bar: bar, panels: panels };
  }

  function activateTab(name) {
    document.querySelectorAll('.admin-tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === name);
    });
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-panel') === name);
    });
    if (name === 'overview')  loadOverview();
    if (name === 'rules')     loadRules();
    if (name === 'resources') loadResources();
    if (name === 'users')     loadUsers();
    if (name === 'audit')     loadAudit();
  }

  // ---------- Overview ----------
  async function loadOverview() {
    var panel = document.getElementById('panel-overview');
    panel.innerHTML = '<div class="admin-card"><p class="muted">Loading…</p></div>';
    try {
      var d = await apiFetch('/admin/stats');
      var total = d.total || 0;
      var byU = d.byUrgency || [];
      var get = function (k) { var x = byU.find(function (b) { return b._id === k; }); return x ? x.count : 0; };
      var emergency = get('EMERGENCY'), urgent = get('URGENT'), semi = get('SEMI_URGENT'), non = get('NON_URGENT'), self = get('SELF_CARE');

      var html = '';
      html += '<div class="card-grid">';
      html += kpiCard('Total assessments', total);
      html += kpiCard('Emergency', emergency, 'danger');
      html += kpiCard('Urgent', urgent, 'warn');
      html += kpiCard('Users', d.userCount || 0);
      html += '</div>';

      // Urgency distribution
      html += '<div class="admin-card"><h2><span class="icon">%</span> Urgency distribution</h2>';
      html += '<div class="chart-bars">';
      URGENCY.forEach(function (k) {
        var c = get(k);
        var pct = total ? (c / total * 100) : 0;
        html += '<div class="chart-row">' +
          '<span style="font-weight:600;color:' + URGENCY_COLORS[k] + '">' + k.replace('_',' ') + '</span>' +
          '<div class="bar-wrap"><div class="bar-fill" style="width:' + pct.toFixed(1) + '%;background:' + URGENCY_COLORS[k] + '"></div></div>' +
          '<b>' + c + '</b></div>';
      });
      html += '</div></div>';

      // Daily trend
      var daily = d.daily || [];
      if (daily.length) {
        var maxD = Math.max.apply(null, daily.map(function (x) { return x.count; })) || 1;
        html += '<div class="admin-card"><h2><span class="icon">📈</span> Last 30 days</h2><div class="chart-vbars">';
        daily.forEach(function (x) {
          var h = (x.count / maxD * 100).toFixed(1);
          html += '<div class="vbar" title="' + escapeHtml(x._id) + ': ' + x.count + '">' +
            '<div class="vi" style="height:' + h + '%"></div>' +
            '<div class="vl">' + escapeHtml(String(x._id || '').slice(5)) + '</div></div>';
        });
        html += '</div></div>';
      }

      // Top symptoms
      var symptoms = d.topSymptoms || [];
      if (symptoms.length) {
        var maxS = symptoms[0].count || 1;
        html += '<div class="admin-card"><h2><span class="icon">🩺</span> Top reported symptoms</h2><div class="chart-bars">';
        symptoms.forEach(function (s) {
          var pct = (s.count / maxS * 100).toFixed(1);
          html += '<div class="chart-row">' +
            '<span>' + escapeHtml(s._id.replace(/_/g,' ')) + '</span>' +
            '<div class="bar-wrap"><div class="bar-fill" style="width:' + pct + '%;background:linear-gradient(90deg,#22d3ee,#0e7490)"></div></div>' +
            '<b>' + s.count + '</b></div>';
        });
        html += '</div></div>';
      }

      // Recent assessments
      var recent = d.recent || [];
      if (recent.length) {
        html += '<div class="admin-card"><h2><span class="icon">🕐</span> Recent assessments</h2>';
        html += '<table class="admin-table"><thead><tr><th>Reference</th><th>Urgency</th><th>When</th></tr></thead><tbody>';
        recent.forEach(function (r) {
          html += '<tr>' +
            '<td><code>' + escapeHtml(r.reference) + '</code></td>' +
            '<td><span class="pill ' + r.result.urgency + '">' + r.result.urgency.replace('_',' ') + '</span></td>' +
            '<td>' + escapeHtml(fmtDate(r.createdAt)) + '</td>' +
          '</tr>';
        });
        html += '</tbody></table></div>';
      }

      panel.innerHTML = html;
    } catch (e) {
      panel.innerHTML = '<div class="admin-card"><p class="error">Error: ' + escapeHtml(e.message) + '</p></div>';
    }
  }

  function kpiCard(label, value, cls) {
    return '<div class="kpi' + (cls ? ' ' + cls : '') + '">' +
      '<div class="label">' + escapeHtml(label) + '</div>' +
      '<div class="value">' + value + '</div></div>';
  }

  // ---------- Clinical Rules ----------
  async function loadRules() {
    var panel = document.getElementById('panel-rules');
    panel.innerHTML = '<div class="admin-card"><p class="muted">Loading…</p></div>';
    try {
      var rules = await apiFetch('/admin/rules');
      var html = '';
      html += '<div class="admin-card">' +
        '<h2><span class="icon">+</span> New clinical rule</h2>' +
        renderRuleForm(null) +
      '</div>';

      html += '<div class="admin-card"><h2><span class="icon">🚨</span> Existing rules (' + rules.length + ')</h2>';
      if (!rules.length) {
        html += '<div class="empty-state"><h3>No rules yet</h3><p>Create your first rule above. Rules with higher priority run first.</p></div>';
      } else {
        html += '<table class="admin-table"><thead><tr><th>Name</th><th>Urgency</th><th>Priority</th><th>Status</th><th>Triggers</th><th></th></tr></thead><tbody>';
        rules.forEach(function (r) {
          var triggers = [];
          if (r.anySymptoms && r.anySymptoms.length) triggers.push('any: ' + r.anySymptoms.join(','));
          if (r.allSymptoms && r.allSymptoms.length) triggers.push('all: ' + r.allSymptoms.join(','));
          if (r.anyRedFlags && r.anyRedFlags.length) triggers.push('flags: ' + r.anyRedFlags.join(','));
          html += '<tr>' +
            '<td><strong>' + escapeHtml(r.name) + '</strong><br><span class="muted" style="font-size:.78rem">' + escapeHtml(r.description || '') + '</span></td>' +
            '<td><span class="pill ' + r.urgency + '">' + r.urgency.replace('_',' ') + '</span></td>' +
            '<td>' + r.priority + '</td>' +
            '<td><span class="pill ' + (r.enabled ? 'pill-enabled' : 'pill-disabled') + '">' + (r.enabled ? 'Enabled' : 'Disabled') + '</span></td>' +
            '<td style="font-size:.78rem;color:var(--muted)">' + escapeHtml(triggers.join(' · ')) + '</td>' +
            '<td class="actions-cell">' +
              '<button class="btn-sm" data-edit-rule="' + r._id + '">Edit</button> ' +
              '<button class="btn-sm" data-toggle-rule="' + r._id + '" data-enabled="' + (r.enabled ? '1' : '0') + '">' + (r.enabled ? 'Disable' : 'Enable') + '</button> ' +
              '<button class="btn-sm danger" data-delete-rule="' + r._id + '">Delete</button>' +
            '</td>' +
          '</tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';
      panel.innerHTML = html;

      // Wire up
      wireRuleForm(panel, loadRules);
      panel.querySelectorAll('[data-edit-rule]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-edit-rule');
          var r = rules.find(function (x) { return x._id === id; });
          if (r) openRuleModal(r, loadRules);
        });
      });
      panel.querySelectorAll('[data-toggle-rule]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var id = btn.getAttribute('data-toggle-rule');
          var en = btn.getAttribute('data-enabled') === '1';
          try {
            await apiFetch('/admin/rules/' + id, {
              method: 'PUT',
              body: JSON.stringify({ enabled: !en, name: (rules.find(function (x) { return x._id === id; }) || {}).name })
            });
            toast('Rule ' + (en ? 'disabled' : 'enabled'));
            loadRules();
          } catch (e) { toast(e.message, 'err'); }
        });
      });
      panel.querySelectorAll('[data-delete-rule]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!confirm('Delete this rule permanently?')) return;
          try {
            await apiFetch('/admin/rules/' + btn.getAttribute('data-delete-rule'), { method: 'DELETE' });
            toast('Rule deleted');
            loadRules();
          } catch (e) { toast(e.message, 'err'); }
        });
      });
    } catch (e) {
      panel.innerHTML = '<div class="admin-card"><p class="error">Error: ' + escapeHtml(e.message) + '</p></div>';
    }
  }

  function renderRuleForm(rule) {
    var r = rule || {};
    var SYMPTOMS = ['fever','cough','chest_pain','shortness_of_breath','severe_headache','confusion','weakness_one_side','slurred_speech','severe_bleeding','vomiting','diarrhea','abdominal_pain','rash','joint_pain','fatigue','dizziness','sore_throat','runny_nose','seizure','fainting','chest_tightness','palpitations','swollen_leg','vision_loss'];
    var RED_FLAGS = ['unable_to_drink','vomits_everything','convulsions','lethargic','severe_chest_pain','severe_breathing','uncontrolled_bleeding','sudden_weakness','sudden_speech','severe_dehydration','stiff_neck','severe_allergic'];

    var checked = function (arr, v) { return (arr || []).indexOf(v) !== -1 ? 'checked' : ''; };

    return '<form id="rule-form">' +
      '<input type="hidden" name="id" value="' + escapeHtml(r._id || '') + '">' +
      '<div class="form-grid">' +
        '<label class="field">Name <input type="text" name="name" required value="' + escapeHtml(r.name || '') + '" placeholder="e.g. Severe chest pain"></label>' +
        '<label class="field">Urgency' +
          '<select name="urgency" required>' +
            URGENCY.map(function (u) { return '<option value="' + u + '"' + (r.urgency === u ? ' selected' : '') + '>' + u.replace('_',' ') + '</option>'; }).join('') +
          '</select>' +
        '</label>' +
        '<label class="field">Priority <input type="number" name="priority" min="1" max="100" value="' + (r.priority || 50) + '"><span class="hint">Higher = more important (1-100)</span></label>' +
        '<label class="field">Enabled <select name="enabled"><option value="true"' + (r.enabled !== false ? ' selected' : '') + '>Yes</option><option value="false"' + (r.enabled === false ? ' selected' : '') + '>No</option></select></label>' +
      '</div>' +
      '<label class="field" style="margin-bottom:.85rem">Description <input type="text" name="description" value="' + escapeHtml(r.description || '') + '" placeholder="Optional — for admin reference"></label>' +
      '<div class="field" style="margin-bottom:.85rem">' +
        '<label style="margin-bottom:.35rem">Any of these symptoms</label>' +
        '<div class="chips">' + SYMPTOMS.map(function (s) {
          return '<label><input type="checkbox" name="anySymptoms" value="' + s + '" ' + checked(r.anySymptoms, s) + '><span>' + s.replace(/_/g,' ') + '</span></label>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="field" style="margin-bottom:.85rem">' +
        '<label style="margin-bottom:.35rem">Any of these red flags</label>' +
        '<div class="chips">' + RED_FLAGS.map(function (s) {
          return '<label><input type="checkbox" name="anyRedFlags" value="' + s + '" ' + checked(r.anyRedFlags, s) + '><span>' + s.replace(/_/g,' ') + '</span></label>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="form-grid">' +
        '<label class="field">Max SpO₂ below <input type="number" name="maxSpO2" value="' + (r.maxSpO2 || '') + '" placeholder="e.g. 90"><span class="hint">Triggers if SpO₂ ≤ value</span></label>' +
        '<label class="field">Max systolic BP below <input type="number" name="maxSysBP" value="' + (r.maxSysBP || '') + '" placeholder="e.g. 90"></label>' +
        '<label class="field">Min temp °C <input type="number" step="0.1" name="minTempC" value="' + (r.minTempC || '') + '" placeholder="e.g. 39"></label>' +
        '<label class="field">Min heart rate <input type="number" name="minHeartRate" value="' + (r.minHeartRate || '') + '" placeholder="e.g. 120"></label>' +
      '</div>' +
      '<label class="field" style="margin-bottom:.85rem">Action text <input type="text" name="action" value="' + escapeHtml(r.action || '') + '" placeholder="e.g. Seek emergency care immediately."></label>' +
      '<label class="field" style="margin-bottom:.85rem">Timeframe <input type="text" name="timeframe" value="' + escapeHtml(r.timeframe || '') + '" placeholder="e.g. Now"></label>' +
      '<label class="field" style="margin-bottom:.85rem">Watch for (comma separated) <input type="text" name="watchFor" value="' + escapeHtml((r.watchFor || []).join(', ')) + '"></label>' +
      '<div class="form-actions">' +
        '<button type="submit" class="cta">' + (r._id ? 'Update rule' : 'Create rule') + '</button>' +
        (r._id ? '<button type="button" class="cta ghost" id="cancel-rule">Cancel</button>' : '') +
      '</div>' +
    '</form>';
  }

  function wireRuleForm(panel, reload) {
    var form = panel.querySelector('#rule-form');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var body = {
        name: fd.get('name'),
        urgency: fd.get('urgency'),
        priority: Number(fd.get('priority')) || 50,
        enabled: fd.get('enabled') === 'true',
        description: fd.get('description') || '',
        anySymptoms: fd.getAll('anySymptoms'),
        anyRedFlags: fd.getAll('anyRedFlags'),
        allSymptoms: [],
        action: fd.get('action') || '',
        timeframe: fd.get('timeframe') || '',
        watchFor: (fd.get('watchFor') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean)
      };
      ['maxSpO2','maxSysBP','minTempC','minHeartRate'].forEach(function (k) {
        var v = fd.get(k);
        if (v !== '' && v != null) body[k] = Number(v);
      });
      try {
        var id = fd.get('id');
        if (id) {
          await apiFetch('/admin/rules/' + id, { method: 'PUT', body: JSON.stringify(body) });
          toast('Rule updated');
        } else {
          await apiFetch('/admin/rules', { method: 'POST', body: JSON.stringify(body) });
          toast('Rule created');
        }
        reload();
      } catch (e) { toast(e.message, 'err'); }
    });
  }

  function openRuleModal(rule, reload) {
    var modal = document.getElementById('rule-modal');
    if (!modal) {
      modal = el('div', { class: 'modal-bg', id: 'rule-modal' });
      document.body.appendChild(modal);
    }
    modal.innerHTML = '<div class="modal">' +
      '<h2>Edit rule</h2>' +
      '<p class="modal-hint">Changes are versioned and audit-logged.</p>' +
      renderRuleForm(rule) +
      '</div>';
    modal.classList.add('open');
    modal.addEventListener('click', function (e) {
      if (e.target === modal) { modal.classList.remove('open'); }
    });
    var form = modal.querySelector('#rule-form');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var body = {
        name: fd.get('name'),
        urgency: fd.get('urgency'),
        priority: Number(fd.get('priority')) || 50,
        enabled: fd.get('enabled') === 'true',
        description: fd.get('description') || '',
        anySymptoms: fd.getAll('anySymptoms'),
        anyRedFlags: fd.getAll('anyRedFlags'),
        allSymptoms: [],
        action: fd.get('action') || '',
        timeframe: fd.get('timeframe') || '',
        watchFor: (fd.get('watchFor') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean)
      };
      ['maxSpO2','maxSysBP','minTempC','minHeartRate'].forEach(function (k) {
        var v = fd.get(k);
        if (v !== '' && v != null) body[k] = Number(v);
      });
      try {
        await apiFetch('/admin/rules/' + fd.get('id'), { method: 'PUT', body: JSON.stringify(body) });
        toast('Rule updated');
        modal.classList.remove('open');
        reload();
      } catch (e) { toast(e.message, 'err'); }
    });
    var cancel = modal.querySelector('#cancel-rule');
    if (cancel) cancel.addEventListener('click', function () { modal.classList.remove('open'); });
  }

  // ---------- Emergency Resources ----------
  async function loadResources() {
    var panel = document.getElementById('panel-resources');
    panel.innerHTML = '<div class="admin-card"><p class="muted">Loading…</p></div>';
    try {
      var items = await apiFetch('/admin/resources');
      var html = '';
      html += '<div class="admin-card">' +
        '<h2><span class="icon">+</span> Add emergency resource</h2>' +
        '<form id="resource-form">' +
          '<div class="form-grid">' +
            '<label class="field">Country <input type="text" name="country" required placeholder="e.g. United States"></label>' +
            '<label class="field">Region <input type="text" name="region" placeholder="Optional"></label>' +
            '<label class="field">Service name <input type="text" name="serviceName" required placeholder="e.g. Emergency (911)"></label>' +
            '<label class="field">Phone <input type="text" name="phone" required placeholder="e.g. 911"></label>' +
            '<label class="field">Facility <input type="text" name="facility" placeholder="Optional"></label>' +
            '<label class="field">Address <input type="text" name="address" placeholder="Optional"></label>' +
            '<label class="field">Website <input type="url" name="website" placeholder="Optional"></label>' +
            '<label class="field">Availability <input type="text" name="availability" placeholder="24/7"></label>' +
          '</div>' +
          '<div class="form-actions"><button class="cta" type="submit">Add resource</button></div>' +
        '</form>' +
      '</div>';

      html += '<div class="admin-card"><h2><span class="icon">🏥</span> Resources (' + items.length + ')</h2>';
      if (!items.length) {
        html += '<div class="empty-state"><h3>No resources yet</h3><p>Add your first emergency resource above. They appear on the results page for emergency cases.</p></div>';
      } else {
        html += '<table class="admin-table"><thead><tr><th>Country</th><th>Region</th><th>Service</th><th>Phone</th><th>Availability</th><th>Status</th><th></th></tr></thead><tbody>';
        items.forEach(function (r) {
          html += '<tr>' +
            '<td>' + escapeHtml(r.country) + '</td>' +
            '<td>' + escapeHtml(r.region || '—') + '</td>' +
            '<td>' + escapeHtml(r.serviceName) + '</td>' +
            '<td><strong>' + escapeHtml(r.phone) + '</strong></td>' +
            '<td>' + escapeHtml(r.availability || '—') + '</td>' +
            '<td><span class="pill ' + (r.enabled ? 'pill-enabled' : 'pill-disabled') + '">' + (r.enabled ? 'Enabled' : 'Disabled') + '</span></td>' +
            '<td class="actions-cell">' +
              '<button class="btn-sm danger" data-delete-res="' + r._id + '">Delete</button>' +
            '</td>' +
          '</tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';
      panel.innerHTML = html;

      var form = panel.querySelector('#resource-form');
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        var body = {
          country: fd.get('country'),
          region: fd.get('region') || '',
          serviceName: fd.get('serviceName'),
          phone: fd.get('phone'),
          facility: fd.get('facility') || '',
          address: fd.get('address') || '',
          website: fd.get('website') || '',
          availability: fd.get('availability') || '24/7',
          enabled: true
        };
        try {
          await apiFetch('/admin/resources', { method: 'POST', body: JSON.stringify(body) });
          toast('Resource added');
          loadResources();
        } catch (e) { toast(e.message, 'err'); }
      });

      panel.querySelectorAll('[data-delete-res]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!confirm('Delete this resource?')) return;
          try {
            await apiFetch('/admin/resources/' + btn.getAttribute('data-delete-res'), { method: 'DELETE' });
            toast('Resource deleted');
            loadResources();
          } catch (e) { toast(e.message, 'err'); }
        });
      });
    } catch (e) {
      panel.innerHTML = '<div class="admin-card"><p class="error">Error: ' + escapeHtml(e.message) + '</p></div>';
    }
  }

  // ---------- Users ----------
  async function loadUsers() {
    var panel = document.getElementById('panel-users');
    panel.innerHTML = '<div class="admin-card"><p class="muted">Loading…</p></div>';
    try {
      var users = await apiFetch('/admin/users');
      var html = '<div class="admin-card"><h2><span class="icon">👥</span> Users (' + users.length + ')</h2>';
      if (!users.length) {
        html += '<div class="empty-state"><h3>No users yet</h3><p>Users appear here after they register.</p></div>';
      } else {
        html += '<table class="admin-table"><thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Last login</th><th>Joined</th><th></th></tr></thead><tbody>';
        users.forEach(function (u) {
          html += '<tr>' +
            '<td>' + escapeHtml(u.email) + '</td>' +
            '<td>' + escapeHtml(u.displayName || '—') + '</td>' +
            '<td><span class="pill pill-neutral">' + escapeHtml(u.role) + '</span></td>' +
            '<td>' + escapeHtml(fmtDate(u.lastLoginAt)) + '</td>' +
            '<td>' + escapeHtml(fmtDate(u.createdAt)) + '</td>' +
            '<td class="actions-cell">' +
              (u.role !== 'admin' ? '<button class="btn-sm danger" data-delete-user="' + u._id + '">Delete</button>' : '<span class="muted" style="font-size:.75rem">protected</span>') +
            '</td>' +
          '</tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';
      panel.innerHTML = html;

      panel.querySelectorAll('[data-delete-user]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!confirm('Delete this user and all their assessments? This cannot be undone.')) return;
          try {
            await apiFetch('/admin/users/' + btn.getAttribute('data-delete-user'), { method: 'DELETE' });
            toast('User deleted');
            loadUsers();
          } catch (e) { toast(e.message, 'err'); }
        });
      });
    } catch (e) {
      panel.innerHTML = '<div class="admin-card"><p class="error">Error: ' + escapeHtml(e.message) + '</p></div>';
    }
  }

  // ---------- Audit ----------
  async function loadAudit() {
    var panel = document.getElementById('panel-audit');
    panel.innerHTML = '<div class="admin-card"><p class="muted">Loading…</p></div>';
    try {
      var items = await apiFetch('/admin/audit');
      var html = '<div class="admin-card"><h2><span class="icon">📋</span> Recent activity (' + items.length + ')</h2>';
      if (!items.length) {
        html += '<div class="empty-state"><h3>No audit entries yet</h3><p>Actions like login, rule creation, and user deletion will appear here.</p></div>';
      } else {
        html += '<table class="admin-table"><thead><tr><th>When</th><th>Action</th><th>Meta</th></tr></thead><tbody>';
        items.forEach(function (a) {
          var meta = a.meta ? escapeHtml(JSON.stringify(a.meta).slice(0, 200)) : '—';
          html += '<tr>' +
            '<td>' + escapeHtml(fmtDate(a.createdAt)) + '</td>' +
            '<td><code>' + escapeHtml(a.action || '—') + '</code></td>' +
            '<td style="font-size:.78rem;color:var(--muted)">' + meta + '</td>' +
          '</tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';
      panel.innerHTML = html;
    } catch (e) {
      panel.innerHTML = '<div class="admin-card"><p class="error">Error: ' + escapeHtml(e.message) + '</p></div>';
    }
  }

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', render);
})();