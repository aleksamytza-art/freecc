@echo off
REM ===========================================================================
REM FREECC router start - Windows wrapper.
REM
REM   router\start.cmd          (double-click it, or run it from any shell)
REM
REM It exists because a default PowerShell refuses to run a .ps1 file:
REM   "...start.ps1 cannot be loaded because running scripts is disabled"
REM This wrapper calls PowerShell with -ExecutionPolicy Bypass so nothing has
REM to be changed system-wide.
REM ===========================================================================

setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
set RC=%ERRORLEVEL%

if not "%RC%"=="0" (
  echo.
  echo [freecc] router exited with code %RC%
  pause
)
endlocal & exit /b %RC%
