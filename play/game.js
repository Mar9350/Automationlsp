/* =====================================================================
   ProCAD Office — GCDONUT Hunt
   Plain WebGL + vanilla JS. No libraries, no network requests.
   1. DATA (tools, rooms, people)   2. ENGINE   3. SCENE   4. GAME   5. UI
   Every person is an unnamed blocky figure.
   ===================================================================== */
(function () {
  "use strict";

  /* ================================================================
     1. DATA
     ================================================================ */
  var CATS = {
    cleanup: { name: "Drawing Cleanup",    shape: "circle",   hex: "#D52B1E", rgb: [0.84, 0.17, 0.12] },
    blocks:  { name: "Block Management",   shape: "square",   hex: "#1C4FA0", rgb: [0.11, 0.31, 0.63] },
    qa:      { name: "QA & Standards",     shape: "triangle", hex: "#F2B800", rgb: [0.95, 0.72, 0.00] },
    mapping: { name: "Mapping & Geometry", shape: "square",   hex: "#141414", rgb: [0.22, 0.22, 0.24] },
    python:  { name: "Python Software",    shape: "triangle", hex: "#141414", rgb: [0.52, 0.52, 0.50], outline: true }
  };

  /* Tool text comes from the ProCAD Automation site data. */
  var TOOLS = {
    gcdonut:  { name: "GCDONUT", command: "GCDONUT", cat: "mapping",
      desc: "Places a donut at the true center of each closed polyline.",
      action: "Places a donut at the area centroid of each closed polyline on the selected layers.",
      why: "Consistent marker placement on every shape." },
    hdel:     { name: "HDEL", command: "HDEL", cat: "cleanup",
      desc: "Deletes hatches inside block definitions without opening any block.",
      action: "Goes through every block, deletes the hatches inside it and regenerates the drawing.",
      why: "Lighter, cleaner backgrounds for mapping. The first tool on the timeline." },
    gapcheck: { name: "GAPCHECK", command: "GAPCHECK", cat: "qa",
      desc: "Highlights gaps between space and zone boundaries.",
      action: "Hatches the area between space and zone polylines so gaps are highlighted.",
      why: "Boundary defects are found before peer review." },
    q4:       { name: "BULK POLYLINE", command: "Q4", cat: "mapping",
      desc: "Creates room boundaries from room labels in one run.",
      action: "Creates a closed boundary polyline at each selected TEXT or MTEXT insertion point, then removes the temporary construction lines.",
      why: "Many spaces are polylined in one run, the same way every time." },
    txtdelblk:{ name: "TXTDELBLK", command: "TXTDELBLK", cat: "blocks",
      desc: "Deletes text, MText and attributes inside the blocks you select.",
      action: "Deletes all TEXT, MTEXT and ATTRIBUTE entities inside the selected block definitions.",
      why: "Cleaner plans without opening each block." },
    imagetodxf:{ name: "ImageToDXF", command: "ImageToDXF.exe", cat: "python",
      desc: "Turns a floor-plan image into a DXF.",
      action: "Reads a floor-plan image and generates a DXF.",
      why: "Image-only floors can enter the normal CAD workflow." },
    layclean: { name: "LAYCLEAN", command: "LAYCLEAN", cat: "cleanup",
      desc: "Moves objects to standard layers based on keywords in the layer names.",
      action: "Checks every layer name against a keyword list and moves objects to standard layers such as A-ARCH and FFE_FURNISHINGS.",
      why: "Every coordinator starts from the same clean layer structure." }
  };

  /* Each room is a closed rectangle. Its donut sits at the centroid, like GCDONUT. */
  var ZONES = [
    { id: "conference", label: "Conference room", x0: -14, z0: -10, x1: -5, z1: -2,  tool: "gcdonut" },
    { id: "pantry",     label: "Pantry",          x0: -14, z0: 4,   x1: -7, z1: 10,  tool: "hdel" },
    { id: "podA",       label: "Production A",    x0: -4,  z0: -10, x1: 8,  z1: -2,  tool: "gapcheck" },
    { id: "podB",       label: "Production B",    x0: -4,  z0: -2,  x1: 8,  z1: 4,   tool: "q4" },
    { id: "focus",      label: "Focus room",      x0: 9,   z0: -10, x1: 14, z1: -5,  tool: "txtdelblk" },
    { id: "print",      label: "Print corner",    x0: 9,   z0: 5,   x1: 14, z1: 10,  tool: "imagetodxf" },
    { id: "reception",  label: "Reception",       x0: -7,  z0: 4,   x1: 9,  z1: 10,  tool: "layclean" }
  ];

  /* People: seat ids come from the scene builder.
     Pods "A"/"B" + row "n"/"s" + desk 0–2 (e.g. "An1"); conference: "head", "cn0"–"cn2" (north side), "cs0"–"cs2" (south side).
     hair: "short" | "long" | "bun" | "bald".  mustache: true adds a mustache. */
  var PEOPLE = [
    { role: "coordinator", seat: "An0", hair: "long",  shirt: [0.11, 0.31, 0.63], pants: [0.20, 0.21, 0.26], skin: [0.87, 0.70, 0.56], hairCol: [0.12, 0.09, 0.08] },
    { role: "coordinator", seat: "An1", hair: "bald", mustache: true, shirt: [0.84, 0.17, 0.12], pants: [0.22, 0.22, 0.24], skin: [0.76, 0.58, 0.43], hairCol: [0.10, 0.08, 0.07] },
    { role: "coordinator", seat: "An2", hair: "bun",   shirt: [0.95, 0.72, 0.00], pants: [0.24, 0.25, 0.30], skin: [0.90, 0.74, 0.60], hairCol: [0.22, 0.14, 0.09] },
    { role: "coordinator", seat: "As0", hair: "long",  shirt: [0.27, 0.47, 0.36], pants: [0.18, 0.18, 0.20], skin: [0.82, 0.65, 0.50], hairCol: [0.16, 0.11, 0.08] },
    { role: "manager",     seat: "head", hair: "bald", shirt: [0.16, 0.17, 0.24], pants: [0.16, 0.17, 0.24], skin: [0.92, 0.78, 0.68], hairCol: [0.42, 0.36, 0.30], jacket: true },
    { role: "meeting",     seat: "cn0",  hair: "long", shirt: [0.55, 0.22, 0.36], pants: [0.20, 0.20, 0.24], skin: [0.88, 0.71, 0.58], hairCol: [0.28, 0.17, 0.10] }
  ];
  var ME = { seat: "As1", hair: "short", shirt: [1.0, 0.35, 0.12], pants: [0.18, 0.19, 0.24], skin: [0.80, 0.62, 0.48], hairCol: [0.07, 0.06, 0.06] };

  var LINES = {
    coordinator: [
      "Running GAPCHECK before peer review.",
      "Q4 just polylined the whole floor.",
      "LAYCLEAN sorted the client layers.",
      "Stepping through rooms with DUPTYPENEXT.",
      "SMARTSELECT found every matching chair.",
      "GCDONUT says the centroid is right here."
    ],
    meeting: [
      "Reviewing the client data export together.",
      "The toolkit story is ready for the showcase.",
      "Those new Python tools look useful."
    ],
    manager: [
      "Good work on the toolkit. Keep documenting it.",
      "Let's show this at the tech showcase.",
      "Next step: bring the toolkit to more clients."
    ]
  };

  /* Games. Each one teaches one tool. */
  var MODES = {
    donut: { title: "GCDONUT Hunt", unit: "Donuts", tool: "gcdonut",
      intro: "Seven rooms. Each one has a donut at its centroid, just where GCDONUT would put it. Find them all to unlock a tool card for each.",
      doneTitle: "All donuts found.", doneLead: "Every room is mapped." },
    gap:   { title: "Gap Patrol", unit: "Gaps sealed", tool: "gapcheck",
      intro: "Gaps are hiding in the room boundaries. Walk up to each glowing gap and press E to run GAPCHECK and seal it.",
      doneTitle: "Every gap sealed.", doneLead: "Zero gaps between polylines. Ready for peer review." },
    hatch: { title: "Hatch Sweeper", unit: "Hatches cleared", tool: "hdel",
      intro: "Hatch patterns are cluttering the floor. Clear a few by hand with E, then press H to run HDEL and clear the rest in one command.",
      doneTitle: "Floor is clean.", doneLead: "" }
  };
  /* Gap positions sit on the room outlines; hatch patches sit on open floor. */
  var GAPS = [[-11.5, -2.5], [-8.0, -9.55], [-3.7, -6.0], [6.0, -9.5], [7.7, 1.0], [-7.6, 7.0], [11.6, -5.5], [9.3, 7.5], [3.0, 9.5], [-2.0, 4.3]]
    .map(function (p) { return { x: p[0], z: p[1], done: false, t: 0 }; });
  var HATCHES = [[-4.0, 6.5], [6.5, 6.5], [-12.0, -3.2], [-6.2, -8.5], [-2.8, -8.8], [7.2, -3.0], [-2.6, 3.0], [6.8, 0.0], [-8.2, 8.8], [-12.3, 8.8], [12.2, -9.2], [10.8, 7.0]]
    .map(function (p) { return { x: p[0], z: p[1], done: false, t: 0, delay: 0, byHand: false }; });
  var HDEL_UNLOCK = 3;

  /* ================================================================
     2. ENGINE
     ================================================================ */
  function $(id) { return document.getElementById(id); }
  var canvas = $("scene");
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var isTouch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  var gl = null;
  try {
    gl = canvas.getContext("webgl", { antialias: true, alpha: false, powerPreference: "high-performance" }) ||
         canvas.getContext("experimental-webgl");
  } catch (e) { gl = null; }
  if (!gl) { $("start").hidden = true; $("nogl").hidden = false; return; }

  /* --- mat4 (column-major). Output must not alias the first input. --- */
  function mIdent(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; }
  function mMul(o, a, b) {
    for (var c = 0; c < 4; c++) {
      var b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4]     = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return o;
  }
  function mT(o, x, y, z) { mIdent(o); o[12] = x; o[13] = y; o[14] = z; return o; }
  function mRy(o, a) { mIdent(o); var c = Math.cos(a), s = Math.sin(a); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; }
  function mRx(o, a) { mIdent(o); var c = Math.cos(a), s = Math.sin(a); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o; }
  function mS(o, x, y, z) { mIdent(o); o[0] = x; o[5] = y; o[10] = z; return o; }
  function mPersp(o, fovy, asp, n, f) {
    var t = 1 / Math.tan(fovy / 2); o.fill(0);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
  }
  function mLook(o, ex, ey, ez, cx, cy, cz) {
    var zx = ex - cx, zy = ey - cy, zz = ez - cz, l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    var xx = zz, xy = 0, xz = -zx; l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l;   // cross(up, z)
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * ex + xy * ey + xz * ez); o[13] = -(yx * ex + yy * ey + yz * ez); o[14] = -(zx * ex + zy * ey + zz * ez); o[15] = 1;
    return o;
  }
  var T1 = new Float32Array(16), T2 = new Float32Array(16), T3 = new Float32Array(16);
  var TA = new Float32Array(16), TB = new Float32Array(16), BASE = new Float32Array(16), M = new Float32Array(16);
  var IDENT = mIdent(new Float32Array(16));
  /* M = base · T(p) · Ry(ry) · Rx(rx) · T(o) · S(s) */
  function compose(base, px, py, pz, ry, rx, ox, oy, oz, sx, sy, sz) {
    mMul(T2, base, mT(T1, px, py, pz));
    if (ry) { mMul(T3, T2, mRy(T1, ry)); } else { T3.set(T2); }
    if (rx) { mMul(T2, T3, mRx(T1, rx)); } else { T2.set(T3); }
    mMul(T3, T2, mT(T1, ox, oy, oz));
    return mMul(M, T3, mS(T1, sx, sy, sz));
  }
  function setBase(x, y, z, yaw) { return mMul(BASE, mT(TA, x, y, z), mRy(TB, yaw)); }

  /* --- shaders: flat lambert + emissive flag + linear fog --- */
  var VS = [
    "attribute vec3 aPos; attribute vec3 aNor; attribute vec4 aCol;",
    "uniform mat4 uVP; uniform mat4 uModel; uniform vec3 uEye; uniform vec3 uL1; uniform vec3 uL2; uniform vec2 uFog;",
    "varying vec3 vCol; varying float vShade; varying float vFog;",
    "void main(){",
    "  vec4 w = uModel * vec4(aPos, 1.0);",
    "  vec3 n = normalize((uModel * vec4(aNor, 0.0)).xyz);",
    "  float d = 0.54 + 0.40 * max(dot(n, uL1), 0.0) + 0.14 * max(dot(n, uL2), 0.0);",
    "  vShade = mix(d, 1.0, aCol.a);",
    "  vCol = aCol.rgb;",
    "  vFog = clamp((distance(w.xyz, uEye) - uFog.x) / (uFog.y - uFog.x), 0.0, 0.8);",
    "  gl_Position = uVP * w;",
    "}"
  ].join("\n");
  var FS = [
    "precision mediump float;",
    "varying vec3 vCol; varying float vShade; varying float vFog;",
    "uniform vec4 uTint; uniform vec3 uFogCol;",
    "void main(){",
    "  vec3 c = mix(vCol * uTint.rgb * vShade, uFogCol, vFog);",
    "  gl_FragColor = vec4(c, uTint.a);",
    "}"
  ].join("\n");
  function shader(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  var L = {};
  ["aPos", "aNor", "aCol"].forEach(function (n) { L[n] = gl.getAttribLocation(prog, n); gl.enableVertexAttribArray(L[n]); });
  ["uVP", "uModel", "uEye", "uL1", "uL2", "uFog", "uTint", "uFogCol"].forEach(function (n) { L[n] = gl.getUniformLocation(prog, n); });

  var FOG = [0.86, 0.85, 0.82];
  gl.uniform3f(L.uL1, 0.37, 0.86, 0.35);
  gl.uniform3f(L.uL2, -0.55, 0.55, -0.63);
  gl.uniform2f(L.uFog, 16, 46);
  gl.uniform3fv(L.uFogCol, FOG);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(FOG[0], FOG[1], FOG[2], 1);

  function makeBuf(arr) {
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
    return { buf: b, count: arr.length / 10 };
  }
  var bound = null;
  function bind(b) {
    if (bound === b) return; bound = b;
    gl.bindBuffer(gl.ARRAY_BUFFER, b.buf);
    gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.vertexAttribPointer(L.aNor, 3, gl.FLOAT, false, 40, 12);
    gl.vertexAttribPointer(L.aCol, 4, gl.FLOAT, false, 40, 24);
  }
  var TINT = new Float32Array(4);
  function draw(b, model, r, g, bl, a) {
    bind(b);
    TINT[0] = r; TINT[1] = g; TINT[2] = bl; TINT[3] = a;
    gl.uniformMatrix4fv(L.uModel, false, model);
    gl.uniform4fv(L.uTint, TINT);
    gl.drawArrays(gl.TRIANGLES, 0, b.count);
  }
  function drawCol(b, model, c, a) { draw(b, model, c[0], c[1], c[2], a == null ? 1 : a); }

  /* --- geometry --- */
  function vtx(arr, x, y, z, nx, ny, nz, c, e) { arr.push(x, y, z, nx, ny, nz, c[0], c[1], c[2], e); }
  function quad(arr, a, b, c, d, n, col, e) {
    vtx(arr, a[0], a[1], a[2], n[0], n[1], n[2], col, e); vtx(arr, b[0], b[1], b[2], n[0], n[1], n[2], col, e); vtx(arr, c[0], c[1], c[2], n[0], n[1], n[2], col, e);
    vtx(arr, a[0], a[1], a[2], n[0], n[1], n[2], col, e); vtx(arr, c[0], c[1], c[2], n[0], n[1], n[2], col, e); vtx(arr, d[0], d[1], d[2], n[0], n[1], n[2], col, e);
  }
  function box(arr, x0, y0, z0, x1, y1, z1, col, emissive) {
    var e = emissive ? 1 : 0;
    quad(arr, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0], col, e);
    quad(arr, [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0], col, e);
    quad(arr, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], col, e);
    if (y0 > 0.001) quad(arr, [x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0], col, e);
    quad(arr, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, e);
    quad(arr, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, e);
  }
  function torus(R, r, ns, nr) {
    var a = [], DOUGH = [0.86, 0.60, 0.34], ICING = [0.95, 0.44, 0.58];
    function p(u, v) {
      var cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
      return [(R + r * cv) * cu, r * sv, (R + r * cv) * su, cv * cu, sv, cv * su];
    }
    for (var i = 0; i < ns; i++) for (var j = 0; j < nr; j++) {
      var u0 = i / ns * Math.PI * 2, u1 = (i + 1) / ns * Math.PI * 2, v0 = j / nr * Math.PI * 2, v1 = (j + 1) / nr * Math.PI * 2;
      var q = [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)];
      var col = (Math.sin((v0 + v1) / 2) > -0.1) ? ICING : DOUGH;
      [0, 1, 2, 0, 2, 3].forEach(function (k) { var w = q[k]; a.push(w[0], w[1], w[2], w[3], w[4], w[5], col[0], col[1], col[2], 0); });
    }
    return a;
  }
  var WHITE = [1, 1, 1];
  var CUBE = (function () { var a = []; box(a, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, WHITE, false); return makeBuf(a); })();
  var DONUT = makeBuf(torus(0.3, 0.13, 22, 10));
  var GLOW = (function () { var a = []; box(a, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, WHITE, true); return makeBuf(a); })();
  var HATCH = (function () {   // 1.2 m square with 45° hatch lines, like an ANSI31 pattern
    var a = [], h = 0.6, w = 0.035, y = 0.025, RED = [0.84, 0.17, 0.12], DK = [0.25, 0.08, 0.06];
    box(a, -h, 0.012, -h, h, 0.018, h, [0.93, 0.86, 0.84], false);
    box(a, -h, 0.012, -h, h, 0.03, -h + 0.04, DK, false); box(a, -h, 0.012, h - 0.04, h, 0.03, h, DK, false);
    box(a, -h, 0.012, -h, -h + 0.04, 0.03, h, DK, false); box(a, h - 0.04, 0.012, -h, h, 0.03, h, DK, false);
    for (var c = -1.05; c <= 1.05; c += 0.2) {          // lines x + z = c, clipped to the square
      var x0 = Math.max(-h, c - h), x1 = Math.min(h, c + h);
      if (x1 - x0 < 0.05) continue;
      var p0 = [x0, c - x0], p1 = [x1, c - x1], dx = p1[0] - p0[0], dz = p1[1] - p0[1], l = Math.hypot(dx, dz), nx = -dz / l * w, nz = dx / l * w;
      quad(a, [p0[0] - nx, y, p0[1] - nz], [p0[0] + nx, y, p0[1] + nz], [p1[0] + nx, y, p1[1] + nz], [p1[0] - nx, y, p1[1] - nz], [0, 1, 0], RED, 0);
    }
    return makeBuf(a);
  })();

  /* ================================================================
     3. SCENE (static geometry merged into one draw call)
     ================================================================ */
  var WALL_H = 3;
  var BOUNDS = { x0: -14, z0: -10, x1: 14, z1: 10 };
  var V = [], G = [], SOLIDS = [], SEGS = [], FURN = [], CHAIRS = {};
  var C = {
    wall: [0.93, 0.92, 0.89], frame: [0.24, 0.24, 0.26], desk: [0.88, 0.86, 0.82], leg: [0.30, 0.30, 0.32],
    chair: [0.20, 0.20, 0.22], mine: [1.0, 0.35, 0.12], divider: [0.47, 0.52, 0.57], dark: [0.12, 0.12, 0.13],
    screen: [0.07, 0.09, 0.13], off: [0.10, 0.10, 0.11], cyan: [0.36, 0.80, 0.85], orange: [1.0, 0.45, 0.2],
    sofa: [0.33, 0.37, 0.46], white: [0.96, 0.96, 0.94], plantA: [0.26, 0.55, 0.30], plantB: [0.19, 0.45, 0.25],
    pot: [0.84, 0.83, 0.79], sky: [0.80, 0.89, 0.96], glass: [0.70, 0.84, 0.92], outline: [0.30, 0.30, 0.32],
    red: [0.84, 0.17, 0.12], blue: [0.11, 0.31, 0.63], yellow: [0.95, 0.72, 0.0]
  };
  function B(x0, y0, z0, x1, y1, z1, col, e) { box(V, x0, y0, z0, x1, y1, z1, col, e); }
  function solid(x0, z0, x1, z1, h, kind) { SOLIDS.push({ x0: x0, z0: z0, x1: x1, z1: z1, h: h }); if (kind === "f") FURN.push([x0, z0, x1, z1]); }

  /* floor: 1 m tiles, colored by room */
  function inR(x, z, x0, z0, x1, z1) { return x >= x0 && x < x1 && z >= z0 && z < z1; }
  function floorCol(x, z, ix, iz) {
    var chk = (ix + iz) % 2 ? 0.018 : -0.012;
    if (inR(x, z, -14, -10, -5, -2)) return [0.55 + chk, 0.60 + chk, 0.68 + chk];
    if (inR(x, z, -14, 4, -7, 10)) return chk > 0 ? [0.90, 0.89, 0.86] : [0.80, 0.79, 0.76];
    if (inR(x, z, 9, -10, 14, -5)) return [0.62 + chk, 0.55 + chk, 0.50 + chk];
    if (inR(x, z, -7, 4, 14, 10)) { var p = (iz % 2) ? 0.03 : 0; return [0.74 + p, 0.62 + p, 0.48 + p]; }
    return [0.60 + chk, 0.61 + chk, 0.60 + chk];
  }
  for (var fx = -14; fx < 14; fx++) for (var fz = -10; fz < 10; fz++) {
    var fc = floorCol(fx + 0.5, fz + 0.5, fx + 14, fz + 10);
    quad(V, [fx, 0, fz], [fx, 0, fz + 1], [fx + 1, 0, fz + 1], [fx + 1, 0, fz], [0, 1, 0], fc, 0);
  }

  /* walls */
  function wall(x0, z0, x1, z1, col) { B(x0, 0, z0, x1, WALL_H, z1, col || C.wall); solid(x0, z0, x1, z1, WALL_H); SEGS.push([x0, z0, x1, z1, "wall"]); }
  function wx(xa, xb, z, col) { wall(xa, z - 0.1, xb, z + 0.1, col); }
  function wz(za, zb, x, col) { wall(x - 0.1, za, x + 0.1, zb, col); }
  function glassX(xa, xb, z) {
    B(xa, 0, z - 0.05, xb, 0.08, z + 0.05, C.frame); B(xa, 2.7, z - 0.08, xb, WALL_H, z + 0.08, C.wall);
    for (var x = xa; x <= xb + 0.01; x += Math.max(0.5, (xb - xa) / Math.ceil((xb - xa) / 1.6))) B(x - 0.03, 0, z - 0.04, x + 0.03, 2.7, z + 0.04, C.frame);
    box(G, xa, 0.08, z - 0.015, xb, 2.7, z + 0.015, C.glass, false);
    solid(xa, z - 0.08, xb, z + 0.08, WALL_H); SEGS.push([xa, z - 0.05, xb, z + 0.05, "glass"]);
  }
  function glassZ(za, zb, x) {
    B(x - 0.05, 0, za, x + 0.05, 0.08, zb, C.frame); B(x - 0.08, 2.7, za, x + 0.08, WALL_H, zb, C.wall);
    for (var z = za; z <= zb + 0.01; z += Math.max(0.5, (zb - za) / Math.ceil((zb - za) / 1.6))) B(x - 0.04, 0, z - 0.03, x + 0.04, 2.7, z + 0.03, C.frame);
    box(G, x - 0.015, 0.08, za, x + 0.015, 2.7, zb, C.glass, false);
    solid(x - 0.08, za, x + 0.08, zb, WALL_H); SEGS.push([x - 0.05, za, x + 0.05, zb, "glass"]);
  }

  // outer shell: north wall has a window band over the production area
  wx(-14.1, -4.6, -10); wx(8.6, 14.1, -10);
  B(-4.6, 0, -10.1, 8.6, 0.9, -9.9, C.wall); B(-4.6, 2.5, -10.1, 8.6, WALL_H, -9.9, C.wall);
  B(-4.6, 0.9, -10.1, 8.6, 2.5, -10.02, C.sky, true);
  for (var mx = -4.6; mx <= 8.61; mx += 2.2) B(mx - 0.05, 0.9, -10.05, mx + 0.05, 2.5, -9.95, C.frame);
  B(-4.6, 0.86, -9.95, 8.6, 0.92, -9.8, C.white);
  solid(-4.6, -10.1, 8.6, -9.9, WALL_H); SEGS.push([-4.6, -10.1, 8.6, -9.9, "window"]);
  wx(-14.1, 14.1, 10); wz(-10.1, 10.1, -14); wz(-10.1, 10.1, 14);
  B(-0.8, 0, 9.88, 0.8, 2.2, 9.9, [0.30, 0.30, 0.32]);           // entry door
  B(0.45, 1.0, 9.84, 0.6, 1.08, 9.88, [0.7, 0.7, 0.7]);

  // conference room (glass, door gap on the south side)
  glassZ(-9.9, -2.1, -5);
  glassX(-13.9, -8.0, -2); glassX(-6.4, -5.0, -2);
  B(-13.9, 0, -8.2, -13.88, WALL_H, -3.8, C.blue);                // accent wall behind the screen
  // pantry
  wx(-13.9, -10.6, 4); wx(-9.0, -6.9, 4); wz(4, 9.9, -7);
  B(-13.9, 0, 9.88, -7.1, WALL_H, 9.9, C.yellow);
  // focus room
  glassZ(-9.9, -5.1, 9);
  wx(9, 10.8, -5); wx(12.4, 13.9, -5);
  B(13.88, 0, -9.9, 13.9, WALL_H, -5.1, C.red);
  // print corner half wall
  B(9, 0, 4.95, 11.2, 1.2, 5.05, C.wall); solid(9, 4.95, 11.2, 5.05, 1.2, "f");
  // column
  B(-4.75, 0, -2.25, -4.25, WALL_H, -1.75, C.wall); solid(-4.75, -2.25, -4.25, -1.75, WALL_H); SEGS.push([-4.75, -2.25, -4.25, -1.75, "wall"]);

  /* furniture */
  function chair(id, x, z, yaw, col) {
    col = col || C.chair;
    var fwdx = Math.round(Math.sin(yaw)), fwdz = Math.round(Math.cos(yaw));
    B(x - 0.24, 0.42, z - 0.24, x + 0.24, 0.5, z + 0.24, col);
    var bx = x - fwdx * 0.23, bz = z - fwdz * 0.23;
    if (fwdz !== 0) B(bx - 0.23, 0.5, bz - 0.03, bx + 0.23, 1.0, bz + 0.03, col);
    else B(bx - 0.03, 0.5, bz - 0.23, bx + 0.03, 1.0, bz + 0.23, col);
    B(x - 0.03, 0.08, z - 0.03, x + 0.03, 0.42, z + 0.03, C.leg);
    B(x - 0.26, 0.02, z - 0.03, x + 0.26, 0.07, z + 0.03, C.leg); B(x - 0.03, 0.02, z - 0.26, x + 0.03, 0.07, z + 0.26, C.leg);
    solid(x - 0.27, z - 0.27, x + 0.27, z + 0.27, 1.0, "f");
    if (id) CHAIRS[id] = { x: x, z: z, yaw: yaw };
  }
  function monitor(mx, mz, sign, on) {
    B(mx - 0.03, 0.76, mz - 0.03, mx + 0.03, 0.9, mz + 0.03, C.dark);
    B(mx - 0.12, 0.76, mz - 0.08, mx + 0.12, 0.775, mz + 0.08, C.dark);
    B(mx - 0.3, 0.88, mz - 0.02, mx + 0.3, 1.24, mz + 0.02, C.dark);
    var f0 = mz + sign * 0.021, f1 = mz + sign * 0.025, a = Math.min(f0, f1), b = Math.max(f0, f1);
    B(mx - 0.28, 0.9, a, mx + 0.28, 1.22, b, on ? C.screen : C.off, on);
    if (!on) return;
    var l0 = mz + sign * 0.026, l1 = mz + sign * 0.03, la = Math.min(l0, l1), lb = Math.max(l0, l1), w = 0.008;
    B(mx - 0.2, 0.98, la, mx + 0.2, 0.98 + w, lb, C.cyan, true);
    B(mx - 0.2, 1.14, la, mx + 0.2, 1.14 + w, lb, C.cyan, true);
    B(mx - 0.2, 0.98, la, mx - 0.2 + w, 1.148, lb, C.cyan, true);
    B(mx + 0.192, 0.98, la, mx + 0.2, 1.148, lb, C.cyan, true);
    B(mx + 0.04, 0.98, la, mx + 0.048, 1.148, lb, C.orange, true);
    B(mx - 0.2, 1.06, la, mx + 0.04, 1.068, lb, C.white, true);
  }
  function desk(cx, cz, sign, on, mine) {
    B(cx - 0.8, 0.72, cz - 0.4, cx + 0.8, 0.76, cz + 0.4, C.desk);
    B(cx - 0.8, 0, cz - 0.38, cx - 0.76, 0.72, cz + 0.38, C.leg); B(cx + 0.76, 0, cz - 0.38, cx + 0.8, 0.72, cz + 0.38, C.leg);
    var mz = cz - sign * 0.2;
    monitor(cx - 0.34, mz, sign, on); monitor(cx + 0.34, mz, sign, on);
    var kz = cz + sign * 0.17;
    B(cx - 0.22, 0.76, kz - 0.07, cx + 0.22, 0.78, kz + 0.07, [0.25, 0.25, 0.27]);
    B(cx + 0.3, 0.76, kz - 0.04, cx + 0.36, 0.785, kz + 0.04, [0.25, 0.25, 0.27]);
    if (mine) B(cx + 0.55, 0.76, kz - 0.05, cx + 0.63, 0.87, kz + 0.03, C.mine);
  }
  function pod(id, cx, cz, on, mineSeat) {
    B(cx - 2.4, 0.76, cz - 0.02, cx + 2.4, 1.22, cz + 0.02, C.divider);
    solid(cx - 2.42, cz - 0.82, cx + 2.42, cz + 0.82, 1.22, "f");
    for (var i = 0; i < 3; i++) {
      var dx = cx + (i - 1) * 1.6;
      desk(dx, cz - 0.4, -1, on, false);
      desk(dx, cz + 0.4, 1, on, mineSeat === "s" + i);
      chair(id + "n" + i, dx, cz - 1.35, 0);
      chair(id + "s" + i, dx, cz + 1.35, Math.PI, mineSeat === "s" + i ? C.mine : null);
    }
  }
  function plant(x, z) {
    B(x - 0.25, 0, z - 0.25, x + 0.25, 0.45, z + 0.25, C.pot);
    B(x - 0.3, 0.45, z - 0.3, x + 0.3, 0.9, z + 0.3, C.plantA);
    B(x - 0.22, 0.9, z - 0.22, x + 0.22, 1.25, z + 0.22, C.plantB);
    B(x - 0.12, 1.25, z - 0.12, x + 0.12, 1.45, z + 0.12, C.plantA);
    solid(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 1.45, "f");
  }

  pod("A", 2, -5.8, true, "s1");
  pod("B", 2, 1.0, false, null);

  // conference
  B(-11.5, 0.72, -6.8, -7.1, 0.78, -5.2, [0.92, 0.91, 0.88]);
  B(-10.9, 0, -6.2, -10.4, 0.72, -5.8, C.leg); B(-8.2, 0, -6.2, -7.7, 0.72, -5.8, C.leg);
  solid(-11.5, -6.8, -7.1, -5.2, 0.78, "f");
  [-10.6, -9.3, -8.0].forEach(function (x, i) { chair("cn" + i, x, -7.35, 0); chair("cs" + i, x, -4.65, Math.PI); });
  chair("head", -12.1, -6, Math.PI / 2);
  chair(null, -6.5, -6, -Math.PI / 2);
  B(-11.4, 0.78, -6.25, -11.0, 0.795, -5.75, C.dark);              // laptop
  B(-13.9, 1.0, -7.1, -13.84, 2.0, -4.9, C.dark);                  // screen
  B(-13.84, 1.05, -7.0, -13.82, 1.95, -5.0, C.white, true);
  B(-13.82, 1.55, -6.8, -13.81, 1.8, -6.4, C.red, true);
  B(-13.82, 1.55, -6.2, -13.81, 1.8, -5.8, C.blue, true);
  B(-13.82, 1.55, -5.6, -13.81, 1.8, -5.2, C.yellow, true);
  B(-13.82, 1.2, -6.8, -13.81, 1.24, -5.2, C.dark, true);
  B(-12.6, 1.0, -9.9, -9.4, 2.0, -9.86, C.white);                   // whiteboard
  B(-12.3, 1.5, -9.86, -10.6, 1.52, -9.85, C.blue); B(-12.3, 1.7, -9.86, -11.2, 1.72, -9.85, C.red);
  plant(-13.3, -2.6);

  // pantry
  B(-13.9, 0, 5.2, -13.3, 0.9, 9.6, [0.75, 0.73, 0.70]); B(-13.92, 0.9, 5.18, -13.26, 0.95, 9.62, C.white);
  solid(-13.92, 5.18, -13.26, 9.62, 0.95, "f");
  B(-13.9, 1.6, 5.2, -13.6, 2.3, 9.6, C.yellow);
  B(-13.9, 0, 4.2, -13.15, 1.9, 5.05, [0.88, 0.89, 0.90]); solid(-13.9, 4.2, -13.15, 5.05, 1.9, "f");
  B(-13.85, 0.95, 6.0, -13.45, 1.35, 6.4, C.dark); B(-13.46, 1.25, 6.15, -13.44, 1.28, 6.25, C.red, true);
  B(-11.0, 0.72, 6.85, -9.6, 0.76, 7.75, C.desk); B(-10.4, 0, 7.2, -10.2, 0.72, 7.4, C.leg);
  solid(-11.0, 6.85, -9.6, 7.75, 0.76, "f");
  chair(null, -10.7, 6.35, 0); chair(null, -9.9, 6.35, 0); chair(null, -10.7, 8.25, Math.PI); chair(null, -9.9, 8.25, Math.PI);

  // focus room
  B(13.2, 0, -9.2, 13.9, 0.45, -6.6, C.sofa); B(13.7, 0.45, -9.2, 13.9, 0.95, -6.6, C.sofa);
  B(13.2, 0.45, -9.2, 13.7, 0.65, -9.0, C.sofa); B(13.2, 0.45, -6.8, 13.7, 0.65, -6.6, C.sofa);
  solid(13.2, -9.2, 13.9, -6.6, 0.95, "f");
  B(11.0, 0, -7.85, 12.0, 0.42, -7.15, C.desk); solid(11.0, -7.85, 12.0, -7.15, 0.42, "f");
  B(9.75, 0, -9.35, 10.45, 0.45, -8.65, C.sofa); B(9.75, 0.45, -9.35, 9.95, 0.95, -8.65, C.sofa);
  solid(9.75, -9.35, 10.45, -8.65, 0.95, "f");

  // print corner
  B(12.2, 0, 8.85, 13.2, 1.0, 9.6, [0.86, 0.86, 0.84]); B(12.3, 1.0, 8.95, 13.1, 1.06, 9.5, [0.30, 0.30, 0.32]);
  B(12.35, 0.85, 8.83, 12.6, 0.95, 8.85, C.cyan, true);
  solid(12.2, 8.85, 13.2, 9.6, 1.06, "f");
  B(13.5, 0, 5.6, 13.9, 1.8, 7.6, [0.62, 0.52, 0.42]);
  [0.4, 0.95, 1.5].forEach(function (y) { B(13.55, y, 5.8, 13.85, y + 0.25, 6.5, C.white); B(13.55, y, 6.7, 13.85, y + 0.22, 7.4, C.blue); });
  solid(13.5, 5.6, 13.9, 7.6, 1.8, "f");
  plant(9.6, 9.4);

  // reception
  B(5.2, 0, 8.3, 8.4, 1.05, 8.9, C.white); B(5.2, 0.3, 8.28, 8.4, 0.42, 8.3, C.blue);
  solid(5.2, 8.3, 8.4, 8.9, 1.05, "f");
  B(-5.6, 0, 9.2, -3.4, 0.45, 9.9, C.sofa); B(-5.6, 0.45, 9.7, -3.4, 0.95, 9.9, C.sofa);
  solid(-5.6, 9.2, -3.4, 9.9, 0.95, "f");
  B(-1.2, 0, 5.9, 3.2, 0.01, 8.6, [0.34, 0.40, 0.52]);
  plant(-4.4, -9.3); plant(8.3, -9.3); plant(-6.4, 3.4); plant(13.3, 4.3); plant(8.6, 9.4);

  // room outlines (the closed "polylines")
  ZONES.forEach(function (z) {
    var i = 0.3, w = 0.06, h = 0.02, x0 = z.x0 + i, x1 = z.x1 - i, z0 = z.z0 + i, z1 = z.z1 - i;
    B(x0, 0, z0, x1, h, z0 + w, C.outline); B(x0, 0, z1 - w, x1, h, z1, C.outline);
    B(x0, 0, z0, x0 + w, h, z1, C.outline); B(x1 - w, 0, z0, x1, h, z1, C.outline);
    z.cx = (z.x0 + z.x1) / 2; z.cz = (z.z0 + z.z1) / 2; z.found = false; z.fillT = 0;
  });

  var STATIC = makeBuf(V), GLASS = makeBuf(G);
  V = null; G = null;

  /* people → seats */
  PEOPLE.forEach(function (p, i) {
    var s = CHAIRS[p.seat]; p.x = s.x; p.z = s.z; p.yaw = s.yaw; p.ph = i * 1.7;
    p.headYaw = 0; p.headPitch = 0;
  });
  var MYSEAT = CHAIRS[ME.seat];

  /* ================================================================
     4. GAME STATE + UPDATE
     ================================================================ */
  var SPAWN = { x: -2.2, z: 7.3, yaw: Math.PI * 0.92 };
  var P = { x: SPAWN.x, y: 0, z: SPAWN.z, vy: 0, bodyYaw: SPAWN.yaw, walk: 0, moving: 0, seated: false, headYaw: 0, headPitch: 0, ph: 0 };
  var cam = { yaw: SPAWN.yaw, pitch: 0.32, first: false, dist: 4.4 };
  var keys = {};
  var stick = { x: 0, y: 0 };
  var mode = "donut";
  var state = { manual: 0, byCmd: 0, hdelRun: false, playing: false, paused: false, done: false, t0: 0, elapsed: 0, found: 0, mapOn: true, locked: false, wantLock: false };
  var bubble = { who: null, text: "", until: 0 };
  var R = 0.3;

  function wrap(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
  function lerpAng(a, b, t) { return a + wrap(b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function move(dx, dz) {
    var x = P.x + dx, i, s;
    for (i = 0; i < SOLIDS.length; i++) { s = SOLIDS[i];
      if (x + R > s.x0 && x - R < s.x1 && P.z + R > s.z0 && P.z - R < s.z1) x = dx > 0 ? s.x0 - R - 0.001 : s.x1 + R + 0.001; }
    P.x = clamp(x, BOUNDS.x0 + R, BOUNDS.x1 - R);
    var z = P.z + dz;
    for (i = 0; i < SOLIDS.length; i++) { s = SOLIDS[i];
      if (P.x + R > s.x0 && P.x - R < s.x1 && z + R > s.z0 && z - R < s.z1) z = dz > 0 ? s.z0 - R - 0.001 : s.z1 + R + 0.001; }
    P.z = clamp(z, BOUNDS.z0 + R, BOUNDS.z1 - R);
  }
  function blocksCamera(x, z) {
    if (x < BOUNDS.x0 + 0.15 || x > BOUNDS.x1 - 0.15 || z < BOUNDS.z0 + 0.15 || z > BOUNDS.z1 - 0.15) return true;
    for (var i = 0; i < SOLIDS.length; i++) { var s = SOLIDS[i];
      if (s.h >= 1.8 && x > s.x0 - 0.12 && x < s.x1 + 0.12 && z > s.z0 - 0.12 && z < s.z1 + 0.12) return true; }
    return false;
  }

  function nearest(list, r) {
    var best = null, bd = r;
    list.forEach(function (o) { if (o.done) return; var d = Math.hypot(P.x - o.x, P.z - o.z); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  function interactTarget() {
    if (P.seated) return { kind: "stand", label: "Stand up" };
    if (state.playing && !state.done) {
      if (mode === "gap") { var g = nearest(GAPS, 1.7); if (g) return { kind: "gap", obj: g, label: "Run GAPCHECK" }; }
      if (mode === "hatch" && !state.hdelRun) { var h = nearest(HATCHES, 1.4); if (h) return { kind: "hatch", obj: h, label: "Delete this hatch" }; }
    }
    var best = null, bd = 1e9;
    PEOPLE.forEach(function (p) {
      var d = Math.hypot(P.x - p.x, P.z - p.z);
      if (d < 1.9 && d < bd) { bd = d; best = { kind: "talk", who: p, label: "Talk" }; }
    });
    var dm = Math.hypot(P.x - MYSEAT.x, P.z - MYSEAT.z);
    if (dm < 1.4 && dm < bd) best = { kind: "sit", label: "Sit at your desk" };
    return best;
  }
  function interact() {
    var t = interactTarget();
    if (!t) { if (!$("card").hidden) hideCard(); return; }
    var now = performance.now() / 1000;
    if (t.kind === "gap") { t.obj.done = true; t.obj.t = 0.0001; progress(); return; }
    if (t.kind === "hatch") { t.obj.done = true; t.obj.byHand = true; t.obj.t = 0.0001; state.manual++; progress(); return; }
    if (t.kind === "talk") {
      var pool = LINES[t.who.role] || LINES.coordinator;
      bubble.who = t.who; bubble.text = pool[Math.floor(Math.random() * pool.length)]; bubble.until = now + 3.6;
      $("live").textContent = bubble.text;
    } else if (t.kind === "sit") {
      P.seated = true; P.x = MYSEAT.x; P.z = MYSEAT.z; P.bodyYaw = MYSEAT.yaw; P.y = 0; P.vy = 0;
      if (cam.first) cam.yaw = MYSEAT.yaw;
    } else if (t.kind === "stand") standUp();
  }
  function standUp() {
    P.seated = false;
    var fx = Math.sin(MYSEAT.yaw), fz = Math.cos(MYSEAT.yaw);
    P.x = MYSEAT.x - fx * 0.62; P.z = MYSEAT.z - fz * 0.62;
  }

  function list() { return mode === "gap" ? GAPS : mode === "hatch" ? HATCHES : ZONES; }
  function collect(z) {
    z.found = true; z.fillT = 0.0001; state.found++;
    $("found").textContent = String(state.found);
    showCard(z.tool, "Found in: " + z.label + " · " + state.found + " / " + ZONES.length);
    if (state.found === ZONES.length) finish();
  }
  function progress() {
    var L2 = list(), n = L2.filter(function (o) { return o.done; }).length;
    state.found = n; $("found").textContent = String(n);
    if (mode === "hatch") {
      var left = L2.length - n;
      $("hint").hidden = !(state.manual >= HDEL_UNLOCK && left > 0 && !state.hdelRun);
      if (isTouch) $("t-h").hidden = $("hint").hidden;
      if (state.manual === HDEL_UNLOCK && left > 0) $("live").textContent = "HDEL unlocked. Press H to clear the remaining hatches in one command.";
    }
    if (n === L2.length && !state.done) {
      if (mode === "gap") showCard("gapcheck", "All " + L2.length + " gaps sealed");
      finish();
    }
  }
  function runHDEL() {
    if (mode !== "hatch" || state.hdelRun || state.manual < HDEL_UNLOCK || state.done) return;
    state.hdelRun = true; $("hint").hidden = true; if (isTouch) $("t-h").hidden = true;
    var left = HATCHES.filter(function (h) { return !h.done; });
    state.byCmd = left.length;
    left.forEach(function (h) { h.done = true; h.t = 0.0001; h.delay = reduce ? 0 : Math.hypot(h.x - P.x, h.z - P.z) * 0.04; });
    showCard("hdel", "HDEL cleared " + left.length + " hatches in one command");
    progress();
  }

  var lastSec = -1;
  function update(dt, now) {
    var t = now / 1000;
    if (state.playing && !state.paused) {
      var f = 0, r = 0;
      if (keys.KeyW || keys.ArrowUp) f += 1;
      if (keys.KeyS || keys.ArrowDown) f -= 1;
      if (keys.KeyD || keys.ArrowRight) r += 1;
      if (keys.KeyA || keys.ArrowLeft) r -= 1;
      f += -stick.y; r += stick.x;
      var len = Math.hypot(f, r);
      if (len > 1) { f /= len; r /= len; len = 1; }
      if (P.seated && len > 0.2) standUp();
      if (!P.seated) {
        var speed = (keys.ShiftLeft || keys.ShiftRight) ? 5.4 : 3.2;
        var sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
        var dx = (sy * f - cy * r) * speed * dt, dz = (cy * f + sy * r) * speed * dt;
        var steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
        for (var k = 0; k < steps; k++) move(dx / steps, dz / steps);
        P.moving = len > 0.05 ? Math.min(1, len) : 0;
        if (P.moving) {
          P.walk += dt * speed * 2.4;
          P.bodyYaw = cam.first ? cam.yaw : lerpAng(P.bodyYaw, Math.atan2(dx, dz), Math.min(1, dt * 12));
        } else if (cam.first) P.bodyYaw = cam.yaw;
        if (keys.Space && P.y <= 0.0001) { P.vy = 5.2; }
        P.vy -= 16 * dt; P.y += P.vy * dt;
        if (P.y < 0) { P.y = 0; P.vy = 0; }
      }
      // donuts
      for (var i = 0; mode === "donut" && i < ZONES.length; i++) {
        var z = ZONES[i];
        if (!z.found && Math.hypot(P.x - z.cx, P.z - z.cz) < 2.2) collect(z);
      }
      if (!state.done) {
        state.elapsed = (now - state.t0) / 1000;
        var sec = Math.floor(state.elapsed);
        if (sec !== lastSec) { lastSec = sec; $("timer").textContent = fmt(state.elapsed); }
      }
      // prompt
      var tgt = interactTarget();
      var pr = $("prompt");
      var txt = tgt ? (isTouch ? "Tap E · " : "E · ") + tgt.label : "";
      if (pr.textContent !== txt) { pr.textContent = txt; pr.hidden = !txt; }
    }
    // fills + clear animations
    GAPS.concat(HATCHES).forEach(function (o) {
      if (!o.done || o.t >= 1) return;
      if (o.delay > 0) { o.delay -= dt; return; }
      o.t = reduce ? 1 : Math.min(1, o.t + dt / 0.35);
    });
    ZONES.forEach(function (z) { if (z.found && z.fillT < 1) z.fillT = reduce ? 1 : Math.min(1, z.fillT + dt / 0.6); });
    // people: idle look + look at the player when near
    PEOPLE.forEach(function (p) {
      var target = 0.32 * Math.sin(t * 0.5 + p.ph) * Math.max(0, Math.sin(t * 0.17 + p.ph * 2));
      var d = Math.hypot(P.x - p.x, P.z - p.z);
      if (d < 3.2 && state.playing) {
        var rel = wrap(Math.atan2(P.x - p.x, P.z - p.z) - p.yaw);
        if (Math.abs(rel) < 1.9) target = clamp(rel, -1.0, 1.0);
      }
      p.headYaw += (target - p.headYaw) * Math.min(1, dt * 4);
      p.headPitch = (p.role === "manager" && !reduce) ? 0.1 * Math.max(0, Math.sin(t * 1.6 + p.ph)) : 0;
    });
    if (bubble.who && t > bubble.until) { bubble.who = null; $("bubble").hidden = true; }
  }
  function fmt(s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60); s = s % 60; return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }

  /* ================================================================
     RENDER
     ================================================================ */
  var VP = new Float32Array(16), PROJ = new Float32Array(16), VIEW = new Float32Array(16);
  var scale = Math.min(window.devicePixelRatio || 1, 1.5), maxScale = scale, perf = { acc: 0, n: 0, good: 0 };
  var eye = [0, 0, 0];

  function resize() {
    var w = Math.max(1, Math.round(canvas.clientWidth * scale)), h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function adapt(dt) {
    perf.acc += dt; perf.n++;
    if (perf.acc < 1) return;
    var avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
    if (avg > 1 / 38 && scale > 0.6) { scale = Math.max(0.6, scale - 0.15); perf.good = 0; }
    else if (avg < 1 / 57) { if (++perf.good >= 3 && scale < maxScale) { scale = Math.min(maxScale, scale + 0.1); perf.good = 0; } }
    else perf.good = 0;
  }

  var camSmooth = { x: 0, y: 0, z: 0, init: false, near: false };
  function camera() {
    var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    var fx = Math.sin(cam.yaw) * cp, fy = -sp, fz = Math.cos(cam.yaw) * cp;
    var tx = P.x, tz = P.z, ty = P.seated ? 1.3 : P.y + 1.55;
    if (cam.first) {
      eye[0] = tx; eye[1] = P.seated ? 1.32 : P.y + 1.62; eye[2] = tz;
      mLook(VIEW, eye[0], eye[1], eye[2], eye[0] + fx, eye[1] + fy, eye[2] + fz);
      return;
    }
    // If a wall is behind you, tilt the camera up (no ceiling) until it has room.
    var best = null;
    for (var p = cam.pitch; p <= 1.36; p += 0.15) {
      var c2 = Math.cos(p), s2 = Math.sin(p);
      var dx = -Math.sin(cam.yaw) * c2 * cam.dist, dy = s2 * cam.dist, dz = -Math.cos(cam.yaw) * c2 * cam.dist, k = 1, N = 18;
      for (var i = 1; i <= N; i++) {
        var s = i / N, px = tx + dx * s, py = ty + dy * s, pz = tz + dz * s;
        if (py < WALL_H + 0.1 && blocksCamera(px, pz)) { k = Math.max(0.08, (i - 1) / N); break; }
      }
      if (!best || k > best.k + 0.01) best = { k: k, dx: dx, dy: dy, dz: dz };
      if (k >= 0.7) break;
    }
    var gx = tx + best.dx * best.k, gy = Math.max(0.3, ty + best.dy * best.k), gz = tz + best.dz * best.k;
    if (camSmooth.init && !reduce) {
      var a = 0.25;
      gx = camSmooth.x + (gx - camSmooth.x) * a; gy = camSmooth.y + (gy - camSmooth.y) * a; gz = camSmooth.z + (gz - camSmooth.z) * a;
      // never let smoothing pull the camera into a wall
      if (gy < WALL_H + 0.1 && blocksCamera(gx, gz)) { gx = tx + best.dx * best.k; gy = Math.max(0.3, ty + best.dy * best.k); gz = tz + best.dz * best.k; }
    }
    camSmooth.x = gx; camSmooth.y = gy; camSmooth.z = gz; camSmooth.init = true;
    eye[0] = gx; eye[1] = gy; eye[2] = gz;
    camSmooth.near = Math.hypot(gx - tx, gy - ty, gz - tz) < 1.0;
    mLook(VIEW, eye[0], eye[1], eye[2], tx, ty, tz);
  }

  /* --- blocky people --- */
  function hair(style, col, hx, hy, hz, ry, rx) {
    if (style === "bald") return;   // completely bald: no hair at all
    drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, 0, 0.37, -0.01, 0.37, 0.1, 0.37), col);
    if (style === "long") {
      drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, 0, 0.12, -0.17, 0.38, 0.5, 0.07), col);
      drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, 0.185, 0.2, -0.03, 0.04, 0.32, 0.3), col);
      drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, -0.185, 0.2, -0.03, 0.04, 0.32, 0.3), col);
    } else {
      drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, 0, 0.27, -0.17, 0.37, 0.16, 0.06), col);
      if (style === "bun") drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, 0, 0.44, -0.14, 0.16, 0.16, 0.16), col);
    }
  }
  var EYE = [0.08, 0.08, 0.09], SHOE = [0.12, 0.12, 0.13], COLLAR = [0.96, 0.96, 0.95];
  function head(p, hx, hy, hz) {
    var ry = p.headYaw || 0, rx = p.headPitch || 0;
    drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, 0, 0.19, 0, 0.34, 0.34, 0.34), p.skin);
    drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, 0.075, 0.2, 0.171, 0.05, 0.06, 0.012), EYE);
    drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, -0.075, 0.2, 0.171, 0.05, 0.06, 0.012), EYE);
    if (p.mustache) {
      drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, 0, 0.115, 0.172, 0.18, 0.04, 0.014), p.hairCol);
      drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, 0.075, 0.095, 0.172, 0.04, 0.04, 0.014), p.hairCol);
      drawCol(CUBE, compose(BASE, hx, hy, hz, ry, rx, -0.075, 0.095, 0.172, 0.04, 0.04, 0.014), p.hairCol);
    }
    hair(p.hair, p.hairCol, hx, hy, hz, ry, rx);
  }
  function seated(p, t, typing) {
    setBase(p.x, 0, p.z, p.yaw);
    drawCol(CUBE, compose(BASE, 0, 0.53, 0.17, 0, 0, 0, 0, 0, 0.42, 0.16, 0.46), p.pants);
    drawCol(CUBE, compose(BASE, 0.11, 0.25, 0.4, 0, 0, 0, 0, 0, 0.15, 0.44, 0.15), p.pants);
    drawCol(CUBE, compose(BASE, -0.11, 0.25, 0.4, 0, 0, 0, 0, 0, 0.15, 0.44, 0.15), p.pants);
    drawCol(CUBE, compose(BASE, 0.11, 0.04, 0.46, 0, 0, 0, 0, 0, 0.16, 0.08, 0.24), SHOE);
    drawCol(CUBE, compose(BASE, -0.11, 0.04, 0.46, 0, 0, 0, 0, 0, 0.16, 0.08, 0.24), SHOE);
    var br = reduce ? 1 : 1 + 0.012 * Math.sin(t * 2 + p.ph);
    drawCol(CUBE, compose(BASE, 0, 0.9, 0, 0, 0, 0, 0, 0, 0.46, 0.62 * br, 0.26), p.shirt);
    if (p.jacket) {
      drawCol(CUBE, compose(BASE, 0, 1.1, 0.131, 0, 0, 0, 0, 0, 0.16, 0.16, 0.012), COLLAR);
      drawCol(CUBE, compose(BASE, 0, 1.0, 0.139, 0, 0, 0, 0, 0, 0.05, 0.22, 0.012), CATS.blocks.rgb);
    }
    var amp = (typing && !reduce) ? 0.05 : 0;
    var aL = 0.62 + amp * Math.sin(t * 14 + p.ph), aR = 0.62 + amp * Math.sin(t * 14 + p.ph + 2.1);
    drawCol(CUBE, compose(BASE, 0.29, 1.13, 0.02, 0, aL, 0, 0, 0.25, 0.13, 0.13, 0.5), p.shirt);
    drawCol(CUBE, compose(BASE, 0.29, 1.13, 0.02, 0, aL, 0, 0, 0.53, 0.11, 0.09, 0.12), p.skin);
    drawCol(CUBE, compose(BASE, -0.29, 1.13, 0.02, 0, aR, 0, 0, 0.25, 0.13, 0.13, 0.5), p.shirt);
    drawCol(CUBE, compose(BASE, -0.29, 1.13, 0.02, 0, aR, 0, 0, 0.53, 0.11, 0.09, 0.12), p.skin);
    head(p, 0, 1.21, 0);
  }
  function standing(p) {
    setBase(p.x, p.y, p.z, p.bodyYaw);
    var air = p.y > 0.01;
    var sw = air ? 0.35 : (reduce ? 0.25 : 0.55) * Math.sin(p.walk) * p.moving;
    drawCol(CUBE, compose(BASE, 0.11, 0.86, 0, 0, sw, 0, -0.43, 0, 0.16, 0.86, 0.2), p.pants);
    drawCol(CUBE, compose(BASE, 0.11, 0.86, 0, 0, sw, 0, -0.82, 0.04, 0.17, 0.08, 0.26), SHOE);
    drawCol(CUBE, compose(BASE, -0.11, 0.86, 0, 0, -sw, 0, -0.43, 0, 0.16, 0.86, 0.2), p.pants);
    drawCol(CUBE, compose(BASE, -0.11, 0.86, 0, 0, -sw, 0, -0.82, 0.04, 0.17, 0.08, 0.26), SHOE);
    drawCol(CUBE, compose(BASE, 0, 1.17, 0, 0, 0, 0, 0, 0, 0.46, 0.62, 0.26), p.shirt);
    var aw = air ? -2.6 : -sw;
    drawCol(CUBE, compose(BASE, 0.3, 1.44, 0, 0, aw, 0, -0.27, 0, 0.13, 0.56, 0.13), p.shirt);
    drawCol(CUBE, compose(BASE, 0.3, 1.44, 0, 0, aw, 0, -0.6, 0, 0.11, 0.11, 0.11), p.skin);
    drawCol(CUBE, compose(BASE, -0.3, 1.44, 0, 0, air ? -2.6 : sw, 0, -0.27, 0, 0.13, 0.56, 0.13), p.shirt);
    drawCol(CUBE, compose(BASE, -0.3, 1.44, 0, 0, air ? -2.6 : sw, 0, -0.6, 0, 0.11, 0.11, 0.11), p.skin);
    head(p, 0, 1.48, 0);
  }

  function project(x, y, z) {
    var cx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12], cy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13], w = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
    if (w <= 0.05) return null;
    return { x: (cx / w * 0.5 + 0.5) * canvas.clientWidth, y: (1 - (cy / w * 0.5 + 0.5)) * canvas.clientHeight };
  }

  var MEP = { x: 0, y: 0, z: 0, yaw: 0, skin: ME.skin, shirt: ME.shirt, pants: ME.pants, hair: ME.hair, hairCol: ME.hairCol, headYaw: 0, headPitch: 0, ph: 0.4 };
  function render(t) {
    resize();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mPersp(PROJ, (cam.first ? 74 : 64) * Math.PI / 180, canvas.clientWidth / Math.max(1, canvas.clientHeight), 0.1, 70);
    camera();
    mMul(VP, PROJ, VIEW);
    gl.uniformMatrix4fv(L.uVP, false, VP);
    gl.uniform3f(L.uEye, eye[0], eye[1], eye[2]);

    draw(STATIC, IDENT, 1, 1, 1, 1);

    // room fills (found rooms tint in their tool's category color)
    ZONES.forEach(function (z) {
      if (!z.found || mode !== "donut") return;
      var c = CATS[TOOLS[z.tool].cat].rgb, k = z.fillT * 0.55, base = [0.62, 0.62, 0.6];
      mMul(M, mT(TA, z.cx, 0.007, z.cz), mS(TB, z.x1 - z.x0 - 0.6, 0.012, z.z1 - z.z0 - 0.6));
      draw(CUBE, M, base[0] + (c[0] - base[0]) * k, base[1] + (c[1] - base[1]) * k, base[2] + (c[2] - base[2]) * k, 1);
    });

    if (mode === "gap") GAPS.forEach(function (g, i) {
      if (!g.done || g.t < 1) {   // open gap: a glowing break in the boundary
        var k = g.done ? 1 - g.t : 1, pul = reduce ? 1 : 0.75 + 0.25 * Math.sin(t * 5 + i);
        mMul(M, mT(TA, g.x, 0.7 * k, g.z), mS(TB, 0.14, 1.4 * k + 0.001, 0.14));
        draw(GLOW, M, 1.0 * pul + 0.1, 0.42 * pul, 0.14, 1);
        mMul(M, mT(TA, g.x, 0.03, g.z), mS(TB, 0.7 * k + 0.001, 0.04, 0.7 * k + 0.001));
        draw(GLOW, M, 1.0, 0.36, 0.12, 1);
      }
      if (g.done) {               // sealed: a cyan line across the old gap
        mMul(M, mT(TA, g.x, 0.03, g.z), mS(TB, 0.8 * g.t + 0.001, 0.04, 0.8 * g.t + 0.001));
        draw(GLOW, M, 0.36, 0.80, 0.85, 1);
      }
    });
    if (mode === "hatch") HATCHES.forEach(function (h) {
      if (h.done && h.t >= 1) return;
      var k = h.done ? 1 - h.t : 1;
      mMul(M, mT(TA, h.x, 0, h.z), mS(TB, k + 0.001, 1, k + 0.001));
      draw(HATCH, M, 1, 1, 1, 1);
    });

    // donuts + floor ring
    ZONES.forEach(function (z, i) {
      if (z.found || mode !== "donut") return;
      var spin = reduce ? 0.6 : t * 1.6 + i, bob = reduce ? 0 : 0.08 * Math.sin(t * 2.2 + i);
      setBase(z.cx, 1.55 + bob, z.cz, spin);
      mMul(M, BASE, mRx(TA, 1.25));
      draw(DONUT, M, 1, 1, 1, 1);
      mMul(M, mT(TA, z.cx, 0.03, z.cz), mS(TB, 1.5, 0.06, 1.5));
      draw(DONUT, M, 1.15, 0.5, 0.25, 1);
    });

    // people
    PEOPLE.forEach(function (p) { seated(p, t, p.role === "coordinator"); });

    // me
    if (!cam.first && !camSmooth.near) {
      MEP.headYaw = 0; MEP.headPitch = 0;
      if (P.seated) { MEP.x = MYSEAT.x; MEP.z = MYSEAT.z; MEP.yaw = MYSEAT.yaw; seated(MEP, t, true); }
      else { MEP.x = P.x; MEP.y = P.y; MEP.z = P.z; MEP.bodyYaw = P.bodyYaw; MEP.walk = P.walk; MEP.moving = P.moving; standing(MEP); }
    }

    // glass last
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    draw(GLASS, IDENT, 1, 1, 1, 0.22);
    gl.depthMask(true); gl.disable(gl.BLEND);

    // speech bubble
    if (bubble.who) {
      var s = project(bubble.who.x, 2.05, bubble.who.z), el = $("bubble");
      if (s) { el.textContent = bubble.text; el.style.transform = "translate(" + Math.round(s.x) + "px," + Math.round(s.y) + "px) translate(-50%,-100%)"; el.hidden = false; }
      else el.hidden = true;
    }
  }

  /* --- minimap --- */
  var map = $("map"), mctx = map.getContext("2d"), mapBase = document.createElement("canvas");
  var MS = map.width / 28.6, MP = 0.3;
  function mx_(x) { return (x + 14 + MP) * MS; } function mz_(z) { return (z + 10 + MP) * MS; }
  (function () {
    mapBase.width = map.width; mapBase.height = map.height;
    var c = mapBase.getContext("2d");
    c.fillStyle = "#F3F2EE"; c.fillRect(0, 0, map.width, map.height);
    c.fillStyle = "#D9D8D3";
    FURN.forEach(function (r) { c.fillRect(mx_(r[0]), mz_(r[1]), (r[2] - r[0]) * MS, (r[3] - r[1]) * MS); });
    c.strokeStyle = "#9A9994"; c.lineWidth = 1; c.setLineDash([3, 2]);
    ZONES.forEach(function (z) { c.strokeRect(mx_(z.x0 + 0.3), mz_(z.z0 + 0.3), (z.x1 - z.x0 - 0.6) * MS, (z.z1 - z.z0 - 0.6) * MS); });
    c.setLineDash([]);
    SEGS.forEach(function (s) {
      c.fillStyle = s[4] === "glass" ? "#6A93DB" : s[4] === "window" ? "#9CC3E0" : "#141414";
      c.fillRect(mx_(s[0]), mz_(s[1]), Math.max(1.5, (s[2] - s[0]) * MS), Math.max(1.5, (s[3] - s[1]) * MS));
    });
  })();
  var mapTick = 0;
  function drawMap() {
    if (!state.mapOn || (mapTick++ % 2)) return;
    mctx.drawImage(mapBase, 0, 0);
    if (mode === "gap") GAPS.forEach(function (g) {
      mctx.fillStyle = g.done ? "#3BB6C4" : "#FF5A1F"; mctx.fillRect(mx_(g.x) - 3, mz_(g.z) - 3, 6, 6);
    });
    if (mode === "hatch") HATCHES.forEach(function (h) {
      if (h.done) return; mctx.strokeStyle = "#D52B1E"; mctx.lineWidth = 2; mctx.strokeRect(mx_(h.x) - 3.5, mz_(h.z) - 3.5, 7, 7);
    });
    if (mode === "donut") ZONES.forEach(function (z) {
      var cat = CATS[TOOLS[z.tool].cat];
      if (z.found) {
        mctx.globalAlpha = 0.3; mctx.fillStyle = cat.hex;
        mctx.fillRect(mx_(z.x0 + 0.3), mz_(z.z0 + 0.3), (z.x1 - z.x0 - 0.6) * MS, (z.z1 - z.z0 - 0.6) * MS);
        mctx.globalAlpha = 1;
      }
      mctx.beginPath(); mctx.arc(mx_(z.cx), mz_(z.cz), 3.2, 0, Math.PI * 2);
      if (z.found) { mctx.fillStyle = "#141414"; mctx.fill(); }
      else { mctx.strokeStyle = "#FF5A1F"; mctx.lineWidth = 2; mctx.stroke(); }
    });
    mctx.fillStyle = "#6E6E6A";
    PEOPLE.forEach(function (p) { mctx.beginPath(); mctx.arc(mx_(p.x), mz_(p.z), 2.2, 0, Math.PI * 2); mctx.fill(); });
    var a = cam.first || P.seated ? (P.seated ? MYSEAT.yaw : cam.yaw) : P.bodyYaw, px = mx_(P.x), pz = mz_(P.z);
    mctx.save(); mctx.translate(px, pz); mctx.rotate(-a);
    mctx.beginPath(); mctx.moveTo(0, 6); mctx.lineTo(4, -4); mctx.lineTo(-4, -4); mctx.closePath();
    mctx.fillStyle = "#FF5A1F"; mctx.fill(); mctx.strokeStyle = "#141414"; mctx.lineWidth = 1; mctx.stroke();
    mctx.restore();
  }

  /* ================================================================
     5. UI + INPUT
     ================================================================ */
  var SHAPES = {
    circle: '<circle cx="12" cy="12" r="10"/>',
    square: '<rect x="2" y="2" width="20" height="20"/>',
    triangle: '<path d="M12 2 22 22H2Z"/>'
  };
  var cardTimer = 0;
  function showCard(toolId, where) {
    var tl = TOOLS[toolId], cat = CATS[tl.cat];
    var svg = '<svg viewBox="0 0 24 24" width="20" height="20" role="img" aria-label="' + cat.name + '" style="' +
      (cat.outline ? 'fill:none;stroke:currentColor;stroke-width:2' : 'fill:' + cat.hex + (tl.cat === "qa" ? ';stroke:#141414;stroke-width:1.2' : '')) + '">' + SHAPES[cat.shape] + "</svg>";
    $("c-shape").innerHTML = svg;
    $("c-cat").textContent = cat.name;
    $("c-room").textContent = where;
    $("c-name").textContent = tl.name;
    $("c-cmd").textContent = tl.command;
    $("c-desc").textContent = tl.desc;
    $("c-action").textContent = tl.action;
    $("c-why").textContent = tl.why;
    $("card").hidden = false;
    $("live").textContent = where + ". " + tl.name + ": " + tl.desc;
    clearTimeout(cardTimer); cardTimer = setTimeout(hideCard, 9000);
  }
  function hideCard() { $("card").hidden = true; clearTimeout(cardTimer); }

  function finish() {
    state.done = true;
    var m = MODES[mode];
    $("d-title").textContent = m.doneTitle;
    $("d-lead").textContent = mode === "hatch"
      ? "You cleared " + state.manual + " by hand and " + state.byCmd + " with one HDEL command."
      : m.doneLead;
    $("d-time").textContent = fmt(state.elapsed);
    setTimeout(function () {
      $("done").hidden = false; releaseLock();
      $("again").focus();
    }, mode === "donut" ? 1200 : 1600);
  }

  function requestLock() {
    if (isTouch || !canvas.requestPointerLock) return;
    state.wantLock = true;
    try { var r = canvas.requestPointerLock(); if (r && r.catch) r.catch(function () { state.wantLock = false; }); }
    catch (e) { state.wantLock = false; }
  }
  function releaseLock() { state.wantLock = false; if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); }

  function setMode(m) {
    if (!MODES[m]) m = "donut";
    mode = m;
    var M2 = MODES[m];
    $("s-title").textContent = M2.title; $("s-intro").textContent = M2.intro;
    $("h-title").textContent = M2.title; $("h-unit").textContent = M2.unit;
    $("total").textContent = String(list().length);
    Array.prototype.forEach.call(document.querySelectorAll("#modes button"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === m)); });
    document.title = "ProCAD Office · " + M2.title;
  }
  function resetObjectives() {
    ZONES.forEach(function (z) { z.found = false; z.fillT = 0; });
    GAPS.forEach(function (g) { g.done = false; g.t = 0; g.delay = 0; });
    HATCHES.forEach(function (h) { h.done = false; h.t = 0; h.delay = 0; h.byHand = false; });
    state.found = 0; state.manual = 0; state.byCmd = 0; state.hdelRun = false; state.done = false;
    state.t0 = performance.now(); lastSec = -1;
    $("found").textContent = "0"; $("timer").textContent = "00:00"; $("hint").hidden = true; $("t-h").hidden = true;
    P.x = SPAWN.x; P.z = SPAWN.z; P.y = 0; P.vy = 0; P.seated = false; P.bodyYaw = SPAWN.yaw; cam.yaw = SPAWN.yaw;
    hideCard();
  }
  function start() {
    resetObjectives();
    $("start").hidden = true; $("hud").hidden = false;
    if (isTouch) $("touch").hidden = false;
    state.playing = true; state.paused = false;
    requestLock();
    canvas.focus();
  }
  function menu() {
    state.playing = false; state.paused = false; releaseLock();
    $("done").hidden = true; $("pause").hidden = true; $("hud").hidden = true; $("touch").hidden = true;
    $("start").hidden = false; $("play").focus();
  }
  function pause() {
    if (!state.playing || state.done || state.paused) return;
    state.paused = true; state.pauseAt = performance.now();
    $("pause").hidden = false; $("resume").focus();
  }
  function resume() {
    if (state.pauseAt) { state.t0 += performance.now() - state.pauseAt; state.pauseAt = 0; }
    state.paused = false; $("pause").hidden = true; requestLock(); canvas.focus();
  }
  function reset() { resetObjectives(); $("done").hidden = true; requestLock(); canvas.focus(); }

  var hashMode = (/mode=(\w+)/.exec(location.hash) || [])[1];
  setMode(hashMode);
  document.getElementById("modes").addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button[data-mode]"); if (b) setMode(b.getAttribute("data-mode"));
  });
  $("menu").addEventListener("click", menu);
  $("pmenu").addEventListener("click", menu);
  $("play").addEventListener("click", start);
  $("resume").addEventListener("click", resume);
  $("again").addEventListener("click", reset);
  $("explore").addEventListener("click", function () { $("done").hidden = true; requestLock(); canvas.focus(); });
  $("c-close").addEventListener("click", hideCard);

  document.addEventListener("pointerlockchange", function () {
    var was = state.locked;
    state.locked = document.pointerLockElement === canvas;
    if (was && !state.locked && state.playing && !state.done && $("done").hidden) pause();
  });
  canvas.addEventListener("click", function () { if (state.playing && !state.paused && !state.locked) requestLock(); });

  var drag = null;
  canvas.addEventListener("mousedown", function (e) { if (!state.locked) drag = { x: e.clientX, y: e.clientY }; });
  window.addEventListener("mouseup", function () { drag = null; });
  window.addEventListener("mousemove", function (e) {
    if (!state.playing || state.paused) return;
    var dx = 0, dy = 0;
    if (state.locked) { dx = e.movementX || 0; dy = e.movementY || 0; }
    else if (drag) { dx = e.clientX - drag.x; dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; }
    else return;
    look(dx, dy, 0.0025);
  });
  function look(dx, dy, s) {
    cam.yaw = wrap(cam.yaw - dx * s);
    cam.pitch = clamp(cam.pitch + dy * s, cam.first ? -1.3 : -0.35, cam.first ? 1.3 : 1.25);
  }

  var GAME_KEYS = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1, ShiftLeft: 1, ShiftRight: 1 };
  window.addEventListener("keydown", function (e) {
    if (!state.playing) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.code === "Escape") { if (state.paused) resume(); else { pause(); releaseLock(); } return; }
    if (state.paused) return;
    if (GAME_KEYS[e.code]) { keys[e.code] = true; e.preventDefault(); }
    if (e.repeat) return;
    if (e.code === "KeyE") interact();
    else if (e.code === "KeyV") toggleCam();
    else if (e.code === "KeyH") runHDEL();
    else if (e.code === "KeyM") { state.mapOn = !state.mapOn; $("mapwrap").hidden = !state.mapOn; }
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });
  window.addEventListener("blur", function () { keys = {}; });
  function toggleCam() {
    cam.first = !cam.first;
    cam.pitch = cam.first ? 0 : 0.32;
    if (cam.first && !P.seated) cam.yaw = P.bodyYaw;
  }

  /* touch: left = joystick, right = look, buttons */
  if (isTouch) {
    var tl = $("touch"), knob = $("knob"), stickId = null, lookId = null, sx0 = 0, sy0 = 0, lx = 0, ly = 0;
    tl.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button")) return;
      if (e.clientX < window.innerWidth / 2 && stickId === null) { stickId = e.pointerId; sx0 = e.clientX; sy0 = e.clientY; }
      else if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; }
      tl.setPointerCapture(e.pointerId);
    });
    tl.addEventListener("pointermove", function (e) {
      if (e.pointerId === stickId) {
        var dx = e.clientX - sx0, dy = e.clientY - sy0, l = Math.hypot(dx, dy), m = 48;
        if (l > m) { dx *= m / l; dy *= m / l; }
        stick.x = dx / m; stick.y = dy / m;
        knob.style.transform = "translate(" + dx + "px," + dy + "px)";
      } else if (e.pointerId === lookId) {
        look(e.clientX - lx, e.clientY - ly, 0.005); lx = e.clientX; ly = e.clientY;
      }
    });
    function endTouch(e) {
      if (e.pointerId === stickId) { stickId = null; stick.x = stick.y = 0; knob.style.transform = ""; }
      if (e.pointerId === lookId) lookId = null;
    }
    tl.addEventListener("pointerup", endTouch); tl.addEventListener("pointercancel", endTouch);
    $("t-e").addEventListener("click", interact);
    $("t-cam").addEventListener("click", toggleCam);
    $("t-h").addEventListener("click", runHDEL);
    $("t-jump").addEventListener("pointerdown", function () { keys.Space = true; });
    $("t-jump").addEventListener("pointerup", function () { keys.Space = false; });
    $("t-jump").addEventListener("pointercancel", function () { keys.Space = false; });
  }

  /* ================================================================
     LOOP
     ================================================================ */
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    update(dt, now);
    render(now / 1000);
    drawMap();
    adapt(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (/test/.test(location.hash)) {
    window.__office = { P: P, cam: cam, state: state, zones: ZONES, gaps: GAPS, hatches: HATCHES, runHDEL: runHDEL, mode: function () { return mode; }, people: PEOPLE, start: start, interact: interact, toggleCam: toggleCam,
      tp: function (x, z) { P.x = x; P.z = z; }, chairs: CHAIRS, solids: SOLIDS, scale: function () { return scale; } };
  }
})();
