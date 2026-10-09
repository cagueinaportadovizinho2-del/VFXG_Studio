// Ponto de entrada: cena 3D, câmera orbital, abas (Partículas / Interseção / Dissolver / Cena), biblioteca e exportação.
(function () {
  const $ = id => document.getElementById(id), view = $('view');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); view.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x14161c);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.2, 200);
  const grid = new THREE.GridHelper(10, 20, 0x555a6e, 0x2a2d38); grid.position.y = 0.003;
  const helpers = new THREE.Group(); helpers.add(grid, new THREE.AxesHelper(1)); scene.add(helpers);
  const sys = new VFX.ParticleSystem(scene), P = sys.p;
  const stage = new VFX.Stage(scene, camera, renderer), ixm = new VFX.IxMaterial(stage), dsm = new VFX.DsMaterial(stage);

  // Câmera orbital + seleção por clique
  let az = 0.6, el = 0.35, dist = 8, orbit = false, down = null; const target = new THREE.Vector3(0, 1, 0), cv = renderer.domElement;
  const placeCam = () => { camera.position.set(target.x + dist*Math.cos(el)*Math.sin(az), target.y + dist*Math.sin(el), target.z + dist*Math.cos(el)*Math.cos(az)); camera.lookAt(target); };
  cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; orbit = !stage.tc.axis; if (orbit) cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointerup', e => {
    const click = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4 && orbit; orbit = false; down = null;
    if (click && !stage.tc.axis) stage.select(stage.pick(e.clientX, e.clientY));
  });
  cv.addEventListener('pointermove', e => { if (!orbit || stage.dragging) return; az -= e.movementX * 0.01; el = Math.max(-1.4, Math.min(1.4, el + e.movementY * 0.01)); });
  cv.addEventListener('wheel', e => { e.preventDefault(); dist = Math.max(1.5, Math.min(40, dist * (1 + e.deltaY * 0.001))); }, { passive: false });
  function resize() { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); sys.updateScale(cv.height, camera.fov); }
  addEventListener('resize', resize);

  // Abas do painel direito
  const panelEl = $('panel'), tabs = document.createElement('div'); tabs.className = 'tabs'; panelEl.appendChild(tabs);
  const tabNames = ['Partículas', 'Interseção', 'Dissolver', 'Cena'], tabEls = tabNames.map(() => { const d = document.createElement('div'); panelEl.appendChild(d); return d; });
  const tabBtns = tabNames.map((n, i) => { const b = document.createElement('button'); b.textContent = n; b.onclick = () => showTab(i); tabs.appendChild(b); return b; });
  function showTab(i) { tabEls.forEach((d, k) => d.style.display = k === i ? '' : 'none'); tabBtns.forEach((b, k) => b.classList.toggle('on', k === i)); }
  showTab(0);

  // Efeito de material ativo (interseção OU dissolver; nunca os dois)
  const fxMode = () => P.dsOn ? 'ds' : 'ix';
  function applyFx() {
    ixm.apply(P); dsm.apply(P);
    stage.fxMat = P.ixOn ? ixm.mat : P.dsOn ? dsm.mat : null; stage.fxOn = !!(P.ixOn || P.dsOn); stage.applyMaterials();
  }
  // Se um efeito for ligado e nenhum objeto o usar, marca o selecionado (ou cria o template).
  function ensureFxObjects() {
    if (!stage.fxOn || stage.items.some(i => i.fx)) return;
    const cand = stage.sel && stage.sel.kind !== 'floor' ? stage.sel : stage.items.find(i => i.kind !== 'floor');
    if (cand) stage.setFx(cand, true); else stage.setDemo(stage.demoKind, fxMode());
  }
  let dsT0 = performance.now(), lastSync = 0;
  const restartDs = () => { dsT0 = performance.now(); };

  const APPEARANCE = ['colorStart', 'colorEnd', 'blend', 'texture', 'model', 'alignVel'];
  let lib = null;
  const panelPart = VFX.buildPanel(tabEls[0], P, key => { if (APPEARANCE.includes(key)) { sys.applyAppearance(); if (lib) lib.render(); } if (['mode', 'loop', 'lifetime'].includes(key)) sys.trigger(); }, VFX.schemaPart);
  let panelIx, panelDs;
  function onFxChange(key) {
    if (key === 'ixOn' && P.ixOn) P.dsOn = false;
    if (key === 'dsOn' && P.dsOn) P.ixOn = false;
    if (key === 'ixTexture' && P.ixTexture && P.ixBase === VFX.defaults.ixBase) P.ixBase = '#ffffff'; // textura entra sem escurecer
    if (key === 'dsAmount') P.dsAnimate = false; // mexer no slider para a animação
    if (['dsAnimate', 'dsLoop', 'dsDuration', 'dsOn'].includes(key)) restartDs();
    applyFx();
    if ((key === 'ixOn' || key === 'dsOn') && stage.fxOn && stage.items.some(i => i.demo)) stage.setDemo(stage.demoKind, fxMode()); // reposiciona o template para o efeito
    ensureFxObjects(); panelIx.sync(); panelDs.sync(); renderScene();
  }
  panelIx = VFX.buildPanel(tabEls[1], P, onFxChange, VFX.schemaIx);
  panelDs = VFX.buildPanel(tabEls[2], P, onFxChange, VFX.schemaDs);
  [[tabEls[1], 'Material aplicado nos objetos marcados com 💠 na aba Cena. A borda de luz aparece onde o objeto atravessa outro (o chão, por exemplo). Mova o objeto e veja.'],
   [tabEls[2], 'Material de dissolução: o objeto some por ruído com uma borda brilhante. "Progresso" vai de 0 (inteiro) a 1 (sumiu); com "Animar" ligado ele repete sozinho.']].forEach(([el, txt]) => { const d = document.createElement('div'); d.className = 'hint'; d.textContent = txt; el.prepend(d); });

  // Seletor do modelo do template (cubo por padrão): troca o objeto mantendo o efeito aplicado
  const demoSelects = [];
  [tabEls[1], tabEls[2]].forEach(el => {
    const row = document.createElement('div'); row.className = 'row'; row.innerHTML = '<label>Modelo base</label>'; const s = document.createElement('select');
    s.onchange = () => { stage.setDemo(s.value, fxMode()); fillDemoSelects(); }; row.appendChild(s); el.prepend(row); demoSelects.push(s);
  });
  function fillDemoSelects() {
    demoSelects.forEach(s => { s.innerHTML = ''; [['cube', 'Cubo'], ['sphere', 'Esfera'], ['cylinder', 'Cilindro']].forEach(([v, l]) => s.add(new Option(l, v)));
      Object.keys(VFX.assets.models).forEach(n => s.add(new Option('🧊 ' + n, 'model:' + n))); s.value = stage.demoKind; });
  }
  fillDemoSelects();

  function setParams(obj) {
    Object.assign(P, VFX.defaults, obj); if (P.model && !VFX.assets.models[P.model]) P.model = ''; if (!VFX.textures.all().includes(P.texture)) P.texture = 'soft';
    if (P.ixTexture && !VFX.textures.all().includes(P.ixTexture)) P.ixTexture = '';
    sys.applyAppearance(); applyFx(); ensureFxObjects(); panelPart.refresh(); panelIx.refresh(); panelDs.refresh(); sys.reset(); sys.trigger(); restartDs(); renderScene();
    showTab(P.ixOn && !P.partOn ? 1 : P.dsOn && !P.partOn ? 2 : 0);
  }
  Object.keys(VFX.presets).forEach(name => {
    const b = document.createElement('button'); b.textContent = name;
    b.onclick = () => { const o = Object.assign({}, VFX.presets[name]), demo = o.demo; delete o.demo; setParams(o); if (demo) stage.setDemo(stage.demoKind, fxMode()); fillDemoSelects(); lib.render(); };
    $('presetList').appendChild(b);
  });

  // Aba "Cena": objetos de teste com gizmo
  const sc = tabEls[3]; sc.innerHTML = '<h3>Adicionar à cena</h3><div class="btn-grid" id="addBtns"></div><select id="sceneModel"></select><button id="addModel" style="width:100%;margin-bottom:6px">＋ Modelo importado</button>' +
    '<h3>Gizmo</h3><div class="btn-grid" id="modeBtns"></div><div class="hint">Clique num objeto no preview para selecionar. Atalhos: W mover · E girar · R escalar. O botão 💠 liga o efeito de material (interseção ou dissolver) no objeto.</div><h3>Objetos</h3><div id="sceneList"></div>';
  [['floor', '＋ Chão'], ['cube', '＋ Cubo'], ['sphere', '＋ Esfera'], ['cylinder', '＋ Cilindro']].forEach(([k, l]) => { const b = document.createElement('button'); b.textContent = l; b.onclick = () => stage.add(k); $('addBtns').appendChild(b); });
  const modes = [['translate', 'Mover (W)'], ['rotate', 'Girar (E)'], ['scale', 'Escalar (R)']], modeBtn = {};
  modes.forEach(([m, l]) => { const b = document.createElement('button'); b.textContent = l; b.onclick = () => setMode(m); $('modeBtns').appendChild(b); modeBtn[m] = b; });
  function setMode(m) { stage.setMode(m); modes.forEach(([k]) => modeBtn[k].classList.toggle('on', k === m)); } setMode('translate');
  $('addModel').onclick = () => { const n = $('sceneModel').value; if (n) stage.add('model', n); else alert('Importe um modelo (OBJ/GLB) na biblioteca primeiro.'); };
  function renderModels() { const s = $('sceneModel'); s.innerHTML = ''; const names = Object.keys(VFX.assets.models); if (!names.length) s.add(new Option('(nenhum modelo importado)', '')); names.forEach(n => s.add(new Option(n, n))); fillDemoSelects(); }
  function renderScene() {
    const L = $('sceneList'); L.innerHTML = '';
    stage.items.forEach(it => {
      const d = document.createElement('div'); d.className = 'lib-row' + (stage.sel === it ? ' on' : ''); d.onclick = () => stage.select(it);
      const t = document.createElement('span'); t.className = 'lib-name'; t.textContent = (it.kind === 'floor' ? '🟫 ' : it.kind === 'model' ? '🧊 ' : '⬜ ') + it.name; d.appendChild(t);
      [['💠', 'Usar o efeito de material neste objeto', () => { if (!stage.fxOn && !it.fx) { P.ixOn = true; applyFx(); panelIx.sync(); } stage.setFx(it, !it.fx); }, true],
       ['👁', 'Mostrar/ocultar', () => { it.obj.visible = !it.obj.visible; stage.refreshSel(); }], ['✕', 'Apagar', () => stage.remove(it)]].forEach(([lab, title, fn, keep]) => {
        const b = document.createElement('button'); b.textContent = lab; b.title = title; if (keep) b.className = 'keep' + (it.fx && stage.fxOn ? '' : ' off');
        b.onclick = e => { e.stopPropagation(); fn(); }; d.appendChild(b); });
      L.appendChild(d);
    });
  }
  stage.onSelect = renderScene; renderScene(); renderModels();
  addEventListener('keydown', e => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; const k = e.key.toLowerCase(); if (k === 'w') setMode('translate'); else if (k === 'e') setMode('rotate'); else if (k === 'r') setMode('scale'); });

  // Biblioteca (estilo FileSystem da Godot)
  const refreshAll = () => { sys.applyAppearance(); applyFx(); panelPart.refresh(); panelIx.refresh(); panelDs.refresh(); lib.render(); renderScene(); };
  lib = VFX.buildLibrary($('library'), {
    useTexture: n => { P.texture = n; P.model = ''; refreshAll(); },
    useModel: n => { P.model = n; refreshAll(); },
    loadEffect: n => { setParams(VFX.library.effects[n]); lib.render(); },
    saveEffect: () => { const n = VFX.safeName(P.name), copy = JSON.parse(JSON.stringify(P)); VFX.library.effects[n] = copy; VFX.store.put('effects', n, { params: copy }); lib.render(); },
    remove: (kind, name) => {
      if (kind === 'effects') delete VFX.library.effects[name];
      else {
        if (kind === 'textures') { if (P.texture === name) P.texture = 'soft'; if (P.ixTexture === name) P.ixTexture = ''; }
        if (kind === 'models') { if (P.model === name) P.model = ''; stage.items.filter(i => i.kind === 'model' && i.model === name).forEach(i => stage.remove(i)); if (stage.demoKind === 'model:' + name) stage.demoKind = 'cube'; }
        VFX.assets.remove(kind, name);
      }
      VFX.store.del(kind, name); refreshAll();
    },
    importFiles: () => $('fAssets').click(),
    isActive: (kind, n) => (kind === 'textures' && !P.model && P.texture === n) || (kind === 'models' && P.model === n)
  });
  VFX.assets.onChange = () => { panelPart.refresh(); panelIx.refresh(); panelDs.refresh(); renderModels(); lib.render(); };

  async function importFiles(files) {
    for (const f of files) {
      const ext = f.name.split('.').pop().toLowerCase();
      try {
        if (/^(png|jpe?g|webp|gif|bmp)$/.test(ext)) { const n = await VFX.assets.addTexture(f); VFX.store.put('textures', n, { blob: f }); P.texture = n; P.model = ''; }
        else if (/^(obj|glb|gltf)$/.test(ext)) { const n = await VFX.assets.addModel(f); VFX.store.put('models', n, { obj: VFX.assets.toOBJ(n) }); P.model = n; }
        else alert('Formato não suportado: ' + f.name);
      } catch (err) { alert('Erro ao importar ' + f.name + ': ' + err.message); }
    }
    refreshAll();
  }
  $('bAdd').onclick = () => $('fAssets').click();
  $('fAssets').onchange = e => { importFiles([...e.target.files]); e.target.value = ''; };
  view.addEventListener('dragover', e => e.preventDefault());
  view.addEventListener('drop', e => { e.preventDefault(); importFiles([...e.dataTransfer.files]); });

  (async () => { // restaura a biblioteca salva no navegador
    for (const it of await VFX.store.all()) {
      try {
        if (it.kind === 'textures') await VFX.assets.addTexture(new File([it.blob], it.name + '.png', { type: it.blob.type }));
        else if (it.kind === 'models') await VFX.assets.addModel(new File([it.obj], it.name + '.obj'));
        else if (it.kind === 'effects') VFX.library.effects[it.name] = it.params;
      } catch (err) { console.warn('Falha ao restaurar', it.id, err); }
    }
    lib.render();
  })();

  $('bPlay').onclick = () => { sys.playing = !sys.playing; $('bPlay').textContent = sys.playing ? '⏸ Pausar' : '▶ Tocar'; };
  $('bShot').onclick = () => { sys.trigger(); restartDs(); };
  $('bReset').onclick = () => { sys.reset(); sys.trigger(); restartDs(); };
  $('bGodot').onclick = async () => { try { VFX.download(VFX.safeName(P.name) + '_godot.zip', await VFX.exportGodotPackage(P, stage.exportItems())); } catch (err) { alert('Erro ao exportar: ' + err.message); } };
  $('bSheet').onclick = () => VFX.exportSheet({ sys, renderer, scene, camera, helpers, stage });

  let last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop); const dt = Math.min((now - last) / 1000, 0.05); last = now;
    sys.step(dt); placeCam();
    if (P.ixOn) { ixm.update(camera, renderer); if (stage.hasFx()) stage.depthPass([helpers, sys.points, sys.imesh].filter(Boolean)); }
    if (P.dsOn) {
      let a = P.dsAmount;
      if (P.dsAnimate) { const t = (now - dsT0) / 1000 / P.dsDuration; a = P.dsLoop ? t % 1 : Math.min(t, 1); P.dsAmount = +a.toFixed(3); if (now - lastSync > 120) { panelDs.sync(); lastSync = now; } }
      dsm.setAmount(a); dsm.update(camera);
    }
    renderer.render(scene, camera);
    $('info').textContent = sys.alive + ' partículas · arraste para girar · scroll para zoom';
  })(last);

  resize(); setParams(VFX.presets['Chuva']); lib.render();
})();
