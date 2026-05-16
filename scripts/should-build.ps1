$distPath = Join-Path $PSScriptRoot '..\dist\time-tracker\browser\index.html'
$dist = Get-Item $distPath -ErrorAction SilentlyContinue

if (-not $dist) {
  Write-Output 'build'
  exit 0
}

$sourceItems = @(
  Get-ChildItem -Path (Join-Path $PSScriptRoot '..\src') -Recurse -File
  Get-Item (Join-Path $PSScriptRoot '..\server.js')
  Get-Item (Join-Path $PSScriptRoot '..\angular.json')
  Get-Item (Join-Path $PSScriptRoot '..\package.json')
)

$latestSource = $sourceItems | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($latestSource.LastWriteTime -gt $dist.LastWriteTime) {
  Write-Output 'build'
} else {
  Write-Output 'skip'
}
