$ErrorActionPreference='Stop'
$root='C:\agent\openclaw-workspace\orchestrator'
$statePath=Join-Path $root 'manager\state.json'
if(Test-Path $statePath){
  $state=Get-Content $statePath -Raw | ConvertFrom-Json
}else{
  $state=[pscustomobject]@{ inboxOffset=0; lastRunAt=$null; spawned=@{} }
}
$inboxPath=Join-Path $root 'queue\inbox.jsonl'
if(!(Test-Path $inboxPath)){ New-Item -ItemType File -Force -Path $inboxPath | Out-Null }
$fs=[System.IO.File]::Open($inboxPath,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::ReadWrite)
try {
  $null=$fs.Seek([int64]$state.inboxOffset,[System.IO.SeekOrigin]::Begin)
  $sr=[System.IO.StreamReader]::new($fs,[System.Text.Encoding]::UTF8,$true,4096,$true)
  $newText=$sr.ReadToEnd()
  $sr.Dispose()
  $newOffset=$fs.Position
} finally {
  $fs.Dispose()
}
[pscustomobject]@{ state=$state; newText=$newText; newOffset=$newOffset; inboxPath=$inboxPath; statePath=$statePath } | ConvertTo-Json -Depth 10
