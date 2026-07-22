const BASE = 'https://provinces.open-api.vn/api';

let listCache = null;

export const locationService = {
  async listProvinces() {
    if (listCache) return listCache;
    const res = await fetch(`${BASE}/v1/p/`);
    if (!res.ok) throw new Error('Không tải được danh sách tỉnh/thành');
    listCache = await res.json();
    return listCache;
  },

  async searchProvinces(query) {
    const q = (query || '').trim();
    if (!q) return this.listProvinces();
    const res = await fetch(`${BASE}/v1/p/search/?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('Không tìm được tỉnh/thành');
    return res.json();
  },
};
