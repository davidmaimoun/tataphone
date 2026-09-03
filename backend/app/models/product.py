from datetime import datetime
from bson import ObjectId

def _to_bool(val, default=False):
    """Convert any truthy value to bool."""
    if isinstance(val, bool): return val
    if isinstance(val, str):  return val.lower() in ('yes','true','1','כן')
    return bool(val) if val is not None else default


from app.db import get_db


def get_collection():
    return get_db()['products']


def create_indexes():
    col = get_collection()
    col.create_index('category')
    col.create_index('brand')
    col.create_index([('name', 'text'), ('brand', 'text'), ('description', 'text')])
    col.create_index('sku', sparse=True)
    col.create_index('variants.sku', sparse=True)   # ← NOUVEAU : matcher une variante par SKU (sync Priority)
    col.create_index('createdAt')
    col.create_index('rating')
    col.create_index('salesCount')
    col.create_index('isFeatured')


# ── Helpers ──────────────────────────────────────────────────────────────────


def build_query(params: dict) -> dict:
    query = {}
    if params.get('cat'):
        query['category'] = params['cat']
    if params.get('brand'):
        query['brand'] = {'$regex': params['brand'], '$options': 'i'}
    if params.get('q'):
        import re
        term = re.escape(params['q'].strip())
        if term:
            query['$or'] = [
                {'name':        {'$regex': term, '$options': 'i'}},
                {'brand':       {'$regex': term, '$options': 'i'}},
                {'description': {'$regex': term, '$options': 'i'}},
                {'sku':         {'$regex': term, '$options': 'i'}},
                {'nameEn':      {'$regex': term, '$options': 'i'}},
            ]
    if params.get('sale') == 'true':
        query['discount'] = True
    if params.get('isKosher') == 'true':
        query['isKosher'] = True
    if params.get('isAccessory') == 'true':
        query['isAccessory'] = True
    if params.get('inStock') == 'true':
        query['stock'] = {'$gt': 0}
    if params.get('min_price') or params.get('max_price'):
        price_q = {}
        if params.get('min_price'):
            price_q['$gte'] = float(params['min_price'])
        if params.get('max_price'):
            price_q['$lte'] = float(params['max_price'])
        query['price'] = price_q
    return query

def get_all(params: dict = {}):
    col    = get_collection()
    query  = build_query(params)
    sort   = params.get('sort', '-createdAt')
    page   = max(1, int(params.get('page', 1)))
    limit  = min(48, max(1, int(params.get('limit', 12))))
    skip   = (page - 1) * limit

    sort_field = sort.lstrip('-')
    sort_dir   = -1 if sort.startswith('-') else 1
    cursor = col.find(query).sort(sort_field, sort_dir).skip(skip).limit(limit)

    products = [serialize(p) for p in cursor]
    total    = col.count_documents(query)
    return {'products': products, 'total': total, 'page': page, 'limit': limit}


def get_by_id(product_id: str):
    try:
        p = get_collection().find_one({'_id': ObjectId(product_id)})
        return serialize(p) if p else None
    except Exception:
        return None


def get_related(product_id: str, limit: int = 4):
    p = get_collection().find_one({'_id': ObjectId(product_id)})
    if not p:
        return []
    cursor = get_collection().find({
        'category': p.get('category'),
        '_id':      {'$ne': ObjectId(product_id)}
    }).sort('rating', -1).limit(limit)
    return [serialize(r) for r in cursor]


def get_recommended(visited_ids: list, limit: int = 8):
    try:
        obj_ids = [ObjectId(i) for i in visited_ids[:10]]
    except Exception:
        return []
    visited = list(get_collection().find({'_id': {'$in': obj_ids}}))
    cats = list({p.get('category') for p in visited if p.get('category')})
    cursor = get_collection().find({
        'category': {'$in': cats},
        '_id':      {'$nin': obj_ids}
    }).sort('rating', -1).limit(limit)
    return [serialize(p) for p in cursor]


def _parse_list(val) -> list:
    """Accept JSON string or list."""
    if isinstance(val, list): return val
    if isinstance(val, str):
        import json
        try: return json.loads(val)
        except Exception: return [v.strip() for v in val.split(',') if v.strip()]
    return []


def _parse_specs(val) -> dict:
    if isinstance(val, dict): return val
    if isinstance(val, str):
        import json
        try: return json.loads(val)
        except: return {}
    return {}


def _parse_details(val) -> list:
    """details = liste de sections [{title, body}]. Accepte JSON string ou liste."""
    if isinstance(val, list):
        out = []
        for s in val:
            if isinstance(s, dict) and (s.get('title') or s.get('body')):
                out.append({'title': str(s.get('title', '')).strip(),
                            'body':  str(s.get('body', '')).strip()})
        return out
    if isinstance(val, str) and val.strip():
        import json
        try:
            return _parse_details(json.loads(val))
        except Exception:
            return []
    return []


# ════════════════════════════════════════════════════════════════════════════
#  VARIANTES — nouveau
#  options  = [{ name: 'צבע', values: ['לבן','שחור'] }, ...]   (ordre d'affichage)
#  variants = [{ sku, attributes: {'צבע':'לבן','אחסון':'64GB'},
#               price, originalPrice, stock, supplierPrice, image }]
# ════════════════════════════════════════════════════════════════════════════

def _parse_options(val) -> list:
    """options = [{name, values:[...]}]. Accepte JSON string ou liste."""
    raw = val
    if isinstance(val, str) and val.strip():
        import json
        try: raw = json.loads(val)
        except Exception: return []
    if not isinstance(raw, list):
        return []
    out = []
    for o in raw:
        if isinstance(o, dict) and o.get('name'):
            values = o.get('values', [])
            if isinstance(values, str):
                values = [v.strip() for v in values.split(',') if v.strip()]
            out.append({
                'name':   str(o['name']).strip(),
                'values': [str(v).strip() for v in (values or []) if str(v).strip()],
            })
    return out


def _parse_variants(val) -> list:
    """variants = [{sku, attributes:{}, price, originalPrice, stock, supplierPrice, image}]."""
    raw = val
    if isinstance(val, str) and val.strip():
        import json
        try: raw = json.loads(val)
        except Exception: return []
    if not isinstance(raw, list):
        return []
    out = []
    for v in raw:
        if not isinstance(v, dict):
            continue
        try:
            price = float(v.get('price', 0) or 0)
        except (TypeError, ValueError):
            price = 0.0
        try:
            orig = float(v.get('originalPrice') or 0)
        except (TypeError, ValueError):
            orig = 0.0
        try:
            sup = float(v.get('supplierPrice')) if v.get('supplierPrice') not in (None,'','None') else None
        except (TypeError, ValueError):
            sup = None
        attrs = v.get('attributes', {})
        if not isinstance(attrs, dict):
            attrs = {}
        out.append({
            'sku':           str(v.get('sku', '')).strip(),
            'attributes':    {str(k): str(vv) for k, vv in attrs.items()},
            'price':         price,
            'originalPrice': orig if orig > price else None,
            'stock':         int(v.get('stock', 0) or 0),
            'supplierPrice': sup,
            'image':         v.get('image', ''),
        })
    return out


def _derive_pricing(doc: dict):
    """À partir des variantes, calcule le prix d'affichage (min), le stock total,
    et le flag discount. Si pas de variantes, garde les valeurs à plat existantes."""
    variants = doc.get('variants', [])
    if variants:
        prices = [v['price'] for v in variants if v.get('price')]
        if prices:
            doc['price'] = min(prices)
        # le "originalPrice" d'affichage = celui de la variante la moins chère, si soldée
        cheapest = min(variants, key=lambda v: v.get('price', 0) or 0)
        doc['originalPrice'] = cheapest.get('originalPrice')
        doc['discount'] = any(v.get('originalPrice') for v in variants)
        doc['stock'] = sum(int(v.get('stock', 0) or 0) for v in variants)
        doc['hasVariants'] = True
        # plage de prix (pour "à partir de" et affichage)
        doc['priceMin'] = min(prices) if prices else doc.get('price', 0)
        doc['priceMax'] = max(prices) if prices else doc.get('price', 0)
    else:
        doc['hasVariants'] = False
        doc['priceMin'] = doc.get('price', 0)
        doc['priceMax'] = doc.get('price', 0)


def create_product(data: dict) -> dict:
    now = datetime.utcnow()
    price    = float(data.get('price', 0) or 0)
    orig     = float(data.get('originalPrice') or 0)
    doc = {
        'name':          data.get('name', ''),
        'brand':         data.get('brand', ''),
        'sku':           data.get('sku', ''),
        'category':      data.get('category', 'smartphones'),
        'description':   data.get('description', ''),
        'details':       _parse_details(data.get('details', '[]')),
        'price':         price,
        'originalPrice': orig if orig > price else None,
        'discount':      orig > price,
        'images':        data.get('images', []),
        'stock':         int(data.get('stock', 0) or 0),
        'rating':        float(data.get('rating', 0) or 0),
        'reviewCount':   int(data.get('reviewCount', 0) or 0),
        'isNew':         data.get('isNew', False),
        'isTopRated':    data.get('isTopRated', False),
        'isKosher':      _to_bool(data.get('isKosher', data.get('is_kosher', data.get('kosher', False))), False),
        'isAccessory':   _to_bool(data.get('isAccessory', data.get('is_accessory', False)), False),
        'tags':          data.get('tags', []),
        'colors':        _parse_list(data.get('selectedColors', '[]')),
        'note':          data.get('note', ''),
        'specs':         _parse_specs(data.get('specs', '{}')),
        'sizes':         _parse_list(data.get('selectedSizes', '[]')),
        'supplierPrice': (float(data.get('supplierPrice')) if data.get('supplierPrice') not in (None,'','None') else None),
        'salesCount':    int(data.get('salesCount', 0) or 0),
        'isFeatured':    _to_bool(data.get('isFeatured', False), False),
        # ── variantes ──
        'options':       _parse_options(data.get('options', '[]')),
        'variants':      _parse_variants(data.get('variants', '[]')),
        'createdAt':     now,
        'updatedAt':     now,
    }
    _derive_pricing(doc)   # ← prix/stock d'affichage déduits des variantes
    result = get_collection().insert_one(doc)
    doc['_id'] = result.inserted_id
    return serialize(doc)


def update_product(product_id: str, data: dict) -> dict:
    for field in ('_id', 'id', 'createdAt'):
        data.pop(field, None)

    data['updatedAt'] = datetime.utcnow()
    import json as _json

    for field in ('specs',):
        if field in data and isinstance(data[field], str):
            data[field] = _parse_specs(data[field])
    if 'details' in data:
        data['details'] = _parse_details(data['details'])
    if 'options' in data:
        data['options'] = _parse_options(data['options'])
    if 'variants' in data:
        data['variants'] = _parse_variants(data['variants'])
    for field in ('colors', 'sizes', 'images', 'tags'):
        if field in data and isinstance(data[field], str):
            try: data[field] = _json.loads(data[field])
            except: pass
    if 'supplierPrice' in data:
        try: data['supplierPrice'] = float(data['supplierPrice']) if data['supplierPrice'] not in (None,'','None') else None
        except (ValueError, TypeError): data['supplierPrice'] = None
    if 'salesCount' in data:
        try: data['salesCount'] = int(data['salesCount'] or 0)
        except (ValueError, TypeError): data['salesCount'] = 0

    # Prix : forcer en nombre (le formulaire multipart envoie des strings → sinon le prix
    # est sauvegarde comme "150" et l'affichage / les calculs se cassent).
    if 'price' in data:
        try: data['price'] = float(data['price'] or 0)
        except (ValueError, TypeError): data['price'] = 0.0
    if 'originalPrice' in data:
        try:
            data['originalPrice'] = float(data['originalPrice']) if data['originalPrice'] not in (None,'','None','0') else None
        except (ValueError, TypeError): data['originalPrice'] = None

    # Flags booleens : normaliser depuis les strings du formulaire ("true"/"false"/"on"...).
    # Sans ca, la string "false" est truthy en Python → le produit passe en vedette tout seul.
    for bflag in ('isFeatured', 'isNew', 'isAccessory', 'isKosher'):
        if bflag in data:
            data[bflag] = _to_bool(data[bflag], False)

    # Recompute discount (cas sans variantes)
    try:
        price = float(data.get('price', 0) or 0)
        orig  = float(data.get('originalPrice', 0) or 0)
        if price and orig:
            data['discount'] = orig > price
    except (ValueError, TypeError):
        pass

    # Si variantes présentes (nouvelles ou existantes), recalcule le pricing.
    # On lit le doc existant pour fusionner si 'variants' n'est pas dans l'update.
    existing = get_collection().find_one({'_id': ObjectId(product_id)}) or {}
    merged = dict(existing)
    merged.update(data)
    _derive_pricing(merged)
    # Reporte les champs dérivés dans l'update
    for k in ('price', 'originalPrice', 'discount', 'stock', 'hasVariants', 'priceMin', 'priceMax'):
        if k in merged:
            data[k] = merged[k]

    get_collection().update_one({'_id': ObjectId(product_id)}, {'$set': data})
    return get_by_id(product_id)


def add_images(product_id: str, urls: list):
    get_collection().update_one(
        {'_id': ObjectId(product_id)},
        {'$push': {'images': {'$each': urls}}, '$set': {'updatedAt': datetime.utcnow()}}
    )


def apply_promotion(target_type: str, target: str, discount_pct: float):
    col = get_collection()
    if target_type == 'all':
        match = {}
    elif target_type == 'category':
        match = {'category': target}
    else:
        try:
            match = {'_id': ObjectId(target)}
        except Exception:
            return 0
    products = list(col.find(match))
    count = 0
    for p in products:
        base  = p.get('originalPrice') or p['price']
        new_p = round(base * (1 - discount_pct / 100), 2)
        col.update_one({'_id': p['_id']}, {'$set': {
            'price': new_p, 'originalPrice': base, 'discount': True,
            'updatedAt': datetime.utcnow(),
        }})
        count += 1
    return count


def delete_product(product_id: str):
    get_collection().delete_one({'_id': ObjectId(product_id)})


def serialize(p: dict, admin: bool = False) -> dict:
    if not p:
        return {}
    variants = p.get('variants', []) or []

    # "Nouveau" automatique : produit cree il y a moins de NEW_DAYS jours.
    # Le badge disparait tout seul apres, sans intervention manuelle.
    # Un override manuel (isNew=True enregistre explicitement) force aussi le badge.
    NEW_DAYS = 30
    is_new_auto = False
    created = p.get('createdAt')
    if isinstance(created, datetime):
        is_new_auto = (datetime.utcnow() - created).days < NEW_DAYS
    is_new = bool(p.get('isNew')) or is_new_auto

    out = {
        '_id':           str(p['_id']),
        'name':          p.get('name'),
        'brand':         p.get('brand'),
        'sku':           p.get('sku'),
        'category':      p.get('category'),
        'description':   p.get('description'),
        'details':       p.get('details', []),
        'price':         p.get('price'),
        'originalPrice': p.get('originalPrice'),
        'priceMin':      p.get('priceMin', p.get('price')),
        'priceMax':      p.get('priceMax', p.get('price')),
        'discount':      p.get('discount', False),
        'specs':         _parse_specs(p.get('specs', {})),
        'images':        p.get('images', []),
        'stock':         p.get('stock', 0),
        'rating':        p.get('rating', 0),
        'reviewCount':   p.get('reviewCount', 0),
        'isNew':         is_new,
        'isTopRated':    p.get('isTopRated', False),
        'salesCount':    p.get('salesCount', 0),
        'isFeatured':    p.get('isFeatured', False),
        'tags':          p.get('tags', []),
        'colors':        p.get('colors', []),
        'note':          p.get('note', ''),
        'sizes':         p.get('sizes', []),
        'isKosher':      p.get('isKosher', True),
        'isAccessory':   p.get('isAccessory', False),
        # ── variantes ──
        'options':       p.get('options', []),
        'hasVariants':   p.get('hasVariants', bool(variants)),
        'variants':      _serialize_variants(variants, admin),
        'createdAt':     p['createdAt'].isoformat() if p.get('createdAt') else '',
        'updatedAt':     p['updatedAt'].isoformat() if p.get('updatedAt') else '',
    }
    if admin:
        out['supplierPrice'] = p.get('supplierPrice')
    return out


def _serialize_variants(variants: list, admin: bool) -> list:
    """Expose les variantes au front. supplierPrice masqué sauf admin."""
    out = []
    for v in variants:
        item = {
            'sku':           v.get('sku', ''),
            'attributes':    v.get('attributes', {}),
            'price':         v.get('price', 0),
            'originalPrice': v.get('originalPrice'),
            'stock':         v.get('stock', 0),
            'image':         v.get('image', ''),
        }
        if admin:
            item['supplierPrice'] = v.get('supplierPrice')
        out.append(item)
    return out