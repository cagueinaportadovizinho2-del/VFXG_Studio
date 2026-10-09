// Material de interseção: shader que faz uma borda de luz onde a malha atravessa outra superfície
// (compara a profundidade deste pixel com a profundidade da cena). É aplicado nos objetos/modelos marcados na aba Cena.
VFX.IxMaterial = class {
  constructor(stage) {
    this.stage = stage; this.v = new THREE.Vector3();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tDepth: { value: stage.rt.depthTexture }, uRes: { value: new THREE.Vector2(1, 1) }, uNear: { value: 0.2 }, uFar: { value: 200 }, uLight: { value: new THREE.Vector3(0, 1, 0) },
        uTex: { value: null }, uHasTex: { value: 0 }, uBase: { value: new THREE.Vector4() }, uEdge: { value: new THREE.Vector4() }, uWidth: { value: 0.12 }, uPower: { value: 1.5 }, uIntensity: { value: 3 }, uFresnel: { value: 0 } },
      transparent: true,
      vertexShader: 'varying vec3 vVP;varying vec3 vN;varying vec2 vUv;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vVP=mv.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}',
      fragmentShader: '#include <packing>\nuniform sampler2D tDepth;uniform sampler2D uTex;uniform float uHasTex;uniform vec2 uRes;uniform float uNear;uniform float uFar;uniform vec3 uLight;uniform vec4 uBase;uniform vec4 uEdge;uniform float uWidth;uniform float uPower;uniform float uIntensity;uniform float uFresnel;varying vec3 vVP;varying vec3 vN;varying vec2 vUv;' +
        'void main(){float d=texture2D(tDepth,gl_FragCoord.xy/uRes).x;float sceneZ=-perspectiveDepthToViewZ(d,uNear,uFar);float diff=sceneZ+vVP.z;' +
        'float edge=pow(1.-clamp(diff/uWidth,0.,1.),uPower);vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;' +
        'float fr=pow(1.-abs(dot(n,normalize(-vVP))),3.)*uFresnel;float glow=clamp(edge+fr*.5,0.,1.);' +
        'vec4 t=uHasTex>.5?texture2D(uTex,vUv):vec4(1.);vec3 body=uBase.rgb*t.rgb*(.35+.65*max(dot(n,uLight),0.));' +
        'vec3 e=uEdge.rgb*uIntensity;float m=max(e.r,max(e.g,e.b));if(m>1.)e=mix(e/m,vec3(1.),clamp((m-1.)*.1,0.,.45));' +
        'gl_FragColor=vec4(mix(body,e,glow),clamp(mix(uBase.a*t.a,uEdge.a,glow),0.,1.));}'
    });
  }
  apply(p) {
    const u = this.mat.uniforms, b = new THREE.Color(p.ixBase), e = new THREE.Color(p.ixEdge);
    u.uBase.value.set(b.r, b.g, b.b, p.ixBaseA); u.uEdge.value.set(e.r, e.g, e.b, p.ixEdgeA);
    u.uWidth.value = p.ixWidth; u.uPower.value = p.ixPower; u.uIntensity.value = p.ixIntensity; u.uFresnel.value = p.ixFresnel;
    const tex = p.ixTexture && VFX.textures.all().includes(p.ixTexture) ? VFX.textures.get(p.ixTexture) : null;
    if (tex) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    u.uTex.value = tex; u.uHasTex.value = tex ? 1 : 0;
    this.mat.side = p.ixDouble ? THREE.DoubleSide : THREE.FrontSide; this.mat.depthWrite = p.ixBaseA >= 0.99;
  }
  update(camera, renderer) {
    const u = this.mat.uniforms; renderer.getDrawingBufferSize(u.uRes.value); u.uNear.value = camera.near; u.uFar.value = camera.far;
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    u.uLight.value.copy(this.v.copy(this.stage.light.position).normalize().transformDirection(camera.matrixWorldInverse));
  }
};
