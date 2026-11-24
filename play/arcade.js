/* =====================================================================
   Hatch Invaders — 2D arcade (Canvas 2D, vanilla JS, no network).
   Logical field is 1000 × 700; the canvas scales to its container.
   ===================================================================== */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var cv = $("arena"), ctx = cv.getContext("2d");
  var W = 1000, H = 700, GROUND = H - 26, PY = H - 62;
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var touch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  if (touch) document.body.classList.add("touch");

  /* ---------- theme ---------- */
  var T = {};
  function readTheme() {
    var s = getComputedStyle(document.documentElement);
    function v(n, d) { return (s.getPropertyValue(n) || "").trim() || d; }
    T.bg = v("--surface", "#FAF9F6"); T.ink = v("--ink", "#141414"); T.grid = v("--grey-2", "#D9D8D3");
    T.grey = v("--grey-1", "#6E6E6A"); T.red = v("--red", "#D52B1E"); T.blue = v("--blue", "#1C4FA0");
    T.rows = [T.red, T.blue, "#F2B800", T.grey, T.ink];
  }
  readTheme();
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", function () { readTheme(); if (!running) draw(); });
  }

  /* ---------- sizing ---------- */
  var scale = 1;
  function resize() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    scale = cv.width / W;
    ctx.setTransform(scale, 0, 0, cv.height / H, 0, 0);
    if (!running) draw();
  }
  window.addEventListener("resize", resize);

  /* ---------- state ---------- */
  var S, running = false, paused = false, raf = 0, last = 0;
  var keys = {};
  var best = 0;
  try { best = parseInt(localStorage.getItem("pa-arcade-best"), 10) || 0; } catch (e) { best = 0; }
  function newGame() {
    S = { score: 0, wave: 0, lives: 3, charge: 0, x: W / 2, cool: 0, inv: 0,
          shots: [], drops: [], foes: [], pops: [], dir: 1, speed: 0, fireT: 1.5,
          banner: "", bannerT: 0, flash: 0, over: false, hits: 0, hdelUses: 0, hdelCleared: 0 };
    nextWave();
    hud();
  }
  function nextWave() {
    S.wave++;
    var rows = Math.min(5, 3 + Math.floor((S.wave - 1) / 2)), cols = 9, gx = 84, gy = 56;
    var x0 = (W - (cols - 1) * gx) / 2, y0 = 70 + Math.min(4, S.wave - 1) * 8;
    S.foes = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++)
      S.foes.push({ x: x0 + c * gx, y: y0 + r * gy, w: 52, h: 34, row: r, alive: true });
    S.dir = 1; S.speed = 34 + S.wave * 12; S.fireT = 1.2;
    S.drops = []; S.shots = [];
    S.banner = "WAVE " + S.wave; S.bannerT = 1.4;
    say("Wave " + S.wave + ".");
  }

  /* ---------- HUD ---------- */
  var lastHud = "";
  function hud() {
    var key = S.score + "|" + S.wave + "|" + S.lives + "|" + S.charge;
    if (key === lastHud) return; lastHud = key;
    $("s-score").textContent = String(S.score);
    $("s-wave").textContent = String(S.wave);
    $("s-lives").textContent = String(Math.max(0, S.lives));
    var ready = S.charge >= 10;
    $("s-hdel").textContent = ready ? "Ready · H" : S.charge + " / 10";
    $("m-fill").style.width = (S.charge * 10) + "%";
    $("meter").classList.toggle("ready", ready);
    $("t-hdel").disabled = !ready;
  }
  function say(t) { $("live").textContent = t; }

  /* ---------- actions ---------- */
  function fire() {
    if (!running || paused || S.cool > 0 || S.shots.length >= 3) return;
    S.shots.push({ x: S.x, y: PY - 18 });
    S.cool = 0.26;
  }
  function hdel() {
    if (!running || paused || S.charge < 10) return;
    var n = 0;
    S.foes.forEach(function (f) {
      if (!f.alive) return;
      f.alive = false; n++;
      pop(f.x, f.y, T.rows[f.row % T.rows.length], Math.abs(f.x - S.x) * 0.0006);
    });
    S.score += n * 5; S.charge = 0; S.hdelUses++; S.hdelCleared += n;
    S.drops = [];
    S.flash = reduce ? 0 : 0.35;
    S.banner = "HDEL · " + n + " CLEARED"; S.bannerT = 1.3;
    say("HDEL cleared " + n + " hatches in one command.");
    hud();
  }
  function pop(x, y, col, delay) {
    if (reduce) return;
    for (var i = 0; i < 6; i++) {
      var a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 140;
      S.pops.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0.45, d: delay || 0, c: col });
    }
    if (S.pops.length > 260) S.pops.splice(0, S.pops.length - 260);
  }
  function hitPlayer() {
    if (S.inv > 0) return;
    S.lives--; S.inv = 1.6; S.drops = [];
    S.flash = reduce ? 0 : 0.2;
    if (S.lives <= 0) { gameOver("A gap got through. Out of lives."); return; }
    say("Hit. " + S.lives + (S.lives === 1 ? " life" : " lives") + " left.");
    hud();
  }
  function gameOver(why) {
    S.over = true; running = false; cancelAnimationFrame(raf);
    if (S.score > best) { best = S.score; try { localStorage.setItem("pa-arcade-best", String(best)); } catch (e) { /* ignore */ } }
    $("over-h").textContent = why;
    $("o-score").textContent = String(S.score);
    $("o-text").textContent = "Wave " + S.wave + " · " + S.hits + " hatches shot" +
      (S.hdelUses ? " · " + S.hdelCleared + " cleared by HDEL in " + S.hdelUses + (S.hdelUses === 1 ? " command" : " commands") : "") +
      " · Best " + best;
    hud(); draw();
    $("ov-over").hidden = false; $("b-again").focus();
    say("Game over. Score " + S.score + ".");
  }

  /* ---------- update ---------- */
  function hit(a, ax, ay, b) { return ax > b.x - b.w / 2 && ax < b.x + b.w / 2 && ay > b.y - b.h / 2 && ay < b.y + b.h / 2; }
  function update(dt) {
    var mv = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    S.x = Math.max(40, Math.min(W - 40, S.x + mv * 420 * dt));
    if (keys.fire) fire();
    S.cool = Math.max(0, S.cool - dt); S.inv = Math.max(0, S.inv - dt);
    S.flash = Math.max(0, S.flash - dt); S.bannerT = Math.max(0, S.bannerT - dt);

    // formation
    var alive = S.foes.filter(function (f) { return f.alive; });
    if (!alive.length) { nextWave(); return; }
    var boost = 1 + (1 - alive.length / S.foes.length) * 1.2;
    var dx = S.dir * S.speed * boost * dt, minX = 1e9, maxX = -1e9, maxY = 0;
    alive.forEach(function (f) { f.x += dx; minX = Math.min(minX, f.x - f.w / 2); maxX = Math.max(maxX, f.x + f.w / 2); maxY = Math.max(maxY, f.y + f.h / 2); });
    if ((S.dir > 0 && maxX > W - 16) || (S.dir < 0 && minX < 16)) {
      S.dir *= -1;
      alive.forEach(function (f) { f.y += 18; });
    }
    if (maxY > PY - 24) { gameOver("The hatches reached the bottom."); return; }

    // enemy fire: bottom foe of a random column
    S.fireT -= dt;
    if (S.fireT <= 0) {
      var cols = {};
      alive.forEach(function (f) { var k = Math.round(f.x); if (!cols[k] || cols[k].y < f.y) cols[k] = f; });
      var list = Object.keys(cols).map(function (k) { return cols[k]; });
      var shooter = list[Math.floor(Math.random() * list.length)];
      if (shooter) S.drops.push({ x: shooter.x, y: shooter.y + 20 });
      S.fireT = Math.max(0.45, 1.5 - S.wave * 0.12) * (0.6 + Math.random() * 0.8);
    }

    // shots
    alive.sort(function (p, q) { return q.y - p.y; });
    for (var i = S.shots.length - 1; i >= 0; i--) {
      var s = S.shots[i], y0 = s.y; s.y -= 760 * dt;
      var done = s.y < -20;
      // swept test: the shot can travel further than a block's height in one frame
      for (var j = 0; !done && j < alive.length; j++) {
        var f = alive[j];
        if (f.alive && s.x > f.x - f.w / 2 && s.x < f.x + f.w / 2 && y0 > f.y - f.h / 2 && s.y - 14 < f.y + f.h / 2) {
          f.alive = false; done = true; S.hits++;
          S.score += 10; S.charge = Math.min(10, S.charge + 1);
          pop(f.x, f.y, T.rows[f.row % T.rows.length], 0);
          if (S.charge === 10) say("HDEL charged. Press H.");
        }
      }
      if (done) S.shots.splice(i, 1);
    }
    // drops
    var pbox = { x: S.x, y: PY, w: 56, h: 26 };
    for (var k = S.drops.length - 1; k >= 0; k--) {
      var d = S.drops[k]; d.y += (230 + S.wave * 16) * dt;
      if (d.y > GROUND) { S.drops.splice(k, 1); continue; }
      if (hit(null, d.x, d.y, pbox)) { S.drops.splice(k, 1); hitPlayer(); if (S.over) return; }
    }
    // particles
    for (var p = S.pops.length - 1; p >= 0; p--) {
      var q = S.pops[p];
      if (q.d > 0) { q.d -= dt; continue; }
      q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.t <= 0) S.pops.splice(p, 1);
    }
    hud();
  }

  /* ---------- draw ---------- */
  function hatchBlock(f) {
    var col = T.rows[f.row % T.rows.length], x = f.x - f.w / 2, y = f.y - f.h / 2;
    ctx.fillStyle = T.bg; ctx.fillRect(x, y, f.w, f.h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, f.w, f.h); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath();
    for (var o = -f.h; o < f.w; o += 9) { ctx.moveTo(x + o, y + f.h); ctx.lineTo(x + o + f.h, y); }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = f.row % T.rows.length === 2 ? T.ink : col; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, f.w - 2, f.h - 2);
  }
  function player() {
    if (S.inv > 0 && !reduce && Math.floor(S.inv * 10) % 2) return;
    var x = S.x, y = PY;
    ctx.strokeStyle = T.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.lineTo(x + 30, y); ctx.moveTo(x, y - 26); ctx.lineTo(x, y + 14); ctx.stroke();
    ctx.strokeRect(x - 11, y - 11, 22, 22);
    ctx.fillStyle = "#FF5A1F"; ctx.fillRect(x - 6, y - 6, 12, 12);
  }
  function draw() {
    if (!S) return;
    ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
    // drafting grid
    ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (var gx = 50; gx < W; gx += 50) { ctx.moveTo(gx, 0); ctx.lineTo(gx, GROUND); }
    for (var gy = 50; gy < GROUND; gy += 50) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
    ctx.stroke();
    ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();

    S.foes.forEach(function (f) { if (f.alive) hatchBlock(f); });
    // shots (cyan, like a GAPCHECK highlight)
    ctx.fillStyle = "#3BB6C4";
    S.shots.forEach(function (s) { ctx.fillRect(s.x - 2, s.y - 14, 4, 18); });
    // drops (short red gap marks)
    ctx.strokeStyle = T.red; ctx.lineWidth = 3;
    S.drops.forEach(function (d) { ctx.beginPath(); ctx.moveTo(d.x, d.y - 8); ctx.lineTo(d.x, d.y + 8); ctx.stroke(); });
    S.pops.forEach(function (q) { if (q.d > 0) return; ctx.globalAlpha = Math.max(0, q.t / 0.45); ctx.fillStyle = q.c; ctx.fillRect(q.x - 3, q.y - 3, 6, 6); });
    ctx.globalAlpha = 1;
    player();

    if (S.bannerT > 0) {
      ctx.globalAlpha = Math.min(1, S.bannerT * 2);
      ctx.fillStyle = T.ink; ctx.font = "700 44px Helvetica Neue, Helvetica, Arial, sans-serif";
      ctx.textAlign = "center"; ctx.fillText(S.banner, W / 2, H / 2);
      ctx.globalAlpha = 1;
    }
    if (S.flash > 0) { ctx.globalAlpha = S.flash; ctx.fillStyle = "#FF5A1F"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  /* ---------- loop ---------- */
  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (!paused) update(dt);
    if (running) { draw(); raf = requestAnimationFrame(frame); }
  }
  function start() {
    newGame();
    ["ov-start", "ov-over", "ov-pause"].forEach(function (id) { $(id).hidden = true; });
    running = true; paused = false; last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    cv.focus();
  }
  function pause() {
    if (!running || paused) return;
    paused = true; keys = {}; $("ov-pause").hidden = false; $("b-resume").focus();
  }
  function resume() {
    if (!running) return;
    paused = false; $("ov-pause").hidden = true; last = performance.now(); cv.focus();
  }

  /* ---------- input ---------- */
  var MAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "fire", ArrowUp: "fire", KeyW: "fire" };
  window.addEventListener("keydown", function (e) {
    if (!running) return;
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); if (paused) resume(); else pause(); return; }
    if (paused) return;
    if (MAP[e.code]) { keys[MAP[e.code]] = true; e.preventDefault(); if (MAP[e.code] === "fire") fire(); }
    if (e.code === "KeyH") { e.preventDefault(); hdel(); }
  });
  window.addEventListener("keyup", function (e) { if (MAP[e.code]) keys[MAP[e.code]] = false; });
  window.addEventListener("blur", function () { keys = {}; if (running && !paused) pause(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && running && !paused) pause(); });
  function hold(id, k) {
    var b = $(id);
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); keys[k] = true; if (k === "fire") fire(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (t) { b.addEventListener(t, function () { keys[k] = false; }); });
  }
  hold("t-left", "left"); hold("t-right", "right"); hold("t-fire", "fire");
  $("t-hdel").addEventListener("click", hdel);
  cv.addEventListener("pointerdown", function (e) {      // tap/click the field to fire
    if (!running || paused) return;
    var r = cv.getBoundingClientRect();
    if (touch) S.x = Math.max(40, Math.min(W - 40, (e.clientX - r.left) / r.width * W));
    fire();
  });

  $("b-start").addEventListener("click", start);
  $("b-again").addEventListener("click", start);
  $("b-restart").addEventListener("click", start);
  $("b-resume").addEventListener("click", resume);
  $("best-line").textContent = best ? "Best score on this device: " + best : "";

  newGame(); resize(); draw();
  if (/test/.test(location.hash)) window.__arcade = { S: function () { return S; }, start: start, hdel: hdel, fire: fire, running: function () { return running; } };
})();
