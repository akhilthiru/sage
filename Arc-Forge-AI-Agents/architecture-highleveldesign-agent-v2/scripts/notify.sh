#!/usr/bin/env bash
# Cross-platform desktop notification script
# Usage: bash scripts/notify.sh "Agent Name" "Status" "Summary message"

AGENT_NAME="${1:-Agent}"
STATUS="${2:-Completed}"
SUMMARY="${3:-}"
TITLE="${AGENT_NAME} — ${STATUS}"

case "$(uname -s 2>/dev/null)" in

  Darwin*)
    # macOS — uses osascript (built-in, no dependencies)
    osascript -e "display notification \"${SUMMARY}\" with title \"${TITLE}\""
    ;;

  Linux*)
    # Linux — requires libnotify-bin (apt install libnotify-bin)
    if command -v notify-send &>/dev/null; then
      notify-send "${TITLE}" "${SUMMARY}"
    else
      echo "[notify] notify-send not found. Install libnotify-bin to enable Linux toasts." >&2
      exit 1
    fi
    ;;

  CYGWIN*|MINGW*|MSYS*|*)
    # Windows (Git Bash / MSYS2 / Cygwin) — falls through to PowerShell
    powershell.exe -ExecutionPolicy Bypass -Command "
      Add-Type -AssemblyName System.Windows.Forms
      \$n = New-Object System.Windows.Forms.NotifyIcon
      \$n.Icon = [System.Drawing.SystemIcons]::Information
      \$n.Visible = \$true
      \$n.ShowBalloonTip(5000, '${TITLE}', '${SUMMARY}', [System.Windows.Forms.ToolTipIcon]::None)
      Start-Sleep -Seconds 6
      \$n.Dispose()
    "
    ;;

esac
