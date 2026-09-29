#!/usr/bin/env bash
#
# Tripwires for defects this repository has actually had.
#
# Usage: ops/hygiene.sh

set -uo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILURES=0
check() {
    local label="$1"; shift
    if "$@"; then
        printf 'ok   %s\n' "$label"
    else
        printf 'FAIL %s\n' "$label"
        FAILURES=$((FAILURES + 1))
    fi
}

# Tracked files plus new ones that are not gitignored: `git ls-files` alone
# sees only what is committed, so a file added in the same change is skipped.
repo_files() {
    git ls-files --cached --others --exclude-standard
}

# `! cmd | xargs grep | grep .` is unreliable under `set -o pipefail`: xargs
# returns non-zero when a batch has no match, which makes the pipeline non-zero
# and the negation report success while printing the matches it found.
expect_no_matches() {
    local hits
    hits=$(eval "$1" 2>/dev/null)
    [ -z "$hits" ] && return 0
    echo "$hits" | head -20 | sed 's/^/  /'
    return 1
}

# The instructor and admin routers serve per-student behavioural data and can
# rewrite the hints students see. Every route in this API was once open, with
# CORS the only thing in front of them - and CORS is a browser policy.
staff_routers_are_gated() {
    local bad=0
    grep -q 'dependencies=\[Depends(require_staff)\]' server/app/routers/dashboards.py \
      || { echo "  dashboards router has no require_staff dependency"; bad=1; }
    grep -q 'require_staff' server/app/routers/kb.py \
      || { echo "  kb router does not import require_staff (/kb/reload must be gated)"; bad=1; }
    [ "$bad" -eq 0 ]
}

# ...and the gate must fail closed. Defaulting open is how this was wrong.
staff_gate_fails_closed() {
    grep -q 'allow_unauthenticated_staff: bool = False' server/app/config.py &&
    grep -q 'compare_digest' server/app/auth.py
}

# Student-facing routes must stay open: the widget is embedded in ~200
# independently hosted lab pages with no identity to present. Gating them would
# break every one of them silently.
student_routes_stay_open() {
    expect_no_matches "grep -n 'require_staff' server/app/routers/session.py server/app/routers/chat.py"
}

# The limiter keeps a window per session id. Without eviction its memory grew
# with total sessions rather than concurrent ones.
rate_limiter_evicts() {
    grep -q '_maybe_sweep' server/app/ratelimit.py
}

# eslint used to walk into the Python virtualenv and report formatting errors
# in pip's vendored urllib3.
eslint_ignores_the_python_tree() {
    grep -q '"\.venv"' eslint.config.js
}

no_env_or_db_committed() {
    expect_no_matches "repo_files | grep -E '(^|/)(\.env|\.dev\.vars)\$|\.db\$|(^|/)__pycache__/'"
}

no_build_artefacts_committed() {
    # git ls-files, not repo_files: "committed" is about what is tracked, and
    # an artefact that is merely gitignored is already fine.
    expect_no_matches "git ls-files | grep -E '^(dist|\.output|\.vinxi|\.tanstack|embed/dist|node_modules|\.venv|\.pytest_cache)/'"
}

# Only package markers may be empty. Four zero-byte test files in another repo
# in this job made it look tested when it was not.
no_empty_source_files() {
    local bad=0 f
    for f in $(repo_files | grep -E '\.(py|ts|tsx|sh)$'); do
        if [ ! -s "$f" ] && [ "$(basename "$f")" != "__init__.py" ]; then
            echo "  empty file: $f"
            bad=1
        fi
    done
    [ "$bad" -eq 0 ]
}

# House style: no em dashes, en dashes or emoji in anything tracked.
no_decorative_glyphs() {
    expect_no_matches "repo_files | grep -vE '\.(png|jpg|jpeg|gif|svg|ico|woff2?)\$' | xargs grep -nP '[\x{2013}\x{2014}\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE0F}]'"
}

readme_images_resolve() {
    local missing=0 img found=0
    for img in $( { grep -ohE '\]\(([^)]+\.(jpg|jpeg|png|gif))\)' README.md 2>/dev/null | sed -E 's/^\]\(//; s/\)$//';
                    grep -ohE 'src="([^"]+\.(jpg|jpeg|png|gif))"' README.md 2>/dev/null | sed -E 's/^src="//; s/"$//'; } | sort -u ); do
        found=$((found + 1))
        [ -f "$img" ] || { echo "  missing image: $img"; missing=1; }
    done
    # A check that matched nothing is not a check that passed.
    [ "$found" -gt 0 ] || { echo "  no image references found at all"; missing=1; }
    [ "$missing" -eq 0 ]
}

# src/lib/kb.types.ts is generated from kb/schema/experiment.schema.json. A
# generated file that is committed and never re-checked is the same trap as a
# stale schema snapshot: the schema gains a field, the types do not, and the
# console reads a property that is no longer there. Regenerate into a temporary
# file and compare.
kb_types_are_current() {
    command -v npx >/dev/null 2>&1 || { echo "  npx not available, cannot verify"; return 1; }
    [ -f src/lib/kb.types.ts ] || { echo "  src/lib/kb.types.ts is missing"; return 1; }
    local committed rc=0
    committed="$(mktemp)"
    cp src/lib/kb.types.ts "$committed"
    if ! npm run --silent kb:types >/dev/null 2>&1; then
        echo "  npm run kb:types failed"
        rc=1
    elif ! diff -q "$committed" src/lib/kb.types.ts >/dev/null; then
        echo "  src/lib/kb.types.ts is out of date with kb/schema/experiment.schema.json"
        echo "  run: npm run kb:types"
        rc=1
    fi
    # Always put the committed copy back: a check must not edit the tree it is
    # checking, or a failing run leaves a diff nobody asked for.
    cp "$committed" src/lib/kb.types.ts
    rm -f "$committed"
    return "$rc"
}

check "instructor and admin routers are gated"   staff_routers_are_gated
check "the staff gate fails closed"              staff_gate_fails_closed
check "student-facing routes stay open"          student_routes_stay_open
check "rate limiter evicts stale windows"        rate_limiter_evicts
check "eslint ignores the Python tree"           eslint_ignores_the_python_tree
check "no .env, database or __pycache__ tracked" no_env_or_db_committed
check "no build artefacts committed"             no_build_artefacts_committed
check "no empty source files"                    no_empty_source_files
check "no em dashes, en dashes or emoji"         no_decorative_glyphs
check "README images all resolve"                readme_images_resolve
check "generated KB types match the schema"      kb_types_are_current

echo
if [ "$FAILURES" -eq 0 ]; then
    echo "hygiene: all checks passed"
else
    echo "hygiene: ${FAILURES} check(s) failed"
fi
exit "$FAILURES"
