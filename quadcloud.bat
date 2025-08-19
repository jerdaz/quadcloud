@echo off
setlocal
cd /d %~dp0

set REPO_URL=https://github.com/jerdaz/quadcloud
set BRANCH=main
set STATE_FILE=.update_state

for /f %%A in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set TODAY=%%A

if exist "%STATE_FILE%" (
  set /p LAST_DATE=<"%STATE_FILE%"
  for /f "skip=1 delims=" %%A in (%STATE_FILE%) do set LAST_COMMIT=%%A
) else (
  set LAST_DATE=
  set LAST_COMMIT=
)

if not "%LAST_DATE%"=="%TODAY%" (
  echo Checking for updates...
  for /f %%A in ('powershell -NoProfile -Command "(Invoke-RestMethod https://api.github.com/repos/jerdaz/quadcloud/commits/%BRANCH%).sha"') do set REMOTE_COMMIT=%%A

  echo Installing latest Electron...
  call npm install electron@latest --save >nul

  if not "%REMOTE_COMMIT%"=="%LAST_COMMIT%" (
    echo Updating source...
    set TMP_DIR=%TEMP%\quadcloud_update
    if exist "%TMP_DIR%" rd /s /q "%TMP_DIR%"
    mkdir "%TMP_DIR%"
    curl -L "%REPO_URL%/archive/refs/heads/%BRANCH%.tar.gz" -o "%TMP_DIR%\update.tar.gz"
    tar -xzf "%TMP_DIR%\update.tar.gz" -C "%TMP_DIR%" --strip-components=1 --exclude="*/node_modules/*"
    xcopy "%TMP_DIR%\*" . /E /Y >nul
    rd /s /q "%TMP_DIR%"

    echo Installing dependencies...
    call npm install >nul

    set LAST_COMMIT=%REMOTE_COMMIT%
  ) else (
    echo Source is up to date.
  )

  >"%STATE_FILE%" (
    echo %TODAY%
    echo %LAST_COMMIT%
  )
) else (
  echo Using cached build; no updates today.
)

echo Starting app...
call npm start

