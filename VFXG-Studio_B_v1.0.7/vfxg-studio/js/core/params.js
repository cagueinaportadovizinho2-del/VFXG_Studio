window.VFX = window.VFX || {};
// Parâmetros padrão de um efeito. Tudo o que o editor controla vive aqui.
VFX.defaults = {
  name: 'meu_efeito',
  amount: 200, lifetime: 1.5, mode: 'continuous', loop: true,
  shape: 'sphere', radius: 0.2, boxX: 0.5, boxY: 0.1, boxZ: 0.5, offsetY: 0,
  spread: 30, down: false, speed: 3, speedRandom: 0.3, gravity: 0, damping: 0,
  sizeStart: 0.4, sizeEnd: 0.1, sizeRandom: 0.3,
  rotation: 0, rotSpeed: 0, alignVel: false, localCoords: false,
  colorStart: '#ffaa33', colorEnd: '#ff2200', alphaStart: 1, alphaEnd: 0, alphaEndAt: 1,
  blend: 'add', texture: 'soft', model: '',
  partOn: true,
  // Interseção: material aplicado nos objetos/modelos marcados na aba Cena (borda de luz onde atravessam outra superfície)
  ixOn: false, ixDouble: false, ixTexture: '',
  ixBase: '#6b7490', ixBaseA: 1, ixEdge: '#7dff4a', ixEdgeA: 1, ixWidth: 0.12, ixPower: 1.5, ixIntensity: 3, ixFresnel: 0,
  // Dissolver: objeto some com ruído + borda brilhante (usa também ixBase/ixTexture/ixDouble como corpo)
  dsOn: false, dsAmount: 0, dsAnimate: true, dsLoop: true, dsDuration: 2.5, dsScale: 3.5, dsDir: 0.25,
  dsEdge: '#ffa02e', dsEdgeW: 0.08, dsIntensity: 4, dsDouble: true
};
