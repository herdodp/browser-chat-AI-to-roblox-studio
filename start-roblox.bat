@echo off

cd /d "%~dp0"

set ZS_BRIDGE_PORT=17614

title Snapgent Bridge - Roblox Studio

if exist "%~dp0bridge.exe" (
    "%~dp0bridge.exe"
) else (
    python bridge.py
)
pause
