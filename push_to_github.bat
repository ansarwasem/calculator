@echo off
title Push Calculator to GitHub (OmniCalc Pro)
cd /d "%~dp0"
color 0B
echo ========================================================
echo       OmniCalc Pro - GitHub Push Helper
echo ========================================================
echo.
echo Your GitHub username: ansarwasem
echo Default repo: https://github.com/ansarwasem/calculator.git
echo.
set /p REPO_NAME="Enter repo name on GitHub [Press Enter for 'calculator']: "
if "%REPO_NAME%"=="" set REPO_NAME=calculator

echo.
echo Setting remote to git@github.com:ansarwasem/%REPO_NAME%.git ...
git remote remove origin 2>nul
git remote add origin git@github.com:ansarwasem/%REPO_NAME%.git

echo Pushing main branch to GitHub...
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [INFO] SSH push didn't succeed. Trying HTTPS...
    git remote set-url origin https://github.com/ansarwasem/%REPO_NAME%.git
    git push -u origin main
)

echo.
if %ERRORLEVEL% EQU 0 (
    color 0A
    echo ========================================================
    echo  [SUCCESS] Code successfully pushed to GitHub!
    echo  Your Repo: https://github.com/ansarwasem/%REPO_NAME%
    echo ========================================================
    echo Ab aap Vercel pe ja kr is repo ko 1 click ma Deploy kr skty hein!
) else (
    color 0C
    echo ========================================================
    echo  [NOTICE] Push nahi ho saka.
    echo  Agar aapne GitHub par repo nahi banaya to pehle:
    echo  1. https://github.com/new par ja kar '%REPO_NAME%' name se
    echo     ek New Repository bana lein.
    echo  2. Phir is file ko dobara run karein!
    echo ========================================================
)
echo.
pause
