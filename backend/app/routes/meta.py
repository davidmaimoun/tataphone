"""
Meta collections: categories, brands, colors, sizes.
Admin can add entries; products reference them by name.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from app.db import get_db
import datetime

meta_bp = Blueprint('meta', __name__)

COLLECTIONS = ['categories', 'subcategories', 'brands', 'colors', 'sizes', 'tags']


def _col(name):
    return get_db()[f'meta_{name}']


def _is_admin():
    try:
        return get_jwt().get('role') == 'admin'
    except Exception:
        return False


# ── GET /api/meta/<collection> ────────────────────────────────────────────────
@meta_bp.route('/<collection>', methods=['GET'])
def get_all(collection):
    if collection not in COLLECTIONS:
        return jsonify({'error': 'Invalid collection'}), 400
    docs = list(_col(collection).find().sort('name', 1))
    return jsonify({collection: [d['name'] for d in docs]})


# ── POST /api/meta/<collection> ───────────────────────────────────────────────
@meta_bp.route('/<collection>', methods=['POST'])
@jwt_required()
def add_entry(collection):
    if not _is_admin():
        return jsonify({'error': 'Admin only'}), 403
    if collection not in COLLECTIONS:
        return jsonify({'error': 'Invalid collection'}), 400
    name = (request.get_json() or {}).get('name', '').strip()
    if not name:
        return jsonify({'error': 'name required'}), 400
    # Upsert — no duplicate
    _col(collection).update_one(
        {'name': name},
        {'$setOnInsert': {'name': name, 'createdAt': datetime.datetime.utcnow()}},
        upsert=True
    )
    return jsonify({'ok': True, 'name': name})


# ── DELETE /api/meta/<collection>/<name> ─────────────────────────────────────
@meta_bp.route('/<collection>/<name>', methods=['DELETE'])
@jwt_required()
def delete_entry(collection, name):
    if not _is_admin():
        return jsonify({'error': 'Admin only'}), 403
    if collection not in COLLECTIONS:
        return jsonify({'error': 'Invalid collection'}), 400
    _col(collection).delete_one({'name': name})
    return jsonify({'ok': True})


# ── POST /api/meta/seed ───────────────────────────────────────────────────────
@meta_bp.route('/seed', methods=['POST'])
@jwt_required()
def seed():
    """Seed initial data from existing products + defaults."""
    if not _is_admin():
        return jsonify({'error': 'Admin only'}), 403

    db = get_db()
    products = list(db['products'].find({}, {'brand':1,'category':1,'colors':1,'sizes':1}))

    seeds = {
        'categories': ['smartphones','cameras','headphones','watches','accessories','tablets','batteries'],
        'sizes':      ['XS','S','M','L','XL','XXL','64GB','128GB','256GB','512GB'],
        'brands':     list({p['brand'] for p in products if p.get('brand')}),
        'colors':     list({'שחור','לבן','כסף','אפור','זהב','ורוד','אדום','כחול','ירוק','סגול','כתום','טיטניום','שמפניה'} |
                          {c for p in products for c in (p.get('colors') or []) if c}),
    }
    # Add categories and sizes from products
    seeds['categories'] += [p['category'] for p in products if p.get('category')]
    seeds['categories'] = list(set(seeds['categories']))

    now = datetime.datetime.utcnow()
    totals = {}
    for col, names in seeds.items():
        count = 0
        for name in names:
            if not name: continue
            r = _col(col).update_one(
                {'name': name},
                {'$setOnInsert': {'name': name, 'createdAt': now}},
                upsert=True
            )
            if r.upserted_id:
                count += 1
        totals[col] = count

    return jsonify({'seeded': totals})