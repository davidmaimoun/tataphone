from flask import Blueprint, request, jsonify
from app.db import get_db
import datetime
from app.services.email_service import send_contact_notify, send_email
import os
APP_URL = os.getenv("APP_URL", "http://localhost:5173")

contact_bp = Blueprint('contact', __name__)


@contact_bp.route('/', methods=['POST'])
def send_message():
    data    = request.get_json() or {}
    name    = data.get('name',    '').strip()
    email   = data.get('email',   '').strip()
    phone   = data.get('phone',   '').strip()
    message = data.get('message', '').strip()

    if not email or not message:
        return jsonify({'error': 'Email and message required'}), 400

    # Save to DB
    get_db()['contact_messages'].insert_one({
        'name': name, 'email': email, 'phone': phone,
        'message': message, 'read': False,
        'createdAt': datetime.datetime.utcnow(),
    })

    # Notify admin via new email service (beautiful HTML)
    try:
        send_contact_notify(name, email, message)
    except Exception as e:
        print(f'[EMAIL] admin notify failed: {e}')

    # Auto-reply to sender
    try:
        _send_autoreply(name, email)
    except Exception as e:
        print(f'[EMAIL] autoreply failed: {e}')

    return jsonify({'sent': True})


def _send_autoreply(name: str, to: str):
    from app.services.email_service import _wrap, _btn
    html = _wrap(f"""
      <h2 style="font-size:20px;font-weight:900;color:#0F172A;margin:0 0 8px;">קיבלנו את הודעתך! 🙏</h2>
      <p style="font-size:14px;color:#64748B;line-height:1.7;margin:0 0 16px;">
        שלום {name},<br>
        תודה על פנייתך. נחזור אליך בהקדם האפשרי — בדרך כלל תוך 24 שעות.
      </p>
      <div style="background:#EFF6FF;border-radius:10px;padding:14px 18px;margin:14px 0;">
        <p style="font-size:13px;color:#1D4ED8;font-weight:700;margin:0 0 6px;">פרטי יצירת קשר:</p>
        <p style="font-size:13px;color:#374151;margin:0;line-height:2;">
          📞 03-555-1234<br>
          📧 info@tataphone.co.il<br>
          🕐 א׳–ה׳ 9:00–18:00
        </p>
      </div>
      {_btn(f"{APP_URL}/products", "בינתיים — גלה מוצרים")}
    """)
    send_email(to, "קיבלנו את הודעתך — טטהפון 🙏", html)


@contact_bp.route('/messages', methods=['GET'])
def get_messages():
    from flask_jwt_extended import jwt_required, get_jwt, verify_jwt_in_request
    try:
        verify_jwt_in_request()
        if get_jwt().get('role') != 'admin':
            return jsonify({'error': 'Admin only'}), 403
    except Exception:
        return jsonify({'error': 'Unauthorized'}), 401

    msgs = list(get_db()['contact_messages'].find().sort('createdAt', -1).limit(50))
    for m in msgs:
        m['_id'] = str(m['_id'])
        if m.get('createdAt'):
            m['createdAt'] = m['createdAt'].isoformat()
    return jsonify({'messages': msgs})


@contact_bp.route('/messages/<msg_id>', methods=['DELETE'])
def delete_message(msg_id):
    from flask_jwt_extended import get_jwt, verify_jwt_in_request
    from bson import ObjectId
    try:
        verify_jwt_in_request()
        if get_jwt().get('role') != 'admin':
            return jsonify({'error': 'Admin only'}), 403
    except Exception:
        return jsonify({'error': 'Unauthorized'}), 401
    get_db()['contact_messages'].delete_one({'_id': ObjectId(msg_id)})
    return jsonify({'ok': True})


@contact_bp.route('/messages/<msg_id>/read', methods=['PUT'])
def mark_read(msg_id):
    from flask_jwt_extended import jwt_required, get_jwt, verify_jwt_in_request
    from bson import ObjectId
    try:
        verify_jwt_in_request()
        if get_jwt().get('role') != 'admin':
            return jsonify({'error': 'Admin only'}), 403
    except Exception:
        return jsonify({'error': 'Unauthorized'}), 401
    # Accepte { "read": true/false } pour basculer lu/non-lu (defaut : true)
    body = request.get_json(silent=True) or {}
    read_val = body.get('read', True)
    get_db()['contact_messages'].update_one(
        {'_id': ObjectId(msg_id)}, {'$set': {'read': bool(read_val)}}
    )
    return jsonify({'ok': True, 'read': bool(read_val)})


@contact_bp.route('/messages/<msg_id>/handle', methods=['PUT'])
def mark_handled(msg_id):
    from flask_jwt_extended import jwt_required, get_jwt, verify_jwt_in_request
    from bson import ObjectId
    try:
        verify_jwt_in_request()
        if get_jwt().get('role') != 'admin':
            return jsonify({'error': 'Admin only'}), 403
    except Exception:
        return jsonify({'error': 'Unauthorized'}), 401
    get_db()['contact_messages'].update_one(
        {'_id': ObjectId(msg_id)},
        {'$set': {'read': True, 'handled': True, 'handledAt': datetime.datetime.utcnow()}}
    )
    return jsonify({'ok': True})


@contact_bp.route('/messages/<msg_id>/unhandle', methods=['PUT'])
def unmark_handled(msg_id):
    from flask_jwt_extended import get_jwt, verify_jwt_in_request
    from bson import ObjectId
    try:
        verify_jwt_in_request()
        if get_jwt().get('role') != 'admin':
            return jsonify({'error': 'Admin only'}), 403
    except Exception:
        return jsonify({'error': 'Unauthorized'}), 401
    get_db()['contact_messages'].update_one(
        {'_id': ObjectId(msg_id)},
        {'$set': {'handled': False}, '$unset': {'handledAt': ''}}
    )
    return jsonify({'ok': True})