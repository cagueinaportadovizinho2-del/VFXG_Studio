// Sistema de partículas (simulação em CPU). Renderiza como sprites (THREE.Points) ou como malhas instanciadas (modelo importado).
VFX.ParticleSystem = class {
  constructor(scene, max = 6000) {
    this.scene = scene; this.max = max; this.p = Object.assign({}, VFX.defaults);
    this.alive = 0; this.playing = true; this.time = 0; this.acc = 0; this.burstTimer = 0; this.imesh = null;
    this.pos = new Float32Array(max*3); this.vel = new Float32Array(max*3); this.col = new Float32Array(max*4);
    this.siz = new Float32Array(max); this.rot = new Float32Array(max); this.rotBase = new Float32Array(max);
    this.age = new Float32Array(max); this.life = new Float32Array(max); this.sm = new Float32Array(max);
    const g = this.geo = new THREE.BufferGeometry(), D = THREE.DynamicDrawUsage;
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(D));
        g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(D));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.siz, 1).setUsage(D));
    g.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1).setUsage(D));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: null }, uScale: { value: 500 }, uAlign: { value: 0 } },
      transparent: true, depthWrite: false,
      vertexShader: 'attribute vec4 aColor;attribute float aSize;attribute float aRot;uniform float uScale;uniform float uAlign;varying vec4 vC;varying float vR;' +
        'void main(){vC=aColor;vec4 mv=modelViewMatrix*vec4(position,1.);float a=aRot;' +
        'if(uAlign>.5){vec2 d=(viewMatrix*vec4(0.,1.,0.,0.)).xy;if(length(d)>1e-4){d=normalize(d);a=atan(-d.x,d.y);}}' +
        'vR=a;gl_PointSize=aSize*uScale/-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform sampler2D map;varying vec4 vC;varying float vR;' +
        'void main(){vec2 p=vec2(gl_PointCoord.x-.5,.5-gl_PointCoord.y);float c=cos(vR),s=sin(vR);' +
        'vec2 t=vec2(c*p.x+s*p.y,-s*p.x+c*p.y)+.5;if(t.x<0.||t.x>1.||t.y<0.||t.y>1.)discard;gl_FragColor=texture2D(map,t)*vC;}'
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points);
    this.dummy = new THREE.Object3D(); this.tmpC = new THREE.Color();
    this.applyAppearance();
  }
  applyAppearance() {
    const p = this.p, blending = p.blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.mat.uniforms.map.value = VFX.textures.get(p.texture); this.mat.uniforms.uAlign.value = p.alignVel ? 1 : 0;
    this.mat.blending = blending; this.mat.needsUpdate = true;
    this.cs = new THREE.Color(p.colorStart); this.ce = new THREE.Color(p.colorEnd);
    if (this.imesh) { this.scene.remove(this.imesh); if (this.imesh.dispose) this.imesh.dispose(); this.imesh = null; }
    const m = p.model && VFX.assets.models[p.model];
    if (m) {
      this.imesh = new THREE.InstancedMesh(m.geometry, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending, side: THREE.DoubleSide }), this.max);
      this.imesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.imesh.setColorAt(0, this.tmpC.set(0xffffff));
      this.imesh.frustumCulled = false; this.imesh.count = 0; this.scene.add(this.imesh);
    }
    this.points.visible = !this.imesh;
  }
  updateScale(pixelHeight, fov) { this.mat.uniforms.uScale.value = pixelHeight / (2 * Math.tan(fov * Math.PI / 360)); }
  reset() { this.alive = 0; this.time = 0; this.acc = 0; this.burstTimer = 0; this.geo.setDrawRange(0, 0); if (this.imesh) this.imesh.count = 0; }
  trigger() { this.burstTimer = 0; this.time = 0; }
  emit(n) {
    const p = this.p, sp = p.spread * Math.PI / 180, dirY = p.down ? -1 : 1;
    for (let i = 0; i < n && this.alive < this.max; i++) {
      const k = this.alive++, k3 = k*3; let x = 0, y = 0, z = 0;
      if (p.shape === 'sphere') {
        const u = Math.random()*2-1, a = Math.random()*Math.PI*2, s = Math.sqrt(1-u*u), r = p.radius*Math.cbrt(Math.random());
        x = s*Math.cos(a)*r; y = u*r; z = s*Math.sin(a)*r;
      } else if (p.shape === 'box') {
        x = (Math.random()*2-1)*p.boxX; y = (Math.random()*2-1)*p.boxY; z = (Math.random()*2-1)*p.boxZ;
      }
      const cosT = 1 - Math.random()*(1 - Math.cos(sp)), sinT = Math.sqrt(1 - cosT*cosT), ph = Math.random()*Math.PI*2;
      const v = p.speed * (1 - Math.random()*p.speedRandom);
      this.pos[k3] = x; this.pos[k3+1] = y + p.offsetY; this.pos[k3+2] = z;
      this.vel[k3] = sinT*Math.cos(ph)*v; this.vel[k3+1] = cosT*v*dirY; this.vel[k3+2] = sinT*Math.sin(ph)*v;
      this.age[k] = 0; this.life[k] = p.lifetime; this.sm[k] = 1 - Math.random()*p.sizeRandom;
      this.rotBase[k] = (Math.random()*2-1) * p.rotation * Math.PI / 180;
    }
  }
  step(dt) {
    const p = this.p;
    if (!p.partOn) { this.alive = 0; this.write(); return; }
    if (this.playing) {
      this.time += dt;
      if (p.mode === 'continuous') {
        if (p.loop || this.time < p.lifetime) { this.acc += p.amount / p.lifetime * dt; const n = Math.floor(this.acc); this.acc -= n; this.emit(n); }
      } else { // burst: repete a cada "vida", igual ao GPUParticles da Godot com explosiveness 1
        this.burstTimer -= dt;
        if (this.burstTimer <= 0) { this.emit(p.amount); this.burstTimer = p.loop ? p.lifetime : Infinity; }
      }
      this.simulate(dt);
    }
    this.write();
  }
  simulate(dt) {
    const p = this.p, damp = Math.max(0, 1 - p.damping*dt);
    for (let i = this.alive - 1; i >= 0; i--) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this.copy(this.alive - 1, i); this.alive--; continue; }
      const i3 = i*3;
      this.vel[i3+1] += p.gravity*dt;
      this.vel[i3] *= damp; this.vel[i3+1] *= damp; this.vel[i3+2] *= damp;
      this.pos[i3] += this.vel[i3]*dt; this.pos[i3+1] += this.vel[i3+1]*dt; this.pos[i3+2] += this.vel[i3+2]*dt;
    }
  }
  copy(a, b) {
    if (a === b) return;
    for (let j = 0; j < 3; j++) { this.pos[b*3+j] = this.pos[a*3+j]; this.vel[b*3+j] = this.vel[a*3+j]; }
    this.age[b] = this.age[a]; this.life[b] = this.life[a]; this.sm[b] = this.sm[a]; this.rotBase[b] = this.rotBase[a];
  }
  write() {
    const p = this.p, cs = this.cs, ce = this.ce, at = Math.max(p.alphaEndAt, 0.001), im = this.imesh, d = this.dummy, rs = p.rotSpeed * Math.PI / 180;
    for (let i = 0; i < this.alive; i++) {
      const t = this.age[i] / this.life[i], i4 = i*4, ta = Math.min(t / at, 1);
      this.siz[i] = (p.sizeStart + (p.sizeEnd - p.sizeStart)*t) * this.sm[i];
      this.rot[i] = this.rotBase[i] + rs * this.age[i];
      const r = cs.r + (ce.r - cs.r)*t, g = cs.g + (ce.g - cs.g)*t, b = cs.b + (ce.b - cs.b)*t, a = p.alphaStart + (p.alphaEnd - p.alphaStart)*ta;
      this.col[i4] = r; this.col[i4+1] = g; this.col[i4+2] = b; this.col[i4+3] = a;
      if (im) { // malha: alpha aproximado escurecendo a cor (ideal com mistura aditiva)
        d.position.set(this.pos[i*3], this.pos[i*3+1], this.pos[i*3+2]); d.rotation.set(0, this.rot[i], 0); d.scale.setScalar(this.siz[i]); d.updateMatrix();
        im.setMatrixAt(i, d.matrix); im.setColorAt(i, this.tmpC.setRGB(r*a, g*a, b*a));
      }
    }
    const A = this.geo.attributes; for (const k in A) A[k].needsUpdate = true;
    this.geo.setDrawRange(0, this.alive);
    if (im) { im.count = this.alive; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; }
  }
};
