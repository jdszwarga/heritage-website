// Heritage Baptist Church: small behaviours. The site works without this file.
(function () {
  var root = document.documentElement;
  root.classList.add('js');

  // The test address must not turn up in search results. On the real domain this does nothing.
  if (/\.github\.io$/.test(location.hostname)) {
    var noindex = document.createElement('meta');
    noindex.name = 'robots';
    noindex.content = 'noindex, nofollow';
    document.head.appendChild(noindex);
  }
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = root.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.site-nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        root.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('nav-open')) {
        root.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Header: hairline once scrolled, tucks away going down, returns going up
  var header = document.querySelector('.site-header');
  var bible = document.querySelector('.hero-bible');
  var lastY = window.scrollY;
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 8);
    }
    if (bible && !calm) {
      bible.style.translate = '-50% calc(46% - ' + Math.min(y * 0.08, 48) + 'px)';
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  // Hero entrance
  var hero = document.querySelector('.hero');
  if (hero) setTimeout(function () { hero.classList.add('is-ready'); }, 60);

  // Scroll reveals
  var items = document.querySelectorAll('.reveal, .wipe');
  if ('IntersectionObserver' in window && !calm) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px 12% 0px', threshold: 0 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Hero video: silent loop, with a pause control. Stays still for reduced motion.
  var video = document.querySelector('.hero-media video');
  var vbtn = document.querySelector('.hero-toggle');
  function setPaused(p) {
    if (!vbtn) return;
    vbtn.classList.toggle('is-paused', p);
    vbtn.setAttribute('aria-label', p ? 'Play background video' : 'Pause background video');
  }
  if (video) {
    if (calm) { setPaused(true); }
    else if (navigator.connection && navigator.connection.saveData) { setPaused(true); }
    else {
      var begin = function () { var pr = video.play(); if (pr && pr.catch) pr.catch(function () { setPaused(true); }); };
      if (document.readyState === 'complete') begin(); else window.addEventListener('load', begin);
    }
    if (vbtn) vbtn.addEventListener('click', function () {
      if (video.paused) { video.play(); setPaused(false); } else { video.pause(); setPaused(true); }
    });
  }

  // Subpage jump links: mark the section in view
  var jumps = document.querySelectorAll('.jump a');
  if (jumps.length && 'IntersectionObserver' in window) {
    var byId = {};
    jumps.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    // The row slides sideways: mark which edges have more pills hidden, and keep the current one in view
    var bar = document.querySelector('.jump');
    var row = document.querySelector('.jump-row');
    var edges = function () {
      bar.classList.toggle('more-left', row.scrollLeft > 4);
      bar.classList.toggle('more-right', row.scrollLeft + row.clientWidth < row.scrollWidth - 4);
    };
    var show = function (a) {
      row.scrollTo({ left: a.offsetLeft - row.offsetLeft - (row.clientWidth - a.offsetWidth) / 2, behavior: calm ? 'auto' : 'smooth' });
    };
    row.addEventListener('scroll', edges, { passive: true });
    window.addEventListener('resize', edges);
    window.addEventListener('load', edges);
    edges();
    jumps[0].classList.add('is-active');
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        jumps.forEach(function (a) { a.classList.remove('is-active'); });
        var link = byId[en.target.id];
        if (link) { link.classList.add('is-active'); show(link); }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  // Schedule: rows open on hover (CSS) or tap
  document.querySelectorAll('.sched li').forEach(function (li) {
    var btn = li.querySelector('button.sched-row');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = !li.classList.contains('is-open');
      li.parentNode.querySelectorAll('li.is-open').forEach(function (o) {
        o.classList.remove('is-open');
        var b = o.querySelector('button.sched-row'); if (b) b.setAttribute('aria-expanded', 'false');
      });
      li.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // Pop-ups: Bible study and Plan a visit (links fall back to a page without JS)
  function wire(id, attr) {
    var dlg = document.getElementById(id);
    if (!dlg || !dlg.showModal) return;
    document.querySelectorAll('[' + attr + ']').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        root.classList.remove('nav-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        dlg.showModal();
      });
    });
    dlg.querySelectorAll('[data-close-dialog]').forEach(function (el) {
      el.addEventListener('click', function () { dlg.close(); });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }
  wire('dlg-study', 'data-open-study');
  wire('dlg-visit', 'data-open-visit');
  wire('dlg-testament', 'data-open-testament');

  // Plan a visit: fill in the next two Sundays, and the people counter
  function isoDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  document.querySelectorAll('[data-sunday]').forEach(function (el) {
    var d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + 7 * Number(el.dataset.sunday));
    el.textContent = d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) + ' · 10 am';
    var radio = el.closest('label') && el.closest('label').querySelector('input[type="radio"]');
    if (radio) { radio.value = isoDate(d); radio.dataset.label = d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' }); }
  });
  document.querySelectorAll('.stepper').forEach(function (st) {
    var input = st.querySelector('input');
    st.querySelectorAll('[data-step]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = (parseInt(input.value, 10) || 1) + Number(b.dataset.step);
        input.value = Math.min(20, Math.max(1, v));
      });
    });
  });

  // ---------- The database: forms go in, editable content comes out ----------
  var cfg = window.HBC || {};
  function api(path, options) {
    options = options || {};
    options.headers = Object.assign({ apikey: cfg.key, Authorization: 'Bearer ' + cfg.key, 'Content-Type': 'application/json' }, options.headers || {});
    return fetch(cfg.url + '/rest/v1/' + path, options);
  }

  // Forms: Bible study, plan a visit (save a seat), contact message
  var SAID = {
    study: function (first) { return 'Thank you, ' + first + '. One of our pastors will be in touch soon.'; },
    visit: function (first, f) {
      var when = f.querySelector('input[name="when"]:checked');
      return 'Your seat is saved, ' + first + '. See you on ' + (when && when.dataset.label ? when.dataset.label : 'Sunday') + ' at 10am. Meet us at the door when you arrive and we will show you to your seat.';
    },
    message: function (first) { return 'Thank you, ' + first + '. Your message has been sent.'; },
    testament: function (first) { return 'Thank you, ' + first + '. We will send your Bible soon.'; }
  };
  var WRONG = {
    name: 'Please tell us your name.',
    contact: 'Please give a mobile number or an email address so we can reach you.',
    email: 'That email address does not look right.',
    busy: 'We have had a lot of requests just now. Please try again in a little while, or call or text the church.'
  };
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var kind = form.dataset.form;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.form-note');
      var btn = form.querySelector('button[type="submit"]');
      var val = function (n) { var el = form.elements[n]; return el && typeof el.value === 'string' ? el.value.trim() : ''; };
      var when = form.querySelector('input[name="when"]:checked');
      // A free Bible request is stored as a message, marked so it is easy to spot in the admin page
      var isNT = kind === 'testament';
      var body = {
        p_kind: isNT ? 'message' : kind,
        p_name: val('name'),
        p_phone: val('mobile') || null,
        p_email: val('email') || null,
        p_details: isNT ? 'FREE BIBLE REQUEST. Post to: ' + val('details') : (val('details') || null),
        p_service_date: kind === 'visit' && when && /^\d{4}-\d\d-\d\d$/.test(when.value) ? when.value : null,
        p_party_size: kind === 'visit' ? (parseInt(val('count'), 10) || 1) : null,
        p_wants_reminder: !!(form.elements.reminder && form.elements.reminder.checked),
        p_source: location.pathname.split('/').pop() || 'index.html',
        p_website: val('website')
      };
      if (!cfg.url) { note.textContent = 'This form is not connected yet.'; return; }
      btn.disabled = true;
      note.classList.remove('is-error');
      note.textContent = 'Sending…';
      api('rpc/fn_web_submit_request', { method: 'POST', body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.ok) {
            var first = body.p_name.split(' ')[0] || 'friend';
            var done = document.createElement('p');
            done.className = 'form-done';
            done.setAttribute('role', 'status');
            done.tabIndex = -1;
            done.textContent = SAID[kind](first, form);
            form.replaceWith(done);
            done.focus();
            return;
          }
          note.classList.add('is-error');
          note.textContent = WRONG[data && data.error] || 'Sorry, something went wrong. Please try again, or call or text the church.';
        })
        .catch(function () {
          note.classList.add('is-error');
          note.textContent = 'Sorry, we could not reach the server. Check your connection and try again.';
        })
        .then(function () { btn.disabled = false; });
    });
  });

  // Editable content: every field has its built-in wording in the page; anything changed in the admin page replaces it.
  function make(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; n.textContent = text; return n; }
  function nzTel(v) { var d = String(v).replace(/\D/g, ''); return d.charAt(0) === '0' ? '+64' + d.slice(1) : '+' + d; }
  function lines(v) { return String(v).split('\n').map(function (l) { return l.trim(); }).filter(Boolean); }
  function applyContent(map) {
    var each = function (attr, fn) {
      document.querySelectorAll('[' + attr + ']').forEach(function (el) {
        var v = map[el.getAttribute(attr)];
        if (typeof v === 'string' && v.trim() !== '') fn(el, v.trim());
      });
    };
    each('data-c', function (el, v) { el.textContent = v; });
    each('data-c-lines', function (el, v) {
      el.textContent = '';
      lines(v).forEach(function (l, i) { if (i) el.appendChild(document.createElement('br')); el.appendChild(document.createTextNode(l)); });
      if (el.hasAttribute('data-map')) el.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(lines(v).join(', '));
    });
    each('data-c-paras', function (el, v) {
      el.textContent = '';
      lines(v).forEach(function (l) {
        if (l.indexOf('## ') === 0) el.appendChild(make('h4', '', l.slice(3)));
        else if (l.indexOf('> ') === 0) el.appendChild(make('p', 'creed-refs', l.slice(2)));
        else el.appendChild(make('p', '', l));
      });
    });
    each('data-c-verses', function (el, v) {
      el.textContent = '';
      lines(v).forEach(function (l) {
        var cut = l.lastIndexOf(' - ');
        var p = make('p', 'hb-scripture', cut === -1 ? l : l.slice(0, cut) + ' ');
        if (cut !== -1) p.appendChild(make('cite', '', '- ' + l.slice(cut + 3)));
        el.appendChild(p);
      });
    });
    each('data-c-linkphones', function (el, v) {
      el.textContent = '';
      var re = /\b0\d[\d ]{6,12}\d\b/g, last = 0, m;
      while ((m = re.exec(v))) {
        el.appendChild(document.createTextNode(v.slice(last, m.index)));
        var a = make('a', '', m[0]); a.href = 'sms:' + nzTel(m[0]); el.appendChild(a);
        last = m.index + m[0].length;
      }
      el.appendChild(document.createTextNode(v.slice(last)));
    });
    each('data-c-phone', function (el, v) { el.textContent = (el.dataset.prefix || '') + v; el.href = 'tel:' + nzTel(v); });
    each('data-c-email', function (el, v) { el.textContent = v; el.href = 'mailto:' + v; });
    each('data-c-img', function (el, v) {
      if (!/^(https:\/\/|assets\/)/.test(v)) return;
      el.src = v;
      var frame = el.closest('[hidden]'); if (frame) frame.hidden = false;
    });
  }
  if (cfg.url && document.querySelector('[data-c],[data-c-lines],[data-c-paras],[data-c-verses],[data-c-linkphones],[data-c-phone],[data-c-email],[data-c-img]')) {
    try { var kept = JSON.parse(localStorage.getItem('hbc-content') || 'null'); if (kept) applyContent(kept); } catch (err) { /* no saved copy */ }
    api('web_content?select=key,value').then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
      var map = {};
      rows.forEach(function (row) { map[row.key] = row.value; });
      applyContent(map);
      try { localStorage.setItem('hbc-content', JSON.stringify(map)); } catch (err) { /* private window */ }
    }).catch(function () { /* offline: the built-in wording stays */ });
  }
})();
