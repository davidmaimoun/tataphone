# ════════════════════════════════════════════════════════════════════════════
#  ROUTES ADRESSE — Autocomplete d'adresses (Israël) via OpenStreetMap Nominatim.
#  → backend/app/routes/address.py
#
#  Pourquoi un proxy backend et pas un appel direct depuis le navigateur ?
#  - La politique d'usage de Nominatim exige un User-Agent identifiable et
#    limite à ~1 req/sec. Un proxy serveur permet de respecter ça facilement,
#    d'ajouter un petit cache, et d'éviter d'exposer l'appel externe au client.
#
#  Enregistre dans app/__init__.py (create_app) :
#    from app.routes.address import address_bp
#    app.register_blueprint(address_bp, url_prefix='/api/address')
# ════════════════════════════════════════════════════════════════════════════

import time
import requests
from flask import Blueprint, request, jsonify

address_bp = Blueprint('address', __name__)

NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
# Nominatim exige un User-Agent identifiable (politique d'usage officielle).
HEADERS = {'User-Agent': 'TataPhone-Ecommerce/1.0 (contact: support@tataphone.co.il)'}

# ── Petit cache mémoire (évite de re-taper Nominatim pour les mêmes requêtes) ──
_CACHE = {}
_CACHE_TTL = 60 * 30  # 30 min
_last_call = 0
_MIN_INTERVAL = 1.0  # respecte la limite ~1 req/sec de Nominatim


def _throttle():
    global _last_call
    elapsed = time.time() - _last_call
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)
    _last_call = time.time()


def _cache_get(key):
    entry = _CACHE.get(key)
    if entry and (time.time() - entry['t']) < _CACHE_TTL:
        return entry['data']
    return None


def _cache_set(key, data):
    _CACHE[key] = {'t': time.time(), 'data': data}
    # Nettoyage basique pour ne pas grossir indéfiniment
    if len(_CACHE) > 500:
        oldest = sorted(_CACHE.items(), key=lambda kv: kv[1]['t'])[:100]
        for k, _ in oldest:
            _CACHE.pop(k, None)


def _normalize(raw):
    """Transforme un résultat Nominatim en format simple pour le frontend."""
    addr = raw.get('address', {})
    street = addr.get('road', '')
    house_number = addr.get('house_number', '')
    city = addr.get('city') or addr.get('town') or addr.get('village') or addr.get('municipality') or ''
    postcode = addr.get('postcode', '')
    return {
        'label': raw.get('display_name', ''),
        'street': street,
        'houseNumber': house_number,
        'city': city,
        'postcode': postcode,
        'lat': raw.get('lat'),
        'lon': raw.get('lon'),
    }


# ── GET /api/address/autocomplete?q=... ──────────────────────────────────────
@address_bp.route('/autocomplete', methods=['GET'])
def autocomplete():
    q = (request.args.get('q') or '').strip()
    if len(q) < 2:
        return jsonify({'results': []})

    cache_key = q.lower()
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({'results': cached})

    try:
        _throttle()
        resp = requests.get(NOMINATIM_URL, params={
            'q': q,
            'format': 'json',
            'addressdetails': 1,
            'countrycodes': 'il',
            'accept-language': 'he',
            'limit': 8,
        }, headers=HEADERS, timeout=5)
        resp.raise_for_status()
        raw_results = resp.json()
    except Exception as e:
        return jsonify({'error': str(e), 'results': []}), 502

    results = [_normalize(r) for r in raw_results]
    # On enlève les résultats sans nom de rue exploitable (souvent trop vagues)
    results = [r for r in results if r['street'] or r['city']]
    _cache_set(cache_key, results)
    return jsonify({'results': results})