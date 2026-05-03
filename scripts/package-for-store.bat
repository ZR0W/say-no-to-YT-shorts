@echo off
setlocal
REM Build store upload folder + zip with POSIX '/' paths in the archive (AMO-safe).
REM Extra args are passed through, e.g.  package-for-store.bat -IncludeReadme
REM -NoPause: .ps1 skips its own prompt; this window uses "pause" so success/failure output stays visible.
set "PS1=%~dp0package-for-store.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -NoPause -Zip %*
set "EXITCODE=%errorlevel%"
echo.
pause
endlocal
exit /b %EXITCODE%
