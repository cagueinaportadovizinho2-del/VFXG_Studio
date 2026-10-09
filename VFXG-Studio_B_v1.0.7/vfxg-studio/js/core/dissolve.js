// Material de dissolução: o objeto some por ruído (ou de baixo para cima) com uma borda brilhante na frente da dissolução.
// O mesmo código de ruído vai para o shader da Godot (VFX.NOISE_GLSL).
VFX.NOISE_GLSL = `float hash31(vec3 p) {
	p = fract(p * 0.3183099 + 0.1);
	p *= 17.0;
	return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
	vec3 i = floor(x);
	vec3 f = fract(x);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
			mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
			mix(mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
			mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
	float a = 0.5;
	float s = 0.0;
	for (int i = 0; i < 3; i++) {
		s += a * vnoise(p);
		p *= 2.0;
		a *= 0.5;
	}
	return clamp((s / 0.875 - 0.5) * 1.8 + 0.5, 0.0, 1.0);
}
`;
VFX.DsMaterial = class {
  constructor(stage) {
    this.stage = stage; this.v = new THREE.Vector3();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: null }, uHasTex: { value: 0 }, uLight: { value: new THREE.Vector3(0, 1, 0) }, uBase: { value: new THREE.Color() }, uEdge: { value: new THREE.Color() },
        uAmount: { value: 0 }, uScale: { value: 3.5 }, uDir: { value: 0 }, uEdgeW: { value: 0.08 }, uIntensity: { value: 4 }, uHMin: { value: -0.5 }, uHMax: { value: 0.5 } },
      vertexShader: 'varying vec3 vL;varying vec3 vN;varying vec2 vUv;void main(){vL=position;vUv=uv;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform sampler2D uTex;uniform float uHasTex;uniform vec3 uLight;uniform vec3 uBase;uniform vec3 uEdge;uniform float uAmount;uniform float uScale;uniform float uDir;uniform float uEdgeW;uniform float uIntensity;uniform float uHMin;uniform float uHMax;varying vec3 vL;varying vec3 vN;varying vec2 vUv;\n' + VFX.NOISE_GLSL +
        'void main(){float n=fbm(vL*uScale);float g=clamp((vL.y-uHMin)/(uHMax-uHMin),0.,1.);float h=mix(n,g,uDir);' +
        'float th=uAmount*(1.+uEdgeW)-uEdgeW;if(h<=th)discard;float e=1.-smoothstep(0.,uEdgeW,h-th);' +
        'vec3 nr=normalize(vN);if(!gl_FrontFacing)nr=-nr;vec4 t=uHasTex>.5?texture2D(uTex,vUv):vec4(1.);' +
        'vec3 body=uBase*t.rgb*(.35+.65*max(dot(nr,uLight),0.));vec3 c=uEdge*uIntensity;float m=max(c.r,max(c.g,c.b));' +
        'if(m>1.)c=mix(c/m,vec3(1.),clamp((m-1.)*.1,0.,.45));gl_FragColor=vec4(mix(body,c,e),1.);}'
    });
  }
  apply(p) {
    const u = this.mat.uniforms; u.uBase.value.set(p.ixBase); u.uEdge.value.set(p.dsEdge);
    u.uScale.value = p.dsScale; u.uDir.value = p.dsDir; u.uEdgeW.value = p.dsEdgeW; u.uIntensity.value = p.dsIntensity;
    const tex = p.ixTexture && VFX.textures.all().includes(p.ixTexture) ? VFX.textures.get(p.ixTexture) : null;
    if (tex) tex.wrapS = tex.wrapT = THREE.RepeatWrapping; u.uTex.value = tex; u.uHasTex.value = tex ? 1 : 0;
    this.mat.side = p.dsDouble ? THREE.DoubleSide : THREE.FrontSide;
  }
  setAmount(a) { this.mat.uniforms.uAmount.value = a; }
  update(camera) {
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    this.mat.uniforms.uLight.value.copy(this.v.copy(this.stage.light.position).normalize().transformDirection(camera.matrixWorldInverse));
  }
};
