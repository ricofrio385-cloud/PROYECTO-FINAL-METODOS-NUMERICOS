'use strict';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const PROJECT_DATA = {
  charge: [
    { t: 0, v: 0.00 }, { t: 4, v: 1.29 }, { t: 10, v: 2.98 }, { t: 14, v: 3.14 },
    { t: 15, v: 3.76 }, { t: 20, v: 4.15 }, { t: 25, v: 4.43 }, { t: 30, v: 4.55 },
    { t: 40, v: 4.71 }, { t: 47, v: 4.79 }, { t: 56, v: 4.83 }
  ],
  discharge: [
    { t: 0, v: 4.71 }, { t: 4, v: 3.82 }, { t: 8, v: 3.05 }, { t: 12, v: 2.41 },
    { t: 18, v: 1.75 }, { t: 23, v: 1.23 }, { t: 30, v: 0.82 }, { t: 40, v: 0.55 },
    { t: 47, v: 0.45 }
  ]
};

let state = {
  mode: 'charge',
  data: structuredClone(PROJECT_DATA.charge),
  rk4: [],
  params: { vs: 5, rKohm: 10, cMicro: 1000 }
};

const algorithms = {
  interpolation: ['Newton — diferencias divididas', 'P(x)=a₀+a₁(x−x₀)+a₂(x−x₀)(x−x₁)+...'],
  root: ['Newton-Raphson — búsqueda de raíces', 'tₙ₊₁ = tₙ − f(tₙ)/f′(tₙ)'],
  derivative: ['Diferencia central', "f′(x) ≈ [f(x+h)−f(x−h)]/(2h)"],
  integration: ['Regla compuesta del trapecio', 'I ≈ Σ [(xᵢ₊₁−xᵢ)(fᵢ+fᵢ₊₁)/2]'],
  rk4: ['Runge-Kutta de cuarto orden', 'yₙ₊₁ = yₙ + (h/6)(k₁+2k₂+2k₃+k₄)']
};

function tau() {
  return state.params.rKohm * 1000 * state.params.cMicro * 1e-6;
}

function modelVoltage(t) {
  const T = tau();
  if (!Number.isFinite(T) || T <= 0) return 0;
  if (state.mode === 'charge') return state.params.vs * (1 - Math.exp(-t / T));
  const v0 = state.data.length ? Math.max(...state.data.map(p => p.v)) : state.params.vs;
  return v0 * Math.exp(-t / T);
}

function modelDerivative(t) {
  const T = tau();
  if (state.mode === 'charge') return (state.params.vs / T) * Math.exp(-t / T);
  return -modelVoltage(t) / T;
}

function syncParams() {
  state.params.vs = positiveNumber($('#sourceVoltage').value, 5);
  state.params.rKohm = positiveNumber($('#resistance').value, 10);
  state.params.cMicro = positiveNumber($('#capacitance').value, 1000);
  state.mode = $('#analysisMode').value;
  updateStaticIndicators();
}

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function updateStaticIndicators() {
  const T = tau();
  $('#tauResult').textContent = `τ = ${format(T, 3)} s`;
  $('#tauStat').textContent = `${format(T, 2)} s`;
  const maxV = state.data.length ? Math.max(...state.data.map(p => p.v)) : 0;
  $('#maxVoltageStat').textContent = `${format(maxV, 2)} V`;
  const effectiveFinal = state.mode === 'charge' && maxV > 0 ? maxV : state.params.vs;
  const target = Math.min(4, effectiveFinal * 0.98);
  let targetTime = 0;
  if (state.mode === 'charge') targetTime = -T * Math.log(1 - target / effectiveFinal);
  else targetTime = T * Math.log(Math.max(maxV, state.params.vs) / target);
  $('#targetTimeStat').textContent = `${format(targetTime, 2)} s`;
  $('#chartTitle').textContent = `Curva de ${state.mode === 'charge' ? 'carga' : 'descarga'} del capacitor`;
  $('#datasetLabel').textContent = `Dataset: ${state.mode === 'charge' ? 'carga' : 'descarga'} experimental`;
  $('#formulaTitle').textContent = state.mode === 'charge' ? 'Ecuación de carga' : 'Ecuación de descarga';
  $('#formulaDisplay').innerHTML = state.mode === 'charge'
    ? 'V<sub>C</sub>(t) = V<sub>S</sub>(1 − e<sup>−t/τ</sup>)'
    : 'V<sub>C</sub>(t) = V<sub>0</sub>e<sup>−t/τ</sup>';
}

function format(n, digits = 4) {
  return Number.isFinite(n) ? n.toFixed(digits) : '—';
}

function sortData() {
  state.data = state.data
    .filter(p => Number.isFinite(p.t) && Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t);
}

function renderTable() {
  sortData();
  const body = $('#dataTableBody');
  body.innerHTML = '';
  state.data.forEach((point, index) => {
    const model = modelVoltage(point.t);
    const err = Math.abs(point.v - model) / Math.max(Math.abs(point.v), 1e-9) * 100;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><input aria-label="Tiempo fila ${index + 1}" data-index="${index}" data-key="t" type="number" step="0.01" value="${point.t}"></td>
      <td><input aria-label="Voltaje fila ${index + 1}" data-index="${index}" data-key="v" type="number" step="0.001" value="${point.v}"></td>
      <td>${format(model, 4)}</td>
      <td>${format(err, 2)}</td>
      <td><button class="delete-row" data-delete="${index}" title="Eliminar fila">✕</button></td>`;
    body.appendChild(row);
  });
  body.querySelectorAll('input').forEach(input => input.addEventListener('change', event => {
    const index = Number(event.target.dataset.index);
    const key = event.target.dataset.key;
    const value = Number(event.target.value);
    if (Number.isFinite(value)) state.data[index][key] = value;
    renderAll();
  }));
  body.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => {
    state.data.splice(Number(button.dataset.delete), 1);
    renderAll();
  }));
}

function buildCurve() {
  if (state.rk4.length) return state.rk4;
  const maxDataT = state.data.length ? Math.max(...state.data.map(p => p.t)) : 60;
  const maxT = Math.max(maxDataT, 1);
  const points = [];
  for (let i = 0; i <= 160; i++) {
    const t = maxT * i / 160;
    points.push({ t, v: modelVoltage(t) });
  }
  return points;
}

function renderChart() {
  const svg = $('#mainChart');
  svg.innerHTML = '';
  const W = 900, H = 430;
  const pad = { l: 68, r: 25, t: 22, b: 55 };
  const curve = buildCurve();
  const all = [...state.data, ...curve];
  const maxT = Math.max(1, ...all.map(p => p.t)) * 1.04;
  const maxV = Math.max(1, state.params.vs, ...all.map(p => p.v)) * 1.12;
  const x = t => pad.l + (t / maxT) * (W - pad.l - pad.r);
  const y = v => H - pad.b - (v / maxV) * (H - pad.t - pad.b);
  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs = {}) => {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };
  const css = getComputedStyle(document.body);
  const lineColor = css.getPropertyValue('--line').trim();
  const muted = css.getPropertyValue('--muted').trim();
  const primary = css.getPropertyValue('--primary').trim();
  const accent = css.getPropertyValue('--accent').trim();

  const defs = make('defs');
  const grad = make('linearGradient', { id:'areaGradient', x1:'0', y1:'0', x2:'0', y2:'1' });
  grad.append(make('stop', { offset:'0%', 'stop-color':accent, 'stop-opacity':'0.25' }), make('stop', { offset:'100%', 'stop-color':accent, 'stop-opacity':'0' }));
  defs.appendChild(grad); svg.appendChild(defs);

  for (let i = 0; i <= 5; i++) {
    const yy = pad.t + i * (H - pad.t - pad.b) / 5;
    const val = maxV * (1 - i / 5);
    svg.appendChild(make('line', { x1:pad.l, y1:yy, x2:W-pad.r, y2:yy, stroke:lineColor, 'stroke-width':'1' }));
    const label = make('text', { x:pad.l-12, y:yy+4, fill:muted, 'font-size':'12', 'text-anchor':'end' });
    label.textContent = format(val, 1); svg.appendChild(label);
  }
  for (let i = 0; i <= 6; i++) {
    const xx = pad.l + i * (W - pad.l - pad.r) / 6;
    const val = maxT * i / 6;
    svg.appendChild(make('line', { x1:xx, y1:pad.t, x2:xx, y2:H-pad.b, stroke:lineColor, 'stroke-width':'1' }));
    const label = make('text', { x:xx, y:H-pad.b+25, fill:muted, 'font-size':'12', 'text-anchor':'middle' });
    label.textContent = format(val, 0); svg.appendChild(label);
  }
  const yLabel = make('text', { x:17, y:H/2, fill:muted, 'font-size':'12', transform:`rotate(-90 17 ${H/2})`, 'text-anchor':'middle' });
  yLabel.textContent = 'Voltaje (V)'; svg.appendChild(yLabel);
  const xLabel = make('text', { x:(pad.l+W-pad.r)/2, y:H-8, fill:muted, 'font-size':'12', 'text-anchor':'middle' });
  xLabel.textContent = 'Tiempo (s)'; svg.appendChild(xLabel);

  if (curve.length) {
    const d = curve.map((p,i) => `${i?'L':'M'} ${x(p.t)} ${y(p.v)}`).join(' ');
    const areaD = `${d} L ${x(curve[curve.length-1].t)} ${H-pad.b} L ${x(curve[0].t)} ${H-pad.b} Z`;
    svg.appendChild(make('path', { d:areaD, fill:'url(#areaGradient)' }));
    svg.appendChild(make('path', { d, fill:'none', stroke:accent, 'stroke-width':'3', 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
  }

  state.data.forEach(point => {
    const group = make('g', { tabindex:'0', role:'button', 'aria-label':`Tiempo ${point.t} segundos, voltaje ${point.v} voltios` });
    const circle = make('circle', { cx:x(point.t), cy:y(point.v), r:'5.5', fill:primary, stroke:'white', 'stroke-width':'2', cursor:'pointer' });
    circle.addEventListener('mouseenter', event => showTooltip(event, point));
    circle.addEventListener('mouseleave', hideTooltip);
    circle.addEventListener('mousemove', event => showTooltip(event, point));
    group.appendChild(circle); svg.appendChild(group);
  });
}

function showTooltip(event, point) {
  const tooltip = $('#chartTooltip');
  const wrap = $('.chart-wrap').getBoundingClientRect();
  tooltip.hidden = false;
  tooltip.innerHTML = `<strong>${format(point.v, 3)} V</strong><br>${format(point.t, 2)} s`;
  tooltip.style.left = `${event.clientX - wrap.left}px`;
  tooltip.style.top = `${event.clientY - wrap.top}px`;
}
function hideTooltip() { $('#chartTooltip').hidden = true; }

function renderAll() {
  syncParams();
  renderTable();
  renderChart();
}

function loadProjectData(mode = state.mode) {
  state.mode = mode;
  $('#analysisMode').value = mode;
  state.data = structuredClone(PROJECT_DATA[mode]);
  state.rk4 = [];
  renderAll();
  toast('Datos experimentales del proyecto cargados.');
}

function nearestPoints(target, count, excludeExact = false) {
  const pool = excludeExact ? state.data.filter(p => Math.abs(p.t - target) > 1e-9) : state.data;
  return [...pool].sort((a,b) => Math.abs(a.t-target)-Math.abs(b.t-target)).slice(0, Math.min(count, pool.length)).sort((a,b)=>a.t-b.t);
}


function newtonInterpolation(points, target) {
  const n = points.length;
  if (n < 2) throw new Error('Se necesitan al menos dos puntos.');
  const coef = points.map(p => p.v);
  for (let j = 1; j < n; j++) {
    for (let i = n - 1; i >= j; i--) {
      const denom = points[i].t - points[i-j].t;
      if (Math.abs(denom) < 1e-12) throw new Error('Hay tiempos repetidos en los datos.');
      coef[i] = (coef[i] - coef[i-1]) / denom;
    }
  }
  let value = coef[n-1];
  for (let i = n - 2; i >= 0; i--) value = value * (target - points[i].t) + coef[i];
  return { value, coef };
}

function evaluateData(t, count = 4) {
  if (state.data.length < 2) throw new Error('Carga al menos dos datos.');
  return newtonInterpolation(nearestPoints(t, count), t).value;
}

function calculateInterpolation() {
  try {
    const target = Number($('#interpTime').value);
    const count = Number($('#interpPoints').value);
    const points = nearestPoints(target, count, true);
    const { value, coef } = newtonInterpolation(points, target);
    const theoretical = modelVoltage(target);
    const error = Math.abs(value - theoretical) / Math.max(Math.abs(theoretical),1e-9) * 100;
    $('#interpResult').innerHTML = `<span>Resultado</span><strong>V(${format(target,2)} s) = ${format(value,4)} V</strong><p>Nodos: ${points.map(p=>`(${p.t}, ${p.v})`).join(', ')}<br>Coeficientes: ${coef.map(c=>format(c,5)).join(' · ')}<br>Error frente al modelo: ${format(error,2)} %.</p>`;
    toast('Interpolación calculada correctamente.');
  } catch (error) { showError(error); }
}

function calculateRoot() {
  try {
    const target = Number($('#targetVoltage').value);
    let t = Number($('#initialGuess').value);
    const measuredMax = state.data.length ? Math.max(...state.data.map(p=>p.v)) : state.params.vs;
    const effectiveFinal = state.mode === 'charge' ? measuredMax : Math.max(measuredMax, state.params.vs);
    if (!Number.isFinite(target) || target <= 0 || target >= effectiveFinal) throw new Error('El voltaje objetivo debe estar dentro del rango físico del circuito.');
    if (!Number.isFinite(t) || t < 0) t = tau();
    const calibratedVoltage = x => state.mode === 'charge'
      ? effectiveFinal * (1 - Math.exp(-x / tau()))
      : effectiveFinal * Math.exp(-x / tau());
    const calibratedDerivative = x => state.mode === 'charge'
      ? (effectiveFinal / tau()) * Math.exp(-x / tau())
      : -(effectiveFinal / tau()) * Math.exp(-x / tau());
    const iterations = [];
    for (let i=0; i<30; i++) {
      const f = calibratedVoltage(t) - target;
      const fp = calibratedDerivative(t);
      if (Math.abs(fp) < 1e-12) throw new Error('La derivada es demasiado pequeña para continuar.');
      const next = Math.max(0, t - f/fp);
      iterations.push({i:i+1,t,f});
      if (Math.abs(next-t) < 1e-9) { t=next; break; }
      t = next;
    }
    $('#rootResult').innerHTML = `<span>Resultado</span><strong>t = ${format(t,4)} s para V = ${format(target,3)} V</strong><p>Modelo calibrado con V∞ = ${format(effectiveFinal,3)} V. Convergencia en ${iterations.length} iteraciones. Residuo final: ${format(calibratedVoltage(t)-target,8)} V.<br>Secuencia: ${iterations.slice(0,5).map(it=>`t${it.i}=${format(it.t,4)}`).join(' → ')}${iterations.length>5?' → …':''}</p>`;
    $('#targetTimeStat').textContent = `${format(t,2)} s`;
    toast('Raíz encontrada con Newton-Raphson.');
  } catch (error) { showError(error); }
}

function calculateDerivative() {
  try {
    const t = Number($('#derivativeTime').value);
    const h = positiveNumber($('#derivativeStep').value, 1);
    const forward = (evaluateData(t+h)-evaluateData(t))/h;
    const backward = (evaluateData(t)-evaluateData(t-h))/h;
    const central = (evaluateData(t+h)-evaluateData(t-h))/(2*h);
    const exact = modelDerivative(t);
    const error = Math.abs(central-exact)/Math.max(Math.abs(exact),1e-9)*100;
    $('#derivativeResult').innerHTML = `<span>Resultado</span><strong>dV/dt ≈ ${format(central,6)} V/s</strong><p>Progresiva: ${format(forward,6)} V/s · Regresiva: ${format(backward,6)} V/s<br>Modelo: ${format(exact,6)} V/s · Error central: ${format(error,2)} %.</p>`;
    toast('Derivación numérica completada.');
  } catch (error) { showError(error); }
}

function clippedData(a,b) {
  const lo = Math.min(a,b), hi = Math.max(a,b);
  const inside = state.data.filter(p=>p.t>lo && p.t<hi);
  return [{t:lo,v:evaluateData(lo)}, ...inside, {t:hi,v:evaluateData(hi)}].sort((x,y)=>x.t-y.t);
}

function calculateIntegration() {
  try {
    const a = Number($('#integrationStart').value);
    const b = Number($('#integrationEnd').value);
    if (!Number.isFinite(a)||!Number.isFinite(b)||a===b) throw new Error('Escribe un intervalo válido.');
    const points = clippedData(a,b);
    let area=0;
    for(let i=0;i<points.length-1;i++) area += (points[i+1].t-points[i].t)*(points[i].v+points[i+1].v)/2;
    const finalV = evaluateData(Math.max(a,b));
    const capacitanceF = state.params.cMicro*1e-6;
    const energy = 0.5*capacitanceF*finalV*finalV;
    $('#integrationResult').innerHTML = `<span>Resultado</span><strong>∫V(t)dt ≈ ${format(Math.abs(area),5)} V·s</strong><p>Trapecios utilizados: ${points.length-1}. Energía almacenada al final: ${format(energy,6)} J.</p>`;
    toast('Integración por trapecios completada.');
  } catch (error) { showError(error); }
}

function solveRK4() {
  try {
    const end = positiveNumber($('#rkEnd').value,60);
    const h = positiveNumber($('#rkStep').value,.5);
    if (h>end) throw new Error('El paso h debe ser menor que el tiempo final.');
    const T=tau(), vs=state.params.vs;
    const initial = state.mode==='charge' ? 0 : (state.data.length?Math.max(...state.data.map(p=>p.v)):vs);
    const f = (_,v) => state.mode==='charge' ? (vs-v)/T : -v/T;
    let t=0,v=initial;
    const arr=[{t,v}];
    while(t<end-1e-12){
      const step=Math.min(h,end-t);
      const k1=f(t,v);
      const k2=f(t+step/2,v+step*k1/2);
      const k3=f(t+step/2,v+step*k2/2);
      const k4=f(t+step,v+step*k3);
      v += step*(k1+2*k2+2*k3+k4)/6;
      t += step;
      arr.push({t,v});
      if(arr.length>20000) throw new Error('Demasiados pasos; aumenta h.');
    }
    state.rk4=arr;
    renderChart();
    const exact=modelVoltage(end);
    const error=Math.abs(v-exact)/Math.max(Math.abs(exact),1e-9)*100;
    $('#rkResult').innerHTML=`<span>Resultado</span><strong>V(${format(end,2)} s) = ${format(v,6)} V</strong><p>${arr.length-1} pasos RK4 con h = ${format(h,3)} s. Modelo analítico: ${format(exact,6)} V. Error: ${format(error,6)} %.</p>`;
    toast('La solución RK4 se añadió a la gráfica.');
  } catch(error){showError(error);}
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const parsed=[];
  for(let i=0;i<lines.length;i++){
    const cols=lines[i].trim().split(/[;,\t ]+/);
    if(cols.length<2) continue;
    const t=Number(cols[0].replace(',','.'));
    const v=Number(cols[1].replace(',','.'));
    if(Number.isFinite(t)&&Number.isFinite(v)) parsed.push({t,v});
  }
  if(parsed.length<2) throw new Error('El CSV debe contener al menos dos filas numéricas: tiempo, voltaje.');
  return parsed;
}

function downloadCsv() {
  const rows=['tiempo_s,voltaje_V,modelo_V,error_porcentaje'];
  state.data.forEach(p=>{
    const m=modelVoltage(p.t); const e=Math.abs(p.v-m)/Math.max(Math.abs(p.v),1e-9)*100;
    rows.push(`${p.t},${p.v},${m},${e}`);
  });
  const blob=new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`datos_rc_${state.mode}.csv`; a.click(); URL.revokeObjectURL(url);
  toast('Archivo CSV descargado.');
}

function switchTab(tabName) {
  $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tabName));
  $$('.tab-content').forEach(c=>c.classList.toggle('active',c.id===tabName));
  const [title,code]=algorithms[tabName];
  $('#algorithmBox').innerHTML=`<strong>${title}</strong><code>${code}</code>`;
}

function toast(message) {
  const el=$('#toast'); el.textContent=message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2800);
}
function showError(error) { toast(`Error: ${error.message || error}`); }

function bindEvents() {
  ['sourceVoltage','resistance','capacitance'].forEach(id=>$('#'+id).addEventListener('input',()=>{state.rk4=[];renderAll();}));
  $('#analysisMode').addEventListener('change',e=>loadProjectData(e.target.value));
  $('#simulateButton').addEventListener('click',()=>{state.rk4=[];renderAll();toast('Simulación actualizada.');});
  $('#loadDemoButton').addEventListener('click',()=>loadProjectData());
  $('#loadDemoTop').addEventListener('click',()=>loadProjectData());
  $('#openCsvButton').addEventListener('click',()=>$('#csvInput').click());
  $('#csvInput').addEventListener('change',async e=>{
    const file=e.target.files[0]; if(!file)return;
    try{state.data=parseCsv(await file.text());state.rk4=[];renderAll();toast(`${state.data.length} datos importados.`);}catch(error){showError(error);}finally{e.target.value='';}
  });
  $('#downloadDataButton').addEventListener('click',downloadCsv);
  $('#addRowButton').addEventListener('click',()=>{const last=state.data.at(-1)||{t:0,v:0};state.data.push({t:last.t+1,v:last.v});renderAll();});
  $('#clearRowsButton').addEventListener('click',()=>{state.data=[];state.rk4=[];renderAll();toast('Tabla limpiada.');});
  $('#interpButton').addEventListener('click',calculateInterpolation);
  $('#rootButton').addEventListener('click',calculateRoot);
  $('#derivativeButton').addEventListener('click',calculateDerivative);
  $('#integrationButton').addEventListener('click',calculateIntegration);
  $('#rkButton').addEventListener('click',solveRK4);
  $$('.tab').forEach(tab=>tab.addEventListener('click',()=>switchTab(tab.dataset.tab)));
  $('#themeButton').addEventListener('click',()=>{
    document.body.classList.toggle('light');
    $('#themeButton').textContent=document.body.classList.contains('light')?'🌙':'☀️';
    renderChart();
  });
  window.addEventListener('resize',()=>renderChart());
}

bindEvents();
renderAll();
calculateInterpolation();
