// Renderiza o efeito frame a frame e monta um sprite sheet PNG (fundo transparente).
VFX.exportSheet = function (ctx, cols = 8, rows = 4, cell = 128) {
  const { sys, renderer, scene, camera, helpers } = ctx, p = sys.p;
  const oldBg = scene.background, oldPlaying = sys.playing;
  const oldSize = renderer.getSize(new THREE.Vector2()), oldRatio = renderer.getPixelRatio(), oldAspect = camera.aspect;
  helpers.visible = false; if (ctx.stage) ctx.stage.sheetMode(true); scene.background = null; renderer.setPixelRatio(1); renderer.setSize(cell, cell, false);
  camera.aspect = 1; camera.updateProjectionMatrix(); sys.updateScale(cell, camera.fov); sys.playing = true;
  sys.reset(); if (p.mode === 'burst') sys.trigger();
  const fps = 60, frames = cols * rows;
  if (p.mode === 'continuous') for (let i = 0; i < p.lifetime * fps; i++) sys.step(1 / fps);
  const sheet = document.createElement('canvas'); sheet.width = cols * cell; sheet.height = rows * cell;
  const sctx = sheet.getContext('2d'), dt = (p.lifetime * 1.2) / frames;
  for (let i = 0; i < frames; i++) {
    sys.step(dt); renderer.setClearColor(0x000000, 0); renderer.render(scene, camera);
    sctx.drawImage(renderer.domElement, (i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
  }
  helpers.visible = true; if (ctx.stage) ctx.stage.sheetMode(false); scene.background = oldBg; renderer.setPixelRatio(oldRatio); renderer.setSize(oldSize.x, oldSize.y, false);
  camera.aspect = oldAspect; camera.updateProjectionMatrix(); sys.updateScale(renderer.domElement.height, camera.fov);
  sys.playing = oldPlaying; sys.reset();
  sheet.toBlob(b => VFX.download(VFX.safeName(p.name) + '_sheet_' + cols + 'x' + rows + '.png', b), 'image/png');
};
