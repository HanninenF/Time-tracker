$repoRoot = Join-Path $PSScriptRoot '..'
$pidFilePath = Join-Path $repoRoot '.time-tracker-server.pid'

$stoppedPids = New-Object System.Collections.Generic.HashSet[int]

function Stop-TrackedProcess {
  param(
    [int]$ProcessId
  )

  if ($ProcessId -le 0) {
    return
  }

  if ($stoppedPids.Add($ProcessId)) {
    try {
      Stop-Process -Id $ProcessId -Force -ErrorAction Stop
    } catch {
      # Ignore processes that already exited.
    }
  }
}

$existingPid = Get-Content $pidFilePath -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existingPid) {
  Stop-TrackedProcess -ProcessId ([int]$existingPid)
}

$netstatLines = & netstat -ano 2>$null | Select-String ':58291\s'
foreach ($line in $netstatLines) {
  $parts = ($line.Line -split '\s+') | Where-Object { $_ -ne '' }
  $pidText = $parts[-1]
  $pidValue = 0
  if ([int]::TryParse($pidText, [ref]$pidValue)) {
    Stop-TrackedProcess -ProcessId $pidValue
  }
}

Remove-Item $pidFilePath -ErrorAction SilentlyContinue
