$ErrorActionPreference='Stop'
$state = Get-Content "$PSScriptRoot\state.json" | ConvertFrom-Json
$offset = [int64]$state.inboxByteOffset
$inbox = Join-Path (Split-Path $PSScriptRoot -Parent) "queue\inbox.jsonl"
$nextOffsetPath = Join-Path $PSScriptRoot "_nextOffset.txt"
if (!(Test-Path $inbox)) {
  Set-Content -Encoding ascii -NoNewline -Path $nextOffsetPath -Value $offset
  exit 0
}
$fs = [System.IO.File]::Open($inbox, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
try {
  $null = $fs.Seek($offset, [System.IO.SeekOrigin]::Begin)
  $sr = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8, $true, 4096, $true)
  $text = $sr.ReadToEnd()
  $sr.Close()
  $newOffset = $fs.Position
  Set-Content -Encoding ascii -NoNewline -Path $nextOffsetPath -Value $newOffset
  Write-Output $text
} finally {
  $fs.Close()
}
