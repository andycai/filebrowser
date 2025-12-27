#!/bin/bash

# 文件浏览器系统服务安装脚本
# 适用于 Linux 系统（使用 systemd）

set -e

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
SERVICE_NAME="filebrowser"
INSTALL_DIR="/opt/filebrowser"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   安装文件浏览器为系统服务${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    exit 1
fi

# 检查 systemd
if ! command -v systemctl &> /dev/null; then
    echo -e "${RED}错误: 此系统不支持 systemd${NC}"
    exit 1
fi

# 获取当前目录
CURRENT_DIR=$(pwd)

# 检查编译的二进制文件
echo -e "${YELLOW}检测平台...${NC}"
ARCH=$(uname -m)
OS=$(uname)

if [ "$OS" = "Linux" ]; then
    if [ "$ARCH" = "aarch64" ]; then
        BINARY="${CURRENT_DIR}/build/filebrowser-linux-arm64"
    elif [ "$ARCH" = "x86_64" ]; then
        BINARY="${CURRENT_DIR}/build/filebrowser-linux-amd64"
    else
        echo -e "${RED}不支持的架构: $ARCH${NC}"
        exit 1
    fi
else
    echo -e "${RED}此脚本仅支持 Linux 系统${NC}"
    exit 1
fi

if [ ! -f "$BINARY" ]; then
    echo -e "${RED}错误: 找不到编译的二进制文件${NC}"
    echo -e "${YELLOW}请先运行 ./build.sh 进行编译${NC}"
    exit 1
fi

echo -e "${GREEN}找到二进制文件: $BINARY${NC}"
echo ""

# 创建安装目录
echo -e "${YELLOW}创建安装目录...${NC}"
mkdir -p "$INSTALL_DIR"

# 复制文件
echo -e "${YELLOW}复制文件到 $INSTALL_DIR...${NC}"
cp "$BINARY" "$INSTALL_DIR/filebrowser"
cp "${CURRENT_DIR}/config.json" "$INSTALL_DIR/"

# 创建日志目录
mkdir -p /var/log/filebrowser
touch /var/log/filebrowser/access.log
touch /var/log/filebrowser/error.log

# 设置权限
chmod +x "$INSTALL_DIR/filebrowser"
chmod 644 /var/log/filebrowser/*.log

echo -e "${GREEN}✓ 文件复制完成${NC}"
echo ""

# 创建 systemd 服务文件
echo -e "${YELLOW}创建 systemd 服务...${NC}"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=File Browser Service
After=network.target

[Service]
Type=simple
User=$SUDO_USER
Group=$SUDO_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/filebrowser
Restart=on-failure
RestartSec=5

# 日志
StandardOutput=append:/var/log/filebrowser/access.log
StandardError=append:/var/log/filebrowser/error.log

# 安全设置
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ 服务文件创建完成${NC}"
echo ""

# 重新加载 systemd
echo -e "${YELLOW}重新加载 systemd...${NC}"
systemctl daemon-reload

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   安装完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "服务已安装为系统服务"
echo ""
echo -e "${BLUE}可用命令:${NC}"
echo "  启动服务: sudo systemctl start $SERVICE_NAME"
echo "  停止服务: sudo systemctl stop $SERVICE_NAME"
echo "  重启服务: sudo systemctl restart $SERVICE_NAME"
echo "  查看状态: sudo systemctl status $SERVICE_NAME"
echo "  开机自启: sudo systemctl enable $SERVICE_NAME"
echo "  查看日志: sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo -e "${YELLOW}是否现在启动服务并设置开机自启？ [y/N]${NC}"
read -r answer

if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    systemctl enable "$SERVICE_NAME"
    systemctl start "$SERVICE_NAME"
    echo ""
    echo -e "${GREEN}✓ 服务已启动并设置开机自启${NC}"
    echo ""
    systemctl status "$SERVICE_NAME" --no-pager
fi
