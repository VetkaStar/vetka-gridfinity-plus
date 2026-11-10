@echo off
pushd "%~dp0"
python launch.py
if errorlevel 1 pause
popd
