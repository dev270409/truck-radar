#!/bin/sh
# Truck Radar — entrypoint self-hosted.
# Prepara lo schema, crea le tabelle raw e (opzionalmente) i dati demo, poi avvia.
set -e

echo "[entrypoint] Applico lo schema Prisma (prisma db push)..."
i=0
until npx prisma db push --skip-generate; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[entrypoint] Database non raggiungibile dopo 30 tentativi." >&2
    exit 1
  fi
  echo "[entrypoint] Database non pronto, riprovo ($i)..."
  sleep 2
done

echo "[entrypoint] Creo le tabelle raw e i seed di sistema..."
npx tsx scripts/ensure-raw-tables.ts

if [ "${SEED_DEMO}" = "true" ]; then
  echo "[entrypoint] Inserisco i dati demo (SEED_DEMO=true)..."
  npx tsx prisma/seed.ts || echo "[entrypoint] Seed demo fallito (ignoro)."
fi

echo "[entrypoint] Avvio applicazione..."
exec npm start
