@echo off
setlocal
cd /d "%~dp0"

echo Nhap URL license server public.
echo Vi du: https://ten-app-cua-ban.koyeb.app
set /p LICENSE_SERVER_URL="License server URL [http://127.0.0.1:8008]: "
if "%LICENSE_SERVER_URL%"=="" set "LICENSE_SERVER_URL=http://127.0.0.1:8008"
set /p PURCHASE_URL="Trang mua key [%LICENSE_SERVER_URL%]: "
if "%PURCHASE_URL%"=="" set "PURCHASE_URL=%LICENSE_SERVER_URL%"

echo [1/4] Writing build settings...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$license = $env:LICENSE_SERVER_URL; $purchase = $env:PURCHASE_URL; $lines = @('DEFAULT_LICENSE_SERVER_URL = ' + ($license | ConvertTo-Json), 'DEFAULT_PURCHASE_URL = ' + ($purchase | ConvertTo-Json)); Set-Content -LiteralPath 'build_settings.py' -Encoding UTF8 -Value $lines"
if errorlevel 1 goto fail

echo [2/4] Installing dependencies...
python -m pip install -r requirements.txt
if errorlevel 1 goto fail

echo [3/4] Creating app icons...
python create_icons.py
if errorlevel 1 goto fail

echo [4/4] Building AutoClickDrag.exe...
python -m PyInstaller --noconfirm --clean --onefile --windowed --hidden-import build_settings --icon assets\AutoClickDrag.ico --name AutoClickDrag auto_click_drag.py
if errorlevel 1 goto fail

echo.
echo Build complete:
echo %cd%\dist\AutoClickDrag.exe
echo License server:
echo %LICENSE_SERVER_URL%
echo Trang mua key:
echo %PURCHASE_URL%
pause
exit /b 0

:fail
echo.
echo Build failed.
pause
exit /b 1
