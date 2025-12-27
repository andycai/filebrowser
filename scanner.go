package main

import (
	"bufio"
	"io"
	"os"
)

// LineScanner 优化的行扫描器
type LineScanner struct {
	scanner *bufio.Scanner
	line    string
}

// NewLineScanner 创建新的行扫描器
func NewLineScanner(r io.Reader) *LineScanner {
	scanner := bufio.NewScanner(r)
	// 设置更大的缓冲区以处理更长的行
	buf := make([]byte, 0, 64*1024) // 64KB 初始缓冲区
	scanner.Buffer(buf, 1024*1024)  // 最大 1MB 行长度
	return &LineScanner{scanner: scanner}
}

// Scan 扫描下一行
func (ls *LineScanner) Scan() bool {
	ok := ls.scanner.Scan()
	if ok {
		ls.line = ls.scanner.Text()
	}
	return ok
}

// Text 返回当前行的文本
func (ls *LineScanner) Text() string {
	return ls.line
}

// Bytes 返回当前行的字节
func (ls *LineScanner) Bytes() []byte {
	return ls.scanner.Bytes()
}

// Err 返回扫描过程中的错误
func (ls *LineScanner) Err() error {
	return ls.scanner.Err()
}

// ReadLines 从指定位置读取指定行数（内存优化的版本）
func ReadLines(filePath string, startLine, count int) ([]string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	scanner := NewLineScanner(file)
	lines := make([]string, 0, count)
	currentLine := 0

	for scanner.Scan() {
		if currentLine >= startLine+count {
			break
		}
		if currentLine >= startLine {
			lines = append(lines, scanner.Text())
		}
		currentLine++
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return lines, nil
}

// CountLinesFast 快速统计文件行数（使用缓冲读取）
func CountLinesFast(filePath string) (int, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	count := 0
	buf := make([]byte, 32*1024) // 32KB 缓冲区
	newline := []byte("\n")[0]

	for {
		n, err := file.Read(buf)
		if err != nil && err != io.EOF {
			return 0, err
		}
		if n == 0 {
			break
		}

		for _, b := range buf[:n] {
			if b == newline {
				count++
			}
		}
	}

	return count, nil
}
