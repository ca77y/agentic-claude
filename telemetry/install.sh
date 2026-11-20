#!/usr/bin/env bash
# Installs the OpenTelemetry Collector and runs it as a launchd agent that writes
# Claude Code telemetry to ~/.claude/otel/. Safe to rerun: it reinstalls and restarts.
set -euo pipefail

VERSION=0.164.0
LABEL=com.agentic-claude.otelcol
HERE="$(cd "$(dirname "$0")" && pwd)"
SHARE="$HOME/.local/share/agentic-claude-telemetry"
BIN="$SHARE/otelcol-contrib"
CONFIG="$SHARE/collector.yaml"
LOG="$HOME/Library/Logs/$LABEL.log"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

mkdir -p "$SHARE" "$HOME/.claude/otel" "$HOME/Library/LaunchAgents"

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

sed -e "s|__BIN__|$BIN|" -e "s|__CONFIG__|$CONFIG|" -e "s|__LOG__|$LOG|" \
  "$HERE/$LABEL.plist" >"$PLIST"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
# bootout returns before the agent is gone, and bootstrapping a label still loaded fails.
for _ in $(seq 50); do
  launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || break
  sleep 0.2
done
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "$LABEL running; telemetry goes to $HOME/.claude/otel/, its log to $LOG"
