package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	// 每次读取的行数，用于大文件分页
	LinesPerPage = 1000
	// 最大文件大小限制（10MB），超过则使用流式读取
	MaxFileSize = 10 * 1024 * 1024
)

// Config 配置结构
type Config struct {
	RootDir   string `json:"rootDir"`
	Port      int    `json:"port"`
	StaticDir string `json:"staticDir"`
}

// FileItem 文件项信息
type FileItem struct {
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	IsDir     bool      `json:"isDir"`
	Size      int64     `json:"size"`
	ModTime   time.Time `json:"modTime"`
	Extension string    `json:"extension,omitempty"`
}

// FileContent 文件内容响应
type FileContent struct {
	Path       string   `json:"path"`
	Name       string   `json:"name"`
	Size       int64    `json:"size"`
	IsPartial  bool     `json:"isPartial"`  // 是否为部分内容
	TotalLines int      `json:"totalLines"` // 总行数
	Lines      []string `json:"lines"`      // 内容行
	Page       int      `json:"page"`       // 当前页码
	TotalPages int      `json:"totalPages"` // 总页数
}

// Server 文件浏览服务器
type Server struct {
	config *Config
}

// NewServer 创建新的服务器实例
func NewServer(config *Config) *Server {
	// 确保根目录是绝对路径
	absPath, err := filepath.Abs(config.RootDir)
	if err != nil {
		log.Fatalf("Failed to get absolute path: %v", err)
	}
	config.RootDir = absPath

	// 检查根目录是否存在
	if _, err := os.Stat(config.RootDir); os.IsNotExist(err) {
		log.Fatalf("Root directory does not exist: %s", config.RootDir)
	}

	return &Server{config: config}
}

// Start 启动服务器
func (s *Server) Start() error {
	// 静态文件服务
	fs := http.FileServer(http.Dir(s.config.StaticDir))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// API 路由
	http.HandleFunc("/api/list", s.handleList)
	http.HandleFunc("/api/view", s.handleView)
	http.HandleFunc("/", s.handleIndex)

	addr := fmt.Sprintf(":%d", s.config.Port)
	log.Printf("Starting file browser on http://localhost%s", addr)
	log.Printf("Root directory: %s", s.config.RootDir)

	return http.ListenAndServe(addr, nil)
}

// handleIndex 处理首页
func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		s.handleError(w, fmt.Errorf("page not found"), http.StatusNotFound)
		return
	}

	http.ServeFile(w, r, filepath.Join(s.config.StaticDir, "index.html"))
}

// handleList 处理文件列表请求
func (s *Server) handleList(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		path = "/"
	}

	// 构建完整路径
	fullPath := s.getFullPath(path)

	// 检查路径是否在根目录内
	if !s.isPathSafe(fullPath) {
		s.handleError(w, fmt.Errorf("access denied"), http.StatusForbidden)
		return
	}

	// 读取目录内容
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}

	// 构建文件列表
	var items []FileItem
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		relPath, _ := filepath.Rel(s.config.RootDir, filepath.Join(fullPath, entry.Name()))

		item := FileItem{
			Name:    entry.Name(),
			Path:    "/" + filepath.ToSlash(relPath),
			IsDir:   entry.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime(),
		}

		if !entry.IsDir() {
			item.Extension = strings.TrimPrefix(filepath.Ext(entry.Name()), ".")
		}

		items = append(items, item)
	}

	s.writeJSON(w, items)
}

// handleView 处理文件内容查看请求
func (s *Server) handleView(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	if path == "" {
		s.handleError(w, fmt.Errorf("path parameter is required"), http.StatusBadRequest)
		return
	}

	// 构建完整路径
	fullPath := s.getFullPath(path)

	// 检查路径是否在根目录内
	if !s.isPathSafe(fullPath) {
		s.handleError(w, fmt.Errorf("access denied"), http.StatusForbidden)
		return
	}

	// 检查是否为文件
	info, err := os.Stat(fullPath)
	if err != nil {
		s.handleError(w, err, http.StatusNotFound)
		return
	}

	if info.IsDir() {
		s.handleError(w, fmt.Errorf("path is a directory"), http.StatusBadRequest)
		return
	}

	// 检查文件大小，决定读取方式
	if info.Size() > MaxFileSize {
		s.handleLargeFile(w, r, fullPath, info, page)
	} else {
		s.handleSmallFile(w, fullPath, info)
	}
}

// handleSmallFile 处理小文件（一次性读取）
func (s *Server) handleSmallFile(w http.ResponseWriter, fullPath string, info os.FileInfo) {
	content, err := os.ReadFile(fullPath)
	if err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}

	// 分割成行
	lines := strings.Split(string(content), "\n")

	response := FileContent{
		Path:       fullPath,
		Name:       info.Name(),
		Size:       info.Size(),
		IsPartial:  false,
		TotalLines: len(lines),
		Lines:      lines,
		Page:       1,
		TotalPages: 1,
	}

	s.writeJSON(w, response)
}

// handleLargeFile 处理大文件（流式分页读取）
func (s *Server) handleLargeFile(w http.ResponseWriter, r *http.Request, fullPath string, info os.FileInfo, page int) {
	file, err := os.Open(fullPath)
	if err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// 统计总行数（这个操作可能比较慢，可以缓存结果）
	totalLines := s.countLines(file)

	// 计算总页数
	totalPages := (totalLines + LinesPerPage - 1) / LinesPerPage
	if page > totalPages {
		page = totalPages
	}
	if page < 1 {
		page = 1
	}

	// 定位到起始位置
	_, err = file.Seek(0, io.SeekStart)
	if err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}

	// 跳过前面的行
	startLine := (page - 1) * LinesPerPage
	currentLine := 0
	var lines []string

	scanner := NewLineScanner(file)
	for scanner.Scan() {
		if currentLine >= startLine+LinesPerPage {
			break
		}
		if currentLine >= startLine {
			lines = append(lines, scanner.Text())
		}
		currentLine++
	}

	if err := scanner.Err(); err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}

	response := FileContent{
		Path:       fullPath,
		Name:       info.Name(),
		Size:       info.Size(),
		IsPartial:  true,
		TotalLines: totalLines,
		Lines:      lines,
		Page:       page,
		TotalPages: totalPages,
	}

	s.writeJSON(w, response)
}

// countLines 统计文件行数
func (s *Server) countLines(file *os.File) int {
	_, err := file.Seek(0, io.SeekStart)
	if err != nil {
		return 0
	}

	count := 0
	scanner := NewLineScanner(file)
	for scanner.Scan() {
		count++
	}
	return count
}

// getFullPath 获取完整路径
func (s *Server) getFullPath(path string) string {
	// 移除开头的 /
	path = strings.TrimPrefix(path, "/")
	return filepath.Join(s.config.RootDir, path)
}

// isPathSafe 检查路径是否安全（防止目录遍历攻击）
func (s *Server) isPathSafe(path string) bool {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return false
	}

	absRoot, err := filepath.Abs(s.config.RootDir)
	if err != nil {
		return false
	}

	relPath, err := filepath.Rel(absRoot, absPath)
	if err != nil {
		return false
	}

	// 检查相对路径是否以 .. 开头
	return !strings.HasPrefix(relPath, "..")
}

// writeJSON 写入 JSON 响应
func (s *Server) writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(data); err != nil {
		log.Printf("Error encoding JSON: %v", err)
	}
}

// handleError 处理错误
func (s *Server) handleError(w http.ResponseWriter, err error, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": err.Error(),
	})
}

func main() {
	// 加载配置文件
	config, err := LoadConfig("config.json")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 创建并启动服务器
	server := NewServer(config)
	if err := server.Start(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
