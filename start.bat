@echo off
chcp 65001 >nul
title 点云展陈 · 一键启动
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo 未找到 Python,请先安装 Python 3 并勾选 Add to PATH。
  pause
  exit /b
)
python start.py
pause
