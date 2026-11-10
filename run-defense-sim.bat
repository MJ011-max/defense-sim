@echo off
REM Launcher for defense-sim Vite dev server
cd /d "C:\Users\MUNASHE\Desktop\defense-sim"
start "Vite" cmd /k "cd /d C:\Users\MUNASHE\Desktop\defense-sim && npx vite --host"
timeout /t 2 >nul
start "" "http://localhost:5173/"
exit
