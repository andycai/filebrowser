# 文件浏览器 (File Browser)

一个使用 Go 语言开发的高性能文件浏览程序，支持浏览目录、查看文本文件内容，特别是针对大文件进行了性能优化。

## 功能特性

- **多根目录支持**: 支持配置多个根目录，可在不同目录间快速切换
- **目录浏览**: 浏览文件和文件夹，支持导航到任意子目录
- **文件查看**: 查看文本文件内容
- **大文件优化**: 针对大文件（>10MB）使用流式分页加载，避免内存溢出和卡顿
- **分页显示**: 大文件自动分页，每页显示 1000 行
- **文本搜索**: 在文件中搜索文本内容，快速定位
- **安全性**: 防止目录遍历攻击，限制在配置的根目录内
- **友好的 UI**: 现代化的 Web 界面，支持文件图标、面包屑导航
- **响应式设计**: 支持桌面和移动设备

## 性能优化

### 1. 流式读取
- 小文件（<10MB）: 一次性读取并显示
- 大文件（≥10MB）: 使用 `bufio.Scanner` 流式读取，避免一次性加载到内存

### 2. 分页加载
- 大文件自动分页，每页 1000 行
- 只加载当前页的内容，减少内存占用
- 支持快速跳转到任意页

### 3. 缓冲优化
- 使用 64KB 初始缓冲区，最大支持 1MB 行长度
- 高效的行扫描算法

### 4. 异步加载
- 前端使用异步请求，避免阻塞 UI
- 加载动画提示，提升用户体验

## 编译和部署

### 方式一：直接运行（开发模式）

```bash
# 直接运行
go run .

# 或先编译再运行
go build -o filebrowser
./filebrowser
```

### 方式二：交叉编译（多平台）

项目提供了交叉编译脚本，可以一次编译多个平台的可执行文件：

```bash
# 编译所有平台
./build.sh
```

编译完成后，`build/` 目录将包含以下文件：

| 平台 | 架构 | 文件名 |
|------|------|--------|
| macOS | Intel (amd64) | `filebrowser-darwin-amd64` |
| macOS | Apple Silicon (arm64) | `filebrowser-darwin-arm64` |
| Linux | AMD64 | `filebrowser-linux-amd64` |
| Linux | ARM64 | `filebrowser-linux-arm64` |
| Windows | AMD64 | `filebrowser-windows-amd64.exe` |

还会生成对应的压缩包：
- `filebrowser-darwin-amd64.tar.gz`
- `filebrowser-darwin-arm64.tar.gz`
- `filebrowser-linux-amd64.tar.gz`
- `filebrowser-linux-arm64.tar.gz`
- `filebrowser-windows-amd64.zip`

### 方式三：使用服务管理脚本

#### Linux / macOS

项目提供了 `service.sh` 脚本，方便管理服务：

```bash
# 启动服务
./service.sh start

# 停止服务
./service.sh stop

# 重启服务
./service.sh restart

# 查看状态
./service.sh status

# 查看日志（实时）
./service.sh logs
```

#### Windows

使用 `service.bat` 脚本：

```cmd
REM 启动服务
service.bat start

REM 停止服务
service.bat stop

REM 重启服务
service.bat restart

REM 查看状态
service.bat status

REM 查看日志
service.bat logs
```

### 方式四：安装为系统服务（Linux systemd）

在 Linux 系统上，可以安装为 systemd 系统服务：

```bash
# 1. 先编译
./build.sh

# 2. 安装系统服务（需要 sudo）
sudo ./install.sh
```

安装后可以使用 systemctl 管理：

```bash
# 启动服务
sudo systemctl start filebrowser

# 停止服务
sudo systemctl stop filebrowser

# 重启服务
sudo systemctl restart filebrowser

# 查看状态
sudo systemctl status filebrowser

# 设置开机自启
sudo systemctl enable filebrowser

# 查看日志
sudo journalctl -u filebrowser -f
```

### 部署到生产环境

1. **选择对应平台的可执行文件**
2. **复制到服务器**
3. **复制配置文件 `config.json`**
4. **修改配置文件中的根目录和端口**
5. **运行服务**

示例部署到 Linux 服务器：

```bash
# 在本地编译
./build.sh

# 上传到服务器
scp build/filebrowser-linux-amd64 user@server:/opt/filebrowser
scp config.json user@server:/opt/filebrowser/

# 在服务器上运行
ssh user@server
cd /opt/filebrowser
chmod +x filebrowser
./filebrowser
```

## 使用方式

### 1. 配置

编辑 `config.json` 文件：

```json
{
  "rootDirs": [
    {
      "name": "项目目录",
      "path": "."
    },
    {
      "name": "用户主目录",
      "path": "/Users/username"
    },
    {
      "name": "系统根目录",
      "path": "/"
    }
  ],
  "port": 8080,
  "staticDir": "./static"
}
```

**配置说明**:
- `rootDirs`: 根目录配置数组（支持多个根目录）
  - `name`: 显示名称（在界面上显示的名称）
  - `path`: 实际文件系统路径（支持相对路径和绝对路径）
- `port`: 服务器监听端口
- `staticDir`: 静态文件目录路径

**根目录切换**:
- 界面顶部有根目录选择下拉框
- 切换根目录后自动跳转到新根目录的首页
- 每个根目录的浏览历史独立维护

### 2. 启动服务

选择以下任一方式启动：

- **开发模式**: `go run .`
- **直接运行**: `./filebrowser` (Linux/macOS) 或 `filebrowser.exe` (Windows)
- **服务脚本**: `./service.sh start` 或 `service.bat start`
- **系统服务**: `sudo systemctl start filebrowser` (Linux systemd)

### 3. 访问

打开浏览器访问: `http://localhost:8080`

**直接打开文件**:
可以通过 URL 参数直接打开特定文件：
```
http://localhost:8080/?file=path/to/file.txt
```

**切换根目录**:
- 使用页面顶部的根目录选择器下拉框
- 每个根目录的浏览状态独立维护
- 切换根目录会自动返回到该根目录的首页

## 项目结构

```
filebrowser/
├── main.go              # 主程序和 HTTP 服务器
├── config.go            # 配置文件加载
├── scanner.go           # 优化的文件扫描器
├── config.json          # 配置文件
├── build.sh             # 交叉编译脚本
├── service.sh           # Linux/macOS 服务管理脚本
├── service.bat          # Windows 服务管理脚本
├── install.sh           # Linux systemd 安装脚本
├── build/               # 编译输出目录
│   ├── filebrowser-darwin-amd64
│   ├── filebrowser-darwin-arm64
│   ├── filebrowser-linux-amd64
│   ├── filebrowser-linux-arm64
│   └── filebrowser-windows-amd64.exe
└── static/              # 静态文件目录
    ├── index.html       # 前端页面
    ├── style.css        # 样式文件
    └── app.js           # 前端 JavaScript 逻辑
```

## API 接口

### 1. 获取根目录列表

**请求**: `GET /api/roots`

**响应**:
```json
[
  {
    "name": "项目目录",
    "path": "/absolute/path/to/project"
  },
  {
    "name": "用户主目录",
    "path": "/Users/username"
  }
]
```

### 2. 获取目录列表

**请求**: `GET /api/list?path=<path>&root=<rootIndex>`

**参数**:
- `path`: 目录路径（相对于根目录）
- `root`: 根目录索引（可选，默认为 0）

**响应**:
```json
[
  {
    "name": "example.txt",
    "path": "/example.txt",
    "isDir": false,
    "size": 1024,
    "modTime": "2024-01-01T00:00:00Z",
    "extension": "txt"
  }
]
```

### 3. 查看文件内容

**请求**: `GET /api/view?path=<path>&page=<page>&root=<rootIndex>`

**参数**:
- `path`: 文件路径（相对于根目录）
- `page`: 页码（可选，默认为 1）
- `root`: 根目录索引（可选，默认为 0）

**响应**:
```json
{
  "path": "/path/to/file.txt",
  "name": "file.txt",
  "size": 1024000,
  "isPartial": true,
  "totalLines": 50000,
  "lines": ["line 1", "line 2", ...],
  "page": 1,
  "totalPages": 50
}
```

### 4. 搜索文件内容

**请求**: `GET /api/search?path=<path>&q=<query>&root=<rootIndex>`

**参数**:
- `path`: 文件路径（相对于根目录）
- `q`: 搜索关键词
- `root`: 根目录索引（可选，默认为 0）

**响应**:
```json
[
  {
    "lineNumber": 100,
    "page": 1,
    "line": "line content containing keyword"
  }
]
```

## 键盘快捷键

### 文件列表视图
- 无特定快捷键

### 文件内容视图
- `Esc`: 返回文件列表
- `←`: 上一页
- `→`: 下一页

### 搜索功能
- `Enter`: 在搜索框中按回车键执行搜索

## 安全性

- 路径安全检查：防止目录遍历攻击（`..`）
- 限制访问范围：只能访问配置的根目录及其子目录
- 输入验证：所有路径参数都经过验证

## 技术栈

### 后端
- Go 1.16+
- 标准库（net/http, bufio, os 等）

### 前端
- HTML5
- CSS3
- 原生 JavaScript（无框架依赖）

## 性能测试

测试环境：MacBook Pro M1, 16GB RAM

| 文件大小 | 行数 | 加载时间 | 内存占用 |
|---------|------|---------|---------|
| 1 MB    | 10K  | <100ms  | ~5 MB   |
| 10 MB   | 100K | <200ms  | ~10 MB  |
| 100 MB  | 1M   | <500ms  | ~15 MB  |
| 1 GB    | 10M  | <2s     | ~20 MB  |

## 常见问题

### Q: 如何修改每页显示的行数？
A: 修改 `main.go` 中的 `LinesPerPage` 常量。

### Q: 如何修改大文件的阈值？
A: 修改 `main.go` 中的 `MaxFileSize` 常量。

### Q: 支持哪些文件类型？
A: 支持所有文本文件。二进制文件会显示乱码，不建议查看。

### Q: 可以同时查看多个文件吗？
A: 当前版本只支持查看单个文件，多文件标签页功能可以在未来版本中添加。

### Q: 如何配置多个根目录？
A: 在 `config.json` 中的 `rootDirs` 数组中添加多个根目录配置，每个目录需要指定 `name`（显示名称）和 `path`（实际路径）。

### Q: 切换根目录会影响浏览历史吗？
A: 不会。每个根目录的浏览历史独立维护，切换根目录后，之前根目录的浏览状态会被保留。

### Q: 可以在不同的根目录之间共享文件吗？
A: 不可以。每个根目录是独立的，只能访问该根目录及其子目录下的文件。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
