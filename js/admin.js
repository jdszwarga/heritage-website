// Website admin: people who asked for a Bible study, planned a visit or sent a message,
// and the website's editable wording and photos. Signs in with the church app's accounts.
(function () {
  'use strict';
  var sb = window.supabase.createClient(window.HBC.url, window.HBC.key);
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function show(id) {
    ['view-signin', 'view-denied', 'view-app'].forEach(function (v) { $(v).hidden = v !== id; });
    $('sign-out').hidden = id === 'view-signin';
  }
  var me = null;

  // ---------- Signing in ----------
  $('signin-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var note = $('si-note');
    if (!$('si-pass').value) { note.textContent = 'Enter your password, or use the sign-in link below.'; return; }
    note.textContent = 'Signing in…';
    sb.auth.signInWithPassword({ email: $('si-email').value.trim(), password: $('si-pass').value }).then(function (r) {
      note.textContent = r.error ? 'That email and password did not match.' : '';
      $('si-pass').value = '';
    });
  });
  $('si-link').addEventListener('click', function () {
    var note = $('si-note'), email = $('si-email').value.trim();
    if (!email) { note.textContent = 'Enter your email first.'; return; }
    note.textContent = 'Sending…';
    sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false, emailRedirectTo: location.href.split('#')[0] } }).then(function (r) {
      note.textContent = r.error ? 'Could not send a link to that address.' : 'Check your email for the sign-in link.';
    });
  });
  $('sign-out').addEventListener('click', function () { sb.auth.signOut(); });

  function start(session) {
    me = session ? session.user : null;
    if (!me) { show('view-signin'); return; }
    sb.rpc('fn_has_role', { target: 'admin' }).then(function (r) {
      if (r.error || r.data !== true) { show('view-denied'); return; }
      show('view-app');
      loadPeople();
      buildContent();
    });
  }
  sb.auth.getSession().then(function (r) { start(r.data.session); });
  sb.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') start(session);
  });

  // ---------- Tabs ----------
  document.querySelectorAll('.adm-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.adm-tab').forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', String(on));
        $('tab-' + t.dataset.tab).hidden = !on;
      });
    });
  });

  // ---------- People ----------
  var people = [], fKind = '', fStatus = 'open';
  var KIND = { study: 'Bible study', visit: 'Visit', message: 'Message' };
  var STATUS = [['new', 'New'], ['contacted', 'Contacted'], ['done', 'Done']];
  function chips(boxId, attr, set) {
    $(boxId).querySelectorAll('.adm-chip').forEach(function (c) {
      c.addEventListener('click', function () {
        $(boxId).querySelectorAll('.adm-chip').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        set(c.dataset[attr]);
        renderPeople();
      });
    });
  }
  chips('filter-kind', 'kind', function (v) { fKind = v; });
  chips('filter-status', 'status', function (v) { fStatus = v; });

  function loadPeople() {
    $('people-note').textContent = 'Loading…';
    sb.from('web_requests').select('*').order('created_at', { ascending: false }).limit(500).then(function (r) {
      if (r.error) { $('people-note').textContent = 'Could not load the list. ' + r.error.message; return; }
      people = r.data;
      renderPeople();
    });
  }
  function nzDate(iso, opts) { return new Date(iso).toLocaleDateString('en-NZ', opts); }
  function save(row, changes, after) {
    changes.handled_by = me.id;
    changes.handled_at = new Date().toISOString();
    sb.from('web_requests').update(changes).eq('id', row.id).then(function (r) {
      if (r.error) { alert('Could not save. ' + r.error.message); return; }
      Object.assign(row, changes);
      if (after) after();
    });
  }
  function renderPeople() {
    var list = $('people-list');
    list.textContent = '';
    var fresh = people.filter(function (p) { return p.status === 'new'; }).length;
    $('count-new').textContent = fresh ? String(fresh) : '';
    var rows = people.filter(function (p) {
      if (fKind && p.kind !== fKind) return false;
      if (fStatus === 'open') return p.status !== 'done';
      if (fStatus === 'done') return p.status === 'done';
      return true;
    });
    $('people-note').textContent = rows.length ? '' : 'Nothing here.';
    rows.forEach(function (p) {
      var item = el('article', 'adm-item' + (p.status === 'done' ? ' is-done' : ''));
      var head = el('div', 'adm-item-head');
      head.appendChild(el('span', 'adm-name', p.name));
      head.appendChild(el('span', 'adm-kind', KIND[p.kind] || p.kind));
      head.appendChild(el('span', 'adm-when', nzDate(p.created_at, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })));
      item.appendChild(head);

      var facts = el('div', 'adm-facts');
      if (p.phone) { var t = el('a', '', p.phone); t.href = 'tel:' + p.phone.replace(/[^\d+]/g, ''); facts.appendChild(t); }
      if (p.email) { var m = el('a', '', p.email); m.href = 'mailto:' + p.email; facts.appendChild(m); }
      if (p.kind === 'visit') {
        if (p.service_date) facts.appendChild(el('span', '', 'Coming ' + nzDate(p.service_date + 'T12:00:00', { weekday: 'long', day: 'numeric', month: 'long' })));
        if (p.party_size) facts.appendChild(el('span', '', p.party_size + (p.party_size === 1 ? ' person' : ' people')));
        if (p.wants_reminder) facts.appendChild(el('span', '', 'Wants a reminder text'));
      }
      item.appendChild(facts);
      if (p.details) item.appendChild(el('p', 'adm-details', p.details));

      var note = el('textarea', 'adm-note');
      note.placeholder = 'Your note (only admins see this)';
      note.value = p.admin_note || '';
      note.setAttribute('aria-label', 'Note about ' + p.name);
      note.addEventListener('change', function () { save(p, { admin_note: note.value.trim() || null }); });
      item.appendChild(note);

      var actions = el('div', 'adm-actions');
      STATUS.forEach(function (s) {
        var b = el('button', 'adm-chip' + (p.status === s[0] ? ' is-on' : ''), s[1]);
        b.type = 'button';
        b.addEventListener('click', function () { save(p, { status: s[0] }, renderPeople); });
        actions.appendChild(b);
      });
      var del = el('button', 'adm-link adm-danger', 'Delete');
      del.type = 'button';
      del.addEventListener('click', function () {
        if (!confirm('Delete ' + p.name + '’s ' + (KIND[p.kind] || 'request').toLowerCase() + '? This cannot be undone.')) return;
        sb.from('web_requests').delete().eq('id', p.id).then(function (r) {
          if (r.error) { alert('Could not delete. ' + r.error.message); return; }
          people = people.filter(function (x) { return x !== p; });
          renderPeople();
        });
      });
      actions.appendChild(del);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  // ---------- Website content ----------
  // Long text boxes grow to show everything in them, so nothing has to be scrolled inside a small box.
  function grow(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
  // Stray spaces at the ends of lines and blank lines at the end are dropped, on the way in and on the way out.
  function tidy(v) { return String(v).replace(/[ \t\u00a0]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim(); }
  var built = false;
  function buildContent() {
    if (built) return;
    built = true;
    var box = $('content-groups');
    sb.from('web_content').select('key,value').then(function (r) {
      var saved = {};
      (r.data || []).forEach(function (row) { saved[row.key] = row.value; });
      var groups = {};
      window.HBC_FIELDS.forEach(function (f) { (groups[f.group] = groups[f.group] || []).push(f); });
      Object.keys(groups).forEach(function (name) {
        var d = el('details', 'adm-group');
        d.appendChild(el('summary', '', name));
        var body = el('div', 'adm-group-body');
        var inputs = [];
        groups[name].forEach(function (f) {
          var start = tidy(saved[f.key] != null ? saved[f.key] : f.value);
          var wrap = el('div', 'field');
          var id = 'f-' + f.key.replace(/\W/g, '-');
          var label = el('label', '', f.label);
          label.htmlFor = id;
          wrap.appendChild(label);
          var input;
          if (f.type === 'timeline') {
            label.removeAttribute('for');
            inputs.push(timelineField(f, saved[f.key], wrap));
          } else if (f.type === 'image') {
            var row = el('div', 'adm-photo');
            var img = el('img');
            img.alt = '';
            if (start) img.src = start; else img.hidden = true;
            input = el('input');
            input.type = 'file';
            input.accept = 'image/jpeg,image/png,image/webp';
            input.id = id;
            input.addEventListener('change', function () {
              if (!input.files[0]) return;
              img.src = URL.createObjectURL(input.files[0]);
              img.hidden = false;
              wrap.classList.add('is-changed');
            });
            row.appendChild(img);
            row.appendChild(input);
            wrap.appendChild(row);
            inputs.push({ f: f, input: input, wrap: wrap, start: start, image: true });
          } else {
            input = el(f.type === 'long' ? 'textarea' : 'input');
            input.id = id;
            input.value = start;
            if (f.type === 'long') { input.rows = 1; input.addEventListener('input', function () { grow(input); }); }
            var item = { f: f, input: input, wrap: wrap, start: start };
            input.addEventListener('input', function () { wrap.classList.toggle('is-changed', input.value !== item.start); });
            wrap.appendChild(input);
            inputs.push(item);
          }
          if (f.hint) wrap.appendChild(el('p', 'adm-hint', f.hint));
          body.appendChild(wrap);
        });
        var bar = el('div', 'adm-save');
        var btn = el('button', 'hb-button', 'Save');
        btn.type = 'button';
        var said = el('span', 'adm-muted');
        said.setAttribute('role', 'status');
        btn.addEventListener('click', function () { saveGroup(inputs, btn, said); });
        bar.appendChild(btn);
        bar.appendChild(said);
        body.appendChild(bar);
        d.appendChild(body);
        d.addEventListener('toggle', function () { if (d.open) body.querySelectorAll('textarea').forEach(grow); });
        box.appendChild(d);
      });
    });
  }
  // Photos straight from a phone are far bigger than a web page needs. They are scaled to 2000px on the long side before upload.
  function shrink(file) {
    var MAX = 2000;
    return new Promise(function (done) {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        if (k === 1 && file.size < 600000) { done(file); return; }
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          done(blob && blob.size < file.size ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { done(file); };
      img.src = URL.createObjectURL(file);
    });
  }
  var photoN = 0;
  function putPhoto(key, original) {
    var path;
    return shrink(original).then(function (file) {
      var ext = file.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      path = key.replace(/\W/g, '-') + '-' + Date.now() + '-' + (photoN++) + '.' + ext;
      return sb.storage.from('website').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
    }).then(function (r) {
      if (r.error) throw r.error;
      return sb.storage.from('website').getPublicUrl(path).data.publicUrl;
    });
  }

  // Our story: a list of highlights that can be added to, reordered and removed. Saved as one value.
  function timelineField(f, saved, wrap) {
    var list = [];
    try { list = JSON.parse(saved || '[]'); } catch (err) { list = []; }
    if (!Array.isArray(list)) list = [];
    var entries = list.map(function (h) { return { date: h.date || '', text: h.text || '', img: h.img || '', file: null }; });
    var box = el('div', 'adm-tl');
    var item = { f: f, timeline: true, wrap: wrap, start: JSON.stringify(entries.map(plain)) };
    function plain(e) { return { date: tidy(e.date), text: tidy(e.text), img: e.img }; }
    function kept() { return entries.filter(function (e) { return tidy(e.date) || tidy(e.text); }); }
    function touched() {
      var dirty = entries.some(function (e) { return e.file; }) || JSON.stringify(kept().map(plain)) !== item.start;
      wrap.classList.toggle('is-changed', dirty);
    }
    function draw() {
      box.textContent = '';
      entries.forEach(function (e, i) {
        var row = el('div', 'adm-tl-item');
        var head = el('div', 'adm-tl-head');
        head.appendChild(el('span', 'adm-tl-n', 'Highlight ' + (i + 1)));
        [['Move up', -1], ['Move down', 1]].forEach(function (m) {
          var b = el('button', 'adm-link', m[0]);
          b.type = 'button';
          b.disabled = i + m[1] < 0 || i + m[1] >= entries.length;
          b.addEventListener('click', function () { entries.splice(i + m[1], 0, entries.splice(i, 1)[0]); draw(); touched(); });
          head.appendChild(b);
        });
        var del = el('button', 'adm-link adm-danger', 'Remove');
        del.type = 'button';
        del.addEventListener('click', function () {
          if ((e.date || e.text || e.img) && !confirm('Remove this highlight?')) return;
          entries.splice(i, 1); draw(); touched();
        });
        head.appendChild(del);
        row.appendChild(head);

        var date = el('input');
        date.placeholder = 'Date, for example March 2024';
        date.value = e.date;
        date.setAttribute('aria-label', 'Highlight ' + (i + 1) + ' date');
        date.addEventListener('input', function () { e.date = date.value; touched(); });
        row.appendChild(date);

        var text = el('textarea');
        text.rows = 1;
        text.placeholder = 'What happened';
        text.value = e.text;
        text.setAttribute('aria-label', 'Highlight ' + (i + 1) + ' text');
        text.addEventListener('input', function () { e.text = text.value; grow(text); touched(); });
        row.appendChild(text);

        var photo = el('div', 'adm-photo');
        var img = el('img');
        img.alt = '';
        if (e.file) img.src = URL.createObjectURL(e.file); else if (e.img) img.src = e.img; else img.hidden = true;
        var file = el('input');
        file.type = 'file';
        file.accept = 'image/jpeg,image/png,image/webp';
        file.setAttribute('aria-label', 'Highlight ' + (i + 1) + ' photo');
        var clear = el('button', 'adm-link', 'Remove photo');
        clear.type = 'button';
        clear.hidden = !(e.file || e.img);
        file.addEventListener('change', function () {
          if (!file.files[0]) return;
          e.file = file.files[0];
          img.src = URL.createObjectURL(e.file); img.hidden = false; clear.hidden = false;
          touched();
        });
        clear.addEventListener('click', function () { e.file = null; e.img = ''; file.value = ''; img.hidden = true; clear.hidden = true; touched(); });
        photo.appendChild(img);
        photo.appendChild(file);
        photo.appendChild(clear);
        row.appendChild(photo);
        box.appendChild(row);
      });
      var add = el('button', 'adm-chip', 'Add highlight');
      add.type = 'button';
      add.addEventListener('click', function () {
        entries.push({ date: '', text: '', img: '', file: null });
        draw();
        var rows = box.querySelectorAll('.adm-tl-item');
        rows[rows.length - 1].querySelector('input').focus();
      });
      box.appendChild(add);
      box.querySelectorAll('textarea').forEach(grow);
    }
    // Uploads any new photos, then gives back the list as it should be saved
    item.collect = function () {
      return Promise.all(kept().map(function (e) {
        if (!e.file) return null;
        return putPhoto(f.key, e.file).then(function (url) { e.img = url; e.file = null; });
      })).then(function () { return JSON.stringify(kept().map(plain)); });
    };
    draw();
    wrap.appendChild(box);
    return item;
  }

  function saveGroup(inputs, btn, said) {
    btn.disabled = true;
    said.textContent = 'Saving…';
    var rows = [], uploads = [], removals = [];
    inputs.forEach(function (it) {
      if (it.timeline) {
        uploads.push(it.collect().then(function (v) {
          if (v === it.start) return;
          if (v === '[]') removals.push(it.f.key); else rows.push({ key: it.f.key, value: v });
          it.start = v;
          it.wrap.classList.remove('is-changed');
        }));
      } else if (it.image) {
        if (!it.input.files[0]) return;
        uploads.push(putPhoto(it.f.key, it.input.files[0]).then(function (url) {
          rows.push({ key: it.f.key, value: url });
          it.start = url; it.input.value = ''; it.wrap.classList.remove('is-changed');
        }));
      } else if (it.input.value !== it.start) {
        var v = tidy(it.input.value);
        if (!v) {
          // Blank means "leave as it is" (the site keeps its built-in wording), except on an optional field, where it takes the wording away again
          if (it.f.value === '' && it.start !== '') { removals.push(it.f.key); it.pending = ''; }
          return;
        }
        rows.push({ key: it.f.key, value: v });
        it.pending = v;
      }
    });
    Promise.all(uploads).then(function () {
      if (!removals.length) return { error: null };
      return sb.from('web_content').delete().in('key', removals);
    }).then(function (r) {
      if (r.error) throw r.error;
      if (!rows.length) return { error: null, none: !removals.length };
      var now = new Date().toISOString();
      rows.forEach(function (row) { row.updated_at = now; row.updated_by = me.id; });
      return sb.from('web_content').upsert(rows);
    }).then(function (r) {
      if (r.error) throw r.error;
      inputs.forEach(function (it) { if (it.pending != null) { it.start = it.pending; it.input.value = it.pending; if (it.input.tagName === 'TEXTAREA') grow(it.input); it.pending = null; it.wrap.classList.remove('is-changed'); } });
      try { localStorage.removeItem('hbc-content'); } catch (err) { /* nothing kept */ }
      said.textContent = r.none ? 'Nothing to save.' : 'Saved. The website is updated.';
    }).catch(function (err) {
      said.textContent = 'Could not save. ' + (err && err.message ? err.message : '');
    }).then(function () { btn.disabled = false; });
  }
})();
