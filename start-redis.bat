@echo off
echo Starting Redis with Docker...
docker run -d -p 6379:6379 --name collab-redis redis:7-alpine
if %errorlevel% neq 0 (
    echo Docker not available. Install Redis manually or use single-instance mode.
    echo The application will work without Redis for development.
    pause
) else (
    echo Redis started successfully on port 6379
)