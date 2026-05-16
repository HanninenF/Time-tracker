$repoRoot = Join-Path $PSScriptRoot '..'
$pidFilePath = Join-Path $repoRoot '.time-tracker-server.pid'
$serverScriptPath = Join-Path $repoRoot 'server.js'

$existingPid = Get-Content $pidFilePath -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existingPid) {
  try {
    $existingProcess = Get-Process -Id ([int]$existingPid) -ErrorAction Stop
    if ($existingProcess) {
      Start-Process 'http://localhost:58291'
      exit 0
    }
  } catch {
    Remove-Item $pidFilePath -ErrorAction SilentlyContinue
  }
}

$distPath = Join-Path $repoRoot 'dist\time-tracker\browser\index.html'
$shouldBuild = $false

if (-not (Test-Path $distPath)) {
  $shouldBuild = $true
} else {
  $dist = Get-Item $distPath
  $sourceItems = @(
    Get-ChildItem -Path (Join-Path $repoRoot 'src') -Recurse -File
    Get-Item (Join-Path $repoRoot 'server.js')
    Get-Item (Join-Path $repoRoot 'angular.json')
    Get-Item (Join-Path $repoRoot 'package.json')
  )

  $latestSource = $sourceItems | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($latestSource.LastWriteTime -gt $dist.LastWriteTime) {
    $shouldBuild = $true
  }
}

if ($shouldBuild) {
  Push-Location $repoRoot
  try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  } finally {
    Pop-Location
  }
}

$process = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
Set-Content -Path $pidFilePath -Value $process.Id

for ($attempt = 0; $attempt -lt 60; $attempt++) {
  try {
    Invoke-WebRequest -Uri 'http://localhost:58291' -UseBasicParsing -TimeoutSec 2 | Out-Null
    Start-Process 'http://localhost:58291'
    exit 0
  } catch {
    Start-Sleep -Seconds 1
  }
}

Start-Process 'http://localhost:58291'
