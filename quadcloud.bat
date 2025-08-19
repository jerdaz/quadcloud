@echo off
setlocal
cd /d %~dp0

set REPO_URL=https://github.com/your-username/quadcloud
set BRANCH=main
set TMP_DIR=%TEMP%\quadcloud_update

echo Updating source...
if exist "%TMP_DIR%" rd /s /q "%TMP_DIR%"
mkdir "%TMP_DIR%"
curl -L "%REPO_URL%/archive/refs/heads/%BRANCH%.tar.gz" -o "%TMP_DIR%\update.tar.gz"
tar -xzf "%TMP_DIR%\update.tar.gz" -C "%TMP_DIR%" --strip-components=1 --exclude="*/node_modules/*"
xcopy "%TMP_DIR%\*" . /E /Y >nul
rd /s /q "%TMP_DIR%"

echo Installing latest Electron...
call npm install electron@latest --save >nul

echo Installing dependencies...
call npm install >nul

echo Starting app...
call npm start
