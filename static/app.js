// 当前浏览的路径
let currentPath = '/';
// 当前文件查看的页码
let currentPage = 1;
// 当前文件的总页数
let totalPages = 1;
// 当前查看的文件路径
let currentFilePath = '';

// DOM 元素
const listView = document.getElementById('listView');
const contentView = document.getElementById('contentView');
const fileList = document.getElementById('fileList');
const breadcrumb = document.getElementById('breadcrumb');
const fileContent = document.getElementById('fileContent');
const fileName = document.getElementById('fileName');
const fileInfo = document.getElementById('fileInfo');
const loading = document.getElementById('loading');
const pagination = document.getElementById('pagination');
const paginationBottom = document.getElementById('paginationBottom');

// 工具函数：格式化文件大小
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 工具函数：格式化日期
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 工具函数：获取文件图标
function getFileIcon(isDir, extension) {
    if (isDir) return '📁';
    if (!extension) return '📄';
    const icons = {
        'txt': '📄',
        'md': '📝',
        'js': '📜',
        'go': '📘',
        'py': '🐍',
        'java': '☕',
        'cpp': '⚙️',
        'c': '⚙️',
        'html': '🌐',
        'css': '🎨',
        'json': '📋',
        'xml': '📋',
        'pdf': '📕',
        'zip': '📦',
        'tar': '📦',
        'gz': '📦',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'gif': '🖼️',
        'mp3': '🎵',
        'mp4': '🎬',
        'mov': '🎬'
    };
    return icons[extension.toLowerCase()] || '📄';
}

// 显示/隐藏加载动画
function showLoading() {
    loading.style.display = 'flex';
}

function hideLoading() {
    loading.style.display = 'none';
}

// 显示错误消息
function showError(message) {
    alert('错误: ' + message);
}

// 更新面包屑导航
function updateBreadcrumb(path) {
    const parts = path.split('/').filter(p => p);
    let html = '<span class="breadcrumb-item" data-path="/">🏠 根目录</span>';

    let currentPath = '';
    parts.forEach((part, index) => {
        currentPath += '/' + part;
        html += '<span class="breadcrumb-separator">/</span>';
        html += `<span class="breadcrumb-item" data-path="${currentPath}">${part}</span>`;
    });

    breadcrumb.innerHTML = html;

    // 添加点击事件
    document.querySelectorAll('.breadcrumb-item').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.getAttribute('data-path');
            loadDirectory(path);
        });
    });
}

// 加载目录内容
async function loadDirectory(path) {
    try {
        showLoading();
        const response = await fetch(`/api/list?path=${encodeURIComponent(path)}`);

        if (!response.ok) {
            throw new Error('Failed to load directory');
        }

        const files = await response.json();
        currentPath = path;
        renderFileList(files);
        updateBreadcrumb(path);
        showListView();
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 渲染文件列表
function renderFileList(files) {
    if (files.length === 0) {
        fileList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">此文件夹为空</div>
            </div>
        `;
        return;
    }

    // 排序：文件夹在前，然后按名称排序
    files.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
    });

    let html = `
        <div class="file-header">
            <div></div>
            <div>名称</div>
            <div>大小</div>
            <div>修改时间</div>
        </div>
    `;

    files.forEach(file => {
        html += `
            <div class="file-item" data-path="${file.path}" data-is-dir="${file.isDir}">
                <div class="file-icon">${getFileIcon(file.isDir, file.extension)}</div>
                <div class="file-name-cell">${file.name}</div>
                <div class="file-size">${file.isDir ? '' : formatSize(file.size)}</div>
                <div class="file-date">${formatDate(file.modTime)}</div>
            </div>
        `;
    });

    fileList.innerHTML = html;

    // 添加点击事件
    document.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.getAttribute('data-path');
            const isDir = item.getAttribute('data-is-dir') === 'true';

            if (isDir) {
                loadDirectory(path);
            } else {
                viewFile(path);
            }
        });
    });
}

// 查看文件内容
async function viewFile(path, page = 1) {
    try {
        showLoading();
        currentFilePath = path; // 保存当前文件路径
        const url = `/api/view?path=${encodeURIComponent(path)}&page=${page}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to load file');
        }

        const data = await response.json();
        currentPage = data.page;
        totalPages = data.totalPages;

        renderFileContent(data);
        showContentView();
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 渲染文件内容
function renderFileContent(data) {
    fileName.textContent = data.name;
    fileInfo.textContent = `${formatSize(data.size)} • ${data.totalLines.toLocaleString()} 行`;

    if (data.isPartial) {
        fileInfo.textContent += ` • 第 ${data.page}/${data.totalPages} 页`;
    }

    // 转义 HTML 并显示内容
    const escapedContent = data.lines.map(line => escapeHtml(line)).join('\n');
    fileContent.textContent = data.lines.join('\n');

    // 如果是分页内容，显示分页控件
    if (data.isPartial) {
        renderPagination(currentFilePath, data.page, data.totalPages);
        pagination.style.display = 'flex';
        paginationBottom.style.display = 'flex';
    } else {
        pagination.style.display = 'none';
        paginationBottom.style.display = 'none';
    }
}

// 渲染分页控件
function renderPagination(path, page, totalPages) {
    const createButton = (text, newPage, disabled = false) => {
        if (disabled) {
            return `<button class="btn btn-secondary" disabled>${text}</button>`;
        }
        // 使用 data 属性存储路径和页码，避免特殊字符问题
        return `<button class="btn btn-secondary pagination-btn" data-path="${escapeHtml(path)}" data-page="${newPage}">${text}</button>`;
    };

    let html = createButton('« 首页', 1, page === 1);
    html += createButton('‹ 上一页', page - 1, page === 1);
    html += `<span class="pagination-info">第 ${page} / ${totalPages} 页</span>`;
    html += createButton('下一页 ›', page + 1, page === totalPages);
    html += createButton('末页 »', totalPages, page === totalPages);

    pagination.innerHTML = html;
    paginationBottom.innerHTML = html;

    // 添加分页按钮事件监听
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filePath = btn.getAttribute('data-path');
            const newPage = parseInt(btn.getAttribute('data-page'));
            viewFile(filePath, newPage);
        });
    });
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 转义 JavaScript 字符串中的特殊字符
function escapeJsString(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// 显示列表视图
function showListView() {
    listView.style.display = 'block';
    contentView.style.display = 'none';
}

// 显示内容视图
function showContentView() {
    listView.style.display = 'none';
    contentView.style.display = 'block';
}

// 事件监听
document.getElementById('refreshBtn').addEventListener('click', () => {
    loadDirectory(currentPath);
});

document.getElementById('upBtn').addEventListener('click', () => {
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
    loadDirectory(parentPath);
});

document.getElementById('backBtn').addEventListener('click', () => {
    showListView();
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (contentView.style.display !== 'none') {
        // 文件内容视图下的快捷键
        if (e.key === 'Escape') {
            showListView();
        } else if (e.key === 'ArrowLeft' && currentPage > 1) {
            if (currentFilePath) viewFile(currentFilePath, currentPage - 1);
        } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
            if (currentFilePath) viewFile(currentFilePath, currentPage + 1);
        }
    }
});

// 初始化
loadDirectory('/');
