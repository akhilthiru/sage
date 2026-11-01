#!/usr/bin/env bash
# notify.sh — cross-platform desktop toast notification
# Usage: bash .claude/scripts/notify.sh "<AgentName>" "<Status>" "<Summary>"
# Called by all agents via the Notify Skill at the end of each agent run.

AGENT_NAME="${1}"
STATUS="${2}"
SUMMARY="${3}"
TITLE="Technical Lead Agent"
MESSAGE="${AGENT_NAME} — ${STATUS}: ${SUMMARY}"

if [[ -z "$AGENT_NAME" || -z "$STATUS" || -z "$SUMMARY" ]]; then
  echo "[notify.sh] ERROR: Missing arguments. Usage: notify.sh <AgentName> <Status> <Summary>" >&2
  exit 1
fi

OS="$(uname -s)"

case "$OS" in
  Darwin)
    # macOS — Notification Centre via osascript
    osascript -e "display notification \"${SUMMARY}\" with title \"${TITLE}\" subtitle \"${AGENT_NAME} — ${STATUS}\""
    exit $?
    ;;
  Linux)
    # Linux — libnotify (apt install libnotify-bin)
    if command -v notify-send &>/dev/null; then
      notify-send "${TITLE}: ${AGENT_NAME} — ${STATUS}" "${SUMMARY}"
      exit $?
    else
      echo "[notify.sh] WARNING: notify-send not found. Install with: apt install libnotify-bin" >&2
      exit 1
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*|Windows_NT)
    # Windows — PowerShell balloon tip
    powershell.exe -NoProfile -Command "
      Add-Type -AssemblyName System.Windows.Forms
      \$notify = New-Object System.Windows.Forms.NotifyIcon
      \$notify.Icon = [System.Drawing.SystemIcons]::Information
      \$notify.Visible = \$true
      \$notify.ShowBalloonTip(5000, '${TITLE}: ${AGENT_NAME} — ${STATUS}', '${SUMMARY}', [System.Windows.Forms.ToolTipIcon]::Info)
      Start-Sleep -Seconds 6
      \$notify.Dispose()
    "
    exit $?
    ;;
  *)
    echo "[notify.sh] WARNING: Unsupported OS '${OS}' — skipping desktop toast." >&2
    exit 1
    ;;
esac
