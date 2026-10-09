// Presets: só sobrescrevem o que for diferente de VFX.defaults.
VFX.presets = {
  'Chuva':    { name:'chuva', amount:900, lifetime:.75, shape:'box', boxX:5, boxY:.1, boxZ:5, offsetY:6, down:true, spread:2, speed:9, speedRandom:.2, gravity:-4,
                sizeStart:.55, sizeEnd:.55, sizeRandom:.3, colorStart:'#bcd4ff', colorEnd:'#bcd4ff', alphaStart:.55, alphaEnd:.55, alignVel:true, blend:'normal', texture:'streak' },
  'Raio':     { name:'raio', mode:'burst', amount:2, lifetime:1.6, shape:'box', boxX:3, boxY:0, boxZ:3, offsetY:2.8, spread:0, speed:0, speedRandom:0,
                sizeStart:5, sizeEnd:5, sizeRandom:.2, rotation:10, colorStart:'#d8ecff', colorEnd:'#7fb0ff', alphaStart:1, alphaEnd:0, alphaEndAt:.12, texture:'bolt' },
  'Água':     { name:'agua', amount:500, lifetime:1.4, radius:.08, spread:22, speed:6, speedRandom:.35, gravity:-9.8, sizeStart:.14, sizeEnd:.08, sizeRandom:.4,
                colorStart:'#9fd8ff', colorEnd:'#3a8cff', alphaStart:.85, alphaEnd:.15, blend:'normal', texture:'drop' },
  'Respingo': { name:'respingo', mode:'burst', amount:80, lifetime:.8, radius:.05, spread:60, speed:3.5, speedRandom:.5, gravity:-9.8, sizeStart:.1, sizeEnd:.06, sizeRandom:.4,
                colorStart:'#b5e2ff', colorEnd:'#5aa0ff', alphaStart:.9, alphaEnd:0, blend:'normal', texture:'drop' },
  'Interseção: Cubo':   { name:'intersecao_cubo', partOn:false, ixOn:true, ixBase:'#6b7490', ixEdge:'#3fe2ff', ixWidth:.12, ixPower:1.6, ixIntensity:3, demo:'cube' },
  'Dissolver: Cubo':    { name:'dissolver_cubo', partOn:false, dsOn:true, ixBase:'#6b7490', dsEdge:'#ffa02e', dsEdgeW:.08, dsScale:3.5, dsDir:.25, dsIntensity:4, demo:'cube' },
  'Fogo':     { name:'fogo', amount:220, lifetime:1.2, radius:.15, spread:15, speed:1.5, gravity:2, sizeStart:.55, sizeEnd:.05, rotation:180, rotSpeed:40, colorStart:'#ffd04a', colorEnd:'#ff2200' },
  'Fumaça':   { name:'fumaca', amount:70, lifetime:3, radius:.15, spread:20, speed:.8, gravity:.5, sizeStart:.4, sizeEnd:1.6, rotation:180, rotSpeed:15, colorStart:'#8a8a8a', colorEnd:'#2a2a2a', alphaStart:.5, blend:'normal', texture:'smoke' },
  'Faíscas':  { name:'faiscas', mode:'burst', amount:120, lifetime:.9, radius:.05, spread:70, speed:5, speedRandom:.6, gravity:-9, sizeStart:.1, sizeEnd:.02, colorStart:'#fff0a0', colorEnd:'#ff6600', texture:'spark' },
  'Explosão': { name:'explosao', mode:'burst', amount:260, lifetime:1.2, radius:.1, spread:180, speed:6, speedRandom:.6, damping:3, sizeStart:.65, sizeEnd:.1, colorStart:'#ffe066', colorEnd:'#aa2200' },
  'Magia':    { name:'magia', amount:150, lifetime:2, radius:.5, spread:180, speed:.5, gravity:1, sizeStart:.3, sizeEnd:0, rotation:180, rotSpeed:90, colorStart:'#66ccff', colorEnd:'#aa44ff', texture:'star' },
  'Cura':     { name:'cura', amount:60, lifetime:2, shape:'box', boxX:.6, boxY:.05, boxZ:.6, spread:5, speed:1, gravity:.5, sizeStart:.25, sizeEnd:.05, colorStart:'#8dff9a', colorEnd:'#22cc88', texture:'star' },
  'Neve':     { name:'neve', amount:500, lifetime:6, shape:'box', boxX:4, boxY:.1, boxZ:4, offsetY:4, spread:180, speed:.3, gravity:-1.2, sizeStart:.09, sizeEnd:.09, colorStart:'#ffffff', colorEnd:'#ddeeff', alphaStart:.9, alphaEnd:.9 }
};
