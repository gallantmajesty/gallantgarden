@echo off
REM Copies the downloaded diagram clone into the Vite /public/diagram folder so
REM it is served at /diagram/ (and bundled on Vercel deploys).
REM
REM Usage:  setup-drawio.bat
REM Make sure "clone backup" sits next to this repo (in your Downloads folder),
REM or edit SRC below to its actual path.

SET SRC=%USERPROFILE%\Downloads\clone backup
SET DST=%~dp0public\diagram

IF NOT EXIST "%SRC%" (
  echo ERROR: source not found: %SRC%
  echo Edit SRC in this script to point at your "clone backup" folder.
  pause
  EXIT /B 1
)

IF NOT EXIST "%DST%" mkdir "%DST%"

echo Copying diagram clone from:
echo   %SRC%
echo Into:
echo   %DST%
echo.

xcopy "%SRC%\*" "%DST%\" /E /Y /I

echo.
echo Done. Start the dev server and open the Blueprint screen.
echo The board now runs on the embedded diagram editor.
pause
