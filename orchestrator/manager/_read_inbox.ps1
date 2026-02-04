$inbox = 'C:\agent\openclaw-workspace\orchestrator\queue\inbox.jsonl'
$statePath = 'C:\agent\openclaw-workspace\orchestrator\manager\state.json'

$offset = 0
if (Test-Path $statePath) {
  try { $offset = (Get-Content $statePath -Raw | ConvertFrom-Json).inboxByteOffset } catch { $offset = 0 }
}

if (!(Test-Path $inbox)) {
  Write-Output 'NO_INBOX'
  exit 0
}

$fs = [System.IO.File]::Open($inbox,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::ReadWrite)
$len = $fs.Length
if ($offset -gt $len) { $offset = 0 }
$null = $fs.Seek($offset,[System.IO.SeekOrigin]::Begin)
$sr = New-Object System.IO.StreamReader -ArgumentList $fs
$text = $sr.ReadToEnd()
$sr.Close(); $fs.Close()

Write-Output ("OFFSET=$offset")
Write-Output ("LEN=$len")
Write-Output '---'
Write-Output $text
