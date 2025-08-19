@echo off
setlocal
cd /d %~dp0

set REPO_URL=https://github.com/your-username/quadcloud
set BRANCH=main
set TMP_DIR=%TEMP%\quadcloud_update

echo Updating source...
if exist "%TMP_DIR%" rd /s /q "%TMP_DIR%"
mkdir "%TMP_DIR%"
curl -L %REPO_URL%/archive/refs/heads/%BRANCH%.zip -o "%TMP_DIR%\update.zip"
tar -xf "%TMP_DIR%\update.zip" -C "%TMP_DIR%"
xcopy "%TMP_DIR%\quadcloud-%BRANCH%\*" . /E /Y >nul
rd /s /q "%TMP_DIR%"

echo Installing latest Electron...
npm install electron@latest --save >nul

echo Installing dependencies...
npm install >nul

echo Starting app...
npm start
