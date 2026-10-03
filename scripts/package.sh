#!/usr/bin/env sh
# Builds dist/techseo-inspector-<version>.zip for the Chrome Web Store.
set -eu
cd "$(dirname "$0")/.."
version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' extension/manifest.json | head -n 1)
mkdir -p dist
out="dist/techseo-inspector-${version}.zip"
rm -f "$out"
(cd extension && zip -r -q -X "../$out" . -x '.*')
echo "Wrote $out"
