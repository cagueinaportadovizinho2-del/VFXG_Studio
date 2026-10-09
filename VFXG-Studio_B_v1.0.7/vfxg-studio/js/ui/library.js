// Biblioteca em árvore, no estilo do FileSystem da Godot: pastas Texturas / Modelos / Efeitos.
VFX.library = { effects: {} };
VFX.buildLibrary = function (root, api) { // api: useTexture, useModel, loadEffect, saveEffect, remove, importFiles, isActive
  const folders = [['textures', 'Texturas', '🖼'], ['models', 'Modelos', '🧊'], ['effects', 'Efeitos', '✨']];
  const open = { textures: true, models: true, effects: true }; let filter = '';
  const box = document.createElement('input'); box.type = 'text'; box.placeholder = 'Filtrar arquivos…'; box.className = 'lib-filter';
  const tree = document.createElement('div'); root.append(box, tree);
  box.oninput = () => { filter = box.value.toLowerCase(); render(); };
  const source = kind => kind === 'effects' ? VFX.library.effects : VFX.assets[kind];
  function row(depth, text, cls, click, actions) {
    const d = document.createElement('div'); d.className = 'lib-row ' + (cls || ''); d.style.paddingLeft = (6 + depth * 14) + 'px';
    const t = document.createElement('span'); t.className = 'lib-name'; t.textContent = text; d.appendChild(t);
    if (click) d.onclick = click;
    (actions || []).forEach(([label, title, fn]) => { const b = document.createElement('button'); b.textContent = label; b.title = title; b.onclick = e => { e.stopPropagation(); fn(); }; d.appendChild(b); });
    tree.appendChild(d);
  }
  function render() {
    tree.innerHTML = ''; row(0, '📁 VFXG Library', 'dir');
    folders.forEach(([kind, label, icon]) => {
      const names = Object.keys(source(kind)).filter(n => n.toLowerCase().includes(filter)).sort(), isOpen = open[kind] || filter;
      row(1, (isOpen ? '▾ ' : '▸ ') + '📁 ' + label + ' (' + names.length + ')', 'dir', () => { open[kind] = !open[kind]; render(); },
        [kind === 'effects' ? ['＋', 'Salvar o efeito atual aqui', api.saveEffect] : ['＋', 'Importar arquivos', api.importFiles]]);
      if (isOpen) names.forEach(n => row(2, icon + ' ' + n, api.isActive(kind, n) ? 'on' : '',
        () => kind === 'textures' ? api.useTexture(n) : kind === 'models' ? api.useModel(n) : api.loadEffect(n), [['✕', 'Apagar', () => api.remove(kind, n)]]));
    });
  }
  render(); return { render };
};
