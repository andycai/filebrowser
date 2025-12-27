.PHONY: all build run test clean start stop restart status logs help

# 默认目标
all: build

# 编译当前平台
build:
	@echo "编译当前平台..."
	go build -o filebrowser .

# 运行
run:
	@echo "启动文件浏览器..."
	go run .

# 交叉编译所有平台
build-all:
	@echo "交叉编译所有平台..."
	./build.sh

# 测试
test:
	@echo "运行测试..."
	go test -v ./...

# 清理编译文件
clean:
	@echo "清理编译文件..."
	rm -rf build/
	rm -f filebrowser filebrowser.exe
	rm -f filebrowser.log filebrowser.pid

# 启动服务
start:
	@echo "启动服务..."
	./service.sh start

# 停止服务
stop:
	@echo "停止服务..."
	./service.sh stop

# 重启服务
restart: build
	@echo "重启服务..."
	./service.sh restart

# 查看状态
status:
	@echo "查看服务状态..."
	./service.sh status

# 查看日志
logs:
	@echo "查看日志..."
	./service.sh logs

# 格式化代码
fmt:
	@echo "格式化代码..."
	go fmt ./...

# 代码检查
vet:
	@echo "代码检查..."
	go vet ./...

# 优化代码（所有检查）
check: fmt vet
	@echo "代码检查完成！"

# 完整构建流程（编译+测试+清理）
distclean: clean
	@echo "完整清理..."
	rm -rf *.tar.gz *.zip build/

# 安装依赖
deps:
	@echo "下载依赖..."
	go mod download
	go mod tidy

# 帮助信息
help:
	@echo "可用的 make 命令:"
	@echo ""
	@echo "编译相关:"
	@echo "  make build      - 编译当前平台"
	@echo "  make build-all  - 交叉编译所有平台"
	@echo "  make clean      - 清理编译文件"
	@echo ""
	@echo "运行相关:"
	@echo "  make run        - 直接运行（开发模式）"
	@echo "  make start      - 启动服务"
	@echo "  make stop       - 停止服务"
	@echo "  make restart    - 重启服务"
	@echo "  make status     - 查看状态"
	@echo "  make logs       - 查看日志"
	@echo ""
	@echo "开发相关:"
	@echo "  make test       - 运行测试"
	@echo "  make fmt        - 格式化代码"
	@echo "  make vet        - 代码检查"
	@echo "  make check      - 完整代码检查"
	@echo "  make deps       - 安装依赖"
	@echo ""
	@echo "其他:"
	@echo "  make help       - 显示此帮助信息"
