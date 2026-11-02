(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  SFX.unlock();
  document.addEventListener('pointerdown', () => SFX.unlock(), { once: true });

  // ---------- mute ----------
  const muteBtn = $('#mute-btn');
  on(muteBtn, 'click', () => {
    const m = !SFX.isMuted();
    SFX.setMuted(m);
    muteBtn.textContent = m ? '🔇' : '🔊';
  });

  // ---------- generic tap sounds ----------
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('[data-sfx]');
    if (!t) return;
    const fn = SFX[t.dataset.sfx];
    if (fn) fn.call(SFX);
  }, true);

  const wobble = (el, cls = 'wob', ms = 600) => {
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  };

  const say = (pageId, text) => {
    const n = $(`#n-${pageId} .narr-text`);
    if (n) { n.textContent = text; wobble(n.parentElement, 'say-pop', 500); }
  };

  const setCaption = (id, text) => { const c = $(id); if (c) c.textContent = text; };

  // ---------- read aloud ----------
  $$('.read-btn').forEach((b) => on(b, 'click', () => {
    if (!('speechSynthesis' in window) || SFX.isMuted()) return;
    const text = b.parentElement.querySelector('.narr-text').textContent;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.08; u.pitch = 1.35; u.volume = 1;
    speechSynthesis.speak(u);
    SFX.click();
  }));

  // ============================================================
  //  GATE
  // ============================================================
  const gate = $('#gate'), book = $('#book');
  let trunkOpen = false;
  on($('#trunk-lid'), 'pointerdown', openTrunk);
  on($('#car'), 'pointerdown', (e) => { if (!trunkOpen) openTrunk(); });

  function openTrunk() {
    if (trunkOpen) return;
    trunkOpen = true;
    gate.classList.add('trunk-open');
    SFX.whoosh();
    SFX.sparkle();
    setCaption('#hint-open', '');
    $('#hint-jump').setAttribute('opacity', '1');
    on($('#magic-box'), 'pointerdown', () => wobble($('#magic-box'), 'wob', 500));
    $('#jump-btn').classList.add('show');
  }

  on($('#jump-btn'), 'click', () => {
    gate.classList.add('jumping');
    SFX.jumpZoom();
    setTimeout(() => {
      gate.classList.add('hidden');
      book.classList.remove('hidden');
      showPage(0);
      SFX.fanfare();
    }, 850);
  });

  // ============================================================
  //  BOOK NAVIGATION
  // ============================================================
  const pages = $$('.page');
  const donePages = new Set();
  let cur = 0;

  const dotsBox = $('#page-dots');
  pages.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'dot';
    d.setAttribute('aria-label', `Page ${i + 1}`);
    on(d, 'click', () => { if (i <= cur || donePages.has(cur)) go(i); });
    dotsBox.appendChild(d);
  });
  const dots = $$('.dot');

  function complete(i) {
    donePages.add(i);
    pages[i].classList.add('complete');
    dots[i].classList.add('done');
    refreshNav();
  }

  function refreshNav() {
    $('#prev-btn').classList.toggle('hidden', cur === 0);
    $('#next-btn').classList.toggle('hidden', cur === pages.length - 1);
    const canNext = cur === 0 || donePages.has(cur);
    $('#next-btn').classList.toggle('locked', !canNext);
  }

  function showPage(i) {
    cur = i;
    pages.forEach((p, k) => {
      p.classList.remove('active', 'leaving');
      if (k === i) {
        void p.offsetWidth;
        p.classList.add('active');
      }
    });
    dots.forEach((d, k) => d.classList.toggle('current', k === i));
    refreshNav();
  }

  function go(i) {
    if (i === cur) return;
    SFX.pageFlip();
    showPage(i);
  }

  on($('#next-btn'), 'click', () => {
    if (cur === 0 || donePages.has(cur)) go(cur + 1);
    else { SFX.nope(); wobble($('#next-btn'), 'wob', 500); }
  });
  on($('#prev-btn'), 'click', () => go(cur - 1));

  // ============================================================
  //  PAGE 0 — cover
  // ============================================================
  on($('#cover-rocket'), 'pointerdown', () => {
    wobble($('#cover-rocket'), 'rocket-bounce', 900);
    say('p0', '');
    setTimeout(() => go(1), 750);
  });

  // ============================================================
  //  PAGE 1 — spot Mars
  // ============================================================
  let p1stars = 0;
  $$('#p1 .twinkle circle').forEach((s) => on(s, 'pointerdown', () => { SFX.click(); wobble(s, 'star-pop', 400); }));
  on($('#mars'), 'pointerdown', () => {
    if (donePages.has(1)) return;
    $('#mars').classList.add('found');
    setCaption('#cap-p1', 'That red dot is… MARS!!! 🔴');
    say('p1', 'YOU FOUND IT! Johnny waves at Mars from the yard!');
    complete(1);
    burstConfetti(30);
  });

  // ============================================================
  //  PAGE 2 — gather supplies
  // ============================================================
  const supplyNames = { tube: 'cardboard tube', tape: 'duct tape', bottle: 'fizzy bottle', foil: 'shiny foil', bucket: 'bucket', box: 'big box' };
  let got = 0;
  $$('#p2 .item').forEach((it) => {
    it.classList.add('hidden-item');
    on(it, 'pointerdown', () => {
      if (it.classList.contains('got')) return;
      it.classList.add('got');
      got++;
      $('#supply-count').textContent = `🎒 ${got} / 6`;
      wobble($('#supply-counter'), 'wob', 500);
      say('p2', `Got the ${supplyNames[it.dataset.item]}! ${got} down, ${6 - got} to go!`);
      if (got === 6) {
        say('p2', 'ALL SIX! Into the wagon! Next: the garage!');
        complete(2);
        SFX.fanfare();
        burstConfetti(30);
      }
    });
  });

  // ============================================================
  //  PAGE 3 — build the rocket
  // ============================================================
  let placed = 0;
  const dogThought = $('#dog-thought');
  const thoughts = ['…thats a BOX.', '…tape? REALLY?', '…its gonna EXPLODE.', '…hmm. OKAY.'];
  let thoughtIdx = 0;
  $$('#p3 .part').forEach((p) => {
    on(p, 'pointerdown', () => {
      if (p.classList.contains('used')) return;
      p.classList.add('used');
      const slot = $(`#in-${p.dataset.part}`);
      slot.classList.add('placed');
      $(`#slot-${p.dataset.part}`).classList.add('filled');
      placed++;
      say('p3', `CLANK! The ${p.dataset.part} snaps on! ${placed}/4`);
      if (placed === 4) {
        wobble($('#rocket-build'), 'rocket-done', 1200);
        setCaption('#p3 .scene-caption', 'THE ROCKET IS DONE!! (the dog looks… impressed)');
        say('p3', 'Rocket built! Even the dog approves. Almost.');
        dogThought.textContent = '…okay. Thats COOL.';
        dogThought.setAttribute('opacity', '1');
        complete(3);
        SFX.fanfare();
      }
    });
  });
  on($('#dog-judge'), 'pointerdown', () => {
    wobble($('#dog-judge'), 'dog-shake', 600);
    dogThought.textContent = thoughts[thoughtIdx % thoughts.length];
    thoughtIdx++;
    dogThought.setAttribute('opacity', '1');
  });

  // ============================================================
  //  PAGE 4 — blast off (hold to launch)
  // ============================================================
  const launchBtn = $('#launch-btn');
  const HOLD_MS = 3000;
  let holding = false, holdStart = 0, timer = null, lastBeep = 0, launched = false;

  function holdTick() {
    if (!holding) return;
    const p = Math.min(1, (performance.now() - holdStart) / HOLD_MS);
    launchBtn.style.setProperty('--hold', p);
    const step = Math.floor(p * 3); // 0..3
    if (step > lastBeep) {
      lastBeep = step;
      if (step < 3) { SFX.beep(false); setCountdown(3 - step); }
    }
    if (p >= 1) doLaunch();
  }

  function setCountdown(n) {
    const cd = $('#countdown');
    cd.classList.remove('hidden', 'cd-pop');
    cd.textContent = n;
    void cd.getBoundingClientRect();
    cd.classList.add('cd-pop');
  }

  function stopHold(launchedOk) {
    holding = false;
    clearInterval(timer);
    launchBtn.style.setProperty('--hold', 0);
    if (launchedOk) return;
    $('#countdown').classList.add('hidden');
    if (!launched) {
      SFX.nope();
      wobble(launchBtn, 'wob', 500);
      say('p4', 'AWWW! You let go too early! HOLD it down!');
      lastBeep = 0;
    }
  }

  function doLaunch() {
    holding = false;
    launched = true;
    SFX.beep(true);
    setCountdown('🚀');
    SFX.lift();
    $('#engine-flame').classList.remove('hidden');
    $('#p4').classList.add('shaking');
    $('#rocket-p4').classList.add('liftoff');
    launchBtn.classList.add('hidden');
    setCaption('#cap-p4', 'BLAST OFF!!!!! 🚀🔥');
    say('p4', 'WOOOOO! He is going UP, UP, UP!');
    setTimeout(() => {
      $('#p4').classList.remove('shaking');
      setCaption('#cap-p4', 'CHOOO-CHOO! Bye house, bye dog!');
      complete(4);
      burstConfetti(40);
    }, 1900);
  }

  on(launchBtn, 'pointerdown', (e) => {
    e.preventDefault();
    if (launched || donePages.has(4)) return;
    holding = true;
    holdStart = performance.now();
    lastBeep = 0;
    timer = setInterval(holdTick, 50);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
    on(launchBtn, ev, () => stopHold(false)));
  // already launched? tapping button again just replays
  on($('#p4'), 'pointerdown', () => {
    if (donePages.has(4)) wobble($('#rocket-p4'), 'rocket-bounce', 700);
  });

  // ============================================================
  //  PAGE 5 — land on Mars
  // ============================================================
  let landing = false;
  on($('#land-btn'), 'pointerdown', () => {
    if (landing || donePages.has(5)) return;
    landing = true;
    $('#land-btn').classList.add('hidden');
    SFX.beep(false);
    say('p5', 'Coming down… nice and slooow…');
    const rocket = $('#landing-rocket');
    rocket.classList.add('descend');
    setTimeout(() => {
      SFX.thud();
      $('#p5').classList.add('shaking');
      $('#dust').classList.remove('hidden');
      $('#dust').classList.add('puff');
      rocket.classList.add('landed-bounce');
      setCaption('#cap-p5', 'TOUCHDOWN ON MARS!!! 🎉');
      say('p5', 'He landed! One giant hop for Johnny!');
      setTimeout(() => {
        $('#p5').classList.remove('shaking');
        complete(5);
        burstConfetti(40);
      }, 900);
    }, 2600);
  });
  $$('#p5 .rock').forEach((r) => on(r, 'pointerdown', () => wobble(r, 'rock-hop', 600)));
  on($('#earth-dot'), 'pointerdown', () => wobble($('#earth-dot'), 'wob', 600));

  // ============================================================
  //  PAGE 6 — forgot the snacks
  // ============================================================
  let step6 = 0;
  on($('#johnny-gasp'), 'pointerdown', () => {
    if (step6 > 0) return;
    step6 = 1;
    SFX.gasp();
    $('#gasp-speech').classList.remove('hidden');
    $('#johnny-gasp').classList.add('gasp-anim');
    setTimeout(() => SFX.sadTrombone(), 450);
    setCaption('#cap-p6', 'HE FORGOT THE SNACKS!!! 😱');
    say('p6', 'Oh no oh no OH NO. Tap the backpack!');
  });
  on($('#empty-pack'), 'pointerdown', () => {
    if (step6 < 1) { SFX.nope(); return; }
    if (step6 > 1) return;
    step6 = 2;
    $('#dog-reveal').classList.remove('hidden');
    $('#dog-reveal').classList.add('pop-in');
    SFX.bark();
    setCaption('#cap-p6', 'The dog… has the snacks. THE DOG! 🐶🍿');
    say('p6', 'The dog took the snack bag! What a sneaky pup. THE END!');
    setTimeout(() => {
      $('#end-title').classList.remove('hidden');
      $('#end-title').classList.add('pop-in');
      $('#again-btn').classList.remove('hidden');
      SFX.fanfare();
      burstConfetti(80);
      complete(6);
    }, 900);
  });
  on($('#again-btn'), 'click', () => {
    location.reload();
  });

  // ============================================================
  //  CONFETTI
  // ============================================================
  const COLORS = ['#ff2e97', '#ffe600', '#2de1fc', '#a6ff00', '#ff9f1c', '#7b2fff'];
  function burstConfetti(n) {
    const layer = $('#confetti-layer');
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = COLORS[i % COLORS.length];
      c.style.animationDuration = (1.2 + Math.random() * 1.6) + 's';
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      c.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
      c.style.setProperty('--drift', (Math.random() * 200 - 100) + 'px');
      layer.appendChild(c);
      setTimeout(() => c.remove(), 3400);
    }
  }
})();
