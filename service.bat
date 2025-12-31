@echo off
REM File Browser Service Management Script - Windows Version
REM Change code page to UTF-8 to avoid encoding issues
chcp 65001 >nul 2>&1

setlocal EnableDelayedExpansion

REM Configuration
set SERVICE_NAME=filebrowser
set BINARY_NAME=filebrowser-windows-amd64.exe
set CONFIG_FILE=config.json
set PID_FILE=filebrowser.pid
set LOG_FILE=filebrowser.log

REM Color settings (Windows 10+)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

echo %BLUE%========================================%NC%
echo %BLUE%   File Browser Service Management%NC%
echo %BLUE%========================================%NC%
echo.

REM Check binary file
if not exist "build\%BINARY_NAME%" (
    echo %RED%Error: Cannot find executable build\%BINARY_NAME%%NC%
    echo %YELLOW%Please run build.sh to compile the program first%NC%
    exit /b 1
)

REM Check configuration file
if not exist "%CONFIG_FILE%" (
    echo %RED%Error: Cannot find configuration file %CONFIG_FILE%%NC%
    exit /b 1
)

REM Handle commands
if "%1"=="" goto usage
if /i "%1"=="start" goto start
if /i "%1"=="stop" goto stop
if /i "%1"=="restart" goto restart
if /i "%1"=="status" goto status
if /i "%1"=="logs" goto logs
goto usage

:start
    echo %BLUE%Starting %SERVICE_NAME%...%NC%

    REM Check if already running
    call :check_running
    if !RUNNING!==1 (
        echo %YELLOW%%SERVICE_NAME% is already running%NC%
        exit /b 0
    )

    REM Start service
    start /B "" "build\%BINARY_NAME%" >> "%LOG_FILE%" 2>&1

    REM Wait for startup
    timeout /t 2 /nobreak >nul

    call :check_running
    if !RUNNING!==1 (
        echo %GREEN%Success: %SERVICE_NAME% started successfully%NC%
        echo %BLUE%Log file: %LOG_FILE%%NC%

        REM Read port
        for /f "tokens=2 delims=:" %%a in ('findstr /C:"\"port\"" %CONFIG_FILE%') do (
            set PORT=%%a
            set PORT=!PORT: =!
            set PORT=!PORT:,=!
        )
        echo %GREEN%Access URL: http://localhost:!PORT!%NC%
    ) else (
        echo %RED%Error: Failed to start %SERVICE_NAME%%NC%
        echo %YELLOW%View logs: type %LOG_FILE%%NC%
        exit /b 1
    )
    goto :eof

:stop
    echo %BLUE%Stopping %SERVICE_NAME%...%NC%

    call :check_running
    if !RUNNING!==0 (
        echo %YELLOW%%SERVICE_NAME% is not running%NC%
        exit /b 0
    )

    REM Stop process
    for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq %BINARY_NAME%" ^| findstr /C:"%BINARY_NAME%"') do (
        taskkill /F /PID %%a >nul 2>&1
    )

    timeout /t 1 /nobreak >nul

    call :check_running
    if !RUNNING!==0 (
        echo %GREEN%Success: %SERVICE_NAME% stopped%NC%
    ) else (
        echo %RED%Error: Failed to stop %SERVICE_NAME%%NC%
        exit /b 1
    )
    goto :eof

:restart
    echo %BLUE%Restarting %SERVICE_NAME%...%NC%
    call :stop
    timeout /t 1 /nobreak >nul
    call :start
    goto :eof

:status
    echo %BLUE%%SERVICE_NAME% Service Status:%NC%
    echo.

    call :check_running
    if !RUNNING!==1 (
        echo %GREEN%Running: %SERVICE_NAME% is active%NC%
        echo.

        REM Find process information
        for /f "tokens=1,2,5" %%a in ('tasklist /FI "IMAGENAME eq %BINARY_NAME%" /FO CSV /NH') do (
            set PID=%%~b
            set MEM=%%~c
        )

        echo PID: !PID!
        echo Memory: !MEM!

        REM Read port
        for /f "tokens=2 delims=:" %%a in ('findstr /C:"\"port\"" %CONFIG_FILE%') do (
            set PORT=%%a
            set PORT=!PORT: =!
            set PORT=!PORT:,=!
        )
        echo Access URL: http://localhost:!PORT!
        echo.
        echo Log file: %LOG_FILE%
    ) else (
        echo %RED%Stopped: %SERVICE_NAME% is not running%NC%
        exit /b 1
    )
    goto :eof

:logs
    if not exist "%LOG_FILE%" (
        echo %YELLOW%Log file does not exist%NC%
        exit /b 1
    )
    type "%LOG_FILE%"
    goto :eof

:check_running
    set RUNNING=0
    tasklist /FI "IMAGENAME eq %BINARY_NAME%" 2>NUL | find /I /N "%BINARY_NAME%">NUL
    if "%ERRORLEVEL%"=="0" set RUNNING=1
    exit /b

:usage
    echo Usage: %0 {start^|stop^|restart^|status^|logs}
    echo.
    echo Commands:
    echo   start    - Start service
    echo   stop     - Stop service
    echo   restart  - Restart service
    echo   status   - View service status
    echo   logs     - View logs
    echo.
    echo Examples:
    echo   %0 start    # Start service
    echo   %0 status   # View status
    echo   %0 logs     # View logs
    exit /b 1
