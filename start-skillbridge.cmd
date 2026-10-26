@echo off
setlocal
title SkillBridge AI
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required but was not found on PATH.
  echo Install Node.js from https://nodejs.org and try again.
  pause
  exit /b 1
)

if not exist "node_modules" goto install
if not exist "backend\node_modules" goto install
if not exist "frontend\node_modules" goto install
goto run

:install
echo Installing dependencies (first run only)...
call npm run install:all
if errorlevel 1 (
  echo Dependency installation failed.
  pause
  exit /b 1
)

:run
echo Starting SkillBridge AI. The browser will open automatically when it is ready.
echo Press Ctrl+C to stop both services.
echo.
call npm run dev
if errorlevel 1 pause
