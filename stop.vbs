Set shell = CreateObject("WScript.Shell")
answer = MsgBox("Do you really want to close the Time Tracker server?", vbQuestion + vbYesNo + vbDefaultButton2, "Stop Time Tracker")

If answer = vbYes Then
  shell.Run "cmd /c """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\stop.bat""", 0, False
End If
