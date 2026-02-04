$p = 'C:\agent\openclaw-workspace\orchestrator\queue\inbox.jsonl'
if (!(Test-Path $p)) {
  Write-Output 'NO_INBOX'
  exit 0
}
$st = Get-Content 'C:\agent\openclaw-workspace\orchestrator\manager\state.json' -Raw | ConvertFrom-Json
$fs = [System.IO.File]::Open($p,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::ReadWrite)
$null = $fs.Seek([int64]$st.inboxByteOffset,[System.IO.SeekOrigin]::Begin)
$sr = [System.IO.StreamReader]::new($fs,[System.Text.Encoding]::UTF8,$true,4096,$true)
$new = $sr.ReadToEnd()
$pos = $fs.Position
$sr.Dispose(); $fs.Dispose()
Write-Output ("OFFSET=$pos")
Write-Output '---'
Write-Output $new
