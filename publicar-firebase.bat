@echo off
chcp 65001 >nul
title Publicar NT Labs no Firebase
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js nao encontrado. Instale em https://nodejs.org e rode de novo. & pause & exit /b 1)
node scripts\publicar.mjs
echo.
pause
