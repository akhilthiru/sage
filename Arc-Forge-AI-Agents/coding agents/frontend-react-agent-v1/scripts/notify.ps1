<#
.SYNOPSIS
    Send a Windows toast notification for a Dev Agent status update.

.PARAMETER AgentName
    Name of the agent (e.g. "Planning Agent").

.PARAMETER Status
    Agent outcome: Completed | Blocked | Failed

.PARAMETER Summary
    One or two sentence summary produced by the orchestrator.

.PARAMETER SkipSend
    Test seam. Builds the toast payload but does not dispatch to Windows.
    Returns the XML string on stdout instead.

.EXAMPLE
    .\notify.ps1 -AgentName "Planning Agent" -Status "Completed" -Summary "LLD approved."
#>

param(
    [Parameter(Mandatory)]
    [string]$AgentName,

    [Parameter(Mandatory)]
    [ValidateSet('Completed', 'Blocked', 'Failed')]
    [string]$Status,

    [Parameter(Mandatory)]
    [string]$Summary,

    [switch]$SkipSend
)

$AppId  = 'Dev Agent'
$RegKey = "HKCU:\SOFTWARE\Classes\AppUserModelId\$AppId"

$icon = switch ($Status) {
    'Completed' { '[OK]' }
    'Blocked'   { '[BLOCKED]' }
    'Failed'    { '[FAILED]' }
}

$title = "$icon $AgentName : $Status"

if ($Summary.Length -gt 200) {
    $Summary = $Summary.Substring(0, 197) + '...'
}

$escapedTitle   = [System.Security.SecurityElement]::Escape($title)
$escapedSummary = [System.Security.SecurityElement]::Escape($Summary)

$xml = @"
<toast duration="short">
  <visual>
    <binding template="ToastGeneric">
      <text>$escapedTitle</text>
      <text>$escapedSummary</text>
    </binding>
  </visual>
</toast>
"@

if ($SkipSend) {
    Write-Output $xml
    exit 0
}

# Register the app ID in HKCU so Windows delivers toasts (no admin required, persists after first run)
if (-not (Test-Path $RegKey)) {
    New-Item -Path $RegKey -Force | Out-Null
    New-ItemProperty -Path $RegKey -Name 'DisplayName'    -Value $AppId -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $RegKey -Name 'ShowInSettings' -Value 0      -PropertyType DWord  -Force | Out-Null
}

# Load Windows Runtime types and dispatch
[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
[void][Windows.UI.Notifications.ToastNotification,        Windows.UI.Notifications, ContentType = WindowsRuntime]
[void][Windows.Data.Xml.Dom.XmlDocument,                  Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]

$doc = [Windows.Data.Xml.Dom.XmlDocument]::new()
$doc.LoadXml($xml)

$toast = [Windows.UI.Notifications.ToastNotification]::new($doc)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($AppId).Show($toast)
