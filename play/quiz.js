/* =====================================================================
   Guess the LISP — quiz built from the site's TOOLS data (../script.js).
   Add a tool to TOOLS and it joins the question pool automatically.
   ===================================================================== */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  if (typeof TOOLS === "undefined" || !TOOLS.length) {
    $("quiz").innerHTML = '<p>Tool data could not be loaded. Keep quiz.html inside the <code>play</code> folder next to <code>script.js</code>.</p>';
    return;
  }
  var ROUNDS = Math.min(10, TOOLS.length), OPTIONS = Math.min(4, TOOLS.length);
  var CLUES = [["problem", "Problem"], ["approach", "Approach"], ["action", "What it does"]];
  var showClient = typeof CONFIG === "undefined" || CONFIG.SHOW_CLIENT_NAMES !== false;

  function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function nameOf(t) { return (!showClient && t.alias) ? t.alias : t.name; }
  function plain(s) { return showClient ? String(s) : String(s).replace(/Boeing/gi, "client"); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  /* Hide the answer's own name and command inside its clues. */
  function masked(t, text) {
    var words = [t.name, t.alias].concat(String(t.command || "").split("/"))
      .map(function (w) { return (w || "").trim(); })
      .filter(function (w) { return w && !/^TODO/.test(w) && w.length > 1; })
      .sort(function (a, b) { return b.length - a.length; });
    var out = esc(plain(text));
    words.forEach(function (w) {
      var rx = new RegExp("(^|[^A-Za-z0-9_])(" + reEsc(esc(w)) + ")(?![A-Za-z0-9_])", "gi");
      out = out.replace(rx, function (m, pre) { return pre + '<span class="mask" aria-label="hidden name">' + "\u2588".repeat(Math.min(8, Math.max(3, w.length))) + "</span>"; });
    });
    return out;
  }

  var Q, idx, clueN, score, right, answered, log;
  function newQuiz() {
    Q = shuffle(TOOLS.slice()).slice(0, ROUNDS).map(function (t) {
      var others = shuffle(TOOLS.filter(function (o) { return o.id !== t.id; })).slice(0, OPTIONS - 1);
      return { t: t, opts: shuffle(others.concat([t])) };
    });
    idx = 0; score = 0; right = 0; log = [];
    $("s-n").textContent = String(ROUNDS);
    $("r-max").textContent = String(ROUNDS * 3);
    $("result").hidden = true; $("quiz").hidden = false;
    render();
  }
  function worth() { return Math.max(1, 3 - (clueN - 1)); }
  function render() {
    var q = Q[idx]; clueN = 1; answered = false;
    $("q-h").textContent = "Question " + (idx + 1) + " of " + ROUNDS;
    $("s-q").textContent = String(idx + 1);
    $("fb").hidden = true;
    $("pips").innerHTML = Q.map(function (_, i) {
      var c = i < log.length ? (log[i].ok ? "ok" : "no") : i === idx ? "now" : "";
      return '<span class="pip ' + c + '"></span>';
    }).join("");
    $("opts").innerHTML = q.opts.map(function (o, i) {
      return '<button type="button" class="opt" data-id="' + esc(o.id) + '"><span class="k">' + (i + 1) + "</span><span>" + esc(nameOf(o)) +
        (o.type === "Python" ? '<code>Python app</code>' : "") + "</span></button>";
    }).join("");
    showClues();
  }
  function showClues() {
    var q = Q[idx];
    $("clues").innerHTML = CLUES.slice(0, clueN).map(function (c) {
      return "<div class=\"clue\"><dt>" + c[1] + "</dt><dd>" + masked(q.t, q.t[c[0]] || "TODO") + "</dd></div>";
    }).join("");
    $("more").disabled = answered || clueN >= CLUES.length;
    $("more").textContent = clueN >= CLUES.length ? "All clues shown" : "Show another clue (−1 point)";
    $("s-worth").textContent = answered ? "–" : String(worth());
    $("s-score").textContent = String(score); $("s-right").textContent = String(right);
  }
  function answer(id) {
    if (answered) return;
    answered = true;
    var q = Q[idx], ok = id === q.t.id, pts = ok ? worth() : 0;
    score += pts; if (ok) right++;
    log.push({ t: q.t, ok: ok, pts: pts, pick: id });
    Array.prototype.forEach.call(document.querySelectorAll("#opts .opt"), function (b) {
      b.disabled = true;
      if (b.getAttribute("data-id") === q.t.id) b.classList.add("right");
      else if (b.getAttribute("data-id") === id) b.classList.add("wrong");
    });
    clueN = CLUES.length; showClues();
    $("clues").innerHTML = CLUES.map(function (c) { return "<div class=\"clue\"><dt>" + c[1] + "</dt><dd>" + esc(plain(q.t[c[0]] || "TODO")) + "</dd></div>"; }).join("");
    $("fb").classList.toggle("bad", !ok);
    $("fb-h").textContent = ok ? "Correct · +" + pts + (pts === 1 ? " point" : " points") : "Not quite. It's " + nameOf(q.t) + ".";
    $("fb-t").innerHTML = "<code>" + esc(/^TODO/.test(q.t.command) ? nameOf(q.t) : q.t.command) + "</code> — " + esc(plain(q.t.description));
    $("fb-link").href = "../index.html#tool=" + encodeURIComponent(q.t.id);
    $("next").textContent = idx + 1 < ROUNDS ? "Next question" : "See results";
    $("fb").hidden = false;
    $("pips").children[idx].className = "pip " + (ok ? "ok" : "no");
    $("next").focus();
  }
  function next() {
    if (idx + 1 < ROUNDS) { idx++; render(); $("opts").querySelector(".opt").focus(); return; }
    $("quiz").hidden = true; $("result").hidden = false;
    $("r-score").textContent = String(score);
    var pct = score / (ROUNDS * 3);
    $("r-h").textContent = pct >= 0.8 ? "Toolkit expert." : pct >= 0.5 ? "Solid. A few to review." : "Good start. Explore the toolkit.";
    $("r-text").textContent = right + " of " + ROUNDS + " correct.";
    $("r-list").innerHTML = log.map(function (r, i) {
      return '<li><span class="n">' + String(i + 1).padStart(2, "0") + '</span><a href="../index.html#tool=' + encodeURIComponent(r.t.id) + '">' + esc(nameOf(r.t)) + "</a><span>" + (r.ok ? "+" + r.pts : "✕") + "</span></li>";
    }).join("");
    $("again").focus();
  }

  $("opts").addEventListener("click", function (e) { var b = e.target.closest(".opt"); if (b && !b.disabled) answer(b.getAttribute("data-id")); });
  $("more").addEventListener("click", function () { if (!answered && clueN < CLUES.length) { clueN++; showClues(); } });
  $("next").addEventListener("click", next);
  $("again").addEventListener("click", function () { newQuiz(); $("opts").querySelector(".opt").focus(); });
  document.addEventListener("keydown", function (e) {
    if ($("quiz").hidden || e.target.tagName === "INPUT") return;
    var n = parseInt(e.key, 10);
    if (!answered && n >= 1 && n <= OPTIONS) { var b = $("opts").children[n - 1]; if (b) answer(b.getAttribute("data-id")); }
  });

  newQuiz();
  if (/test/.test(location.hash)) window.__quiz = { Q: function () { return Q; }, answer: answer, next: next, state: function () { return { idx: idx, score: score, right: right, clueN: clueN }; } };
})();
