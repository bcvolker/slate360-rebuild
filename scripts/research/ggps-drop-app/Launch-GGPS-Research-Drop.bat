@echo off
title GGPS Research Drop - Research - not for customer jobs
cd /d "%~dp0"
powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -File "%~dp0GGPS-Research-Drop.ps1"
