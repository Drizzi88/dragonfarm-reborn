#!/usr/bin/env bash
set -euo pipefail

EXPECTED_OWNER='Drizzi88'
REPO='dragonfarm-reborn'
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for tool in gh git rsync; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing $tool (CachyOS: sudo pacman -S --needed git github-cli rsync)" >&2; exit 1; }
done

ACTUAL_OWNER="$(gh api user --jq .login 2>/dev/null || true)"
if [[ "$ACTUAL_OWNER" != "$EXPECTED_OWNER" ]]; then
  echo "ERROR: logged in as '${ACTUAL_OWNER:-nobody}', expected '$EXPECTED_OWNER'." >&2
  echo "Run 'gh auth login' or 'gh auth switch --user Drizzi88' first." >&2
  exit 2
fi

VISIBILITY="$(gh repo view "$EXPECTED_OWNER/$REPO" --json visibility --jq .visibility)"
if [[ "$VISIBILITY" != 'PUBLIC' ]]; then
  echo "ERROR: repository $EXPECTED_OWNER/$REPO is not public. Nothing published." >&2
  exit 3
fi

gh auth setup-git >/dev/null
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

gh repo clone "$EXPECTED_OWNER/$REPO" "$WORKDIR/repo" -- -q
DEST="$WORKDIR/repo"

# Keep the existing repository history, update only project content.
rsync -a --exclude='.git/' --exclude='publish-existing.sh' --exclude='publish-github.sh' \
  --exclude='*.zip' "$SOURCE_DIR/" "$DEST/"
cp "$SOURCE_DIR/publish-existing.sh" "$DEST/publish-existing.sh"

git -C "$DEST" add -A
if git -C "$DEST" diff --cached --quiet; then
  echo 'No changes to publish.'
  exit 0
fi

if [[ -z "$(git -C "$DEST" config user.name || true)" ]]; then
  git -C "$DEST" config user.name "$EXPECTED_OWNER"
fi
if [[ -z "$(git -C "$DEST" config user.email || true)" ]]; then
  git -C "$DEST" config user.email '31840592+Drizzi88@users.noreply.github.com'
fi

git -C "$DEST" commit -m 'Publish Dragonfarm Reborn v0.7.2 to GitHub Pages'
git -C "$DEST" push origin HEAD:main

echo
echo 'Game sources uploaded successfully to:'
echo "https://github.com/$EXPECTED_OWNER/$REPO"
echo 'Now enable Pages in Settings > Pages: Deploy from a branch, main, /(root).'
echo "Game URL: https://${EXPECTED_OWNER,,}.github.io/$REPO/"
