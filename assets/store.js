/* Onion · armazenamento de imagens e áudios no navegador (IndexedDB) */
const Store = (() => {
  let dbp = null;
  const urls = new Map();
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open("onion-media", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("blobs");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction("blobs", mode); const st = t.objectStore("blobs");
      const out = fn(st);
      t.oncomplete = () => res(out && "result" in out ? out.result : undefined);
      t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  }
  async function put(key, blob) {
    await tx("readwrite", st => st.put(blob, key));
    if (urls.has(key)) { URL.revokeObjectURL(urls.get(key)); urls.delete(key); }
  }
  async function get(key) { try { return (await tx("readonly", st => st.get(key))) || null; } catch (e) { return null; } }
  async function url(key) {
    if (urls.has(key)) return urls.get(key);
    const b = await get(key); if (!b) return null;
    const u = URL.createObjectURL(b); urls.set(key, u); return u;
  }
  async function keys(prefix) {
    const all = (await tx("readonly", st => st.getAllKeys())) || [];
    return all.filter(k => String(k).startsWith(prefix));
  }
  async function delPrefix(prefix) {
    const ks = await keys(prefix);
    await tx("readwrite", st => ks.forEach(k => st.delete(k)));
    ks.forEach(k => { if (urls.has(k)) { URL.revokeObjectURL(urls.get(k)); urls.delete(k); } });
  }
  async function usage() {
    try { const e = await navigator.storage.estimate(); return e; } catch (e) { return null; }
  }
  return { put, get, url, keys, delPrefix, usage };
})();
