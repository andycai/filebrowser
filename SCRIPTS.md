# 部署脚本说明

本项目提供了一套完整的编译和部署脚本，支持多平台交叉编译和便捷的服务管理。

## 📜 脚本清单

### 1. build.sh - 交叉编译脚本

**功能**：一次编译 macOS、Linux、Windows 三个平台的可执行文件

**支持平台**：
- macOS Intel (amd64)
- macOS Apple Silicon (arm64)
- Linux AMD64
- Linux ARM64
- Windows AMD64

**使用方法**：
```bash
./build.sh
```

**输出**：
- `build/` 目录包含 5 个可执行文件
- 自动生成对应的压缩包（.tar.gz 和 .zip）

**示例输出**：
```
✓ darwin/amd64 编译成功 (8.4M)
✓ darwin/arm64 编译成功 (7.9M)
✓ linux/amd64 编译成功 (8.2M)
✓ linux/arm64 编译成功 (7.7M)
✓ windows/amd64 编译成功 (8.4M)
```

---

### 2. service.sh - 服务管理脚本（Linux/macOS）

**功能**：管理文件浏览器服务的启动、停止、重启和状态查看

**使用方法**：
```bash
./service.sh {start|stop|restart|status|logs}
```

**命令说明**：

| 命令 | 功能 | 说明 |
|------|------|------|
| `start` | 启动服务 | 后台运行，记录 PID 和日志 |
| `stop` | 停止服务 | 优雅停止，最多等待 10 秒 |
| `restart` | 重启服务 | 先停止再启动 |
| `status` | 查看状态 | 显示 PID、内存、运行时间、访问地址 |
| `logs` | 查看日志 | 实时跟踪日志（类似 tail -f） |

**特性**：
- 自动检测平台（macOS Intel/ARM, Linux AMD64/ARM64）
- 彩色输出，清晰美观
- PID 文件管理，防止重复启动
- 完整的错误处理
- 显示内存使用和运行时间

**示例**：
```bash
$ ./service.sh start
✓ filebrowser 启动成功 (PID: 22442)
访问地址: http://localhost:8080

$ ./service.sh status
● filebrowser 正在运行
PID: 22442
内存: 10.1 MB
运行时间: 00:04
访问地址: http://localhost:8080
```

---

### 3. service.bat - 服务管理脚本（Windows）

**功能**：Windows 平台的服务管理

**使用方法**：
```cmd
service.bat {start|stop|restart|status|logs}
```

**命令说明**：同 service.sh

**特性**：
- 自动检测进程是否运行
- 使用 tasklist 和 taskkill 管理进程
- 显示进程 PID 和内存占用
- 兼容 Windows CMD 环境

---

### 4. install.sh - 系统服务安装脚本（Linux）

**功能**：将文件浏览器安装为 Linux systemd 系统服务

**使用方法**：
```bash
sudo ./install.sh
```

**功能特性**：
- 自动检测平台架构
- 安装到 `/opt/filebrowser`
- 创建 systemd 服务文件
- 配置日志文件
- 设置开机自启（可选）
- 使用非 root 用户运行（安全）

**安装后的管理**：
```bash
sudo systemctl start filebrowser    # 启动
sudo systemctl stop filebrowser     # 停止
sudo systemctl restart filebrowser  # 重启
sudo systemctl status filebrowser   # 状态
sudo systemctl enable filebrowser   # 开机自启
sudo journalctl -u filebrowser -f   # 查看日志
```

**systemd 服务特性**：
- 自动重启（失败后 5 秒）
- 日志记录到 `/var/log/filebrowser/`
- 安全沙箱（NoNewPrivileges, PrivateTmp）
- 依赖网络启动

---

### 5. Makefile - 便捷构建工具

**功能**：提供统一的命令接口，简化常见操作

**常用命令**：

```bash
# 编译相关
make build       # 编译当前平台
make build-all   # 交叉编译所有平台
make clean       # 清理编译文件

# 运行相关
make run         # 直接运行（开发模式）
make start       # 启动服务
make stop        # 停止服务
make restart     # 重启服务
make status      # 查看状态
make logs        # 查看日志

# 开发相关
make test        # 运行测试
make fmt         # 格式化代码
make vet         # 代码检查
make check       # 完整代码检查
make deps        # 安装依赖

# 帮助
make help        # 显示所有可用命令
```

---

## 🎯 使用场景

### 场景 1：开发者本地测试

```bash
# 方式一：快速测试
make run

# 方式二：编译后运行
make build
make start
```

### 场景 2：部署到 Linux 服务器

```bash
# 在本地编译
make build-all

# 上传到服务器
scp build/filebrowser-linux-amd64 user@server:/opt/filebrowser
scp config.json user@server:/opt/filebrowser

# 安装为系统服务
ssh user@server
cd /opt/filebrowser
sudo ./install.sh
```

### 场景 3：部署到多个平台

```bash
# 一次编译所有平台
./build.sh

# 分发到不同平台
# macOS: scp build/filebrowser-darwin-arm64 user@mac:/opt/
# Linux: scp build/filebrowser-linux-amd64 user@linux:/opt/
# Windows: scp build/filebrowser-windows-amd64.exe user@win:/C:/Tools/
```

### 场景 4：生产环境运行

```bash
# 使用 systemd 管理服务（推荐）
sudo systemctl enable filebrowser  # 开机自启
sudo systemctl start filebrowser   # 启动服务

# 或使用服务脚本
./service.sh start
```

---

## 📁 文件说明

| 文件 | 类型 | 说明 |
|------|------|------|
| `build.sh` | Shell 脚本 | 交叉编译脚本 |
| `service.sh` | Shell 脚本 | Linux/macOS 服务管理 |
| `service.bat` | Batch 脚本 | Windows 服务管理 |
| `install.sh` | Shell 脚本 | Linux systemd 安装 |
| `Makefile` | Make 文件 | 统一构建接口 |
| `config.json` | JSON 配置 | 应用配置文件 |

---

## 🔧 技术细节

### 编译优化
- 使用 Go 的交叉编译功能（GOOS/GOARCH）
- 静态链接，无外部依赖
- 编译后大小约 8 MB（无压缩）
- 压缩后约 4-5 MB（易于分发）

### 服务管理
- PID 文件管理：`filebrowser.pid`
- 日志文件：`filebrowser.log`
- 后台运行：使用 `nohup`
- 进程检测：防止重复启动

### 安全性
- systemd 服务运行在非 root 用户
- 启用 NoNewPrivileges 和 PrivateTmp
- 日志文件权限控制
- 配置文件验证

---

## 💡 最佳实践

1. **开发环境**：使用 `make run` 快速迭代
2. **测试环境**：使用 `make build && make start`
3. **生产环境**：使用 systemd 管理服务
4. **多平台部署**：使用 `./build.sh` 一次编译
5. **定期更新**：
   ```bash
   make clean          # 清理旧文件
   make build-all      # 重新编译
   make restart        # 重启服务
   ```

---

## 🆘 故障排查

**编译失败**
```bash
# 检查 Go 版本
go version

# 清理并重新编译
make clean
make build-all
```

**服务启动失败**
```bash
# 查看日志
./service.sh logs
# 或
cat filebrowser.log
```

**端口被占用**
```bash
# 修改 config.json 中的 port
# 或查找占用进程
lsof -i :8080
```

---

更多详细文档请参考：
- `README.md` - 完整功能说明
- `QUICKSTART.md` - 快速开始指南
