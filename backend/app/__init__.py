import os
from flask import Flask
from flask_cors import CORS
from flask import jsonify
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from .db import init_db

load_dotenv()

def create_app():
    app = Flask(__name__)
    # Evite les redirections 308 quand le slash final manque (/contact vs /contact/),
    # qui cassent les requetes preflight CORS (le navigateur refuse de suivre un redirect en OPTIONS).
    app.url_map.strict_slashes = False

    # ── Config ────────────────────────────────────────
    app.config['JWT_SECRET_KEY']           = os.getenv('JWT_SECRET', 'dev-secret')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = __import__('datetime').timedelta(
        hours=int(os.getenv('JWT_EXPIRY_HOURS', 48))
    )
    app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_MB', 16)) * 1024 * 1024
    app.config['UPLOAD_FOLDER']      = os.path.join(
        os.path.dirname(__file__), '..', os.getenv('UPLOAD_FOLDER', 'uploads')
    )
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # ── Extensions ───────────────────────────────────
    CORS(app, origins=os.getenv('CORS_ORIGINS', '*').split(','))
    
    jwt = JWTManager(app)

    @jwt.invalid_token_loader
    def _invalid_token(reason):
        print(f"[JWT] invalid token: {reason}")
        return jsonify({'error': 'invalid_token', 'reason': reason}), 401
    
    @jwt.expired_token_loader
    def _expired_token(jwt_header, jwt_payload):
        return jsonify({'error': 'token_expired'}), 401
    
    @jwt.unauthorized_loader
    def _missing_token(reason):
        return jsonify({'error': 'authorization_required', 'reason': reason}), 401
    
    @jwt.needs_fresh_token_loader
    def _needs_fresh(jwt_header, jwt_payload):
        return jsonify({'error': 'fresh_token_required'}), 401

    init_db()

    # ── Blueprints ───────────────────────────────────
    from .routes.auth       import auth_bp
    from .routes.products   import products_bp
    from .routes.orders     import orders_bp
    from .routes.promotions import promotions_bp
    from .routes.users      import users_bp
    from .routes.contact    import contact_bp
    from .routes.uploads    import uploads_bp
    from .routes.wishlist   import wishlist_bp
    from .routes.meta      import meta_bp
    from .routes.reviews   import reviews_bp
    from app.routes.integrations import integrations_bp
    from app.routes.settings import settings_bp
    from app.routes.address import address_bp

    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(wishlist_bp,    url_prefix='/api/wishlist')
    app.register_blueprint(meta_bp,        url_prefix='/api/meta')
    app.register_blueprint(reviews_bp,    url_prefix='/api/reviews')
    app.register_blueprint(auth_bp,       url_prefix='/api/auth')
    app.register_blueprint(products_bp,   url_prefix='/api/products')
    app.register_blueprint(orders_bp,     url_prefix='/api/orders')
    app.register_blueprint(promotions_bp, url_prefix='/api/promotions')
    app.register_blueprint(users_bp,      url_prefix='/api/users')
    app.register_blueprint(contact_bp,    url_prefix='/api/contact')
    app.register_blueprint(uploads_bp,    url_prefix='/api/uploads')
    app.register_blueprint(integrations_bp, url_prefix='/api/integrations')
    app.register_blueprint(address_bp,      url_prefix='/api/address')




    return app