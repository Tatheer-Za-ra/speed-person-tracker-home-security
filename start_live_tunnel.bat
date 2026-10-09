@echo off
title HavenTrack - Public Live Tunnel
echo ============================================================
echo   HavenTrack AI - Starting Public HTTPS Live Tunnel
echo ============================================================
echo.
echo Checking requirements:
echo 1. Flask backend should be running on http://localhost:5000
echo 2. React frontend should be running on http://localhost:5173
echo.
echo Generating public HTTPS live link...
echo Copy the "https://....trycloudflare.com" link below to share with anyone!
echo.
echo ============================================================
.\cloudflared.exe tunnel --url http://localhost:5173
pause
