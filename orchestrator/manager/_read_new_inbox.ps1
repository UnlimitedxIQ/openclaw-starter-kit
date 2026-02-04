param(
  [string]$StatePath,
  [string]$InboxPath
)
if(!(Test-Path $InboxPath)) { exit 0 }
$state = Get-Content $StatePath -Raw | ConvertFrom-Json
$offset = [int64]$state.inboxByteOffset
$fs = [System.IO.File]::Open($InboxPath,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::ReadWrite)
try {
  $null = $fs.Seek($offset,[System.IO.SeekOrigin]::Begin)
  $sr = [System.IO.StreamReader]::new($fs,[System.Text.Encoding]::UTF8)
  try {
    $text = $sr.ReadToEnd()
    Write-Output $text
  } finally {
    $sr.Dispose()
  }
} finally {
  $fs.Dispose()
}
