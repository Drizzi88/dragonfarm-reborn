#!/usr/bin/env bash
set -euo pipefail
# Run: ./publish-github.sh YOUR_PERSONAL_GITHUB_USERNAME
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
ACCOUNT="${1:-}"
if [[ -z "$ACCOUNT" ]]; then
  echo 'Usage: ./publish-github.sh YOUR_PERSONAL_GITHUB_USERNAME' >&2
  exit 2
fi
if [[ "${ACCOUNT,,}" == 'sv-domblick' ]]; then
  echo 'STOP: This project must not be published under SV-Domblick.' >&2
  exit 3
fi
for tool in git gh; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing $tool. On CachyOS install with: sudo pacman -S git github-cli" >&2
    exit 4
  fi
done
ACTUAL="$(gh api user --jq .login 2>/dev/null || true)"
if [[ -z "$ACTUAL" ]]; then
  echo 'GitHub CLI not authenticated. Run: gh auth login --hostname github.com' >&2
  exit 5
fi
if [[ "${ACTUAL,,}" != "${ACCOUNT,,}" ]]; then
  echo "STOP: GitHub CLI is authenticated as '$ACTUAL', not '$ACCOUNT'." >&2
  echo "Switch with 'gh auth switch --user $ACCOUNT' or log in with 'gh auth login'." >&2
  exit 6
fi
if [[ -d .git ]]; then
  echo 'This folder already has a .git repository. Refusing to overwrite/remap remotes.' >&2
  exit 7
fi
if gh repo view "$ACCOUNT/dragonfarm-reborn" >/dev/null 2>&1; then
  echo 'This repository already exists. Refusing to overwrite it.' >&2
  exit 8
fi
echo "This will create a PUBLIC repository: https://github.com/$ACCOUNT/dragonfarm-reborn"
echo 'All files in this directory (except .gitignore exclusions) will become public.'
read -r -p 'Type PUBLIC to continue: ' CONSENT
[[ "$CONSENT" == 'PUBLIC' ]] || { echo 'Cancelled.'; exit 9; }
git init -b main
git add .
git commit -m 'Publish Dragonfarm Reborn v0.7.2 (GitHub Pages)'
gh repo create "$ACCOUNT/dragonfarm-reborn" --public --source=. --remote=origin --push
echo
echo 'The GitHub repository is created. To enable the website:'
echo "https://github.com/$ACCOUNT/dragonfarm-reborn/settings/pages"
echo 'Choose Deploy from a branch > main > / (root), then Save.'
echo "Game URL after Pages finishes: https://$ACCOUNT.github.io/dragonfarm-reborn/"
