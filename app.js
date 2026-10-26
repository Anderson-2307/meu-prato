'use strict';

const KEY = 'meu-prato-v1';
const MEALS = [
  ['cafe', 'Café da manhã', '☕'],
  ['almoco', 'Almoço', '🍽️'],
  ['lanche', 'Lanche', '🍎'],
  ['jantar', 'Jantar', '🌙'],
  ['ceia', 'Ceia', '🥛'],
];
const ACTIVITY = [
  [1.2, 'Sedentário (pouco ou nenhum exercício)'],
  [1.375, 'Leve (1–3 treinos/semana)'],
  [1.55, 'Moderado (3–5 treinos/semana)'],
  [1.725, 'Intenso (6–7 treinos/semana)'],
  [1.9, 'Muito intenso (2x ao dia / trabalho braçal)'],
];

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r0 = n => Math.round(n || 0);
const r1 = n => Math.round((n || 0) * 10) / 10;
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const iso = d => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- estado ---------- */
const defaults = () => ({
  profile: { sex: 'm', age: 30, weight: 80, height: 170, activity: 1.375, deficit: 500, kcal: 2000, p: 120, c: 200, f: 60 },
  days: {},
});
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    const d = defaults();
    const p = { ...d.profile, ...(s && s.profile) };
    delete p.apiKey; delete p.model;
    return { ...d, ...s, profile: p };
  } catch { return defaults(); }
}
let S = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('Não foi possível salvar (armazenamento cheio?)'); } };

let view = 'hoje';
let date = iso(new Date());
const hourMeal = () => { const h = new Date().getHours(); return h < 10 ? 'cafe' : h < 15 ? 'almoco' : h < 18 ? 'lanche' : h < 22 ? 'jantar' : 'ceia'; };
let D = { meal: hourMeal(), text: '', grams: '', items: [] };

const sum = a => a.reduce((t, e) => ({ kcal: t.kcal + e.kcal, p: t.p + e.p, c: t.c + e.c, f: t.f + e.f }), { kcal: 0, p: 0, c: 0, f: 0 });
const dayEntries = d => S.days[d] || [];

/* ---------- utilidades de UI ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}
function fmtDate(d) {
  const dt = new Date(d + 'T12:00:00'), t = iso(new Date());
  const diff = Math.round((new Date(d + 'T12:00:00') - new Date(t + 'T12:00:00')) / 864e5);
  const base = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  return diff === 0 ? 'Hoje · ' + base : diff === -1 ? 'Ontem · ' + base : base;
}
function go(v, meal) {
  view = v;
  if (meal) D.meal = meal;
  render();
  window.scrollTo(0, 0);
}

/* ---------- tela: hoje ---------- */
function macroBar(label, color, val, goal, unit = 'g') {
  const pct = goal > 0 ? Math.min(100, (val / goal) * 100) : 0;
  const left = goal - val;
  return `<div class="macro">
    <div class="top"><span><i class="dot" style="background:${color}"></i><b>${label}</b> ${r0(val)}${unit} <span class="mut">/ ${r0(goal)}${unit}</span></span>
    <span class="${left < 0 ? '' : 'mut'}" style="${left < 0 ? 'color:var(--danger)' : ''}">${left >= 0 ? 'faltam ' + r0(left) : 'passou ' + r0(-left)}${unit}</span></div>
    <div class="bar"><i style="width:${pct}%;background:${left < 0 ? 'var(--danger)' : color}"></i></div></div>`;
}

function viewHoje() {
  const P = S.profile, list = dayEntries(date), tot = sum(list);
  const left = P.kcal - tot.kcal, pct = P.kcal > 0 ? Math.min(1, tot.kcal / P.kcal) : 0;
  const C = 2 * Math.PI * 52;
  const meals = MEALS.map(([id, name, ico]) => {
    const items = list.filter(e => e.meal === id), t = sum(items);
    return `<div class="card">
      <div class="meal-head"><div><b>${ico} ${name}</b><div class="small mut">${items.length ? `${r0(t.kcal)} kcal · P ${r0(t.p)} · C ${r0(t.c)} · G ${r0(t.f)}` : 'Nada registrado'}</div></div>
      <button class="addlink" data-act="addto" data-meal="${id}">+ Adicionar</button></div>
      ${items.map(e => `<div class="item"><div class="grow"><div class="nm">${esc(e.name)}</div>
        <div class="small mut">${e.grams ? r0(e.grams) + ' g · ' : ''}P ${r0(e.p)} · C ${r0(e.c)} · G ${r0(e.f)}</div></div>
        <b>${r0(e.kcal)}</b><span class="small mut">kcal</span>
        <button data-act="del" data-id="${e.id}" aria-label="Remover">✕</button></div>`).join('')}
    </div>`;
  }).join('');
  return `<div class="datebar">
      <button class="iconbtn" data-act="day" data-d="-1" aria-label="Dia anterior">‹</button>
      <b>${fmtDate(date)}</b>
      <button class="iconbtn" data-act="day" data-d="1" aria-label="Próximo dia">›</button></div>
    <div class="card">
      <div class="ring ${left < 0 ? 'over' : ''}">
        <svg viewBox="0 0 124 124"><circle class="bg" cx="62" cy="62" r="52" fill="none" stroke-width="12"/>
          <circle class="fg" cx="62" cy="62" r="52" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
        <div class="grow">
          <div class="stat"><div class="small mut">Consumido</div><div class="big">${r0(tot.kcal)} <span class="small mut">kcal</span></div></div>
          <div class="stat"><div class="small mut">${left >= 0 ? 'Ainda falta' : 'Passou da meta'}</div>
          <div style="font-size:20px;font-weight:700;${left < 0 ? 'color:var(--danger)' : ''}">${r0(Math.abs(left))} kcal</div></div>
          <div class="small mut">Meta: ${r0(P.kcal)} kcal</div>
        </div></div>
      ${macroBar('Proteína', 'var(--p)', tot.p, P.p)}
      ${macroBar('Carboidrato', 'var(--c)', tot.c, P.c)}
      ${macroBar('Gordura', 'var(--f)', tot.f, P.f)}
    </div>${meals}`;
}

/* ---------- tela: adicionar ---------- */
function recents() {
  const seen = new Set(), out = [];
  const all = Object.values(S.days).flat().sort((a, b) => b.t - a.t);
  for (const e of all) {
    const k = e.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k); out.push(e);
    if (out.length >= 8) break;
  }
  return out;
}

function draftTotals() { return sum(D.items); }

function viewAdd() {
  const P = S.profile, dt = draftTotals(), cur = sum(dayEntries(date));
  const after = P.kcal - cur.kcal - dt.kcal;
  const rec = recents();
  const items = D.items.map((it, i) => `<div class="ditem">
      <input class="nmin" data-i="${i}" data-f="name" value="${esc(it.name)}" aria-label="Nome">
      ${it.note ? `<div class="small mut" style="margin-top:4px">${esc(it.note)}</div>` : ''}
      <div class="grid4" style="margin-top:8px">
        <div><label>Gramas</label><input inputmode="decimal" data-i="${i}" data-f="grams" value="${r0(it.grams) || ''}"></div>
        <div><label>kcal</label><input inputmode="decimal" data-i="${i}" data-f="kcal" value="${r0(it.kcal)}"></div>
        <div><label>Prot.</label><input inputmode="decimal" data-i="${i}" data-f="p" value="${r1(it.p)}"></div>
        <div><label>Carb.</label><input inputmode="decimal" data-i="${i}" data-f="c" value="${r1(it.c)}"></div>
      </div>
      <div class="grid4" style="margin-top:0"><div><label>Gord.</label><input inputmode="decimal" data-i="${i}" data-f="f" value="${r1(it.f)}"></div>
        <div style="grid-column:span 3;align-self:end"><button class="btn ghost" style="padding:11px" data-act="rm" data-i="${i}">Remover item</button></div></div>
    </div>`).join('');
  return `<h1>Adicionar alimento</h1>
    <div class="card">
      <h2>Refeição</h2>
      <div class="chips" style="margin-top:8px">${MEALS.map(([id, n, ico]) => `<button class="chip ${D.meal === id ? 'on' : ''}" data-act="meal" data-meal="${id}">${ico} ${n}</button>`).join('')}</div>
      <label>Alimento</label>
      <input id="ftext" placeholder="ex: arroz parbolizado" value="${esc(D.text)}">
      <label>Peso em gramas</label>
      <input id="fgrams" inputmode="decimal" placeholder="ex: 100" value="${esc(D.grams)}">
      <div class="btns"><button class="btn" data-act="manual">➕ Adicionar alimento</button></div>
    </div>
    ${rec.length ? `<div class="card"><h2>Recentes</h2><div class="chips" style="margin-top:8px">${rec.map((e, i) => `<button class="chip" data-act="recent" data-i="${i}">${esc(e.name)}${e.grams ? ' · ' + r0(e.grams) + 'g' : ''}</button>`).join('')}</div></div>` : ''}
    ${D.items.length ? `<div class="card"><h2>Resultado (ajuste se precisar)</h2>${items}
      <div class="notice"><b>${r0(dt.kcal)} kcal</b> · P ${r0(dt.p)}g · C ${r0(dt.c)}g · G ${r0(dt.f)}g<br>
      ${after >= 0 ? `Depois de salvar, ainda faltam <b>${r0(after)} kcal</b> hoje.` : `Isso passa a meta do dia em <b style="color:var(--danger)">${r0(-after)} kcal</b>.`}</div>
      <div class="btns"><button class="btn" data-act="save">Salvar em ${MEALS.find(m => m[0] === D.meal)[1]}</button></div>
      <div class="small mut" style="margin-top:8px">Preencha os valores do item. Se mudar as gramas, os valores se ajustam proporcionalmente.</div>
    </div>` : ''}`;
}

/* ---------- tela: metas ---------- */
function calcGoals() {
  const P = S.profile;
  const bmr = 10 * P.weight + 6.25 * P.height - 5 * P.age + (P.sex === 'm' ? 5 : -161);
  const tdee = bmr * P.activity;
  const kcal = Math.max(1200, r0(tdee - P.deficit));
  const p = r0(Math.min(2 * P.weight, 2.2 * P.weight));
  const f = r0((kcal * 0.25) / 9);
  const c = Math.max(0, r0((kcal - p * 4 - f * 9) / 4));
  return { bmr: r0(bmr), tdee: r0(tdee), kcal, p, c, f };
}

function viewMetas() {
  const P = S.profile, g = calcGoals();
  const inp = (k, lab, extra = '') => `<div><label>${lab}</label><input inputmode="decimal" data-p="${k}" value="${esc(P[k])}" ${extra}></div>`;
  return `<h1>Metas</h1>
    <div class="card"><h2>Calcular meta para emagrecer</h2>
      <div class="grid2">
        <div><label>Sexo</label><select data-p="sex"><option value="m" ${P.sex === 'm' ? 'selected' : ''}>Masculino</option><option value="f" ${P.sex === 'f' ? 'selected' : ''}>Feminino</option></select></div>
        ${inp('age', 'Idade')}
        ${inp('weight', 'Peso atual (kg)')}
        ${inp('height', 'Altura (cm)')}
      </div>
      <label>Nível de atividade</label>
      <select data-p="activity">${ACTIVITY.map(([v, n]) => `<option value="${v}" ${+P.activity === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label>Déficit diário (kcal) — 500 ≈ 0,5 kg/semana</label>
      <input inputmode="decimal" data-p="deficit" value="${esc(P.deficit)}">
      <div class="notice">Metabolismo basal: <b>${g.bmr} kcal</b> · Gasto total: <b>${g.tdee} kcal</b><br>
        Sugestão: <b>${g.kcal} kcal</b> · P ${g.p}g · C ${g.c}g · G ${g.f}g</div>
      <div class="btns"><button class="btn" data-act="applygoal">Usar esta sugestão</button></div>
      <div class="small mut" style="margin-top:8px">Estimativa pela fórmula de Mifflin-St Jeor. Não substitui acompanhamento de nutricionista ou médico.</div>
    </div>
    <div class="card"><h2>Minhas metas diárias</h2>
      <div class="grid2">${inp('kcal', 'Calorias (kcal)')}${inp('p', 'Proteína (g)')}${inp('c', 'Carboidrato (g)')}${inp('f', 'Gordura (g)')}</div>
    </div>
    <div class="card"><h2>Backup</h2>
      <div class="grid2" style="margin-top:8px"><button class="btn sec" data-act="export">⬇️ Exportar</button><button class="btn sec" data-act="import">⬆️ Importar</button></div>
      <input id="fimp" type="file" accept="application/json" class="hidden">
    </div>`;
}

/* ---------- ações ---------- */
function scaleItem(it, newGrams) {
  if (it.grams > 0 && newGrams > 0) {
    const k = newGrams / it.grams;
    it.kcal *= k; it.p *= k; it.c *= k; it.f *= k;
  }
  it.grams = newGrams;
}

document.addEventListener('click', async e => {
  const nav = e.target.closest('[data-go]');
  if (nav) return go(nav.dataset.go);
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'addto') return go('add', b.dataset.meal);
  if (a === 'day') { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + +b.dataset.d); date = iso(d); return render(); }
  if (a === 'del') {
    if (!confirm('Remover este item?')) return;
    S.days[date] = dayEntries(date).filter(x => x.id !== b.dataset.id); save(); return render();
  }
  if (a === 'meal') { D.meal = b.dataset.meal; return render(); }
  if (a === 'manual') { D.items.push({ name: D.text.trim() || 'Alimento', grams: num(D.grams), kcal: 0, p: 0, c: 0, f: 0, note: '' }); D.text = ''; D.grams = ''; return render(); }
  if (a === 'rm') { D.items.splice(+b.dataset.i, 1); return render(); }
  if (a === 'recent') { const e2 = recents()[+b.dataset.i]; D.items.push({ name: e2.name, grams: e2.grams, kcal: e2.kcal, p: e2.p, c: e2.c, f: e2.f, note: '' }); return render(); }
  if (a === 'save') {
    const day = dayEntries(date).slice();
    D.items.forEach(it => day.push({ id: uid(), meal: D.meal, name: it.name || 'Alimento', grams: it.grams, kcal: it.kcal, p: it.p, c: it.c, f: it.f, t: Date.now() }));
    S.days[date] = day; save();
    D = { meal: D.meal, text: '', grams: '', items: [] };
    toast('Salvo!'); return go('hoje');
  }
  if (a === 'applygoal') { Object.assign(S.profile, (({ kcal, p, c, f }) => ({ kcal, p, c, f }))(calcGoals())); save(); toast('Metas atualizadas'); return render(); }
  if (a === 'export') {
    const url = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
    const l = document.createElement('a'); l.href = url; l.download = `diario-de-calorias-${iso(new Date())}.json`; l.click();
    return setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  if (a === 'import') return $('#fimp').click();
});

document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'fimp') {
    try {
      const j = JSON.parse(await t.files[0].text());
      if (!j.days || !j.profile) throw 0;
      if (!confirm('Substituir seus dados atuais pelo backup?')) return;
      S = { ...defaults(), ...j, profile: { ...defaults().profile, ...j.profile } }; save(); toast('Backup importado'); render();
    } catch { toast('Arquivo de backup inválido'); }
    return;
  }
  if (t.dataset.p) {
    const k = t.dataset.p, text = k === 'sex';
    S.profile[k] = text ? t.value.trim() : k === 'activity' ? +t.value : num(t.value);
    save();
    if (view === 'metas' && !['kcal', 'p', 'c', 'f'].includes(k)) render();
    return;
  }
  if (t.dataset.f !== undefined) {
    const it = D.items[+t.dataset.i], f = t.dataset.f;
    if (f === 'name') it.name = t.value;
    else if (f === 'grams') scaleItem(it, num(t.value));
    else it[f] = num(t.value);
    return render();
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'ftext') D.text = e.target.value;
  if (e.target.id === 'fgrams') D.grams = e.target.value;
});

/* ---------- render ---------- */
function render() {
  const el = $('#app');
  el.innerHTML = view === 'hoje' ? viewHoje() : view === 'add' ? viewAdd() : viewMetas();
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === view));
}

render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
