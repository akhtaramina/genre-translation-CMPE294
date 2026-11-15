// Plain JavaScript, no libraries. Without JS, every stage, ending, and
// the reveal are simply shown in order (see the .js rules in style.css).

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function scrollTo(el) {
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function focusQuietly(el) {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }

  /* ---------- share buttons (no tracking) ---------- */
  var status = document.querySelector('.share-status');
  var showStatus = function (msg) {
    status.textContent = msg;
    setTimeout(function () { status.textContent = ''; }, 2500);
  };
  var copyBtn = document.querySelector('[data-copy-link]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      if (!navigator.clipboard) { showStatus('Copy the address bar link'); return; }
      navigator.clipboard.writeText(location.href.split('#')[0])
        .then(function () { showStatus('Link copied'); })
        .catch(function () { showStatus('Copy the address bar link'); });
    });
  }
  var mailLink = document.querySelector('[data-email-link]');
  if (mailLink) mailLink.href += '&body=' + encodeURIComponent(location.href.split('#')[0]);

  /* ---------- reading progress bar ---------- */
  var bar = document.getElementById('progress-bar');
  if (bar) {
    var updateBar = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', updateBar, { passive: true });
    updateBar();
  }

  /* ---------- scroll-in transitions ---------- */
  // One gentle effect for every section: each block fades in and rises 12px
  // the first time it enters the screen. Cards in a grid stagger by 60ms.
  // Figures that hold a card grid fade card by card instead of as one block.
  // Skipped entirely when the reader prefers less motion; without JS nothing is hidden.
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var cardGrids = '.benefit-cards, .rf-cards';
    var targets = [];
    document.querySelectorAll(
      '.sec > h2, .sec > h3, .sec > p, .sec > ul, .sec > ol, .sec > .fig, .sec > figure, .sec > .callout, .sec > .activity, .sec > .db-stat'
    ).forEach(function (el) {
      if (el.matches('.visually-hidden')) return;
      if (!el.querySelector(cardGrids)) { targets.push(el); return; }
      Array.prototype.forEach.call(el.children, function (child) {
        if (child.matches(cardGrids)) {
          Array.prototype.forEach.call(child.children, function (card, i) {
            card.style.setProperty('--d', (i * 0.06) + 's');
            targets.push(card);
          });
        } else {
          targets.push(child);
        }
      });
    });
    targets.forEach(function (el) { el.classList.add('fx'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- scrollytelling: sticky Figure 1 graphic ---------- */
  // Each text step lights up the matching stage as it crosses the middle of
  // the screen. Without JS, the graphic and the steps (each with its visual
  // above the text) simply show in order (no .is-scrolly class). On desktop
  // the step visuals move into one sticky panel and crossfade.
  var scrolly = document.querySelector('[data-scrolly]');
  if (scrolly && 'IntersectionObserver' in window) {
    var flow = scrolly.querySelector('.flow');
    var flowFig = scrolly.querySelector('.scrolly-graphic');
    var stages = scrolly.querySelectorAll('.flow-steps li');
    var stepEls = scrolly.querySelectorAll('.step');
    var panel = scrolly.querySelector('.scrolly-panel');
    var vizEls = Array.prototype.slice.call(scrolly.querySelectorAll('.step-viz'));
    var wideQuery = window.matchMedia('(min-width: 900px)');
    var current = 1;
    scrolly.classList.add('is-scrolly');

    var placeViz = function () {
      var wide = wideQuery.matches;
      scrolly.classList.toggle('has-panel', wide);
      vizEls.forEach(function (fig) {
        if (wide) {
          panel.appendChild(fig);
        } else {
          var step = scrolly.querySelector('.step[data-n="' + fig.getAttribute('data-n') + '"]');
          step.insertBefore(fig, step.firstChild);
        }
      });
      scrolly.style.setProperty('--flow-h', flowFig.offsetHeight + 'px');
    };

    // Step motion: a step's graphic animates once when that step becomes
    // active, and again each time the reader comes back to it (never looping
    // on its own). The resting CSS is the finished picture, so with less
    // motion nothing moves and nothing is
    // left half-drawn.
    vizEls.forEach(function (fig) {
      fig.querySelectorAll('.v-pill, .v-card').forEach(function (el, i) { el.style.setProperty('--i', i); });
      fig.querySelectorAll('.v-sil').forEach(function (el, i) { el.style.setProperty('--i', Math.floor(i / 2)); });
      // each look-alike turns orange as the 1.2s scan line (x 16 to 458) passes it
      fig.querySelectorAll('.v-hit').forEach(function (el) {
        var x = Number(el.querySelector('circle').getAttribute('cx'));
        el.style.setProperty('--t', (1.2 * (x - 16) / 442).toFixed(2) + 's');
      });
    });
    var countScores = function (fig) {
      fig.querySelectorAll('.v-score').forEach(function (el) {
        var end = parseInt(el.getAttribute('data-end') || el.textContent, 10);
        el.setAttribute('data-end', end);
        var start = null;
        var tick = function (now) {
          if (start === null) start = now;
          var t = Math.min((now - start) / 800, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3))) + '%';
          if (t < 1) el.countFrame = requestAnimationFrame(tick);
        };
        cancelAnimationFrame(el.countFrame);
        clearTimeout(el.countDone);
        el.countFrame = requestAnimationFrame(tick);
        // safety net: always land on the real value
        el.countDone = setTimeout(function () { cancelAnimationFrame(el.countFrame); el.textContent = end + '%'; }, 900);
      });
    };
    var playViz = function (n) {
      if (reduceMotion) return;
      var fig = vizEls.filter(function (f) { return Number(f.getAttribute('data-n')) === n; })[0];
      if (!fig) return;
      fig.classList.remove('play');
      void fig.offsetWidth; // restart the CSS animations
      fig.classList.add('play');
      if (n === 4) countScores(fig);
    };

    var setStep = function (n) {
      var changed = n !== current;
      current = n;
      flow.setAttribute('data-step', n);
      stages.forEach(function (li, i) {
        li.classList.toggle('done', i + 1 < n);
        li.classList.toggle('now', i + 1 === n);
      });
      stepEls.forEach(function (el) { el.classList.toggle('is-active', Number(el.getAttribute('data-n')) === n); });
      vizEls.forEach(function (fig) { fig.classList.toggle('on', Number(fig.getAttribute('data-n')) === n); });
      if (changed) playViz(n);
    };
    // Stage boxes are buttons: click (or Enter/Space) jumps to that step, so
    // readers can go back without scrolling.
    var goToStep = function (n) {
      var step = stepEls[n - 1];
      var top;
      if (wideQuery.matches) {
        var box = step.querySelector('p').getBoundingClientRect();
        top = window.scrollY + box.top + box.height / 2 - window.innerHeight * 0.6;
      } else {
        top = window.scrollY + step.getBoundingClientRect().top - 72;
      }
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      setStep(n);
    };
    flow.removeAttribute('role');
    flow.removeAttribute('aria-label');
    scrolly.querySelector('.flow-steps').setAttribute('aria-label', 'Steps in how a match is made. Choose one to jump to it.');
    stages.forEach(function (li, i) {
      li.setAttribute('role', 'button');
      li.tabIndex = 0;
      li.addEventListener('click', function () { goToStep(i + 1); });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToStep(i + 1); }
      });
    });
    var flowCap = flowFig.querySelector('.cap');
    if (flowCap) flowCap.textContent += ' Tap a stage to jump to it.';

    placeViz();
    if (wideQuery.addEventListener) wideQuery.addEventListener('change', function () { placeViz(); setStep(current); });
    window.addEventListener('resize', function () { scrolly.style.setProperty('--flow-h', flowFig.offsetHeight + 'px'); });
    var stepIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setStep(Number(entry.target.getAttribute('data-n')));
      });
    }, { rootMargin: '-55% 0px -35% 0px' });
    stepEls.forEach(function (el) { stepIO.observe(el); });
    setStep(1);
  }

  /* ---------- database-size buttons (drive Figure 2's grid) ---------- */
  // Each icon = 1,000 faces. Look-alikes use an illustrative rate of about
  // 1 per 15,000 faces (not from a source). Look-alike j sits inside block j
  // of 15 icons, so earlier look-alikes never move as the grid grows.
  var dbBox = document.querySelector('[data-dbslider]');
  var bigGrid = document.querySelector('[data-db-big]');
  if (dbBox && bigGrid) {
    var presets = Array.prototype.slice.call(dbBox.querySelectorAll('.db-preset'));
    var icons = Array.prototype.slice.call(bigGrid.querySelectorAll('.db-ico'));
    var hitIdx = icons.filter(function (g) { return g.classList.contains('hit'); })
      .map(function (g) { return Number(g.getAttribute('data-i')); });

    var renderDb = function (faces) {
      var shown = Math.round(faces / 1000);
      var hits = Math.floor(faces / 15000);
      var live = hitIdx.slice(0, hits);
      icons.forEach(function (g, i) {
        g.classList.toggle('off', i >= shown);
        g.classList.toggle('hit', live.indexOf(i) !== -1);
      });
      presets.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(Number(btn.getAttribute('data-faces')) === faces));
      });
    };
    presets.forEach(function (btn) {
      btn.addEventListener('click', function () {
        renderDb(Number(btn.getAttribute('data-faces')));
      });
    });
    renderDb(250000);
  }

  /* ---------- "Try it yourself" activity ---------- */
  var FACES = {
    a: { label: 'Face A', detail: '97% match' },
    b: { label: 'Face B', detail: '91% match, prior arrest' },
    c: { label: 'Face C', detail: '88% match' }
  };

  var reveal = document.getElementById('reveal');
  var pickText = reveal && reveal.querySelector('.your-pick');
  var skipChoice = document.querySelector('.skip-choice');
  var pickFig = reveal && reveal.querySelector('.real-face');
  var firstPick = null;

  // The reveal photo shows the face the reader picked; skipping hides it.
  var showPickPhoto = function (key) {
    if (!pickFig) return;
    pickFig.hidden = !key;
    pickFig.parentNode.classList.toggle('no-photo', !key);
    if (!key) return;
    var img = pickFig.querySelector('img');
    img.src = 'images/face-' + key + '.jpg';
    img.alt = 'AI-generated photo of ' + FACES[key].label + ', the face you picked; not a real person.';
    pickFig.querySelector('figcaption').textContent = 'Your pick, ' + FACES[key].label + ': innocent';
  };

  var openReveal = function () {
    var wasOpen = reveal.classList.contains('open');
    reveal.classList.add('open');
    skipChoice.classList.add('gone');
    if (!wasOpen) {
      scrollTo(reveal);
      focusQuietly(reveal);
    }
  };

  document.querySelectorAll('.lineup .cand').forEach(function (btn) {
    btn.addEventListener('click', function () {
      firstPick = btn.getAttribute('data-face');
      document.querySelectorAll('.lineup .cand').forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      pickText.textContent = 'You picked ' + FACES[firstPick].label + ' (' + FACES[firstPick].detail + ').';
      showPickPhoto(firstPick);
      openReveal();
    });
  });

  var showAnswer = document.querySelector('[data-show-answer]');
  if (showAnswer) {
    showAnswer.addEventListener('click', function () {
      pickText.textContent = 'You skipped the choice. Here is the answer.';
      showPickPhoto(null);
      openReveal();
    });
  }

  /* ---------- "Fix it" replay ---------- */
  var fixit = document.getElementById('fixit');
  if (fixit) {
    var startBtn = fixit.querySelector('[data-fixit-start]');
    var round = fixit.querySelector('.fixit-round');
    var blindBox = fixit.querySelector('.candidates.blind');
    var result = fixit.querySelector('.fixit-result');
    var compareNote = fixit.querySelector('.compare-note');

    var shuffled = function () {
      var order = ['a', 'b', 'c'];
      do {
        for (var i = order.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = order[i]; order[i] = order[j]; order[j] = t;
        }
      } while (order.join('') === 'abc'); // always look different from round 1
      return order;
    };

    var faceImg = function (key) {
      var img = document.createElement('img');
      img.src = 'images/face-' + key + '.jpg';
      img.width = 200;
      img.height = 240;
      img.alt = '';
      var wrap = document.createElement('span');   // carries the photocopy grain
      wrap.className = 'mug';
      wrap.appendChild(img);
      return wrap;
    };

    var fillCard = function (slot, title, key, caption) {
      var card = fixit.querySelector('[data-slot="' + slot + '"]');
      card.innerHTML = '';
      var head = document.createElement('span');
      head.className = 'mono';
      head.textContent = title;
      card.appendChild(head);
      if (key) {
        card.appendChild(faceImg(key));
      } else {
        var none = document.createElement('div');
        none.className = 'none';
        none.textContent = 'No pick';
        card.appendChild(none);
      }
      var cap = document.createElement('figcaption');
      cap.textContent = caption;
      card.appendChild(cap);
    };

    var showResult = function (secondKey, number) {
      if (firstPick) {
        fillCard('first', 'Round 1: with scores', firstPick,
          'You picked ' + FACES[firstPick].label + ' (' + FACES[firstPick].detail + ').');
      } else {
        fillCard('first', 'Round 1: with scores', null, 'You skipped round 1.');
      }
      fillCard('second', 'Round 2: faces only', secondKey,
        'You picked Face ' + number + ', which was ' + FACES[secondKey].label + '.');

      if (!firstPick) {
        compareNote.textContent = 'You skipped round 1, so there is nothing to compare. You can scroll up and pick a face there, then replay.';
      } else if (firstPick === secondKey) {
        compareNote.textContent = 'You picked the same face both times.';
      } else {
        compareNote.textContent = 'Your pick changed once the score and record were hidden.';
      }

      round.hidden = true;
      result.hidden = false;
      startBtn.textContent = 'Shuffle and try again';
      startBtn.hidden = false;
      focusQuietly(result);
    };

    startBtn.addEventListener('click', function () {
      blindBox.innerHTML = '';
      shuffled().forEach(function (key, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'cand';
        b.setAttribute('aria-label', 'Face ' + (i + 1));
        b.appendChild(faceImg(key));
        var name = document.createElement('span');
        name.className = 'cand-name';
        name.textContent = String(i + 1);
        b.appendChild(name);
        b.addEventListener('click', function () { showResult(key, i + 1); });
        blindBox.appendChild(b);
      });
      result.hidden = true;
      round.hidden = false;
      startBtn.hidden = true;
      focusQuietly(round.querySelector('p'));
    });
  }

  /* ---------- "Gatlin is not alone" case line ---------- */
  // Hover shows a case's details (CSS); a click or tap pins them open,
  // one case at a time. Escape or a click elsewhere closes.
  var cases = Array.prototype.slice.call(document.querySelectorAll('.case-line .case'));
  var setOpen = function (item, open) {
    item.classList.toggle('open', open);
    item.querySelector('.case-pt').setAttribute('aria-expanded', String(open));
  };
  cases.forEach(function (item) {
    item.querySelector('.case-pt').addEventListener('click', function () {
      var open = !item.classList.contains('open');
      cases.forEach(function (other) { setOpen(other, false); });
      setOpen(item, open);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cases.forEach(function (item) { setOpen(item, false); });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.case')) cases.forEach(function (item) { setOpen(item, false); });
  });

})();
