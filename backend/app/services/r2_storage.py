# ════════════════════════════════════════════════════════════════════════════
#  CLOUDFLARE R2 — stockage photos produit + resize Cloudflare (Stratégie B)
#
#  Domaine custom : images.tataphone.co.il (branché sur le bucket)
#  Transformations Cloudflare ACTIVÉES → resize à la volée via /cdn-cgi/image/
#
#  .env backend :
#    R2_ACCOUNT_ID=...
#    R2_ACCESS_KEY_ID=...
#    R2_SECRET_ACCESS_KEY=...
#    R2_BUCKET=tataphone-images
#    R2_PUBLIC_URL=https://images.tataphone.co.il   ← domaine custom (sans / final)
#    R2_RESIZE_WIDTH=1200                            ← largeur d'affichage via Cloudflare
#
#  STRATÉGIE B :
#   - Pillow fait un pré-resize LARGE (2000px) pour ne pas stocker d'images géantes
#   - Cloudflare redimensionne à R2_RESIZE_WIDTH (1200) à l'affichage, format auto (WebP/AVIF)
#   - L'URL retournée passe par /cdn-cgi/image/ pour déclencher la transformation
# ════════════════════════════════════════════════════════════════════════════

import os
import io
import uuid
import boto3
from botocore.config import Config
from PIL import Image

R2_ACCOUNT_ID        = os.getenv('R2_ACCOUNT_ID', '')
R2_ACCESS_KEY_ID     = os.getenv('R2_ACCESS_KEY_ID', '')
R2_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET            = os.getenv('R2_BUCKET', '')
R2_PUBLIC_URL        = os.getenv('R2_PUBLIC_URL', '').rstrip('/')
# Largeur d'affichage Cloudflare (0 ou vide = pas de transformation)
R2_RESIZE_WIDTH      = int(os.getenv('R2_RESIZE_WIDTH', '0') or 0)

_ALLOWED   = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
_STORE_MAX = 2000   # pré-resize Pillow à l'upload (évite de stocker du 6000px)


def _client():
    if not (R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_BUCKET):
        raise RuntimeError("R2 non configuré — vérifie R2_* dans le .env")
    return boto3.client(
        's3',
        endpoint_url=f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version='s3v4'),
        region_name='auto',
    )


def _public_url(key: str) -> str:
    """Construit l'URL publique. Si resize Cloudflare activé, passe par /cdn-cgi/image/."""
    if not R2_PUBLIC_URL:
        raise RuntimeError("R2_PUBLIC_URL manquant")
    base = f"{R2_PUBLIC_URL}/{key}"
    if R2_RESIZE_WIDTH > 0:
        # URL de transformation Cloudflare : redimensionne + format auto (WebP/AVIF) + qualité
        # Format : https://<domaine>/cdn-cgi/image/<options>/<image-source>
        opts = f"width={R2_RESIZE_WIDTH},quality=85,format=auto"
        return f"{R2_PUBLIC_URL}/cdn-cgi/image/{opts}/{R2_PUBLIC_URL}/{key}"
    return base


def upload_to_r2(file_storage) -> str:
    """Pré-resize (Pillow, 2000px max) puis upload R2. Retourne l'URL publique (avec resize CF si activé)."""
    filename = file_storage.filename or 'image'
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    if ext not in _ALLOWED:
        raise ValueError(f"Type de fichier non autorisé : {ext}")

    if ext == 'gif':
        data = file_storage.read()
        content_type = 'image/gif'
        out_ext = 'gif'
    else:
        img = Image.open(file_storage.stream)
        if img.mode in ('RGBA', 'P') and ext in ('jpg', 'jpeg'):
            img = img.convert('RGB')
        # Pré-resize large (on garde une bonne qualité, Cloudflare affinera à l'affichage)
        img.thumbnail((_STORE_MAX, _STORE_MAX))
        buf = io.BytesIO()
        fmt = 'JPEG' if ext in ('jpg', 'jpeg') else ext.upper()
        save_kwargs = {'optimize': True}
        if fmt == 'JPEG':
            save_kwargs['quality'] = 90   # qualité stockage un peu plus haute (CF ré-optimise)
        img.save(buf, format=fmt, **save_kwargs)
        data = buf.getvalue()
        content_type = f'image/{"jpeg" if ext in ("jpg","jpeg") else ext}'
        out_ext = 'jpg' if ext in ('jpg', 'jpeg') else ext

    key = f"products/{uuid.uuid4().hex}.{out_ext}"
    _client().put_object(
        Bucket=R2_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
        CacheControl='public, max-age=31536000, immutable',
    )
    return _public_url(key)


def _key_from_url(image_url: str):
    """Extrait la clé R2 depuis n'importe quelle forme d'URL (avec ou sans /cdn-cgi/image/)."""
    if not R2_PUBLIC_URL or not image_url:
        return None
    url = image_url
    # Si l'URL passe par /cdn-cgi/image/.../<R2_PUBLIC_URL>/key → isoler la vraie source
    marker = f"{R2_PUBLIC_URL}/cdn-cgi/image/"
    if marker in url:
        # tout ce qui suit le dernier "R2_PUBLIC_URL/" est la clé
        idx = url.rfind(f"{R2_PUBLIC_URL}/")
        url = url[idx:]
    if url.startswith(R2_PUBLIC_URL):
        return url[len(R2_PUBLIC_URL):].lstrip('/')
    return None


def delete_from_r2(image_url: str):
    """Supprime un objet R2 à partir de son URL publique."""
    key = _key_from_url(image_url)
    if not key:
        return
    try:
        _client().delete_object(Bucket=R2_BUCKET, Key=key)
        print(f"[R2] deleted {key}")
    except Exception as e:
        print(f"[R2] delete failed: {e}")

def grow_image_url(image_url: str, size: int = 300) -> str:
    """URL d'image compatible Grow (module 'Create Payment Link' → champ Product URL).

    Grow exige : PNG ou JPEG, ratio 1:1, min 60x60 px, max 2 Mo.
    Nos URLs stockées utilisent `format=auto` (WebP/AVIF) et une largeur libre → non conformes.
    On reconstruit donc une URL de transformation Cloudflare carrée et forcée en JPEG :
      fit=cover  → recadre en carré exact (garantit le ratio 1:1)
      format=jpeg → force le JPEG (pas de WebP/AVIF)
    Retourne '' si l'image n'est pas hébergée sur R2 (Grow ignorera alors le champ).
    """
    key = _key_from_url(image_url)
    if not key or not R2_PUBLIC_URL:
        return ''
    opts = f"width={size},height={size},fit=cover,format=jpeg,quality=85"
    return f"{R2_PUBLIC_URL}/cdn-cgi/image/{opts}/{R2_PUBLIC_URL}/{key}"