// Fonction serverless Vercel — proxy Foursquare (évite le blocage CORS du navigateur)
// À placer dans : /api/place.js de ton projet

export default async function handler(req, res) {
  // Autorise ton app à appeler cette fonction
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { name, lat, lng } = req.query;
  if (!name || !lat || !lng) {
    res.status(400).json({ error: 'Paramètres manquants' });
    return;
  }

  const FSQ_KEY = 'fsq3U6jVs4RSHJ3/wOVSue8lkB4wkF1myzD/sWavZLBtAkY=';
  const headers = { Authorization: FSQ_KEY, Accept: 'application/json' };

  try {
    // 1. Recherche du lieu
    const searchUrl = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(name)}&ll=${lat},${lng}&limit=1&radius=120`;
    const searchRes = await fetch(searchUrl, { headers });
    if (!searchRes.ok) {
      res.status(200).json({});
      return;
    }
    const searchData = await searchRes.json();
    const place = searchData.results?.[0];
    if (!place) {
      res.status(200).json({});
      return;
    }
    const fsq_id = place.fsq_id;

    let photo = null, tel = null, rating = null;

    // 2. Photo
    try {
      const pr = await fetch(`https://api.foursquare.com/v3/places/${fsq_id}/photos?limit=1`, { headers });
      const pd = await pr.json();
      if (pd[0]) photo = `${pd[0].prefix}600x400${pd[0].suffix}`;
    } catch (e) {}

    // 3. Détails (téléphone + note)
    try {
      const dr = await fetch(`https://api.foursquare.com/v3/places/${fsq_id}?fields=tel,rating`, { headers });
      const dd = await dr.json();
      tel = dd.tel || null;
      rating = dd.rating ? (dd.rating / 2).toFixed(1) : null;
    } catch (e) {}

    // Cache 24h côté Vercel pour économiser les requêtes
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).json({ photo, tel, rating });
  } catch (e) {
    res.status(200).json({});
  }
}
