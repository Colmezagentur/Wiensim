// Wiengo — Vercel serverless aracı (proxy)
// Tarayıcı → /api/wl?url=... → Wiener Linien / Stadt Wien açık verisi
// Wiener Linien doğrudan tarayıcı erişimine CORS izni vermiyor; bu fonksiyon
// veriyi sunucu tarafından çekip CORS başlığıyla geri döndürür.
// (Yerel testte aynı işi "Wiengo Baslat" python başlatıcısı /proxy/ ile yapar.)

const ALLOWED = [
  'https://www.wienerlinien.at/',
  'https://data.wien.gv.at/',
  'https://opensky-network.org/',
  'https://api.adsb.lol/',
];

export default async function handler(req, res) {
  const target = req.query.url;

  if (!target || !ALLOWED.some((p) => target.startsWith(p))) {
    res.status(403).json({ error: 'host not allowed' });
    return;
  }

  try {
    const upstream = await fetch(target, {
      headers: { 'User-Agent': 'Wiengo/1.0' },
    });
    const buf = Buffer.from(await upstream.arrayBuffer());

    // Büyük CSV'ler nadiren değişir → uzun önbellek; canlı veri → çok kısa önbellek
    const isCsv = target.endsWith('.csv');
    res.setHeader(
      'Cache-Control',
      isCsv
        ? 's-maxage=21600, stale-while-revalidate=86400' // 6 saat
        : 's-maxage=10, stale-while-revalidate=20'        // ~10 sn (gerçek zamanlı)
    );
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(upstream.status).send(buf);
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
}
