#!/usr/bin/env bash
branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branch" =~ ^(feature|fix|docs|infra)/[a-z0-9][a-z0-9._-]*$ || "$branch" == main || "$branch" == devel || "$branch" == HEAD ]]; then
  exit 0
fi
echo "Invalid branch name: $branch (use feature|fix|docs|infra/short-description)"
exit 1
