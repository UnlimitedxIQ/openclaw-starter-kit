$ErrorActionPreference='Stop'
$statePath='C:\agent\openclaw-workspace\orchestrator\manager\state.json'
$inboxPath='C:\agent\openclaw-workspace\orchestrator\queue\inbox.jsonl'
if(!(Test-Path $statePath)){ throw "Missing state.json" }
$state = Get-Content -Raw $statePath | ConvertFrom-Json
$off = [int64]$state.inboxByteOffset
if(!(Test-Path $inboxPath)){
  Write-Output ''
  exit 0
}
$fs = [System.IO.File]::Open($inboxPath,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::ReadWrite)
$null = $fs.Seek($off,[System.IO.SeekOrigin]::Begin)
$sr = New-Object System.IO.StreamReader($fs)
$text = $sr.ReadToEnd()
$sr.Close(); $fs.Close()
Write-Output $text
