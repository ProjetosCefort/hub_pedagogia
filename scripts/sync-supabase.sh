#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${SUPABASE_ENV_FILE:-supabase/.env}"
DRY_RUN=false
SKIP_SECRETS=false
SKIP_MIGRATIONS=false
SKIP_FUNCTIONS=false

usage() {
  cat <<'EOF'
Uso:
  npm run supabase:sync
  npm run supabase:sync -- --dry-run
  npm run supabase:sync -- --skip-secrets
  npm run supabase:sync -- --skip-migrations
  npm run supabase:sync -- --skip-functions

Variaveis esperadas em supabase/.env:
  SUPABASE_PROJECT_ID
  SUPABASE_ACCESS_TOKEN
  SUPABASE_DB_PASSWORD ou POSTGRES_PASSWORD

Secrets sincronizados quando existirem:
  JWT_SECRET
  RESEND_API_KEY
  RESEND_FROM_EMAIL
  SUPPORT_EMAIL
  PUBLIC_APP_URL
  WHATSAPP_REMINDER_WEBHOOK_URL
  DOCUMENT_REMINDER_CRON_SECRET
  DOCUMENT_REMINDER_TYPES
  PUBLIC_ACCESS_RATE_LIMIT_SECRET
  GOOGLE_OAUTH_CLIENT_ID
  GOOGLE_OAUTH_CLIENT_SECRET
  GOOGLE_OAUTH_REDIRECT_URI
  GOOGLE_OAUTH_DEFAULT_SENDER
EOF
}

log() {
  printf '\n==> %s\n' "$1"
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    printf 'Erro: variavel obrigatoria ausente: %s\n' "$name" >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      ;;
    --skip-secrets)
      SKIP_SECRETS=true
      ;;
    --skip-migrations)
      SKIP_MIGRATIONS=true
      ;;
    --skip-functions)
      SKIP_FUNCTIONS=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'Erro: opcao desconhecida: %s\n\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ ! -f "$ENV_FILE" ]]; then
  printf 'Erro: arquivo de ambiente nao encontrado: %s\n' "$ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID:-${PROJECT_REF:-}}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"

require_env SUPABASE_PROJECT_ID
require_env SUPABASE_ACCESS_TOKEN
require_env SUPABASE_DB_PASSWORD

SUPABASE_CLI=(npx supabase)

log "Projeto Supabase: ${SUPABASE_PROJECT_ID}"

if [[ "$SKIP_MIGRATIONS" == false ]]; then
  log "Migrations remotas antes do sync"
  "${SUPABASE_CLI[@]}" migration list --linked --password "$SUPABASE_DB_PASSWORD"

  log "Dry-run das migrations"
  "${SUPABASE_CLI[@]}" db push --linked --dry-run --password "$SUPABASE_DB_PASSWORD"

  if [[ "$DRY_RUN" == false ]]; then
    log "Aplicando migrations pendentes"
    "${SUPABASE_CLI[@]}" db push --linked --yes --password "$SUPABASE_DB_PASSWORD"
  fi
else
  log "Migrations ignoradas por --skip-migrations"
fi

if [[ "$DRY_RUN" == true ]]; then
  log "Dry-run concluido. Secrets e Edge Functions nao foram alterados."
  exit 0
fi

if [[ "$SKIP_SECRETS" == false ]]; then
  secret_args=()
  for name in \
    JWT_SECRET \
    RESEND_API_KEY \
    RESEND_FROM_EMAIL \
    SUPPORT_EMAIL \
    PUBLIC_APP_URL \
    WHATSAPP_REMINDER_WEBHOOK_URL \
    DOCUMENT_REMINDER_CRON_SECRET \
    DOCUMENT_REMINDER_TYPES \
    PUBLIC_ACCESS_RATE_LIMIT_SECRET \
    GOOGLE_OAUTH_CLIENT_ID \
    GOOGLE_OAUTH_CLIENT_SECRET \
    GOOGLE_OAUTH_REDIRECT_URI \
    GOOGLE_OAUTH_DEFAULT_SENDER
  do
    if [[ -n "${!name:-}" ]]; then
      secret_args+=("${name}=${!name}")
    fi
  done

  if [[ ${#secret_args[@]} -gt 0 ]]; then
    log "Sincronizando secrets permitidos"
    "${SUPABASE_CLI[@]}" secrets set "${secret_args[@]}" --project-ref "$SUPABASE_PROJECT_ID"
  else
    log "Nenhum secret opcional encontrado para sincronizar"
  fi
else
  log "Secrets ignorados por --skip-secrets"
fi

if [[ "$SKIP_FUNCTIONS" == false ]]; then
  log "Publicando Edge Functions"
  "${SUPABASE_CLI[@]}" functions deploy --project-ref "$SUPABASE_PROJECT_ID" --use-api

  log "Edge Functions remotas"
  "${SUPABASE_CLI[@]}" functions list --project-ref "$SUPABASE_PROJECT_ID"
else
  log "Edge Functions ignoradas por --skip-functions"
fi

if [[ "$SKIP_MIGRATIONS" == false ]]; then
  log "Migrations remotas depois do sync"
  "${SUPABASE_CLI[@]}" migration list --linked --password "$SUPABASE_DB_PASSWORD"
fi

log "Sync do Supabase concluido"
