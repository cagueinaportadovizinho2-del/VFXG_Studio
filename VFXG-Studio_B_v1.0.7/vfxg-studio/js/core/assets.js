// Biblioteca do usuário: texturas (PNG/JPG/WEBP) e modelos (OBJ/GLB/GLTF) importados.
VFX.assets = (function () {
  const A = { textures: {}, models: {}, onChange() {} };
  const baseName = f => VFX.safeName(f.name.replace(/\.[^.]+$/, ''));
  const unique = (map, n) => { let k = n, i = 2; while (map[k] || VFX.textures.names.includes(k)) k = n + '_' + i++; return k; };

  A.addTexture = async function (file) {
    const bmp = await createImageBitmap(file), c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0);
    const name = unique(A.textures, baseName(file));
    A.textures[name] = { name, canvas: c, tex: new THREE.CanvasTexture(c) }; A.onChange(); return name;
  };

  A.addModel = async function (file) {
    const ext = file.name.split('.').pop().toLowerCase(); let root;
    if (ext === 'obj') root = new THREE.OBJLoader().parse(await file.text());
    else {
      const data = ext === 'glb' ? await file.arrayBuffer() : await file.text();
      root = await new Promise((res, rej) => new THREE.GLTFLoader().parse(data, '', g => res(g.scene), rej));
    }
    root.updateMatrixWorld(true); let mesh = null; root.traverse(o => { if (!mesh && o.isMesh) mesh = o; });
    if (!mesh) throw new Error('nenhuma malha encontrada no arquivo');
    const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld); geo.computeBoundingBox();
    const size = new THREE.Vector3(), ctr = new THREE.Vector3(); geo.boundingBox.getSize(size); geo.boundingBox.getCenter(ctr);
    geo.translate(-ctr.x, -ctr.y, -ctr.z); const m = Math.max(size.x, size.y, size.z) || 1; geo.scale(1/m, 1/m, 1/m); // normaliza para 1 unidade
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const name = unique(A.models, baseName(file));
    A.models[name] = { name, geometry: geo, gltf: ext !== 'obj' }; A.onChange(); return name;
  };

  // Converte a malha normalizada em .obj (a Godot importa .obj direto como Mesh).
  A.toOBJ = function (name) {
    const m = A.models[name], g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv, idx = g.index;
    const f = n => +n.toFixed(5), L = ['# VFX Studio 3D', 'o ' + name];
    for (let i = 0; i < pos.count; i++) L.push('v ' + f(pos.getX(i)) + ' ' + f(pos.getY(i)) + ' ' + f(pos.getZ(i)));
    if (uv) for (let i = 0; i < uv.count; i++) L.push('vt ' + f(uv.getX(i)) + ' ' + f(m.gltf ? 1 - uv.getY(i) : uv.getY(i)));
    if (nor) for (let i = 0; i < nor.count; i++) L.push('vn ' + f(nor.getX(i)) + ' ' + f(nor.getY(i)) + ' ' + f(nor.getZ(i)));
    const ref = i => { const k = (idx ? idx.getX(i) : i) + 1; return uv && nor ? k+'/'+k+'/'+k : nor ? k+'//'+k : uv ? k+'/'+k : '' + k; };
    for (let i = 0; i < (idx ? idx.count : pos.count); i += 3) L.push('f ' + ref(i) + ' ' + ref(i+1) + ' ' + ref(i+2));
    return L.join('\n');
  };
  A.remove = function (kind, name) {
    const m = A[kind]; if (!m[name]) return;
    if (kind === 'textures' && m[name].tex.dispose) m[name].tex.dispose();
    delete m[name]; A.onChange();
  };
  return A;
})();
