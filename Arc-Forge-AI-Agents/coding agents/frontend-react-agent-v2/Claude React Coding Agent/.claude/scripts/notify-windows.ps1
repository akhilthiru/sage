# TPS DMS Pipeline — Windows toast notification
# Invoked by Claude Code's Notification hook. Reads event JSON from stdin.
#
# The Notification hook fires whenever the pipeline calls PushNotification —
# at every human gate, every phase start/end, and on pipeline completion or abort.
# This script converts each of those in-app notifications into a Windows toast
# so the developer is alerted even when Claude Code is in the background.

$inputRaw = [Console]::In.ReadToEnd()

$title   = "TPS DMS Pipeline"
$message = "Action needed — open Claude Code"

try {
    $data = $inputRaw | ConvertFrom-Json
    # Claude Code passes the notification text in the "notification" field
    if ($data.notification) { $message = $data.notification }
} catch { }

# Sanitise for XML
$message = $message -replace '&', '&amp;' `
                    -replace '<', '&lt;'  `
                    -replace '>', '&gt;'  `
                    -replace '"', '&quot;'

# Load WinRT toast types (Windows 10/11 built-in — no extra packages needed)
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction Stop
    $null = [Windows.UI.Notifications.ToastNotificationManager,
             Windows.UI.Notifications, ContentType = WindowsRuntime]
    $null = [Windows.Data.Xml.Dom.XmlDocument,
             Windows.Data.Xml.Dom,          ContentType = WindowsRuntime]
} catch {
    exit 0   # WinRT unavailable — silent exit, never block the pipeline
}

$toastXml = @"
<toast duration="long">
  <visual>
    <binding template="ToastGeneric">
      <text>$title</text>
      <text>$message</text>
    </binding>
  </visual>
</toast>
"@

try {
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($toastXml)
    $toast = New-Object Windows.UI.Notifications.ToastNotification $xml

    # Use PowerShell's own App User Model ID — no app registration required
    $appId = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe"
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)
} catch {
    exit 0   # Silent exit — notification failure must never break the pipeline
}
