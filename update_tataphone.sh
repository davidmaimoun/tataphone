#!/usr/bin/env bash
# update_tataphone.sh — déploie les dernières modifs (frontend + backend)
# Usage : ./update_tataphone.sh   (depuis le dossier racine du projet sur le serveur)
set -e

# ── CONFIG (adapte les chemins) ──
PROJECT_DIR="/var/www/tataphone"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "════════════════════════════════════════"
echo "  Mise à jour Tataphone"
echo "════════════════════════════════════════"

# ── 1. Récupérer le code (si tu utilises git) ──
if [ -d "$PROJECT_DIR/.git" ]; then
  echo "→ git pull..."
  cd "$PROJECT_DIR" && git pull
fi

# ── 2. BACKEND (Flask) ──
echo "→ Backend : dépendances + redémarrage..."
cd "$BACKEND_DIR"
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate
pm2 restart tataphone-api

# ── 3. FRONTEND (Next.js) ──
echo "→ Frontend : install + build prod..."
cd "$FRONTEND_DIR"
npm install --omit=dev=false   # installe tout (dev inclus, requis pour le build)
rm -rf .next
npm run build
pm2 restart tataphone-web

echo "════════════════════════════════════════"
echo "  ✓ Déploiement terminé"
pm2 status
echo "════════════════════════════════════════"