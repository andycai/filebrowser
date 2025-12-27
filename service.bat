@echo off
REM 文件浏览器服务管理脚本 - Windows 版本

setlocal EnableDelayedExpansion

REM 配置
set SERVICE_NAME=filebrowser
set BINARY_NAME=filebrowser-windows-amd64.exe
set CONFIG_FILE=config.json
set PID_FILE=filebrowser.pid
set LOG_FILE=filebrowser.log

REM 颜色设置（Windows 10+）
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

echo %BLUE%========================================%NC%
echo %BLUE%   文件浏览器服务管理%NC%
echo %BLUE%========================================%NC%
echo.

REM 检查二进制文件
if not exist "build\%BINARY_NAME%" (
    echo %RED%错误: 找不到可执行文件 build\%BINARY_NAME%%NC%
    echo %YELLOW%请先运行 build.sh 编译程序%NC%
    exit /b 1
)

REM 检查配置文件
if not exist "%CONFIG_FILE%" (
    echo %RED%错误: 找不到配置文件 %CONFIG_FILE%%NC%
    exit /b 1
)

REM 处理命令
if "%1"=="" goto usage
if /i "%1"=="start" goto start
if /i "%1"=="stop" goto stop
if /i "%1"=="restart" goto restart
if /i "%1"=="status" goto status
if /i "%1"=="logs" goto logs
goto usage

:start
    echo %BLUE%启动 %SERVICE_NAME%...%NC%

    REM 检查是否已经在运行
    call :check_running
    if !RUNNING!==1 (
        echo %YELLOW%%SERVICE_NAME% 已经在运行中%NC%
        exit /b 0
    )

    REM 启动服务
    start /B "" "build\%BINARY_NAME%" >> "%LOG_FILE%" 2>&1

    REM 等待启动
    timeout /t 2 /nobreak >nul

    call :check_running
    if !RUNNING!==1 (
        echo %GREEN%✓ %SERVICE_NAME% 启动成功%NC%
        echo %BLUE%日志文件: %LOG_FILE%%NC%

        REM 读取端口
        for /f "tokens=2 delims=:" %%a in ('findstr /C:"\"port\"" %CONFIG_FILE%') do (
            set PORT=%%a
            set PORT=!PORT: =!
            set PORT=!PORT:,=!
        )
        echo %GREEN%访问地址: http://localhost:!PORT!%NC%
    ) else (
        echo %RED%✗ %SERVICE_NAME% 启动失败%NC%
        echo %YELLOW%查看日志: type %LOG_FILE%%NC%
        exit /b 1
    )
    goto :eof

:stop
    echo %BLUE%停止 %SERVICE_NAME%...%NC%

    call :check_running
    if !RUNNING!==0 (
        echo %YELLOW%%SERVICE_NAME% 没有运行%NC%
        exit /b 0
    )

    REM 停止进程
    for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq %BINARY_NAME%" ^| findstr /C:"%BINARY_NAME%"') do (
        taskkill /F /PID %%a >nul 2>&1
    )

    timeout /t 1 /nobreak >nul

    call :check_running
    if !RUNNING!==0 (
        echo %GREEN%✓ %SERVICE_NAME% 已停止%NC%
    ) else (
        echo %RED%✗ %SERVICE_NAME% 停止失败%NC%
        exit /b 1
    )
    goto :eof

:restart
    echo %BLUE%重启 %SERVICE_NAME%...%NC%
    call :stop
    timeout /t 1 /nobreak >nul
    call :start
    goto :eof

:status
    echo %BLUE%%SERVICE_NAME% 服务状态:%NC%
    echo.

    call :check_running
    if !RUNNING!==1 (
        echo %GREEN%● %SERVICE_NAME% 正在运行%NC%
        echo.

        REM 查找进程信息
        for /f "tokens=1,2,5" %%a in ('tasklist /FI "IMAGENAME eq %BINARY_NAME%" /FO CSV /NH') do (
            set PID=%%~b
            set MEM=%%~c
        )

        echo PID: !PID!
        echo 内存: !MEM!

        REM 读取端口
        for /f "tokens=2 delims=:" %%a in ('findstr /C:"\"port\"" %CONFIG_FILE%') do (
            set PORT=%%a
            set PORT=!PORT: =!
            set PORT=!PORT:,=!
        )
        echo 访问地址: http://localhost:!PORT!
        echo.
        echo 日志文件: %LOG_FILE%
    ) else (
        echo %RED%○ %SERVICE_NAME% 未运行%NC%
        exit /b 1
    )
    goto :eof

:logs
    if not exist "%LOG_FILE%" (
        echo %YELLOW%日志文件不存在%NC%
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
    echo 用法: %0 {start^|stop^|restart^|status^|logs}
    echo.
    echo 命令:
    echo   start    - 启动服务
    echo   stop     - 停止服务
    echo   restart  - 重启服务
    echo   status   - 查看服务状态
    echo   logs     - 查看日志
    echo.
    echo 示例:
    echo   %0 start    # 启动服务
    echo   %0 status   # 查看状态
    echo   %0 logs     # 查看日志
    exit /b 1
