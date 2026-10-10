#!/usr/bin/env bash
if grep -qiE '^(Co-Authored-By:|Claude-Session:)|^Signed-off-by:.*(claude|anthropic)' "$1"; then
  echo "Commit message must not credit Claude as author or co-author (no Co-Authored-By or Claude-Session trailers)." >&2
  exit 1
fi
