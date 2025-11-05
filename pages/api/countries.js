let cached = null;
let cachedAt = 0;
const TEN_HOURS = 10 * 60 * 60 * 1000;

export default async function handler(req, res) {
  try {
    const now = Date.now();
    if (cached && now - cachedAt < TEN_HOURS) {
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
      return res.status(200).json(cached);
    }

    const sources = [
      'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
      'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'
    ];

    let geojson = null;
    let lastError = null;

    for (const url of sources) {
      try {
        const resp = await fetch(url, { next: { revalidate: 3600 } });
        if (!resp.ok) throw new Error(`Failed ${url}: ${resp.status}`);
        const data = await resp.json();
        if (data && (Array.isArray(data.features) || Array.isArray(data.objects))) {
          geojson = data;
          break;
        }
      } catch (e) {
        lastError = e;
      }
    }

    if (!geojson) throw lastError || new Error('No source succeeded');

    cached = geojson;
    cachedAt = now;

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(geojson);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}
