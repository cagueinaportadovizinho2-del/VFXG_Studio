// Gera painéis de controles a partir de esquemas simples. Listas (textura/modelo) são dinâmicas.
VFX.schemaPart = [
  ['Efeito', [['name','Nome','text'],['partOn','Partículas ativas','check']]],
  ['Emissão', [['mode','Modo','select',['continuous','burst']],['amount','Quantidade','range',1,3000,1],['lifetime','Vida (s)','range',.1,6,.05],['loop','Repetir','check'],['localCoords','Coords locais','check'],
    ['shape','Forma','select',['point','sphere','box']],['radius','Raio','range',0,3,.01],['boxX','Caixa X','range',0,5,.05],['boxY','Caixa Y','range',0,5,.05],['boxZ','Caixa Z','range',0,5,.05],['offsetY','Altura','range',0,8,.05]]],
  ['Movimento', [['spread','Abertura °','range',0,180,1],['down','Para baixo','check'],['speed','Velocidade','range',0,15,.05],['speedRandom','Var. veloc.','range',0,1,.01],['gravity','Gravidade','range',-15,15,.1],['damping','Atrito','range',0,10,.1]]],
  ['Aparência', [['texture','Textura','select',() => VFX.textures.all()],['model','Modelo 3D','select',() => [''].concat(Object.keys(VFX.assets.models))],
    ['sizeStart','Tam. início','range',0,6,.01],['sizeEnd','Tam. fim','range',0,6,.01],['sizeRandom','Var. tam.','range',0,1,.01],
    ['rotation','Rotação ±°','range',0,180,1],['rotSpeed','Giro °/s','range',-360,360,1],['alignVel','Y-Billboard','check'],
    ['colorStart','Cor início','color'],['colorEnd','Cor fim','color'],['alphaStart','Alpha início','range',0,1,.01],['alphaEnd','Alpha fim','range',0,1,.01],['alphaEndAt','Alpha chega em','range',.02,1,.01],
    ['blend','Mistura','select',['add','normal']]]]
];
VFX.schemaIx = [
  ['Interseção (material)', [['ixOn','Ativar efeito','check'],['ixDouble','Dois lados','check']]],
  ['Borda de luz', [['ixEdge','Cor da borda','color'],['ixEdgeA','Alpha borda','range',0,1,.01],['ixWidth','Largura','range',.01,1,.005],['ixPower','Nitidez','range',.5,8,.1],['ixIntensity','Brilho','range',.5,8,.1]]],
  ['Corpo do objeto', [['ixTexture','Textura','select',() => [''].concat(VFX.textures.all())],['ixBase','Cor do corpo','color'],['ixBaseA','Alpha corpo','range',0,1,.01],['ixFresnel','Fresnel','range',0,2,.01]]]
];
VFX.schemaDs = [
  ['Dissolver (material)', [['dsOn','Ativar efeito','check'],['dsAnimate','Animar','check'],['dsLoop','Repetir','check'],['dsDuration','Duração (s)','range',.3,8,.05],['dsAmount','Progresso','range',0,1,.005]]],
  ['Dissolução', [['dsScale','Escala do ruído','range',.5,12,.1],['dsDir','Baixo → cima','range',0,1,.01],['dsEdgeW','Larg. da borda','range',.005,.3,.005],['dsEdge','Cor da borda','color'],['dsIntensity','Brilho','range',.5,10,.1],['dsDouble','Dois lados','check']]],
  ['Corpo do objeto', [['ixTexture','Textura','select',() => [''].concat(VFX.textures.all())],['ixBase','Cor do corpo','color']]]
];
VFX.buildPanel = function (root, params, onChange, schema) {
  const full = [], values = [], fmt = v => typeof v === 'number' ? +v.toFixed(3) : v;
  schema.forEach(([title, items]) => {
    const h = document.createElement('h3'); h.textContent = title; root.appendChild(h);
    items.forEach(([key, label, type, a, b, c]) => {
      const row = document.createElement('div'); row.className = 'row';
      const l = document.createElement('label'); l.textContent = label; row.appendChild(l);
      let inp, out; const opts = type === 'select' ? (typeof a === 'function' ? a : () => a) : null;
      if (type === 'select') inp = document.createElement('select');
      else { inp = document.createElement('input'); inp.type = type === 'check' ? 'checkbox' : type;
        if (type === 'range') { inp.min = a; inp.max = b; inp.step = c; out = document.createElement('output'); } }
      const set = () => { const v = type === 'check' ? inp.checked : type === 'range' ? parseFloat(inp.value) : inp.value;
        params[key] = v; if (out) out.textContent = fmt(v); onChange(key); };
      inp.addEventListener('input', set); row.appendChild(inp); if (out) row.appendChild(out); root.appendChild(row);
      const setVal = () => { if (type === 'check') inp.checked = !!params[key]; else inp.value = params[key]; if (out) out.textContent = fmt(params[key]); };
      const rebuild = () => { if (opts) { inp.innerHTML = ''; opts().forEach(o => inp.add(new Option(o || '(nenhum)', o))); } };
      full.push(() => { rebuild(); setVal(); }); values.push(setVal);
    });
  });
  const api = { refresh() { full.forEach(f => f()); }, sync() { values.forEach(f => f()); } }; api.refresh(); return api;
};
