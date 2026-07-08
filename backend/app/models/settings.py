"""
settings.py — Modèle des paramètres de la boutique (un seul document en DB).
Collection 'settings', toujours le même _id ('shop') → un seul doc global.
"""
from app.db import get_db

_SETTINGS_ID = 'shop'

# Valeurs par défaut si aucun réglage n'existe encore
DEFAULTS = {
    '_id': _SETTINGS_ID,
    'vatRate': 0,                    # taux TVA (%) — prix produits sont TTC, c'est indicatif
    'shippingType': 'fixed',          # 'fixed' ou 'percent'
    'shippingValue': 30,              # 30₪ fixe, ou X% si percent
    'freeShippingEnabled': True,      # livraison gratuite au-dessus d'un seuil ?
    'freeShippingThreshold': 500,     # seuil (≥) pour livraison gratuite
    'shopName': 'טאטעפון',
    'shopEmail': 'info@tataphone.co.il',
    'shopPhone': '',
    'promoBanner': {'enabled': False, 'text': ''},
}


def get_settings():
    """Retourne les settings (crée le doc par défaut s'il n'existe pas)."""
    db = get_db()
    doc = db['settings'].find_one({'_id': _SETTINGS_ID})
    if not doc:
        db['settings'].insert_one(dict(DEFAULTS))
        doc = dict(DEFAULTS)
    # Complète les clés manquantes avec les défauts (si on ajoute des champs plus tard)
    merged = dict(DEFAULTS)
    merged.update({k: v for k, v in doc.items() if v is not None})
    return merged


def update_settings(data: dict):
    """Met à jour les settings (admin). Ne garde que les clés connues."""
    db = get_db()
    allowed = {
        'vatRate', 'shippingType', 'shippingValue',
        'freeShippingEnabled', 'freeShippingThreshold',
        'shopName', 'shopEmail', 'shopPhone', 'promoBanner',
    }
    update = {}
    for k in allowed:
        if k in data:
            update[k] = data[k]

    # Coercition de types (sécurité)
    if 'vatRate' in update:
        try: update['vatRate'] = float(update['vatRate'])
        except (TypeError, ValueError): update.pop('vatRate')
    if 'shippingValue' in update:
        try: update['shippingValue'] = float(update['shippingValue'])
        except (TypeError, ValueError): update.pop('shippingValue')
    if 'freeShippingThreshold' in update:
        try: update['freeShippingThreshold'] = float(update['freeShippingThreshold'])
        except (TypeError, ValueError): update.pop('freeShippingThreshold')
    if 'shippingType' in update and update['shippingType'] not in ('fixed', 'percent'):
        update['shippingType'] = 'fixed'

    db['settings'].update_one({'_id': _SETTINGS_ID}, {'$set': update}, upsert=True)
    return get_settings()


def compute_shipping(products_total: float, settings: dict = None) -> float:
    """Calcule les frais de livraison selon les settings.
    products_total = somme des produits (TTC). Retourne le coût de livraison."""
    s = settings or get_settings()
    if products_total <= 0:
        return 0.0
    # Livraison gratuite au-dessus du seuil
    if s.get('freeShippingEnabled') and products_total >= float(s.get('freeShippingThreshold', 0)):
        return 0.0
    # Sinon, fixe ou pourcentage
    if s.get('shippingType') == 'percent':
        return round(products_total * float(s.get('shippingValue', 0)) / 100, 2)
    return float(s.get('shippingValue', 0))