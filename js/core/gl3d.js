// Трёхмерная сцена для моделей органоидов.
// Объекты задаются формулами расстояния (SDF) на языке шейдеров, картинку строит видеокарта:
// свет, мягкие тени, затенение в щелях. Модель можно вращать, а нажатием — узнать, на какую часть попали.
//
// Сцена передаёт фрагмент GLSL, в котором определены:
//   vec2  map(vec3 p)                      — расстояние до ближайшей поверхности и номер материала
//   vec3  albedo(float m, vec3 p, vec3 n)  — цвет материала
//   float remap(float m, vec3 p, vec3 n)   — уточнение материала после попадания (можно вернуть m)
//   vec4  haze(vec3 ro, vec3 rd, float t)  — полупрозрачная «среда» перед поверхностью (rgb, плотность)

const VERT = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

const frag = scene => `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uCam; uniform mat3 uBasis; uniform float uFocal;
uniform float uHi; uniform int uPick; uniform float uBound;
out vec4 outColor;

float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdEll(vec3 p, vec3 r) { float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / k1; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r; }
float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xz) - t.x, p.y)) - t.y; }
float sdBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdDisc(vec3 p, float R, float h, float r) { vec2 d = vec2(length(p.xz) - R, abs(p.y) - h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r; }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
vec2 U(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }

${scene}

vec3 normalAt(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0018;
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}
float shadow(vec3 ro, vec3 rd) {
  float res = 1.0, t = 0.03;
  for (int i = 0; i < 18; i++) { float h = map(ro + rd * t).x; res = min(res, 9.0 * h / t); t += clamp(h, 0.02, 0.2); if (res < 0.02 || t > 3.0) break; }
  return clamp(res, 0.0, 1.0);
}
float occlusion(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 4; i++) { float h = 0.03 * float(i); o += (h - map(p + n * h).x) * s; s *= 0.6; }
  return clamp(1.0 - 4.0 * o, 0.0, 1.0);
}
vec3 backdrop(vec2 uv) {
  vec3 c = mix(vec3(0.165, 0.118, 0.251), vec3(0.086, 0.196, 0.290), clamp(uv.y * 0.5 + 0.55, 0.0, 1.0));
  c += vec3(0.05, 0.12, 0.14) * exp(-2.5 * length(uv - vec2(-0.6, 0.9)));
  c *= 1.0 - 0.16 * dot(uv, uv);
  return pow(c, vec3(2.2));            // цвета заданы «как на экране», переводим в линейные
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
  vec3 ro = uCam, rd = normalize(uBasis * vec3(uv, uFocal));
  vec3 col = backdrop(uv); float m = 0.0, t = 0.0, tHit = 1e3;
  // сначала проверяем, попадает ли луч в шар, внутри которого лежит вся модель
  float b = dot(ro, rd), c = dot(ro, ro) - uBound * uBound, disc = b * b - c;
  if (disc > 0.0) {
    float sq = sqrt(disc), far = -b + sq; t = max(-b - sq, 0.0);
    for (int i = 0; i < 96; i++) {
      vec2 h = map(ro + rd * t);
      if (h.x < 0.0012 + 0.0009 * t) { m = h.y; tHit = t; break; }
      t += h.x * 0.92; if (t > far) break;
    }
  }
  vec3 lig = normalize(vec3(-0.45, 0.85, 0.55));
  if (m > 0.0) {
    vec3 p = ro + rd * tHit, n = normalAt(p);
    m = remap(m, p, n);
    if (uPick == 0) {
      vec3 alb = albedo(m, p, n);
      float dif = clamp(dot(n, lig), 0.0, 1.0), sha = shadow(p + n * 0.01, lig), occ = occlusion(p, n);
      float fill = clamp(0.5 + 0.5 * n.y, 0.0, 1.0), back = clamp(dot(n, normalize(vec3(0.6, 0.1, -0.7))), 0.0, 1.0);
      float fre = pow(clamp(1.0 + dot(n, rd), 0.0, 1.0), 3.0), spe = pow(clamp(dot(n, normalize(lig - rd)), 0.0, 1.0), 36.0) * sha;
      vec3 lin = vec3(1.25, 1.15, 0.95) * dif * sha + vec3(0.35, 0.50, 0.62) * fill * occ + vec3(0.30, 0.22, 0.34) * back * occ;
      col = alb * lin + vec3(0.9, 0.95, 1.0) * spe * 0.35 + alb * fre * 0.35 * occ;
      if (uHi > 0.5) {
        if (abs(m - uHi) < 0.5) col = mix(col, vec3(1.0, 0.93, 0.55), 0.30 + 0.22 * sin(uTime * 5.0)) * 1.15;
        else col *= 0.42;
      }
    }
  }
  vec4 hz = haze(ro, rd, tHit);
  if (uPick == 1) { if (m < 0.5 && hz.a > 0.12) m = hazeMaterial; outColor = vec4(m / 255.0, 0.0, 0.0, 1.0); return; }
  if (uHi > 0.5 && abs(hazeMaterial - uHi) > 0.5) hz.rgb *= 0.45;
  if (uHi > 0.5 && abs(hazeMaterial - uHi) < 0.5) hz = vec4(mix(hz.rgb, vec3(1.0, 0.95, 0.6), 0.25 + 0.2 * sin(uTime * 5.0)), min(1.0, hz.a * 1.5));
  col = mix(col, hz.rgb, hz.a);
  outColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(0.4545)), 1.0);
}`;

export function createScene3D(canvas, opts) {
  const { scene, bound = 2.6, ratio = 0.66, minH = 280, maxH = 520, onTap, onFrame } = opts;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag(scene)));
  gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = Object.fromEntries(['uRes', 'uTime', 'uCam', 'uBasis', 'uFocal', 'uHi', 'uPick', 'uBound'].map(n => [n, gl.getUniformLocation(prog, n)]));
  const custom = {};

  let base = opts.yaw ?? 0.5, swing = 0, yaw = base, pitch = opts.pitch ?? 0.42, dist = opts.dist ?? 6.2, spin = 0, hi = 0;
  const fixedQ = window.__gl3dQuality; let cssW = 300, cssH = 200, q = fixedQ || 0.8, t = 0, last = 0, raf = 0, visible = true, dead = false, slow = 0, fast = 0, idle = 0;
  const FOCAL = 2.4, cam = { pos: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, -1] };

  function camera() {
    const cp = Math.cos(pitch), pos = [dist * cp * Math.sin(yaw), dist * Math.sin(pitch), dist * cp * Math.cos(yaw)];
    const f = pos.map(v => -v / dist), r = [f[2], 0, -f[0]], rl = Math.hypot(r[0], r[2]); r[0] /= -rl; r[2] /= -rl;
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    Object.assign(cam, { pos, r, u, f });
  }
  // точка модели → место на экране (в пикселях CSS); z < 0 значит «за камерой»
  function project([x, y, z]) {
    const v = [x - cam.pos[0], y - cam.pos[1], z - cam.pos[2]], d = k => v[0] * k[0] + v[1] * k[1] + v[2] * k[2], zz = d(cam.f);
    return [cssW / 2 + d(cam.r) / zz * FOCAL * cssH / 2, cssH / 2 - d(cam.u) / zz * FOCAL * cssH / 2, zz];
  }
  function resize() {
    const w = canvas.parentElement.clientWidth; if (!w) return;
    cssW = w; cssH = Math.round(Math.max(minH, Math.min(maxH, w * ratio)));
    canvas.style.height = cssH + 'px'; apply();
    opts.onResize?.(cssW, cssH);
  }
  function apply() {
    const k = Math.min(window.devicePixelRatio || 1, 2) * q;
    canvas.width = Math.max(2, Math.round(cssW * k)); canvas.height = Math.max(2, Math.round(cssH * k));
  }
  function render(pick) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height); gl.uniform1f(U.uTime, t); gl.uniform3fv(U.uCam, cam.pos);
    gl.uniformMatrix3fv(U.uBasis, false, [...cam.r, ...cam.u, ...cam.f]); gl.uniform1f(U.uFocal, FOCAL);
    gl.uniform1f(U.uHi, hi); gl.uniform1i(U.uPick, pick ? 1 : 0); gl.uniform1f(U.uBound, bound);
    for (const [name, v] of Object.entries(custom)) gl.uniform1f(gl.getUniformLocation(prog, name), v);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    if (dead) return; raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const real = (now - last) / 1000 || 0, dt = Math.min(0.05, real); last = now; t += dt; idle += dt;
    // подстраиваем чёткость под скорость устройства
    if (!fixedQ) {
      if (real > 0.045) { if (++slow > 12 && q > 0.45) { q = Math.max(0.45, q - 0.12); slow = 0; apply(); } } else slow = 0;
      if (real < 0.019) { if (++fast > 90 && q < 1) { q = Math.min(1, q + 0.1); fast = 0; apply(); } } else fast = 0;
    }
    yaw += spin * dt; spin *= Math.exp(-dt * 3);
    if (idle > 2.5) { swing += dt; yaw += (base + Math.sin(swing * 0.35) * 0.32 - yaw) * Math.min(1, dt * 1.2); }   // сама слегка покачивается, пока её не трогают
    else { base = yaw; swing = 0; }
    camera(); render(false);
    onFrame?.({ t, dt, project, w: cssW, h: cssH });
  }

  // вращение: мышью в любую сторону, пальцем — по горизонтали (вертикальный жест оставлен для прокрутки страницы)
  let drag = null;
  const down = e => { drag = { x: e.clientX, y: e.clientY, moved: 0, touch: e.pointerType === 'touch' }; idle = 0; };
  const move = e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    yaw -= dx * 0.008; spin = -dx * 0.25; idle = 0;
    if (!drag.touch) pitch = Math.max(-0.2, Math.min(1.2, pitch + dy * 0.006));
  };
  const up = e => {
    if (drag && drag.moved < 8 && onTap) {
      const r = canvas.getBoundingClientRect(), px = Math.floor((e.clientX - r.left) / r.width * canvas.width), py = Math.floor((1 - (e.clientY - r.top) / r.height) * canvas.height);
      gl.enable(gl.SCISSOR_TEST); gl.scissor(px, py, 1, 1); camera(); render(true);
      const out = new Uint8Array(4); gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out); gl.disable(gl.SCISSOR_TEST);
      render(false); onTap(out[0]);
    }
    drag = null;
  };
  canvas.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', () => { drag = null; });
  const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement);
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }); io.observe(canvas);
  resize(); raf = requestAnimationFrame(frame);

  return {
    project, setHi(id) { hi = id || 0; }, set(name, v) { custom[name] = v; },
    zoom(k) { dist = Math.max(opts.minDist ?? 3.6, Math.min(opts.maxDist ?? 8, dist * k)); idle = 0; },
    destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}
