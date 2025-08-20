@echo off
setlocal
cd /d %~dp0

set STATE_FILE=.update_state

for /f %%A in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set TODAY=%%A

if exist "%STATE_FILE%" (
  set /p LAST_DATE=<"%STATE_FILE%"
) else (
  set LAST_DATE=
)

if not "%LAST_DATE%"=="%TODAY%" (
  echo Checking for Electron updates...
  call npm install electron@latest --save >nul
  >"%STATE_FILE%" echo %TODAY%
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install >nul
)

echo Starting app...
call npm start

