@echo off
setlocal
cd /d "%~dp0"
if "%LICENSE_ADMIN_TOKEN%"=="" set "LICENSE_ADMIN_TOKEN=doi-token-admin-nay"
python license_server.py serve --host 0.0.0.0 --port 8008
pause
