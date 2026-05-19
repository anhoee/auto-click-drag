@echo off
setlocal
cd /d "%~dp0"

echo [1/3] Installing dependencies...
python -m pip install -r requirements.txt
if errorlevel 1 goto fail

echo [2/3] Creating app icons...
python create_icons.py
if errorlevel 1 goto fail

echo [3/3] Building AutoClickDrag.exe...
python -m PyInstaller --noconfirm --clean --onefile --windowed --icon assets\AutoClickDrag.ico --name AutoClickDrag auto_click_drag.py
if errorlevel 1 goto fail

echo.
echo Build complete:
echo %cd%\dist\AutoClickDrag.exe
pause
exit /b 0

:fail
echo.
echo Build failed.
pause
exit /b 1

