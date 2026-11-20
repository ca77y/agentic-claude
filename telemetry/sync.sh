#!/usr/bin/env bash
# Copies Claude Code's telemetry and session transcripts to the bucket, under this machine's name.
# It never deletes from the bucket, so the bucket keeps what Claude Code later cleans up locally.
set -euo pipefail

BUCKET=gs://agentic-claude-004680-telemetry
DEST="$BUCKET/$(scutil --get LocalHostName)"

gcloud storage rsync --recursive --exclude='\.DS_Store$' "$HOME/.claude/otel" "$DEST/otel"
gcloud storage rsync --recursive --exclude='\.DS_Store$' "$HOME/.claude/projects" "$DEST/projects"
echo "$(date -u +%FT%TZ) synced to $DEST"
