// Cena de teste: chão e objetos/modelos que você move com o gizmo (estilo Godot).
// Objetos marcados com 💠 usam o material de interseção. Também renderiza o mapa de profundidade que o shader lê.
VFX.Stage = class {
  constructor(scene, camera, renderer) {
    this.scene = scene; this.camera = camera; this.renderer = renderer; this.items = []; this.sel = null; this.uid = 0; this.dragging = false;
    this.fxMat = null; this.fxOn = false; this.demoKind = 'cube'; this.onSelect = () => {};
    scene.add(new THREE.AmbientLight(0xffffff, 0.7)); const dl = this.light = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(4, 8, 5); scene.add(dl);
    this.tc = new THREE.TransformControls(camera, renderer.domElement); this.tc.setSize(0.8); scene.add(this.tc);
    this.tc.addEventListener('dragging-changed', e => { this.dragging = e.value; });
    this.rt = new THREE.WebGLRenderTarget(4, 4); this.rt.depthTexture = new THREE.DepthTexture(4, 4); this.rt.depthTexture.type = THREE.UnsignedIntType;
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2(); this.size = new THREE.Vector2();
    this.add('floor');
  }
  add(kind, modelName, opts = {}) {
    let geo, base, color = 0x7a8296;
    if (kind === 'floor') { geo = new THREE.BoxGeometry(10, 0.2, 10); geo.translate(0, -0.1, 0); base = 'Chão'; color = 0x3c4252; }
    else if (kind === 'cube') { geo = new THREE.BoxGeometry(1, 1, 1); base = 'Cubo'; }
    else if (kind === 'sphere') { geo = new THREE.SphereGeometry(0.5, 48, 24); base = 'Esfera'; }
    else if (kind === 'cylinder') { geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 48); base = 'Cilindro'; }
    else { geo = VFX.assets.models[modelName].geometry; base = modelName; }
    const n = this.items.filter(i => i.base === base).length, mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 }), mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.order = 'YXZ'; if (kind !== 'floor') mesh.position.set(((this.items.length % 4) - 1.5) * 1.4, 0.5, -1.8);
    const fx = opts.fx !== undefined ? !!opts.fx : (kind !== 'floor' && this.fxOn); // novos objetos já nascem com o efeito, se ele estiver ativo
    const it = { id: ++this.uid, kind, base, model: modelName, name: base + (n ? ' ' + (n + 1) : ''), obj: mesh, mat, fx, demo: !!opts.demo };
    this.items.push(it); this.scene.add(mesh); this.applyMaterials(); this.select(it); return it;
  }
  // Cria o objeto-template (substitui o anterior). spec: 'cube' | 'sphere' | 'cylinder' | 'model:<nome>'. mode: 'ix' (atravessa o chão) | 'ds' (apoiado no chão).
  setDemo(spec = 'cube', mode = 'ix') {
    const isModel = spec.startsWith('model:'), name = isModel ? spec.slice(6) : null;
    if (isModel && !VFX.assets.models[name]) spec = 'cube';
    this.demoKind = spec; this.items.filter(i => i.demo).forEach(i => this.remove(i));
    const kind = isModel && name ? 'model' : spec, it = this.add(kind, name, { fx: true, demo: true }), o = it.obj, up = mode === 'ds';
    if (kind === 'sphere') o.position.set(0, up ? 0.5 : 0.15, 0);
    else if (kind === 'cube') { o.position.set(0, up ? 0.5 : 0.3, 0); o.rotation.y = 0.45; }
    else if (kind === 'cylinder') { o.position.set(0, up ? 0.3 : 0.1, 0); o.scale.set(1.8, up ? 0.6 : 0.4, 1.8); }
    else o.position.set(0, up ? 0.5 : 0.3, 0);
    return it;
  }
  applyMaterials() { this.items.forEach(it => { it.obj.material = (it.fx && this.fxOn && this.fxMat) ? this.fxMat : it.mat; }); }
  setFx(it, v) { it.fx = v; this.applyMaterials(); this.onSelect(); }
  hasFx() { return this.fxOn && this.items.some(i => i.fx && i.obj.visible); }
  remove(it) {
    this.scene.remove(it.obj); if (it.kind !== 'model') it.obj.geometry.dispose(); it.mat.dispose();
    this.items.splice(this.items.indexOf(it), 1); if (this.sel === it) this.sel = null; this.refreshSel();
  }
  select(it) { this.sel = it; this.refreshSel(); }
  refreshSel() { if (this.sel && this.sel.obj.visible) this.tc.attach(this.sel.obj); else this.tc.detach(); this.onSelect(); }
  setMode(m) { this.tc.setMode(m); }
  pick(x, y) {
    const r = this.renderer.domElement.getBoundingClientRect(); this.ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObjects(this.items.filter(i => i.obj.visible).map(i => i.obj), true)[0]; if (!hit) return null;
    return this.items.find(i => i.obj === hit.object) || null;
  }
  // Renderiza só a geometria "sólida" (sem os objetos com interseção) num alvo com textura de profundidade.
  depthPass(extraHide) {
    const r = this.renderer, hide = extraHide.concat(this.items.filter(i => i.fx).map(i => i.obj)); r.getDrawingBufferSize(this.size);
    if (this.rt.width !== this.size.x || this.rt.height !== this.size.y) this.rt.setSize(this.size.x, this.size.y);
    const prev = hide.map(o => o.visible), tcv = this.tc.visible, bg = this.scene.background;
    hide.forEach(o => o.visible = false); this.tc.visible = false; this.scene.background = null;
    r.setRenderTarget(this.rt); r.render(this.scene, this.camera); r.setRenderTarget(null);
    hide.forEach((o, i) => o.visible = prev[i]); this.tc.visible = tcv; this.scene.background = bg;
  }
  sheetMode(on) { // esconde objetos de teste ao gerar sprite sheet
    if (on) { this._saved = this.items.map(i => i.obj.visible); this.items.forEach(i => i.obj.visible = false); this._tcv = this.tc.visible; this.tc.visible = false; }
    else { this.items.forEach((i, k) => i.obj.visible = this._saved[k]); this.tc.visible = this._tcv; }
  }
  exportItems() { // para o pacote Godot
    return this.items.filter(i => i.obj.visible).map(i => { i.obj.updateMatrix(); return { id: i.id, kind: i.kind, base: i.base, model: i.model, fx: i.fx, m: i.obj.matrix.clone() }; });
  }
};
