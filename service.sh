#!/bin/bash

# 文件浏览器服务管理脚本
# 适用于 Linux 和 macOS

# 配置
SERVICE_NAME="filebrowser"
BINARY_NAME="filebrowser"
CONFIG_FILE="config.json"
PID_FILE="filebrowser.pid"
LOG_FILE="filebrowser.log"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取可执行文件路径
get_binary() {
    if [ "$(uname)" = "Darwin" ]; then
        # macOS
        if [ "$(uname -m)" = "arm64" ]; then
            echo "build/filebrowser-darwin-arm64"
        else
            echo "build/filebrowser-darwin-amd64"
        fi
    elif [ "$(uname)" = "Linux" ]; then
        # Linux
        if [ "$(uname -m)" = "aarch64" ]; then
            echo "build/filebrowser-linux-arm64"
        else
            echo "build/filebrowser-linux-amd64"
        fi
    else
        echo "build/${BINARY_NAME}"
    fi
}

# 检查二进制文件是否存在
check_binary() {
    BINARY=$(get_binary)
    if [ ! -f "$BINARY" ]; then
        echo -e "${RED}错误: 找不到可执行文件 $BINARY${NC}"
        echo -e "${YELLOW}请先运行 ./build.sh 编译程序${NC}"
        exit 1
    fi
    echo "$BINARY"
}

# 检查配置文件是否存在
check_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}错误: 找不到配置文件 $CONFIG_FILE${NC}"
        exit 1
    fi
}

# 获取 PID
get_pid() {
    if [ -f "$PID_FILE" ]; then
        cat "$PID_FILE"
    fi
}

# 检查服务是否在运行
is_running() {
    PID=$(get_pid)
    if [ -n "$PID" ]; then
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            # PID 文件存在但进程不存在，清理 PID 文件
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# 启动服务
start() {
    echo -e "${BLUE}启动 ${SERVICE_NAME}...${NC}"

    check_binary
    BINARY=$?
    BINARY=$(check_binary)
    check_config

    if is_running; then
        echo -e "${YELLOW}${SERVICE_NAME} 已经在运行中 (PID: $(get_pid))${NC}"
        return 0
    fi

    # 启动服务
    nohup "$BINARY" >> "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"

    # 等待启动
    sleep 1

    if is_running; then
        echo -e "${GREEN}✓ ${SERVICE_NAME} 启动成功 (PID: $PID)${NC}"
        echo -e "${BLUE}日志文件: $LOG_FILE${NC}"

        # 读取配置显示端口
        PORT=$(grep -o '"port":[[:space:]]*[0-9]*' "$CONFIG_FILE" | grep -o '[0-9]*')
        echo -e "${GREEN}访问地址: http://localhost:${PORT}${NC}"
    else
        echo -e "${RED}✗ ${SERVICE_NAME} 启动失败${NC}"
        echo -e "${YELLOW}查看日志: tail -f $LOG_FILE${NC}"
        return 1
    fi
}

# 停止服务
stop() {
    echo -e "${BLUE}停止 ${SERVICE_NAME}...${NC}"

    if ! is_running; then
        echo -e "${YELLOW}${SERVICE_NAME} 没有运行${NC}"
        return 0
    fi

    PID=$(get_pid)
    kill "$PID"

    # 等待进程结束
    for i in {1..10}; do
        if ! is_running; then
            rm -f "$PID_FILE"
            echo -e "${GREEN}✓ ${SERVICE_NAME} 已停止${NC}"
            return 0
        fi
        sleep 1
    done

    # 如果还没停止，强制结束
    echo -e "${YELLOW}强制停止 ${SERVICE_NAME}...${NC}"
    kill -9 "$PID"
    rm -f "$PID_FILE"
    echo -e "${GREEN}✓ ${SERVICE_NAME} 已强制停止${NC}"
}

# 重启服务
restart() {
    echo -e "${BLUE}重启 ${SERVICE_NAME}...${NC}"
    stop
    sleep 1
    start
}

# 查看状态
status() {
    echo -e "${BLUE}${SERVICE_NAME} 服务状态:${NC}"
    echo ""

    if is_running; then
        PID=$(get_pid)
        echo -e "${GREEN}● ${SERVICE_NAME} 正在运行${NC}"
        echo ""
        echo "PID: $PID"

        # 显示内存使用
        if command -v ps > /dev/null; then
            MEM=$(ps -o rss= -p "$PID" | awk '{printf "%.1f MB", $1/1024}')
            echo "内存: $MEM"
        fi

        # 显示运行时间
        if command -v ps > /dev/null; then
            ELAPSED=$(ps -o etime= -p "$PID" | xargs)
            echo "运行时间: $ELAPSED"
        fi

        # 读取配置显示端口
        if [ -f "$CONFIG_FILE" ]; then
            PORT=$(grep -o '"port":[[:space:]]*[0-9]*' "$CONFIG_FILE" | grep -o '[0-9]*')
            echo "访问地址: http://localhost:${PORT}"
        fi

        echo ""
        echo "日志文件: $LOG_FILE"
    else
        echo -e "${RED}○ ${SERVICE_NAME} 未运行${NC}"
        return 1
    fi
}

# 查看日志
logs() {
    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${YELLOW}日志文件不存在${NC}"
        return 1
    fi

    if command -v tail > /dev/null; then
        tail -f "$LOG_FILE"
    else
        cat "$LOG_FILE"
    fi
}

# 显示使用说明
usage() {
    echo "用法: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "命令:"
    echo "  start    - 启动服务"
    echo "  stop     - 停止服务"
    echo "  restart  - 重启服务"
    echo "  status   - 查看服务状态"
    echo "  logs     - 查看日志（实时）"
    echo ""
    echo "示例:"
    echo "  $0 start    # 启动服务"
    echo "  $0 status   # 查看状态"
    echo "  $0 logs     # 查看日志"
}

# 主逻辑
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        usage
        exit 1
        ;;
esac

exit $?
