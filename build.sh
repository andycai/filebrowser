#!/bin/bash

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   文件浏览器交叉编译脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 创建输出目录
mkdir -p build

# 编译函数
build() {
    local os=$1
    local arch=$2
    local output=$3

    echo -e "${YELLOW}编译 ${os}/${arch}...${NC}"

    GOOS=$os GOARCH=$arch go build -o "build/${output}" .

    if [ $? -eq 0 ]; then
        size=$(ls -lh "build/${output}" | awk '{print $5}')
        echo -e "${GREEN}✓ ${os}/${arch} 编译成功 (${size})${NC}"
    else
        echo -e "${RED}✗ ${os}/${arch} 编译失败${NC}"
        return 1
    fi
}

# 编译目标
echo "开始编译..."
echo ""

# macOS (Intel)
build darwin amd64 filebrowser-darwin-amd64
echo ""

# macOS (Apple Silicon)
build darwin arm64 filebrowser-darwin-arm64
echo ""

# Linux (AMD64)
build linux amd64 filebrowser-linux-amd64
echo ""

# Linux (ARM64)
build linux arm64 filebrowser-linux-arm64
echo ""

# Windows (AMD64)
build windows amd64 filebrowser-windows-amd64.exe
echo ""

# 创建发布包
echo -e "${YELLOW}创建发布包...${NC}"
cd build

# macOS
tar -czf filebrowser-darwin-amd64.tar.gz filebrowser-darwin-amd64
tar -czf filebrowser-darwin-arm64.tar.gz filebrowser-darwin-arm64

# Linux
tar -czf filebrowser-linux-amd64.tar.gz filebrowser-linux-amd64
tar -czf filebrowser-linux-arm64.tar.gz filebrowser-linux-arm64

# Windows
zip filebrowser-windows-amd64.zip filebrowser-windows-amd64.exe

cd ..

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   编译完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "输出目录: build/"
echo ""
ls -lh build/
echo ""
echo -e "${YELLOW}发布包:${NC}"
ls -lh build/*.tar.gz build/*.zip 2>/dev/null
