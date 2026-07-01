import { parseViewerConfig, buildViewerHeader, type ViewerConfig } from './viewer';

const canvas = document.getElementById('hydrogenCanvas') as HTMLCanvasElement | null;
const viewerInfo = document.getElementById('viewerInfo');

if (!canvas) {
  throw new Error('Canvas element #hydrogenCanvas not found');
}

if (!viewerInfo) {
  throw new Error('Viewer info element #viewerInfo not found');
}

const gl = canvas.getContext('webgl2');
if (!gl) {
  document.body.innerHTML = '<div style="color:#ffe8e8;padding:24px;font-size:18px;">WebGL2 is required for the orbital 3D viewer.</div>';
  throw new Error('WebGL2 unavailable');
}

function resizeCanvas() {
  const rect = canvas.parentElement?.getBoundingClientRect();
  if (!rect) return;
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const viewerConfig = parseViewerConfig();
buildViewerHeader(viewerInfo, viewerConfig);

const vertexShaderSource = `#version 300 es
in vec3 position;
in vec4 color;
uniform mat4 projection;
uniform mat4 view;
uniform float pointSize;
out vec4 vColor;
void main() {
  vColor = color;
  gl_Position = projection * view * vec4(position, 1.0);
  gl_PointSize = pointSize;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;
in vec4 vColor;
out vec4 outColor;
void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  float alpha = 1.0 - smoothstep(0.25, 0.55, dist);
  if (alpha <= 0.0) discard;
  outColor = vec4(vColor.rgb, vColor.a * alpha);
}
`;

function compileShader(type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || 'Unknown shader error');
  }
  return shader;
}

function createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to create program');
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'Unknown program error');
  }
  return program;
}

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [1, 0, 0];
}

function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function randomUnitVector(): [number, number, number] {
  const z = 2 * Math.random() - 1;
  const t = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(t), r * Math.sin(t), z];
}

function getShellColor(l: number): [number, number, number, number] {
  switch (l) {
    case 0: return [0.57, 0.90, 1.0, 0.36];
    case 1: return [0.42, 0.94, 0.76, 0.32];
    case 2: return [0.74, 0.56, 1.0, 0.28];
    case 3: return [1.0, 0.84, 0.42, 0.24];
    default: return [0.86, 0.78, 0.96, 0.20];
  }
}

function sampleShellPoint(n: number, l: number): [number, number, number] {
  const shellRadius = n * 1.9;
  const thickness = 0.35 + 0.18 * Math.random();
  const drift = gaussianRandom() * thickness * shellRadius;
  const radius = Math.max(0.1, shellRadius + drift);
  let direction = randomUnitVector();

  if (l === 1) {
    const axis = Math.floor(Math.random() * 3);
    const sign = Math.random() > 0.5 ? 1 : -1;
    const bias: [number, number, number] = [0, 0, 0];
    bias[axis] = sign * 1.0;
    direction = normalize([
      bias[0] + (Math.random() - 0.5) * 0.35,
      bias[1] + (Math.random() - 0.5) * 0.35,
      bias[2] + (Math.random() - 0.5) * 0.35
    ]);
  } else if (l === 2) {
    const axis = Math.floor(Math.random() * 3);
    const sign = Math.random() > 0.5 ? 1 : -1;
    const bias: [number, number, number] = [0, 0, 0];
    bias[axis] = sign * 0.9;
    bias[(axis + 1) % 3] = Math.random() > 0.5 ? 0.8 : -0.8;
    direction = normalize([
      bias[0] + (Math.random() - 0.5) * 0.42,
      bias[1] + (Math.random() - 0.5) * 0.42,
      bias[2] + (Math.random() - 0.5) * 0.42
    ]);
  } else if (l >= 3) {
    const bias: [number, number, number] = [Math.random() * 0.6 - 0.3, Math.random() * 0.6 - 0.3, Math.random() * 0.6 - 0.3];
    direction = normalize([
      bias[0] + (Math.random() - 0.5) * 0.7,
      bias[1] + (Math.random() - 0.5) * 0.7,
      bias[2] + (Math.random() - 0.5) * 0.7
    ]);
  }

  return [direction[0] * radius, direction[1] * radius, direction[2] * radius];
}

function calculatePointCount(shellCount: number, total: number): number {
  const normalized = Math.max(1, shellCount);
  const target = Math.round((normalized / total) * 36000);
  return Math.min(Math.max(target, 240), 1600);
}

interface CloudPoint {
  x: number;
  y: number;
  z: number;
  color: [number, number, number, number];
}

function buildCloudFromConfig(config: ViewerConfig['config']): CloudPoint[] {
  if (!config.length) return [];
  const points: CloudPoint[] = [];
  const totalShellElectrons = config.reduce((sum, shell) => sum + shell.electronCount, 0);
  config.forEach(shell => {
    const shellPoints = calculatePointCount(shell.electronCount, totalShellElectrons);
    const color = getShellColor(shell.l);
    for (let i = 0; i < shellPoints; i += 1) {
      const [x, y, z] = sampleShellPoint(shell.n, shell.l);
      const alpha = color[3] * (0.55 + Math.random() * 0.35);
      points.push({ x, y, z, color: [color[0], color[1], color[2], alpha] });
    }
  });
  return points;
}

const cloudSamples = buildCloudFromConfig(viewerConfig.config);
const positions: number[] = [];
const colors: number[] = [];

if (cloudSamples.length) {
  const centroid = cloudSamples.reduce<[number, number, number]>(
    (acc, point) => {
      acc[0] += point.x;
      acc[1] += point.y;
      acc[2] += point.z;
      return acc;
    },
    [0, 0, 0]
  );

  centroid[0] /= cloudSamples.length;
  centroid[1] /= cloudSamples.length;
  centroid[2] /= cloudSamples.length;

  cloudSamples.forEach(({ x, y, z, color }) => {
    positions.push(x - centroid[0], y - centroid[1], z - centroid[2]);
    colors.push(...color);
  });
}

const nucleusPositions = [0.0, 0.0, 0.0];
const nucleusColors = [1.0, 0.92, 0.53, 1.0];

const positionBuffer = gl.createBuffer();
const colorBuffer = gl.createBuffer();
const nucleusBuffer = gl.createBuffer();
const nucleusColorBuffer = gl.createBuffer();

if (!positionBuffer || !colorBuffer || !nucleusBuffer || !nucleusColorBuffer) {
  throw new Error('Failed to create WebGL buffers');
}

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

gl.bindBuffer(gl.ARRAY_BUFFER, nucleusBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nucleusPositions), gl.STATIC_DRAW);

gl.bindBuffer(gl.ARRAY_BUFFER, nucleusColorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nucleusColors), gl.STATIC_DRAW);

const program = createProgram(vertexShaderSource, fragmentShaderSource);
const vao = gl.createVertexArray();
const nucleusVao = gl.createVertexArray();

if (!vao || !nucleusVao) {
  throw new Error('Unable to create vertex array objects');
}

gl.bindVertexArray(vao);

const posLoc = gl.getAttribLocation(program, 'position');
const colLoc = gl.getAttribLocation(program, 'color');
if (posLoc < 0 || colLoc < 0) {
  throw new Error('Unable to locate shader attributes');
}

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.enableVertexAttribArray(colLoc);
gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, 0, 0);

gl.bindVertexArray(nucleusVao);
gl.bindBuffer(gl.ARRAY_BUFFER, nucleusBuffer);
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, nucleusColorBuffer);
gl.enableVertexAttribArray(colLoc);
gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, 0, 0);

const projLoc = gl.getUniformLocation(program, 'projection');
const viewLoc = gl.getUniformLocation(program, 'view');
const pointSizeLoc = gl.getUniformLocation(program, 'pointSize');

function perspective(fovy: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0
  ]);
}

function lookAt(eye: [number, number, number], center: [number, number, number], up: [number, number, number]): Float32Array {
  const z0 = eye[0] - center[0];
  const z1 = eye[1] - center[1];
  const z2 = eye[2] - center[2];
  const len = Math.hypot(z0, z1, z2);
  const zx = z0 / len;
  const zy = z1 / len;
  const zz = z2 / len;

  const xx = up[1] * zz - up[2] * zy;
  const xy = up[2] * zx - up[0] * zz;
  const xz = up[0] * zy - up[1] * zx;
  const xlen = Math.hypot(xx, xy, xz);
  const x0 = xx / xlen;
  const x1 = xy / xlen;
  const x2 = xz / xlen;

  const y0 = zy * x2 - zz * x1;
  const y1 = zz * x0 - zx * x2;
  const y2 = zx * x1 - zy * x0;

  return new Float32Array([
    x0, y0, zx, 0,
    x1, y1, zy, 0,
    x2, y2, zz, 0,
    -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]),
    -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]),
    -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
    1
  ]);
}

let angleX = 0.7;
let angleY = 0.8;
let distance = 14;

function render() {
  resizeCanvas();
  gl.clearColor(0.03, 0.05, 0.1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.DEPTH_TEST);

  const aspect = canvas.width / canvas.height;
  const projection = perspective(Math.PI / 3, aspect, 0.1, 1000);
  const eye: [number, number, number] = [
    distance * Math.cos(angleY) * Math.sin(angleX),
    distance * Math.sin(angleY),
    distance * Math.cos(angleY) * Math.cos(angleX)
  ];
  const view = lookAt(eye, [0, 0, 0], [0, 1, 0]);

  gl.useProgram(program);
  gl.bindVertexArray(vao);
  if (pointSizeLoc) gl.uniform1f(pointSizeLoc, 4.5);
  if (projLoc) gl.uniformMatrix4fv(projLoc, false, projection);
  if (viewLoc) gl.uniformMatrix4fv(viewLoc, false, view);
  gl.drawArrays(gl.POINTS, 0, cloudSamples.length);

  gl.bindVertexArray(nucleusVao);
  if (pointSizeLoc) gl.uniform1f(pointSizeLoc, 36.0);
  gl.drawArrays(gl.POINTS, 0, 1);

  requestAnimationFrame(render);
}

render();

let isDragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('pointerdown', (event) => {
  isDragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!isDragging) return;
  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
  angleX += dx * 0.01;
  angleY = Math.min(Math.max(angleY - dy * 0.01, -Math.PI / 2 + 0.1), Math.PI / 2 - 0.1);
});

canvas.addEventListener('pointerup', () => {
  isDragging = false;
});

const zoomSlider = document.getElementById('zoomSlider') as HTMLInputElement | null;
const zoomInButton = document.getElementById('zoomIn');
const zoomOutButton = document.getElementById('zoomOut');

if (zoomSlider) {
  zoomSlider.addEventListener('input', (event) => {
    distance = parseFloat((event.target as HTMLInputElement).value);
  });
}

if (zoomInButton) {
  zoomInButton.addEventListener('click', () => {
    distance = Math.max(2, distance - 0.8);
    if (zoomSlider) zoomSlider.value = distance.toString();
  });
}

if (zoomOutButton) {
  zoomOutButton.addEventListener('click', () => {
    distance = Math.min(80, distance + 0.8);
    if (zoomSlider) zoomSlider.value = distance.toString();
  });
}

canvas.addEventListener('wheel', (event) => {
  distance = Math.min(Math.max(distance + event.deltaY * 0.02, 2), 80);
  if (zoomSlider) zoomSlider.value = distance.toString();
  event.preventDefault();
});

const resetButton = document.getElementById('resetView');
if (resetButton) {
  resetButton.addEventListener('click', () => {
    angleX = 0.7;
    angleY = 0.8;
    distance = 14;
    if (zoomSlider) zoomSlider.value = distance.toString();
  });
}
