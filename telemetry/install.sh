#!/usr/bin/env bash
# Installs two launchd agents: the OpenTelemetry Collector, which writes Claude Code telemetry
# to ~/.claude/otel/, and a sync that copies it and the session transcripts to the GCS bucket
# every 15 minutes. Safe to rerun: it reinstalls and restarts both.
set -euo pipefail

VERSION=0.164.0
PREFIX=com.agentic-claude
HERE="$(cd "$(dirname "$0")" && pwd)"
SHARE="$HOME/.local/share/agentic-claude-telemetry"
BIN="$SHARE/otelcol-contrib"
CONFIG="$SHARE/collector.yaml"
SYNC="$SHARE/sync.sh"
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$HOME/Library/Logs"

mkdir -p "$SHARE" "$HOME/.claude/otel" "$AGENTS"

if ! "$BIN" --version 2>/dev/null | grep -q "$VERSION"; then
  tarball="otelcol-contrib_${VERSION}_darwin_arm64.tar.gz"
  url="https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${VERSION}/${tarball}"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL -o "$tmp/$tarball" "$url"
  curl -fsSL -o "$tmp/$tarball.sha256" "$url.sha256"
  (cd "$tmp" && shasum -a 256 -c <(awk -v f="$tarball" '{print $1"  "f}' "$tarball.sha256"))
  tar -xzf "$tmp/$tarball" -C "$tmp" otelcol-contrib
  install -m 0755 "$tmp/otelcol-contrib" "$BIN"
fi

cp "$HERE/collector.yaml" "$CONFIG"
"$BIN" validate --config "$CONFIG"
install -m 0755 "$HERE/sync.sh" "$SYNC"

# Reloads one agent from its template. bootout returns before the agent is gone, and
# bootstrapping a label that is still loaded fails, so it waits in between.
load() {
  local label="$PREFIX.$1" plist="$AGENTS/$PREFIX.$1.plist"
  sed -e "s|__BIN__|$BIN|" -e "s|__CONFIG__|$CONFIG|" -e "s|__SCRIPT__|$SYNC|" \
    -e "s|__PATH__|$PATH|" -e "s|__LOG__|$LOGS/$label.log|" \
    "$HERE/$label.plist" >"$plist"
  launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
  for _ in $(seq 50); do
    launchctl print "gui/$(id -u)/$label" >/dev/null 2>&1 || break
    sleep 0.2
  done
  launchctl bootstrap "gui/$(id -u)" "$plist"
  echo "$label loaded; its log is $LOGS/$label.log"
}

load otelcol
load sync
