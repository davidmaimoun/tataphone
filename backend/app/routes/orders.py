import io, smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from fpdf import FPDF

from app.models import order as OrderModel
from app.models import product as ProductModel
from app.services.email_service import send_order_confirmation, send_email

orders_bp = Blueprint('orders', __name__)


def _is_admin():
    try:
        verify_jwt_in_request()
        role = get_jwt().get('role', 'user')
        return role == 'admin'
    except Exception as e:
        print(f"[AUTH] _is_admin error: {e}")
        return False


def _get_user_id():
    try:
        verify_jwt_in_request()
        return get_jwt_identity()
    except Exception:
        return None


# ── Routes ────────────────────────────────────────────────────────────────────


@orders_bp.route('/', methods=['POST'])
def create_order():
    data    = request.get_json() or {}
    print(f"[ORDER] received: subtotal={data.get('subtotal')} vat={data.get('vat')} total={data.get('total')}")
    user_id = _get_user_id()
    if user_id:
        data['userId'] = user_id
 
    data['isTest'] = (data.get('paymentMethod') == 'test')
 
    for item in data.get('items', []):
        p = ProductModel.get_by_id(item.get('product', ''))
        if p:
            item['name'] = p.get('name', '')
            try:
                item['supplierPrice'] = float(p.get('supplierPrice') or 0)
            except (TypeError, ValueError):
                item['supplierPrice'] = 0
    order = OrderModel.create_order(data)
 
    # ── Facturer SEULEMENT si la commande est payée ────────────────────────────
    # Grow crée la commande en 'pending' → pas d'email maintenant.
    # L'email partira quand le webhook Grow confirmera le paiement.
    payment_method = data.get('paymentMethod', '')
    payment_status = data.get('paymentStatus', '')
    is_paid = (payment_method == 'test') or (payment_status == 'paid')
 
    if is_paid:
        try:
            c = order.get('customer', {})
            print(f"[EMAIL] order subtotal={order.get('subtotal')} vat={order.get('vat')} total={order.get('total')}")
            if c.get('email'):
                send_order_confirmation(c['email'], c.get('firstName',''), order)
            OrderModel.mark_invoice_sent(order.get('_id',''))
        except Exception as e:
            print(f'[EMAIL] confirmation failed: {e}')
    else:
        print(f"[ORDER] {order.get('_id')} créée en attente ({payment_method}/{payment_status}) — pas de facture maintenant")
 
    return jsonify(order), 201

@orders_bp.route('/', methods=['GET'])
@jwt_required()
def list_orders():
    if not _is_admin():
        return jsonify({'error': 'Admin only'}), 403
    return jsonify(OrderModel.get_all(request.args.to_dict()))


@orders_bp.route('/stats', methods=['GET'])
@jwt_required()
def stats():
    if not _is_admin():
        return jsonify({'error': 'Admin only'}), 403
    from app.db import get_db
    s = OrderModel.get_stats()
    s['totalProducts'] = get_db()['products'].count_documents({})
    s['newUsers']      = get_db()['users'].count_documents({})
    return jsonify(s)


# ── GET /api/orders/accounting?month=YYYY-MM — RAPPORT COMPTABLE ──────────────
@orders_bp.route('/accounting', methods=['GET'])
@jwt_required()
def accounting():
    if not _is_admin():
        return jsonify({'error': 'Admin only'}), 403
    from app.db import get_db
    from bson import ObjectId
    import datetime

    month        = request.args.get('month')
    include_test = request.args.get('includeTest') == 'true'
    now = datetime.datetime.utcnow()
    if month:
        try:
            y, m = map(int, month.split('-'))
        except Exception:
            y, m = now.year, now.month
    else:
        y, m = now.year, now.month
    start = datetime.datetime(y, m, 1)
    end   = datetime.datetime(y + (m // 12), (m % 12) + 1, 1)

    db = get_db()
    # Profit uniquement sur commandes 'completed'
    q = {'createdAt': {'$gte': start, '$lt': end}, 'status': 'completed'}
    if not include_test:
        q['isTest'] = {'$ne': True}

    orders = list(db['orders'].find(q))

    supplier_cache = {}
    def supplier_of(item):
        sp = item.get('supplierPrice')
        if sp is not None:
            try: return float(sp)
            except (TypeError, ValueError): return 0
        pid = item.get('product', '')
        if pid in supplier_cache:
            return supplier_cache[pid]
        val = 0
        try:
            prod = db['products'].find_one({'_id': ObjectId(pid)})
            if prod:
                val = float(prod.get('supplierPrice') or 0)
        except Exception:
            val = 0
        supplier_cache[pid] = val
        return val

    revenue = 0.0
    supplier_cost = 0.0
    product_stats = {}
    for o in orders:
        for it in o.get('items', []):
            qty   = int(it.get('qty', 1) or 1)
            price = float(it.get('price', 0) or 0)
            sup   = supplier_of(it)
            revenue       += price * qty
            supplier_cost += sup * qty
            key = it.get('name', '—')
            if key not in product_stats:
                product_stats[key] = {'name': key, 'qty': 0, 'revenue': 0.0, 'supplierCost': 0.0}
            product_stats[key]['qty']          += qty
            product_stats[key]['revenue']      += price * qty
            product_stats[key]['supplierCost'] += sup * qty

    products = sorted(product_stats.values(), key=lambda x: x['qty'], reverse=True)
    for p in products:
        p['revenue']      = round(p['revenue'], 2)
        p['supplierCost'] = round(p['supplierCost'], 2)
        p['profit']       = round(p['revenue'] - p['supplierCost'], 2)

    return jsonify({
        'month':        f'{y:04d}-{m:02d}',
        'orderCount':   len(orders),
        'revenue':      round(revenue, 2),
        'supplierCost': round(supplier_cost, 2),
        'profit':       round(revenue - supplier_cost, 2),
        'products':     products,
    })


@orders_bp.route('/mine', methods=['GET'])
@jwt_required()
def my_orders():
    return jsonify(OrderModel.get_by_user(get_jwt_identity()))


@orders_bp.route('/<order_id>', methods=['GET'])
def get_order(order_id):
    order = OrderModel.get_by_id(order_id)
    if not order:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(order)


@orders_bp.route('/<order_id>/status', methods=['PUT'])
@jwt_required()
def update_status(order_id):
    if not _is_admin():
        return jsonify({'error': 'Admin only'}), 403
    status = (request.get_json() or {}).get('status')
    try:
        OrderModel.update_status(order_id, status)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    try:
        order = OrderModel.get_by_id(order_id)
        if order:
            _send_status_email(order, status)
    except Exception as e:
        print(f'[EMAIL] status update failed: {e}')
    return jsonify({'updated': True})


@orders_bp.route('/<order_id>/invoice', methods=['POST'])
@jwt_required()
def send_invoice(order_id):
    if not _is_admin():
        return jsonify({'error': 'Admin only'}), 403
    order = OrderModel.get_by_id(order_id)
    if not order:
        return jsonify({'error': 'Not found'}), 404
    try:
        pdf_bytes = _generate_invoice_pdf(order)
        _send_invoice_with_pdf(order, pdf_bytes)
        OrderModel.mark_invoice_sent(order_id)
    except Exception as e:
        print(f'[INVOICE] failed: {e}')
        return jsonify({'error': str(e)}), 500
    return jsonify({'sent': True})


# ── PDF invoice ───────────────────────────────────────────────────────────────

def _generate_invoice_pdf(order: dict) -> bytes:
    from app.services.email_service import _generate_invoice_pdf as _pdf
    return _pdf(order)


def _send_invoice_with_pdf(order: dict, pdf_bytes: bytes):
    from app.services.email_service import send_order_confirmation
    c    = order.get('customer', {})
    to   = c.get('email', '')
    name = c.get('firstName', '')
    if not to:
        print('[INVOICE] No recipient — skipping')
        return
    send_order_confirmation(to, name, order)
    print(f'[INVOICE] Sent to {to}')


# ── GET /api/orders/<id>/invoice-download ─────────────────────────────────────
@orders_bp.route('/<order_id>/invoice-download', methods=['GET'])
@jwt_required()
def download_invoice(order_id):
    from flask import send_file
    import io

    current_user = get_jwt_identity()
    order = OrderModel.get_by_id(order_id)
    if not order:
        return jsonify({'error': 'Not found'}), 404

    is_admin = get_jwt().get('role') == 'admin'
    is_owner = str(order.get('userId', '')) == str(current_user)
    if not is_admin and not is_owner:
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        pdf_bytes = _generate_invoice_pdf(order)
        oid = str(order['_id'])[-8:].upper()
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'tataphone_invoice_{oid}.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── GET /api/orders/pending-count ─────────────────────────────────────────────
@orders_bp.route('/pending-count', methods=['GET'])
@jwt_required()
def pending_count():
    if not _is_admin():
        return jsonify({'error': 'Admin only'}), 403
    from app.db import get_db
    count = get_db()['orders'].count_documents({'status': 'pending'})
    return jsonify({'count': count})


def _send_status_email(order: dict, status: str):
    from app.services.email_service import send_email, _wrap, _btn, APP_URL
    cust = order.get('customer', {})
    to   = cust.get('email', '')
    name = cust.get('firstName', '')
    oid  = str(order.get('_id',''))[-8:].upper()
    if not to:
        return

    STATUS_CFG = {
        'approved':  ('ההזמנה אושרה! ✅', '🎉', '#059669', 'ההזמנה שלך אושרה ומוכנה לשליחה.'),
        'shipped':   ('ההזמנה נשלחה! 🚚', '📦', '#CC785C', 'ההזמנה בדרך! צפה לקבל אותה תוך 2-4 ימי עסקים.'),
        'completed': ('ההזמנה הושלמה! 🎊', '🎊', '#7C3AED', 'תודה שקנית בטאטעפון! נשמח לראותך שוב.'),
        'cancelled': ('ההזמנה בוטלה ❌', '❌', '#DC2626', 'ההזמנה שלך בוטלה. לשאלות פנה אלינו.'),
    }
    if status not in STATUS_CFG:
        return

    title, emoji, color, desc = STATUS_CFG[status]
    thanks = ""
    if status == 'completed':
        thanks = "<div style='background:#F0FDF4;border-radius:10px;padding:14px 16px;margin:14px 0;border:1px solid #BBF7D0;'><p style='font-size:13px;font-weight:700;color:#065F46;margin:0 0 4px;'>תודה שבחרת בטאטעפון!</p><p style='font-size:13px;color:#374151;margin:0;'>אנו שמחים לשרת אותך ומקווים לראותך שוב בקרוב.</p></div>"
    order_btn = _btn(f"{APP_URL}/my-orders", "צפה בהזמנות שלי") if order.get('userId') else ""

    html = _wrap(
        f"<div style='text-align:center;padding:20px 0 16px;'>"
        f"<div style='font-size:48px;'>{emoji}</div>"
        f"<h2 style='font-size:22px;font-weight:900;color:#3A2A22;margin:12px 0 8px;'>{title}</h2>"
        f"<p style='font-size:14px;color:#7A6A60;'>הזמנה <strong style='color:{color};'>#{oid}</strong></p>"
        f"</div>"
        f"<div style='background:#FAF3EF;border-radius:10px;padding:16px 20px;margin:16px 0;text-align:right;'>"
        f"<p style='font-size:14px;color:#5A4A40;line-height:1.7;'>שלום {name},<br>{desc}</p>"
        f"</div>"
        f"{thanks}"
        f"{order_btn}"
        f"<div style='margin-top:20px;padding-top:16px;border-top:1px solid #F1E8E2;font-size:12px;color:#A1887A;text-align:center;'>"
        f"שאלות? <a href='mailto:info@tataphone.co.il' style='color:#CC785C;'>info@tataphone.co.il</a>"
        f"</div>"
    )
    send_email(to, f"הזמנה #{oid} — {title}", html)


# ── POST /api/orders/paypal/create ───────────────────────────────────────────
@orders_bp.route('/paypal/create', methods=['POST'])
def paypal_create():
    """Create PayPal order and return approval URL."""
    import os, requests as req
    data     = request.get_json() or {}
    amount   = float(data.get('amount', 0))
    order_id = data.get('orderId', '')

    client_id = os.getenv('PAYPAL_CLIENT_ID', '')
    secret    = os.getenv('PAYPAL_SECRET', '')
    base      = 'https://api-m.sandbox.paypal.com' if os.getenv('PAYPAL_SANDBOX','true')=='true' \
                else 'https://api-m.paypal.com'

    if not client_id or not secret:
        return jsonify({'error': 'PayPal not configured'}), 500

    token_resp = req.post(f'{base}/v1/oauth2/token',
        auth=(client_id, secret),
        data={'grant_type': 'client_credentials'})
    access_token = token_resp.json().get('access_token')

    app_url = os.getenv('APP_URL', 'http://localhost:3000')
    pp_resp = req.post(f'{base}/v2/checkout/orders',
        headers={'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'},
        json={
            'intent': 'CAPTURE',
            'purchase_units': [{'amount': {'currency_code': 'ILS', 'value': f'{amount:.2f}'},
                                'custom_id': order_id}],
            'application_context': {
                'return_url': f'{app_url}/order-success?paypal=success&orderId={order_id}',
                'cancel_url': f'{app_url}/checkout?paypal=cancel',
            }
        })
    pp_data = pp_resp.json()
    approve = next((l['href'] for l in pp_data.get('links',[]) if l['rel']=='approve'), None)
    _increment_sales(order_id)
    return jsonify({'approvalUrl': approve, 'paypalOrderId': pp_data.get('id')})


# ── POST /api/orders/paypal/capture ──────────────────────────────────────────
@orders_bp.route('/paypal/capture', methods=['POST'])
def paypal_capture():
    """Capture PayPal payment after approval."""
    import os, requests as req
    data           = request.get_json() or {}
    paypal_order_id = data.get('paypalOrderId', '')
    our_order_id    = data.get('orderId', '')

    client_id = os.getenv('PAYPAL_CLIENT_ID', '')
    secret    = os.getenv('PAYPAL_SECRET', '')
    base      = 'https://api-m.sandbox.paypal.com' if os.getenv('PAYPAL_SANDBOX','true')=='true' \
                else 'https://api-m.paypal.com'

    token_resp = req.post(f'{base}/v1/oauth2/token',
        auth=(client_id, secret), data={'grant_type': 'client_credentials'})
    access_token = token_resp.json().get('access_token')

    cap_resp = req.post(f'{base}/v2/checkout/orders/{paypal_order_id}/capture',
        headers={'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'})
    cap_data = cap_resp.json()

    if cap_data.get('status') == 'COMPLETED':
        OrderModel.update_status(our_order_id, 'approved')
        from app.db import get_db
        get_db()['orders'].update_one(
            {'_id': __import__('bson').ObjectId(our_order_id)},
            {'$set': {'paymentStatus': 'paid', 'paymentMethod': 'paypal'}}
        )
        return jsonify({'ok': True, 'status': 'COMPLETED'})
    return jsonify({'ok': False, 'status': cap_data.get('status')}), 400


# ── POST /api/orders/grow/create ─────────────────────────────────────────────
@orders_bp.route('/grow/create', methods=['POST'])
def grow_create():
    """Crée un lien de paiement Grow VIA MAKE — avec le détail des produits (items),
    pour que le reçu envoyé par Grow au client liste chaque article séparément
    au lieu d'un seul total agrégé."""
    import os, json as _json, requests as req
    data     = request.get_json() or {}
    amount   = float(data.get('amount', 0) or 0)
    order_id = data.get('orderId', '')
    customer = data.get('customer', {})

    make_webhook = os.getenv('GROW_MAKE_WEBHOOK', '')
    if not make_webhook:
        return jsonify({'error': 'Grow/Make not configured'}), 500

    full_name = f"{customer.get('firstName','')} {customer.get('lastName','')}".strip()
    phone = (customer.get('phone') or '').strip() or '0500000000'
    title = f"הזמנה #{str(order_id)[-8:].upper()}"

    # ── Détail des produits de la commande (déjà stockés lors de la création de l'order) ──
    order = OrderModel.get_by_id(order_id) if order_id else None
    order_items = (order or {}).get('items', [])
    products = [
        {
            'catalogNumber': str(i.get('product', '')),
            'name':          i.get('name') or 'מוצר',
            'price':         f"{float(i.get('price', 0)):.2f}",
            'quantity':      int(i.get('qty', 1) or 1),
            'vatType':       3,   # 1 = TVA normale (Grow attend un code numérique, pas 'regular')
        }
        for i in order_items
    ]
    # Si le montant payé (produits + livraison) diffère de la somme des lignes produits,
    # on ajoute une ligne "משלוח" pour que le total du reçu corresponde exactement.
    items_total = sum(float(i.get('price', 0)) * int(i.get('qty', 1) or 1) for i in order_items)
    shipping_amount = round(amount - items_total, 2)
    if shipping_amount > 0:
        products.append({
            'catalogNumber': '',
            'name':          'משלוח',
            'price':         f'{shipping_amount:.2f}',
            'quantity':      1,
            'vatType':       1,   # 1 = TVA normale (Grow attend un code numérique, pas 'regular')
        })
    # Filet de sécurité : si on n'a pas réussi à récupérer les items (order introuvable, etc.),
    # on retombe sur une ligne unique plutôt que d'échouer la création du paiement.
    if not products:
        products = [{'catalogNumber': '', 'name': title, 'price': f'{amount:.2f}', 'quantity': 1, 'vatType': 1}]

    payload = {
        'fullName':    full_name or 'לקוח',
        'phone':       phone,
        'amount':      f'{amount:.2f}',
        'title':       title,
        'orderId':     str(order_id),
        'email':       customer.get('email', ''),
        'productName': title,
        'price':       f'{amount:.2f}',
        'items':       products,   # ← à mapper sur le champ "Products" du module Grow "Create Payment Link" dans Make
    }

    try:
        resp = req.post(make_webhook, json=payload, timeout=30)
        # Make renvoie le JSON SANS content-type → on parse directement le texte.
        try:
            result = resp.json()
        except Exception:
            try:
                result = _json.loads(resp.text)
            except Exception:
                result = {}
    except Exception as e:
        return jsonify({'error': f'Make call failed: {e}'}), 502
 
    pay_url = result.get('paymentUrl') if isinstance(result, dict) else None
    if pay_url:
        return jsonify({'paymentUrl': pay_url, 'processId': result.get('processId')})
    return jsonify({'error': 'Grow/Make create failed', 'detail': result}), 400


# ── POST /api/orders/grow/webhook ────────────────────────────────────────────
 
@orders_bp.route('/grow/webhook', methods=['POST'])
def grow_webhook():
    """Notification serveur-à-serveur de Grow : marque la commande payée.
    Grow envoie lui-même le reçu (קבלה) au client → pas d'email de notre côté."""
    data = request.form.to_dict() or (request.get_json(silent=True) or {})
    print(f"[GROW/WEBHOOK] reçu: {data}")
 
    order_id = (
        data.get('data[customFields][cField1]')
        or data.get('cField1')
        or data.get('orderId')
        or ''
    )
    status      = str(data.get('status', '')) or str(data.get('data[status]', ''))
    status_code = str(data.get('data[statusCode]', ''))
    paid = (
        status in ('1', '2', 'approved', 'success', 'שולם')
        or status_code in ('1', '2')
    )
 
    print(f"[GROW/WEBHOOK] order_id={order_id} paid={paid} status={status} statusCode={status_code}")
 
    if paid and order_id:
        try:
            from app.db import get_db
            from bson import ObjectId
            OrderModel.update_status(order_id, 'approved')
            get_db()['orders'].update_one(
                {'_id': ObjectId(order_id)},
                {'$set': {'paymentStatus': 'paid', 'paymentMethod': 'grow', 'invoiceSent': True}}
            )
            print(f"[GROW] commande {order_id} marquée payée ✓ (reçu envoyé par Grow)")
        except Exception as e:
            print(f'[GROW] order update failed: {e}')
 
    # Toujours 200 (Grow l'exige)
    return jsonify({'ok': True}), 200
# @orders_bp.route('/grow/webhook', methods=['POST'])
# def grow_webhook():
#     """Notification serveur-à-serveur de Grow : marque payé + facture."""
#     import os, requests as req
#     data = request.form.to_dict() or (request.get_json(silent=True) or {})
#     print(f"[GROW/WEBHOOK] reçu: {data}")
 
#     # ── Grow envoie les clés en format APLATI : data[customFields][cField1] ──
#     # On cherche l'orderId à tous les endroits possibles (robuste).
#     order_id = (
#         data.get('data[customFields][cField1]')
#         or data.get('cField1')
#         or data.get('orderId')
#         or ''
#     )
 
#     # Le statut : Grow envoie status='1' ET data[status]='שולם' ET data[statusCode]='2'
#     status      = str(data.get('status', '')) or str(data.get('data[status]', ''))
#     status_code = str(data.get('data[statusCode]', ''))
 
#     # transactionId / token aussi en format aplati
#     trans_id    = data.get('data[transactionId]')    or data.get('transactionId', '')
#     trans_token = data.get('data[transactionToken]') or data.get('transactionToken', '')
 
#     # Payé si status='1' (ou '2'), ou statusCode='2', ou texte 'שולם', etc.
#     paid = (
#         status in ('1', '2', 'approved', 'success', 'שולם')
#         or status_code in ('1', '2')
#     )
 
#     print(f"[GROW/WEBHOOK] order_id={order_id} paid={paid} status={status} statusCode={status_code}")
 
#     if paid and order_id:
#         try:
#             from app.db import get_db
#             from bson import ObjectId
#             OrderModel.update_status(order_id, 'approved')
#             get_db()['orders'].update_one(
#                 {'_id': ObjectId(order_id)},
#                 {'$set': {'paymentStatus': 'paid', 'paymentMethod': 'grow'}}
#             )

#             _increment_sales(order_id)

#             print(f"[GROW] commande {order_id} marquée payée ✓")
#         except Exception as e:
#             print(f'[GROW] order update failed: {e}')
 
#         # ── Envoyer la facture/confirmation MAINTENANT (paiement confirmé) ──
#         try:
#             order = OrderModel.get_by_id(order_id)
#             c = (order or {}).get('customer', {})
#             if order and c.get('email') and not order.get('invoiceSent'):
#                 send_order_confirmation(c['email'], c.get('firstName', ''), order)
#                 OrderModel.mark_invoice_sent(order_id)
#                 print(f"[GROW] facture envoyée à {c.get('email')} ✓")
#             elif order and order.get('invoiceSent'):
#                 print(f"[GROW] facture déjà envoyée pour {order_id} — skip")
#             else:
#                 print(f"[GROW] pas d'email client pour {order_id} — pas de facture")
#         except Exception as e:
#             print(f'[GROW] invoice send failed: {e}')
 
#         # ── approveTransaction (acquitter, sinon Grow renvoie 5 rappels) ──
#         try:
#             user_id = os.getenv('GROW_USER_ID', '')
#             if user_id and trans_id:
#                 sandbox = os.getenv('GROW_SANDBOX', 'true') == 'true'
#                 base    = 'https://sandbox.grow.link' if sandbox else 'https://secure.grow.link'
#                 req.post(f'{base}/api/light/server/1.0/approveTransaction',
#                          data={'userId': user_id, 'transactionId': trans_id,
#                                'transactionToken': trans_token}, timeout=20)
#                 print(f"[GROW] approveTransaction envoyé pour {trans_id}")
#         except Exception as e:
#             print(f'[GROW] approveTransaction failed: {e}')
 
#     return jsonify({'ok': True})
 

# ── POST /api/orders/track-guest ─────────────────────────────────────────────
@orders_bp.route('/track-guest', methods=['POST'])
def track_guest():
    from app.db import get_db
    import datetime
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({'ok': False}), 400
    ip = request.headers.get('X-Forwarded-For', request.remote_addr or '').split(',')[0].strip()
    db = get_db()
    db['guests'].update_one(
        {'email': email},
        {'$set': {
            'email': email,
            'lastSeen': datetime.datetime.utcnow(),
            'ip': ip,
            'name': data.get('name', ''),
            'phone': data.get('phone', ''),
        },
        '$inc': {'orderCount': 1},
        '$setOnInsert': {'createdAt': datetime.datetime.utcnow(), 'banned': False}},
        upsert=True
    )
    return jsonify({'ok': True})

 
def _increment_sales(order_id):
    """Incrémente salesCount de chaque produit de la commande (unités vendues).
    Appelé UNE fois quand la commande passe payée. Idempotent via flag salesCounted."""
    try:
        from app.db import get_db
        from bson import ObjectId
        db = get_db()
        order = db['orders'].find_one({'_id': ObjectId(order_id)})
        if not order:
            return
        # Protection : ne compter qu'une seule fois par commande
        if order.get('salesCounted'):
            print(f"[SALES] commande {order_id} déjà comptée — skip")
            return
        for item in order.get('items', []):
            pid = item.get('product', '')
            qty = int(item.get('qty', 1) or 1)
            if not pid:
                continue
            try:
                db['products'].update_one(
                    {'_id': ObjectId(pid)},
                    {'$inc': {'salesCount': qty}}
                )
            except Exception as e:
                print(f"[SALES] produit {pid} inc failed: {e}")
        # Marquer la commande comme comptée (évite double comptage sur rappels Grow)
        db['orders'].update_one({'_id': ObjectId(order_id)}, {'$set': {'salesCounted': True}})
        print(f"[SALES] ventes comptées pour commande {order_id}")
    except Exception as e:
        print(f"[SALES] increment failed: {e}")
 
# ── DANS grow_webhook, après avoir marqué la commande payée, AJOUTE :
#      _increment_sales(order_id)
#
# ── DANS paypal_capture, après le update_status 'approved', AJOUTE :
#      _increment_sales(our_order_id)