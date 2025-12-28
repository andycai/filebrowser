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
	RootDirs  []RootDirConfig `json:"rootDirs"`
	Port      int             `json:"port"`
	StaticDir string          `json:"staticDir"`
}

// RootDirConfig 根目录配置
type RootDirConfig struct {
	Name string `json:"name"` // 显示名称
	Path string `json:"path"` // 实际路径
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

// SearchResult 搜索结果
type SearchResult struct {
	LineNumber int    `json:"lineNumber"` // 行号（从1开始）
	Page       int    `json:"page"`       // 所在页码
	Line       string `json:"line"`       // 行内容
}

// SaveRequest 保存文件请求
type SaveRequest struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// CreateRequest 创建文件请求
type CreateRequest struct {
	Path string `json:"path"`
	Name string `json:"name"`
}

// Server 文件浏览服务器
type Server struct {
	config *Config
}

// NewServer 创建新的服务器实例
func NewServer(config *Config) *Server {
	// 验证所有根目录
	for i, rootDir := range config.RootDirs {
		// 确保根目录是绝对路径
		absPath, err := filepath.Abs(rootDir.Path)
		if err != nil {
			log.Fatalf("Failed to get absolute path for %s: %v", rootDir.Name, err)
		}
		config.RootDirs[i].Path = absPath

		// 检查根目录是否存在
		if _, err := os.Stat(absPath); os.IsNotExist(err) {
			log.Fatalf("Root directory does not exist: %s (%s)", rootDir.Name, absPath)
		}
	}

	return &Server{config: config}
}

// Start 启动服务器
func (s *Server) Start() error {
	// 静态文件服务
	fs := http.FileServer(http.Dir(s.config.StaticDir))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// API 路由（按特定顺序注册，避免路由冲突）
	// 更具体的路由必须先注册
	http.HandleFunc("/view/", s.handleViewRedirect)
	http.HandleFunc("/api/roots", s.handleRoots)
	http.HandleFunc("/api/search", s.handleSearch)
	http.HandleFunc("/api/list", s.handleList)
	http.HandleFunc("/api/view", s.handleView)
	http.HandleFunc("/api/save", s.handleSave)
	http.HandleFunc("/api/delete", s.handleDelete)
	http.HandleFunc("/api/create", s.handleCreate)
	http.HandleFunc("/api/createDir", s.handleCreateDir)
	http.HandleFunc("/api/upload", s.handleUpload)
	http.HandleFunc("/", s.handleIndex)

	addr := fmt.Sprintf(":%d", s.config.Port)
	log.Printf("Starting file browser on http://localhost%s", addr)
	log.Printf("Root directories: %d", len(s.config.RootDirs))
	for _, root := range s.config.RootDirs {
		log.Printf("  - %s: %s", root.Name, root.Path)
	}

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

// handleViewRedirect 处理 /view/ 路径的重定向
func (s *Server) handleViewRedirect(w http.ResponseWriter, r *http.Request) {
	// 从 URL 中提取文件路径，去掉 /view/ 前缀
	filePath := r.URL.Path[len("/view/"):]

	if filePath == "" {
		s.handleError(w, fmt.Errorf("file path is required"), http.StatusBadRequest)
		return
	}

	rootIndex := getRootIndex(r)

	// 检查路径是否安全
	fullPath := s.getFullPath("/"+filePath, rootIndex)
	if !s.isPathSafe(fullPath, rootIndex) {
		s.handleError(w, fmt.Errorf("access denied"), http.StatusForbidden)
		return
	}

	// 检查文件是否存在
	info, err := os.Stat(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			s.handleError(w, fmt.Errorf("file not found"), http.StatusNotFound)
		} else {
			s.handleError(w, err, http.StatusInternalServerError)
		}
		return
	}

	if info.IsDir() {
		s.handleError(w, fmt.Errorf("path is a directory, not a file"), http.StatusBadRequest)
		return
	}

	// 直接返回 HTML 页面，其中包含 JavaScript 自动加载文件
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>查看文件 - 文件浏览器</title>
</head>
<body>
    <script>
        // 自动跳转到主页并加载文件
        window.location.href = '/?file=%s';
    </script>
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2>正在加载文件...</h2>
        <p>请稍候，页面将自动跳转</p>
        <p>如果没有自动跳转，请<a href="/?file=%s">点击这里</a></p>
    </div>
</body>
</html>`, "/"+filePath, "/"+filePath)
}

// handleList 处理文件列表请求
func (s *Server) handleList(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		path = "/"
	}

	rootIndex := getRootIndex(r)

	// 构建完整路径
	fullPath := s.getFullPath(path, rootIndex)

	// 检查路径是否在根目录内
	if !s.isPathSafe(fullPath, rootIndex) {
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

		relPath, _ := filepath.Rel(s.config.RootDirs[rootIndex].Path, filepath.Join(fullPath, entry.Name()))

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

	rootIndex := getRootIndex(r)

	// 构建完整路径
	fullPath := s.getFullPath(path, rootIndex)

	// 检查路径是否在根目录内
	if !s.isPathSafe(fullPath, rootIndex) {
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
// rootIndex 是根目录的索引（从 URL 参数获取），如果为空或无效则使用第一个根目录
func (s *Server) getFullPath(path string, rootIndex int) string {
	// 确保 rootIndex 在有效范围内
	if rootIndex < 0 || rootIndex >= len(s.config.RootDirs) {
		rootIndex = 0
	}

	// 移除开头的 /
	path = strings.TrimPrefix(path, "/")
	return filepath.Join(s.config.RootDirs[rootIndex].Path, path)
}

// getRootIndex 从 URL 查询参数获取根目录索引
func getRootIndex(r *http.Request) int {
	if idxStr := r.URL.Query().Get("root"); idxStr != "" {
		if idx, err := strconv.Atoi(idxStr); err == nil {
			return idx
		}
	}
	return 0 // 默认使用第一个根目录
}

// isPathSafe 检查路径是否安全（防止目录遍历攻击）
func (s *Server) isPathSafe(path string, rootIndex int) bool {
	// 确保 rootIndex 在有效范围内
	if rootIndex < 0 || rootIndex >= len(s.config.RootDirs) {
		return false
	}

	absPath, err := filepath.Abs(path)
	if err != nil {
		return false
	}

	absRoot, err := filepath.Abs(s.config.RootDirs[rootIndex].Path)
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

// handleSearch 处理文件搜索请求
func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	query := r.URL.Query().Get("q")

	if path == "" {
		s.handleError(w, fmt.Errorf("path parameter is required"), http.StatusBadRequest)
		return
	}

	if query == "" {
		s.handleError(w, fmt.Errorf("query parameter is required"), http.StatusBadRequest)
		return
	}

	rootIndex := getRootIndex(r)

	// 构建完整路径
	fullPath := s.getFullPath(path, rootIndex)

	// 检查路径是否在根目录内
	if !s.isPathSafe(fullPath, rootIndex) {
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

	// 搜索文件
	results, err := s.searchFile(fullPath, query)
	if err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}

	s.writeJSON(w, results)
}

// searchFile 在文件中搜索文本
func (s *Server) searchFile(filePath, query string) ([]SearchResult, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var results []SearchResult
	lineNumber := 0
	scanner := NewLineScanner(file)

	// 限制最多返回 100 个结果
	const maxResults = 100

	for scanner.Scan() && len(results) < maxResults {
		lineNumber++
		line := scanner.Text()

		// 简单的字符串包含搜索（不区分大小写）
		if containsIgnoreCase(line, query) {
			// 计算所在页码
			page := (lineNumber + LinesPerPage - 1) / LinesPerPage
			if page < 1 {
				page = 1
			}

			results = append(results, SearchResult{
				LineNumber: lineNumber,
				Page:       page,
				Line:       strings.TrimSpace(line),
			})
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return results, nil
}

// containsIgnoreCase 不区分大小写的字符串包含检查
func containsIgnoreCase(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

// handleRoots 处理获取根目录列表的请求
func (s *Server) handleRoots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 直接返回配置的根目录列表
	if err := json.NewEncoder(w).Encode(s.config.RootDirs); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// handleSave 处理保存文件请求
func (s *Server) handleSave(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.handleError(w, fmt.Errorf("method not allowed"), http.StatusMethodNotAllowed)
		return
	}

	var req SaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.handleError(w, fmt.Errorf("invalid request body"), http.StatusBadRequest)
		return
	}

	rootIndex := getRootIndex(r)

	// 构建完整路径
	fullPath := s.getFullPath(req.Path, rootIndex)

	// 检查路径是否在根目录内
	if !s.isPathSafe(fullPath, rootIndex) {
		s.handleError(w, fmt.Errorf("access denied"), http.StatusForbidden)
		return
	}

	// 检查文件是否存在
	info, err := os.Stat(fullPath)
	if err != nil {
		s.handleError(w, err, http.StatusNotFound)
		return
	}

	// 确保不是目录
	if info.IsDir() {
		s.handleError(w, fmt.Errorf("cannot save directory"), http.StatusBadRequest)
		return
	}

	// 写入文件
	if err := os.WriteFile(fullPath, []byte(req.Content), 0644); err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "文件保存成功",
	})
}

// handleDelete 处理删除文件请求
func (s *Server) handleDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		s.handleError(w, fmt.Errorf("method not allowed"), http.StatusMethodNotAllowed)
		return
	}

	path := r.URL.Query().Get("path")
	if path == "" {
		s.handleError(w, fmt.Errorf("path parameter is required"), http.StatusBadRequest)
		return
	}

	rootIndex := getRootIndex(r)

	// 构建完整路径
	fullPath := s.getFullPath(path, rootIndex)

	// 检查路径是否在根目录内
	if !s.isPathSafe(fullPath, rootIndex) {
		s.handleError(w, fmt.Errorf("access denied"), http.StatusForbidden)
		return
	}

	// 检查文件是否存在
	info, err := os.Stat(fullPath)
	if err != nil {
		s.handleError(w, err, http.StatusNotFound)
		return
	}

	// 确保不是目录
	if info.IsDir() {
		s.handleError(w, fmt.Errorf("cannot delete directory"), http.StatusBadRequest)
		return
	}

	// 删除文件
	if err := os.Remove(fullPath); err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "文件删除成功",
	})
}

// handleCreate 处理创建文件请求
func (s *Server) handleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.handleError(w, fmt.Errorf("method not allowed"), http.StatusMethodNotAllowed)
		return
	}

	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.handleError(w, fmt.Errorf("invalid request body"), http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		s.handleError(w, fmt.Errorf("name is required"), http.StatusBadRequest)
		return
	}

	rootIndex := getRootIndex(r)

	// 构建目录的完整路径
	dirPath := s.getFullPath(req.Path, rootIndex)

	// 检查路径是否在根目录内
	if !s.isPathSafe(dirPath, rootIndex) {
		s.handleError(w, fmt.Errorf("access denied"), http.StatusForbidden)
		return
	}

	// 构建新文件的完整路径
	fullPath := filepath.Join(dirPath, req.Name)

	// 再次检查完整路径是否在根目录内
	if !s.isPathSafe(fullPath, rootIndex) {
		s.handleError(w, fmt.Errorf("access denied"), http.StatusForbidden)
		return
	}

	// 检查文件是否已存在
	if _, err := os.Stat(fullPath); err == nil {
		s.handleError(w, fmt.Errorf("file already exists"), http.StatusConflict)
		return
	}

	// 创建空文件
	if err := os.WriteFile(fullPath, []byte{}, 0644); err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "文件创建成功",
	})
}

// handleCreateDir 处理创建目录请求
func (s *Server) handleCreateDir(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.handleError(w, fmt.Errorf("method not allowed"), http.StatusMethodNotAllowed)
		return
	}

	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.handleError(w, fmt.Errorf("invalid request body"), http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		s.handleError(w, fmt.Errorf("name is required"), http.StatusBadRequest)
		return
	}

	rootIndex := getRootIndex(r)

	// 构建父目录的完整路径
	dirPath := s.getFullPath(req.Path, rootIndex)

	// 检查路径是否在根目录内
	if !s.isPathSafe(dirPath, rootIndex) {
		s.handleError(w, fmt.Errorf("access denied"), http.StatusForbidden)
		return
	}

	// 构建新目录的完整路径
	fullPath := filepath.Join(dirPath, req.Name)

	// 再次检查完整路径是否在根目录内
	if !s.isPathSafe(fullPath, rootIndex) {
		s.handleError(w, fmt.Errorf("access denied"), http.StatusForbidden)
		return
	}

	// 检查目录是否已存在
	if _, err := os.Stat(fullPath); err == nil {
		s.handleError(w, fmt.Errorf("directory already exists"), http.StatusConflict)
		return
	}

	// 创建目录
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "目录创建成功",
	})
}

// handleUpload 处理文件上传请求
func (s *Server) handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.handleError(w, fmt.Errorf("method not allowed"), http.StatusMethodNotAllowed)
		return
	}

	rootIndex := getRootIndex(r)

	// 解析表单，获取文件和路径
	err := r.ParseMultipartForm(32 << 20) // 32MB 最大内存
	if err != nil {
		s.handleError(w, err, http.StatusBadRequest)
		return
	}

	path := r.FormValue("path")
	if path == "" {
		path = "/"
	}

	// 构建目标目录的完整路径
	dirPath := s.getFullPath(path, rootIndex)

	// 检查路径是否在根目录内
	if !s.isPathSafe(dirPath, rootIndex) {
		s.handleError(w, fmt.Errorf("access denied"), http.StatusForbidden)
		return
	}

	// 获取上传的文件
	file, header, err := r.FormFile("file")
	if err != nil {
		s.handleError(w, err, http.StatusBadRequest)
		return
	}
	defer file.Close()

	// 构建目标文件的完整路径
	fullPath := filepath.Join(dirPath, header.Filename)

	// 再次检查完整路径是否在根目录内
	if !s.isPathSafe(fullPath, rootIndex) {
		s.handleError(w, fmt.Errorf("access denied"), http.StatusForbidden)
		return
	}

	// 检查文件是否已存在
	if _, err := os.Stat(fullPath); err == nil {
		s.handleError(w, fmt.Errorf("file already exists"), http.StatusConflict)
		return
	}

	// 创建目标文件
	dst, err := os.Create(fullPath)
	if err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// 复制文件内容
	_, err = io.Copy(dst, file)
	if err != nil {
		s.handleError(w, err, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "文件上传成功",
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
