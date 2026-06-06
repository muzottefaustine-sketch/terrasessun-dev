// Fonction serverless Vercel — proxy Foursquare (NOUVELLE API 2026)
// À placer dans : /api/place.js de ton projet

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { name, lat, lng } = req.query;
  if (!name || !lat || !lng) {
    res.status(400).json({ error: 'Paramètres manquants' });
    return;
  }

  const FSQ_KEY = 'HX4UIQJGDJS1LYB1BQSBCW3HQEWZGVIILWZTWCVTB5K1MSMH';
  // NOUVELLE API Foursquare (l'ancienne v3 est morte depuis le 15 mai 2026)
  const headers = {
    'Authorization': `Bearer ${FSQ_KEY}`,
    'X-Places-Api-Version': '2025-06-17',
    'accept': 'application/json'
  };

  try {
    // 1. Recherche du lieu
    const searchUrl = `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(name)}&ll=${lat},${lng}&limit=1&radius=150`;
    const searchRes = await fetch(searchUrl, { headers });
    if (!searchRes.ok) {
      const txt = await searchRes.text();
      res.status(200).json({ _debug: 'search_failed', _status: searchRes.status, _msg: txt.slice(0, 200) });
      return;
    }
    const searchData = await searchRes.json();
    const place = searchData.results?.[0];
    if (!place) {
      res.status(200).json({ _debug: 'no_results' });
      return;
    }
    // La nouvelle API utilise fsq_place_id
    const fsq_id = place.fsq_place_id || place.fsq_id;

    let photo = null, tel = null, rating = null;

    // 2. Photo
    try {
      const pr = await fetch(`https://places-api.foursquare.com/places/${fsq_id}/photos?limit=1`, { headers });
      if (pr.ok) {
        const pd = await pr.json();
        if (pd[0]) photo = `${pd[0].prefix}600x400${pd[0].suffix}`;
      }
    } catch (e) {}

    // 3. Détails (téléphone + note)
    try {
      const dr = await fetch(`https://places-api.foursquare.com/places/${fsq_id}?fields=tel,rating`, { headers });
      if (dr.ok) {
        const dd = await dr.json();
        tel = dd.tel || null;
        rating = dd.rating ? (dd.rating / 2).toFixed(1) : null;
      }
    } catch (e) {}

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).json({ photo, tel, rating });
  } catch (e) {
    res.status(200).json({ _debug: 'exception', _msg: e.message });
  }
}
