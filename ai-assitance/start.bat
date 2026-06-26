@echo off
echo Make sure Ollama is running! (ollama serve)
echo Model required: llama3.2:latest
echo.
cd /d %~dp0
call venv\Scripts\activate
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
pause
