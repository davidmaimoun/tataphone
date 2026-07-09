#!/usr/bin/env bash
# Israly — mise à jour (pull propre + rebuild + restart)
# Usage : sudo -iu israly bash -c '/var/www/israly/update_israly.sh'
set -euo pipefail

# ===== Config =====
APP_NAME="israly"
APP_DIR="/var/www/israly"
BRANCH="main"
PORT="3001"
NODE_VERSION="22"
# ==================

# 1) Ne jamais tourner en root
if [ "$(id -u)" = "0" ]; then
  echo "❌ Ne lance pas ce script en root."
  echo "   Utilise : sudo -iu israly bash -c '$APP_DIR/update_israly.sh'"
  exit 1
fi

# 2) Charger nvm (chemin explicite = fiable même en non-interactif)
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "❌ nvm introuvable dans $NVM_DIR — installe Node via nvm pour cet utilisateur."
  exit 1
fi
# shellcheck disable=SC1090
\. "$NVM_DIR/nvm.sh"
nvm use "$NODE_VERSION" >/dev/null 2>&1 || nvm use default >/dev/null 2>&1

echo "▶ Node $(node -v) / npm $(npm -v)"
case "$(node -v)" in
  v18.*|v16.*|v14.*) echo "❌ Node trop ancien ($(node -v)). Le build va casser — installe Node $NODE_VERSION (nvm install $NODE_VERSION)."; exit 1;;
esac

cd "$APP_DIR"
echo "▶ Mise à jour d'Israly ($BRANCH)"

# 3) Récupère l'état exact du repo (garde .env qui est git-ignoré)
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "▶ Dépendances"
npm ci

echo "▶ Prisma generate"
npm run db:generate
# décommente si tu as changé le schéma Prisma :
# npm run db:push

echo "▶ Build (cache .next purgé pour éviter les images/pages périmées)"
rm -rf .next
npm run build

echo "▶ Redémarrage PM2"
# restart si l'app existe déjà, sinon start propre sur le bon port
pm2 restart "$APP_NAME" --update-env 2>/dev/null \
  || PORT="$PORT" pm2 start "npm run start -- -p $PORT" --name "$APP_NAME"
pm2 save

echo ""
echo "✅ Israly mis à jour."
echo "   Test local :  curl -I http://127.0.0.1:$PORT"
echo "   ⚠  Pense à purger le cache Cloudflare si tu as changé des images."