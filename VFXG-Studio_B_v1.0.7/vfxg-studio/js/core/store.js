// Persistência no navegador (IndexedDB): texturas, modelos e efeitos da biblioteca sobrevivem ao fechar a página.
VFX.store = (function () {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('IndexedDB indisponível'));
    const r = indexedDB.open('vfxg-studio', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('items', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => { const t = db.transaction('items', mode), q = fn(t.objectStore('items')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); });
  };
  const warn = e => { console.warn('VFXG store:', e); return null; };
  return {
    put: (kind, name, data) => tx('readwrite', s => s.put(Object.assign({ id: kind + '/' + name, kind, name }, data))).catch(warn),
    del: (kind, name) => tx('readwrite', s => s.delete(kind + '/' + name)).catch(warn),
    all: () => tx('readonly', s => s.getAll()).then(r => r || []).catch(e => { warn(e); return []; })
  };
})();
