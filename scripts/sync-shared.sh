#!/usr/bin/env bash
#
# ==============================================
# SYNC SHARED
# Keeps src/shared identical across every tool in
# the family.
#
# Ramps Studio is upstream: src/shared is authored
# there and copied outward. This one script runs in
# both directions and works out which by looking for
# scripts/.is-upstream, which only the upstream repo
# has.
#
#   ./scripts/sync-shared.sh           copy
#   ./scripts/sync-shared.sh --check   diff only, exit 1 on drift
#
# Run --check before any release. Without it, "just
# copy the files" quietly becomes "the files are
# different in four repos and nobody noticed" — which
# is the only real failure mode of choosing a copied
# directory over a published package.
# ==============================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAMILY_ROOT="$(dirname "$REPO_ROOT")"
UPSTREAM_NAME="Ramps Studio"
UPSTREAM="$FAMILY_ROOT/$UPSTREAM_NAME"
SHARED="src/shared"

CHECK=0
[[ "${1:-}" == "--check" ]] && CHECK=1
[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && { sed -n '3,22p' "${BASH_SOURCE[0]}" | sed 's|^# \?||'; exit 0; }

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
fail() { printf '\033[31m%s\033[0m\n' "$1" >&2; }
ok()   { printf '\033[32m%s\033[0m\n' "$1"; }

# One directory against another. Returns 1 on any difference.
compare() {
  local from="$1" to="$2" label="$3"
  if [[ ! -d "$to/$SHARED" ]]; then
    fail "  $label — no $SHARED yet"
    return 1
  fi
  if diff -rq "$from/$SHARED" "$to/$SHARED" >/tmp/sync-shared-diff 2>&1; then
    ok "  $label — in sync"
    return 0
  fi
  fail "  $label — DRIFTED"
  sed 's/^/      /' /tmp/sync-shared-diff >&2
  return 1
}

copy() {
  local from="$1" to="$2" label="$3"
  mkdir -p "$to/$SHARED"
  # --delete so a file removed upstream disappears downstream too. Without it a
  # deleted component lingers, still compiling, until someone imports the stale copy.
  rsync -a --delete "$from/$SHARED/" "$to/$SHARED/"
  ok "  $label — updated"
}

if [[ -f "$REPO_ROOT/scripts/.is-upstream" ]]; then
  # ---- Upstream: push to every sibling that looks like a tool repo ----
  bold "Upstream ($UPSTREAM_NAME) → siblings"
  status=0
  found=0
  for dir in "$FAMILY_ROOT"/*/; do
    dir="${dir%/}"
    [[ "$dir" == "$REPO_ROOT" ]] && continue
    # A tool repo has a package.json. Anything else in the folder is not ours.
    [[ -f "$dir/package.json" ]] || continue
    found=1
    name="$(basename "$dir")"
    if (( CHECK )); then
      compare "$REPO_ROOT" "$dir" "$name" || status=1
    else
      copy "$REPO_ROOT" "$dir" "$name"
    fi
  done
  (( found )) || echo "  no sibling tool repos yet"
  exit $status
fi

# ---- Downstream: pull from upstream ----
if [[ ! -d "$UPSTREAM/$SHARED" ]]; then
  fail "Upstream not found at $UPSTREAM"
  fail "Expected the family to live side by side under $FAMILY_ROOT."
  exit 2
fi

name="$(basename "$REPO_ROOT")"
bold "$UPSTREAM_NAME → $name"
if (( CHECK )); then
  compare "$UPSTREAM" "$REPO_ROOT" "$name"
else
  copy "$UPSTREAM" "$REPO_ROOT" "$name"
fi
