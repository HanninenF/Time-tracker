$desktopPath = [Environment]::GetFolderPath('Desktop')
$repoRoot = Join-Path $PSScriptRoot '..'
$shortcutPath = Join-Path $desktopPath 'Stop Time Tracker.lnk'
$targetPath = Join-Path $env:SystemRoot 'System32\wscript.exe'
$arguments = '"' + (Join-Path $repoRoot 'stop.vbs') + '"'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = $repoRoot
$shortcut.IconLocation = 'shell32.dll,27'
$shortcut.Description = 'Stop the Time Tracker server'
$shortcut.Save()
