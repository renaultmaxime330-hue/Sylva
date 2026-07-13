@echo off
title Sylva - serveur
cd /d "%~dp0"
echo ================================================
echo   SYLVA - demarrage du serveur
echo.
echo   Garde CETTE fenetre ouverte pendant que
echo   tu utilises l'application.
echo   Le navigateur s'ouvrira tout seul dans
echo   quelques secondes sur http://localhost:3000
echo.
echo   Pour arreter l'app : ferme cette fenetre.
echo ================================================
echo.
start "" /b powershell -NoProfile -Command "Start-Sleep 8; Start-Process 'http://localhost:3000'"
call npm run dev
echo.
echo Le serveur s'est arrete. Appuie sur une touche pour fermer.
pause >nul
