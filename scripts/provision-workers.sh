#!/usr/bin/env bash

set -euo pipefail

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""
fi

TOTAL_STAGES=0

_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()
WRITTEN_SECRET=()
SKIPPED=()

_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1 && tput clear 2>/dev/null; then return 0; fi
  printf '\033[2J\033[3J\033[H'
}

banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  You drive the browser; this wizard tells you exactly what to do and\n' "$DIM"
  printf '  captures the values you copy back. Stop any time with Ctrl-C and re-run\n'
  printf '  later, since it remembers values already saved.%s\n' "$RESET"
  pause "Ready to start?"
}

stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

say()  { printf '  %s\n' "$1"; }
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v wslview     >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open    >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open        >/dev/null 2>&1; then open "$url"
    else false; fi
  } >/dev/null 2>&1 || warn "couldn't open a browser, so visit it manually: $url"
}

pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line value sq="'\\''"; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  value="${line#*=}"
  if [[ "$value" == \'*\' ]]; then value="${value:1:${#value}-2}"; value="${value//"$sq"/\'}"
  elif [[ "$value" == \"*\" ]]; then
    value="${value:1:${#value}-2}"
    [[ "$value" == *[\\\$\"]* ]] && return 1
  fi
  printf '%s' "$value"
}

ask() {
  local key="$1" prompt="$2" current input s=$'\001' e=$'\002' p rc=0
  current=$(_existing "$key" || true)
  p="  $s$BOLD$e$prompt$s$RESET$e "
  [[ -n "$current" ]] && p+="$s$DIM$e[Enter keeps current]$s$RESET$e "
  read -e -r -p "$p" input || rc=1
  if (( rc )) && [[ -z "$input" ]]; then return 1; fi
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

ask_secret() {
  local key="$1" prompt="$2" current input rc=0
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || rc=1
  printf '\n'
  if (( rc )) && [[ -z "$input" ]]; then return 1; fi
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

write_env() {
  local key="$1" value="$2" tmp sq="'\\''"
  [[ -e "$ENV_FILE" ]] || (umask 077 && : > "$ENV_FILE")
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf "%s='%s'\n" "$key" "${value//\'/$sq}" >> "$tmp"
  cat "$tmp" > "$ENV_FILE"
  rm -f "$tmp"
  printf -v "$key" '%s' "$value"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ wrote%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ set%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (set it manually: gh secret set $name)")
  warn "skipped GitHub secret $name: gh not ready; set it later"
}

set_var() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if gh variable set "$name" --body "$value" >/dev/null 2>&1; then
      printf '  %s✓ set%s GitHub variable %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub variable $name")
  warn "skipped GitHub variable $name, gh not ready; set it later"
}

finish() {
  _clear
  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} GitHub secret(s): ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "still to do by hand:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}

run_wizard() {

TOTAL_STAGES=7

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT/apps/api"
CONFIG="$API_DIR/wrangler.jsonc"

wr() { (cd "$ROOT" && bunx wrangler --config "$CONFIG" "$@"); }

GH_ACCOUNT="AmiyoKm"
GH_REPO="AmiyoKm/recap-monorepo"

declare -A WEB_HOST_PREFIX=([dev]="dev.recap" [prod]="recap")

set_repo_var() {
  if gh variable set "$1" --repo "$GH_REPO" --body "$2" >/dev/null; then
    printf '  %s✓ set%s GitHub variable %s\n' "$GREEN" "$RESET" "$1"
    return
  fi
  SKIPPED+=("GitHub variable $1")
  warn "could not set GitHub variable $1"
}

build_env_file() {
  local deploy_env="$1"
  printf 'CLOUDFLARE_API_TOKEN=%s\n' "$CI_CLOUDFLARE_API_TOKEN"
  printf 'WEB_ORIGIN=https://%s.%s\n' "${WEB_HOST_PREFIX[$deploy_env]}" "$APP_DOMAIN"
  printf 'BETTER_AUTH_URL=https://recap-api-%s.%s\n' "$deploy_env" "$APP_DOMAIN"
  printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -base64 32)"
  printf 'CONNECTION_ENCRYPTION_KEY=%s\n' "$(openssl rand -base64 32)"
  [[ -n "$GOOGLE_CLIENT_ID" ]] && printf 'GOOGLE_CLIENT_ID=%s\n' "$GOOGLE_CLIENT_ID"
  [[ -n "$GOOGLE_CLIENT_SECRET" ]] && printf 'GOOGLE_CLIENT_SECRET=%s\n' "$GOOGLE_CLIENT_SECRET"
  [[ -n "$JIRA_CLIENT_ID" ]] && printf 'JIRA_CLIENT_ID=%s\n' "$JIRA_CLIENT_ID"
  [[ -n "$JIRA_CLIENT_SECRET" ]] && printf 'JIRA_CLIENT_SECRET=%s\n' "$JIRA_CLIENT_SECRET"
  [[ -n "$LINEAR_CLIENT_ID" ]] && printf 'LINEAR_CLIENT_ID=%s\n' "$LINEAR_CLIENT_ID"
  [[ -n "$LINEAR_CLIENT_SECRET" ]] && printf 'LINEAR_CLIENT_SECRET=%s\n' "$LINEAR_CLIENT_SECRET"
  [[ -n "$GOOGLE_GENERATIVE_AI_API_KEY" ]] && printf 'GOOGLE_GENERATIVE_AI_API_KEY=%s\n' "$GOOGLE_GENERATIVE_AI_API_KEY"
  return 0
}

set_env_file() {
  local deploy_env="$1"
  if build_env_file "$deploy_env" | gh secret set ENV_FILE --repo "$GH_REPO" --env "$deploy_env" >/dev/null; then
    WRITTEN_SECRET+=("ENV_FILE ($deploy_env)")
    printf '  %s✓ set%s ENV_FILE secret of %s\n' "$GREEN" "$RESET" "$deploy_env"
    return
  fi
  SKIPPED+=("ENV_FILE secret of the $deploy_env environment")
  warn "could not set the ENV_FILE secret of $deploy_env"
}

set_config() {
  local path="$1" value="$2" tmp
  tmp=$(mktemp)
  jq --arg v "$value" "$path = \$v" "$CONFIG" > "$tmp"
  cat "$tmp" > "$CONFIG"
  rm -f "$tmp"
  (cd "$ROOT" && bunx biome format --write apps/api/wrangler.jsonc >/dev/null 2>&1) || true
  printf '  %s✓ wrote%s %s → apps/api/wrangler.jsonc\n' "$GREEN" "$RESET" "$path"
}

d1_id() {
  wr d1 list --json 2>/dev/null | jq -r --arg n "$1" '.[] | select(.name == $n) | .uuid' | head -n1
}

kv_id() {
  wr kv namespace list 2>/dev/null | jq -r --arg n "$1" '.[] | select(.title == $n) | .id' | head -n1
}

ensure_d1() {
  local name="$1" path="$2" id
  id=$(d1_id "$name")
  if [[ -n "$id" ]]; then
    note "D1 database $name already exists ($id)."
  elif confirm "Create D1 database $name?"; then
    wr d1 create "$name" </dev/null
    id=$(d1_id "$name")
  fi
  if [[ -z "$id" ]]; then
    SKIPPED+=("D1 database $name: create it, then set $path in apps/api/wrangler.jsonc")
    warn "no ID for $name, so wrangler.jsonc is unchanged"
    return 0
  fi
  set_config "$path" "$id"
}

ensure_kv() {
  local name="$1" path="$2" id
  id=$(kv_id "$name")
  if [[ -n "$id" ]]; then
    note "KV namespace $name already exists ($id)."
  elif confirm "Create KV namespace $name?"; then
    wr kv namespace create "$name" </dev/null
    id=$(kv_id "$name")
  fi
  if [[ -z "$id" ]]; then
    SKIPPED+=("KV namespace $name: create it, then set $path in apps/api/wrangler.jsonc")
    warn "no ID for $name, so wrangler.jsonc is unchanged"
    return 0
  fi
  set_config "$path" "$id"
}

queue_exists() {
  wr queues info "$1" >/dev/null 2>&1
}

ensure_queue() {
  local name="$1"
  if queue_exists "$name"; then
    note "Queue $name already exists."
    return 0
  fi
  if confirm "Create Queue $name?"; then
    wr queues create "$name" </dev/null && return 0
  fi
  SKIPPED+=("Queue $name: run wrangler queues create $name")
  warn "Queue $name is missing, so the hourly pull cannot send messages"
}

vectorize_exists() {
  wr vectorize get "$1" >/dev/null 2>&1
}

vectorize_has_digest_config() {
  wr vectorize get "$1" --json 2>/dev/null | jq -e '.config.dimensions == 768 and .config.metric == "cosine"' >/dev/null
}

vectorize_has_user_index() {
  wr vectorize list-metadata-index "$1" 2>/dev/null | grep -q "userId"
}

ensure_vectorize() {
  local name="$1"
  if vectorize_exists "$name"; then
    note "Vectorize index $name already exists."
  elif confirm "Create Vectorize index $name (768 dimensions, cosine)?"; then
    wr vectorize create "$name" --dimensions=768 --metric=cosine </dev/null
  fi
  if ! vectorize_exists "$name"; then
    SKIPPED+=("Vectorize index $name: run wrangler vectorize create $name --dimensions=768 --metric=cosine")
    warn "Vectorize index $name is missing, so Digest sections cannot be embedded"
    return 0
  fi
  if ! vectorize_has_digest_config "$name"; then
    SKIPPED+=("Vectorize index $name: it must have 768 dimensions and the cosine metric; these cannot change, so make a new index")
    warn "Vectorize index $name has the wrong dimensions or metric, so Digest embeddings will fail"
    return 0
  fi
  if vectorize_has_user_index "$name"; then
    note "Vectorize index $name already has the userId metadata index."
    return 0
  fi
  if confirm "Add the userId metadata index to $name?"; then
    wr vectorize create-metadata-index "$name" --propertyName=userId --type=string </dev/null && return 0
  fi
  SKIPPED+=("Vectorize index $name: run wrangler vectorize create-metadata-index $name --propertyName=userId --type=string")
  warn "Vectorize index $name has no userId metadata index. Add it before the first Digest is embedded."
}

banner "Recap API: provision Cloudflare Workers (dev and prod)"

stage "Sign in to Cloudflare"
say "Wrangler needs your Cloudflare account to create D1 and KV."
note "Wrangler opens the browser itself. Approve the access request there."
if wr whoami 2>/dev/null | grep -q "You are logged in"; then
  note "You are already signed in:"
  wr whoami 2>/dev/null | grep -iE "logged in|account" | head -n5 || true
  if confirm "Sign in again with another account?"; then
    wr login
  fi
else
  wr login
fi
pause "Make sure the account above is the Recap account, then press Enter."

stage "Create the D1 databases"
say "Each environment gets its own D1 database. The IDs go into apps/api/wrangler.jsonc."
ensure_d1 "recap-dev" '.env.dev.d1_databases[0].database_id'
ensure_d1 "recap-prod" '.env.prod.d1_databases[0].database_id'
pause

stage "Create the Queues, KV namespaces and Vectorize indexes"
say "Each environment gets a Queue for the hourly pull messages."
ensure_queue "recap-pull-dev"
ensure_queue "recap-pull-prod"
say "Each environment gets its own KV namespace for the access-token cache."
ensure_kv "recap-api-dev-cache" '.env.dev.kv_namespaces[0].id'
ensure_kv "recap-api-prod-cache" '.env.prod.kv_namespaces[0].id'
if grep -q "TODO-run-scripts-provision-workers" "$CONFIG"; then
  warn "apps/api/wrangler.jsonc still has a TODO ID. Fix it before you deploy."
else
  note "All 4 IDs are in apps/api/wrangler.jsonc. Commit this file."
fi
say "Each environment gets a Vectorize index for the Digest section vectors."
ensure_vectorize "recap-digest-dev"
ensure_vectorize "recap-digest-prod"
pause

stage "Apply the D1 migrations"
say "This makes the tables in the new, empty databases. CI does this on every deploy too."
note "Migrations come from packages/db/migrations."
if confirm "Apply migrations to recap-dev now?"; then
  wr d1 migrations apply DB --remote --env dev
else
  SKIPPED+=("D1 migrations on recap-dev (the first dev deploy applies them)")
fi
warn "recap-prod is production. The first prod deploy also applies the migrations."
if confirm "Apply migrations to recap-prod now?"; then
  wr d1 migrations apply DB --remote --env prod
else
  SKIPPED+=("D1 migrations on recap-prod (the first prod deploy applies them)")
fi
pause

stage "Set the CI API token permissions"
say "CI deploys both Workers with CLOUDFLARE_API_TOKEN from the ENV_FILE secret."
open_url "https://dash.cloudflare.com/?to=/:account/api-tokens"
step "Create a token, or edit the one in ENV_FILE."
step "Make sure it has these permissions, limited to the Recap account:"
note "    Account · Workers Scripts · Edit"
note "    Account · D1 · Edit"
note "    Account · Workers KV Storage · Edit"
note "    Account · Queues · Edit"
note "    Account · Vectorize · Edit"
note "    Zone · Workers Routes · Edit (the zone of APP_DOMAIN)"
note "    Zone · DNS · Edit (the zone of APP_DOMAIN)"
step "Save. The token value stays the same when you only change permissions."
pause "Press Enter when the token has these permissions."

stage "Set the GitHub environment secrets"
say "This stage writes the ENV_FILE secret of the dev and prod GitHub environments."
say "It also sets the repository variables APP_DOMAIN and CLOUDFLARE_ACCOUNT_ID."
warn "It replaces any ENV_FILE that exists. It makes a new auth secret and encryption key for each environment."
if ! command -v gh >/dev/null 2>&1 || ! GH_TOKEN=$(gh auth token -u "$GH_ACCOUNT" 2>/dev/null); then
  warn "gh has no token for $GH_ACCOUNT. Run: gh auth login, then run this wizard again."
  SKIPPED+=("ENV_FILE secrets and repository variables")
  pause
else
  export GH_TOKEN
  ask APP_DOMAIN "Your APP_DOMAIN (for example example.com):"
  ask CLOUDFLARE_ACCOUNT_ID "Your Cloudflare account ID (from stage 1):"
  ask_secret CI_CLOUDFLARE_API_TOKEN "Paste the CI Cloudflare API token (hidden):"
  ask_secret GOOGLE_CLIENT_ID "Google OAuth client ID (Enter to leave empty):" || GOOGLE_CLIENT_ID=""
  ask_secret GOOGLE_CLIENT_SECRET "Google OAuth client secret (Enter to leave empty):" || GOOGLE_CLIENT_SECRET=""
  ask_secret JIRA_CLIENT_ID "Jira OAuth client ID (Enter to leave empty):" || JIRA_CLIENT_ID=""
  ask_secret JIRA_CLIENT_SECRET "Jira OAuth client secret (Enter to leave empty):" || JIRA_CLIENT_SECRET=""
  ask_secret LINEAR_CLIENT_ID "Linear OAuth client ID (Enter to leave empty):" || LINEAR_CLIENT_ID=""
  ask_secret LINEAR_CLIENT_SECRET "Linear OAuth client secret (Enter to leave empty):" || LINEAR_CLIENT_SECRET=""
  ask_secret GOOGLE_GENERATIVE_AI_API_KEY "Gemini API key for the Digest (paid tier in prod, Enter to leave empty):" || GOOGLE_GENERATIVE_AI_API_KEY=""
  set_repo_var APP_DOMAIN "$APP_DOMAIN"
  set_repo_var CLOUDFLARE_ACCOUNT_ID "$CLOUDFLARE_ACCOUNT_ID"
  for deploy_env in dev prod; do
    if confirm "Replace the ENV_FILE secret of the $deploy_env environment?"; then
      set_env_file "$deploy_env"
    else
      SKIPPED+=("ENV_FILE secret of the $deploy_env environment")
    fi
  done
  unset GH_TOKEN
  pause
fi

stage "Deploy"
say "Provisioning is done. The deploy workflows do the rest:"
step "Commit apps/api/wrangler.jsonc with the new IDs."
step "Push to development. dev-deploy migrates recap-dev and deploys recap-api-dev."
step "Check https://recap-api-dev.${APP_DOMAIN:-<APP_DOMAIN>}/health and sign in on the dev web app."
step "Then merge to prod. prod-deploy does the same for prod."
pause "Press Enter to see the summary."

finish
}

run_wizard "$@"; exit
