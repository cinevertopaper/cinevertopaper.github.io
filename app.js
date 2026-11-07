(() => {
  const D = window.SITE_DATA, I = window.ICONS;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const METHODS = [
    ['ours', 'CineVerto', 'Ours'],
    ['h3', 'H3 Turbo8', 'Joint AV'],
    ['dubit', 'DubIt', 'Joint AV'],
    ['latentsync', 'LatentSync 1.6', 'VoxCPM2 +'],
    ['xdub', 'X-Dub', 'VoxCPM2 +'],
    ['infinitetalk', 'InfiniteTalk', 'VoxCPM2 +'],
  ];
  const all = new Set();
  let sounding = null;

  function setSound(card, on) {
    if (on) all.forEach(c => { if (c !== card) setSound(c, false); });
    card.video.muted = !on;
    card.root.classList.toggle('sounding', on);
    card.sbtn.innerHTML = on ? I['volume-2'] : I['volume-x'];
    card.sbtn.classList.toggle('on', on);
    card.sbtn.dataset.tip = on ? 'Mute' : 'Play sound (mutes others)';
    if (on) { sounding = card; if (card.video.paused) card.video.play().catch(() => {}); }
    else if (sounding === card) sounding = null;
  }

  function videoCard(m, opts = {}) {
    const root = el('div', 'vcard' + (opts.ours ? ' ours' : ''));
    const label = el('div', 'vlabel');
    label.innerHTML = `<span class="name">${opts.small ? `<small>${esc(opts.small)}</small>` : ''}${esc(opts.title)}${opts.ours ? '<span class="tag">Ours</span>' : ''}</span>`;
    const frame = el('div', 'frame');
    frame.style.aspectRatio = `${m.width} / ${m.height}`;
    const video = el('video');
    Object.assign(video, { muted: true, playsInline: true, loop: !!opts.loop, preload: opts.lite ? 'metadata' : opts.eager ? 'auto' : 'none', poster: m.poster });
    video.setAttribute('playsinline', '');
    video.dataset.src = m.path;
    if (opts.eager) video.src = m.path;
    frame.append(video);
    const ctr = el('div', 'controls');
    const pbtn = el('button', 'ibtn', I.play); pbtn.type = 'button'; pbtn.dataset.tip = 'Play / pause';
    const rbtn = el('button', 'ibtn', I['rotate-ccw']); rbtn.type = 'button'; rbtn.dataset.tip = 'Replay';
    const sbtn = el('button', 'ibtn', I['volume-x']); sbtn.type = 'button'; sbtn.dataset.tip = 'Play sound (mutes others)';
    const prog = el('div', 'progress', '<i></i>');
    ctr.append(pbtn, rbtn, prog, sbtn);
    root.append(label, frame, ctr);
    const card = { root, video, pbtn, sbtn };
    const load = () => { if (!video.src) { video.src = video.dataset.src; video.load(); } };
    card.load = load;
    card.play = () => { load(); return video.play().catch(() => {}); };
    card.restart = () => { load(); video.currentTime = 0; return video.play().catch(() => {}); };
    pbtn.onclick = () => video.paused ? card.play() : video.pause();
    rbtn.onclick = () => card.restart();
    sbtn.onclick = () => { load(); setSound(card, video.muted); };
    frame.onclick = () => pbtn.onclick();
    video.addEventListener('play', () => { pbtn.innerHTML = I.pause; });
    video.addEventListener('pause', () => { pbtn.innerHTML = I.play; });
    video.addEventListener('ended', () => { pbtn.innerHTML = I.play; });
    video.addEventListener('timeupdate', () => { prog.firstChild.style.width = (video.duration ? 100 * video.currentTime / video.duration : 0) + '%'; });
    prog.onclick = e => { if (!video.duration) return; const r = prog.getBoundingClientRect(); video.currentTime = video.duration * (e.clientX - r.left) / r.width; };
    all.add(card);
    return card;
  }

  function scriptBox(title, text, target) {
    const b = el('div', 'script' + (target ? ' target' : ''));
    b.innerHTML = `<h4>${esc(title)}</h4><p>${esc(text)}</p>`;
    return b;
  }
  function langOf(label, fallback) { return /英文/.test(label) ? 'English' : /中文/.test(label) ? 'Chinese' : fallback; }

  // ---------- hero ----------
  (function hero() {
    const h = D.hero, root = $('#hero');
    const s = videoCard(h.source, { title: 'Original (Chinese)', loop: true, eager: true });
    const o = videoCard(h.ours, { title: 'CineVerto (English)', ours: true, loop: true, eager: true });
    const mid = el('div', 'hero-script');
    mid.append(scriptBox('Source script', h.source_script), scriptBox('Target script', h.target_script, true));
    const sync = el('div', 'syncbar');
    sync.style.margin = '0';
    const sp = el('button', 'tbtn primary', I.play + 'Play both'); sp.type = 'button';
    sp.onclick = () => { s.restart(); o.restart(); };
    sync.append(sp); mid.append(sync);
    root.append(s.root, mid, o.root);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { s.play(); o.play(); } else { s.video.pause(); o.video.pause(); } }), { threshold: .25 });
    io.observe(root);
  })();

  // ---------- comparison ----------
  const hidden = new Set();
  let current = null;
  function caseTags(c) { return [c.split, c.lang, c.scene].filter(Boolean); }
  function renderThumbs() {
    const t = $('#thumbs');
    D.cases.forEach((c, i) => {
      const b = el('button', 'thumb'); b.type = 'button'; b.setAttribute('role', 'tab');
      b.innerHTML = `<img src="${c.media.source.poster}" alt="" loading="lazy"><b>${esc(c.title)}</b><span>${esc(c.scene)}</span>`;
      b.onclick = () => showCase(i);
      t.append(b);
    });
  }
  function showCase(i) {
    if (current) current.cards.forEach(cd => { cd.video.pause(); cd.video.removeAttribute('src'); cd.video.load(); all.delete(cd); if (sounding === cd) sounding = null; });
    document.querySelectorAll('.thumb').forEach((b, j) => { b.classList.toggle('active', i === j); b.setAttribute('aria-selected', i === j); });
    const c = D.cases[i], root = $('#compare'); root.innerHTML = '';
    const top = el('div', 'compare-top');
    const src = videoCard(c.media.source, { title: 'Original video', small: langOf(c.source_label, ''), eager: true, lite: true });
    const side = el('div', 'compare-scripts');
    const meta = el('div', 'compare-meta');
    meta.innerHTML = caseTags(c).map(x => `<span class="chip">${esc(x)}</span>`).join('');
    side.append(meta, scriptBox(`Source script (${langOf(c.source_label, 'source')})`, c.source_script), scriptBox(`Target script (${langOf(c.target_label, 'target')})`, c.target_script, true));
    top.append(src.root, side);
    const bar = el('div', 'compare-meta');
    bar.style.marginBottom = '14px';
    const colbar = el('div', 'colbar'); colbar.style.margin = '0';
    const sync = el('div', 'syncbar');
    const sp = el('button', 'tbtn primary', I.play + 'Sync play'); sp.type = 'button';
    const sr = el('button', 'tbtn', I['rotate-ccw'] + 'Sync replay'); sr.type = 'button';
    const pause = el('button', 'tbtn', I.pause + 'Pause all'); pause.type = 'button';
    sync.append(sp, sr, pause);
    bar.append(colbar, sync);
    const grid = el('div', 'methods');
    const cards = [src];
    const mcards = {};
    METHODS.forEach(([k, name, small]) => {
      const cd = videoCard(c.media[k], { title: name, small, ours: k === 'ours', eager: true, lite: true });
      mcards[k] = cd; cards.push(cd); grid.append(cd.root);
      const cb = el('button', 'colbtn', (hidden.has(k) ? I['eye-off'] : I.eye) + esc(name)); cb.type = 'button';
      cb.classList.toggle('off', hidden.has(k)); cb.dataset.tip = 'Show / hide column';
      cb.onclick = () => { hidden.has(k) ? hidden.delete(k) : hidden.add(k); applyHidden(); };
      cb.dataset.key = k; colbar.append(cb);
    });
    function applyHidden() {
      let n = 0;
      METHODS.forEach(([k]) => { const off = hidden.has(k); mcards[k].root.hidden = off; if (off) { mcards[k].video.pause(); if (sounding === mcards[k]) setSound(mcards[k], false); } else n++; });
      colbar.querySelectorAll('.colbtn').forEach(b => { const off = hidden.has(b.dataset.key); b.classList.toggle('off', off); b.innerHTML = (off ? I['eye-off'] : I.eye) + esc(b.textContent); });
      grid.style.setProperty('--cols', Math.max(1, n));
    }
    const visible = () => cards.filter(cd => !cd.root.hidden);
    sp.onclick = () => visible().forEach(cd => cd.play());
    sr.onclick = () => { const v = visible(); v.forEach(cd => { cd.load(); cd.video.pause(); cd.video.currentTime = 0; }); Promise.all(v.map(cd => new Promise(r => cd.video.readyState >= 2 ? r() : cd.video.addEventListener('canplay', r, { once: true })))).then(() => v.forEach(cd => cd.video.play().catch(() => {}))); };
    pause.onclick = () => cards.forEach(cd => cd.video.pause());
    root.append(top, bar, grid);
    applyHidden();
    current = { cards };
  }

  // ---------- gallery ----------
  function renderGallery() {
    const groups = ['All', 'Single speaker', 'Conversation', 'Narration', 'Chinese to English', 'English to Chinese'];
    const f = $('#filters'), g = $('#galleryGrid');
    const items = D.gallery.map(it => {
      const box = el('div', 'gitem');
      const pair = el('div', 'pair');
      const s = videoCard(it.source, { title: 'Original' });
      const o = videoCard(it.ours, { title: 'CineVerto', ours: true });
      pair.append(s.root, o.root);
      const meta = el('div', 'compare-meta'); meta.innerHTML = `<span class="chip">${esc(it.scene)}</span><span class="chip">${esc(it.direction)}</span>`;
      const tb = scriptBox('Target script', it.target_script, true);
      tb.onclick = () => tb.classList.toggle('expanded'); tb.style.cursor = 'pointer';
      box.append(meta, pair, tb);
      g.append(box);
      return { it, box, cards: [s, o] };
    });
    const lazy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const x = items.find(y => y.box === e.target); x.cards.forEach(cd => { cd.video.preload = 'metadata'; cd.load(); }); lazy.unobserve(e.target); } }), { rootMargin: '200px' });
    items.forEach(x => lazy.observe(x.box));
    groups.forEach((name, i) => {
      const b = el('button', 'seg' + (i ? '' : ' active'), esc(name)); b.type = 'button';
      b.onclick = () => {
        f.querySelectorAll('.seg').forEach(x => x.classList.toggle('active', x === b));
        items.forEach(x => { const ok = name === 'All' || x.it.scene === name || x.it.direction === name; x.box.hidden = !ok; if (!ok) x.cards.forEach(cd => cd.video.pause()); });
      };
      f.append(b);
    });
  }

  // ---------- multilingual ----------
  function renderML() {
    const m = D.multilingual, root = $('#ml');
    const langs = el('div', 'ml-langs');
    const wrap = el('div', 'ml-wrap');
    const s = videoCard(m.source, { title: 'Original (Chinese)' });
    let o = null;
    const scripts = el('div', 'ml-scripts');
    const sync = el('div', 'syncbar'); sync.style.margin = '0';
    const sp = el('button', 'tbtn primary', I.play + 'Play both'); sp.type = 'button';
    sync.append(sp);
    function pick(i) {
      langs.querySelectorAll('.seg').forEach((b, j) => b.classList.toggle('active', i === j));
      const L = m.languages[i];
      if (o) { o.video.pause(); all.delete(o); if (sounding === o) sounding = null; o.root.remove(); }
      o = videoCard(L, { title: `CineVerto (${L.label})`, ours: true });
      o.load();
      wrap.insertBefore(o.root, scripts);
      scripts.innerHTML = '';
      const tgt = scriptBox(`Target script (${L.label})`, L.script, true);
      if (L.code === 'ar') tgt.querySelector('p').setAttribute('dir', 'rtl');
      scripts.append(scriptBox('Source script (Chinese)', m.source_script), tgt, sync);
    }
    sp.onclick = () => { s.restart(); o.restart(); };
    m.languages.forEach((L, i) => { const b = el('button', 'seg', esc(L.label)); b.type = 'button'; b.onclick = () => pick(i); langs.append(b); });
    wrap.append(s.root, scripts);
    root.append(langs, wrap);
    pick(0);
    new IntersectionObserver((es, ob) => es.forEach(e => { if (e.isIntersecting) { s.load(); ob.disconnect(); } }), { rootMargin: '300px' }).observe(root);
  }

  renderThumbs(); showCase(0); renderGallery(); renderML();
  document.addEventListener('visibilitychange', () => { if (document.hidden) all.forEach(c => c.video.pause()); });
})();
