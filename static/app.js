// 当前浏览的路径
let currentPath = '/';
// 当前文件查看的页码
let currentPage = 1;
// 当前文件的总页数
let totalPages = 1;
// 当前查看的文件路径
let currentFilePath = '';
// 每页显示的行数（需要与后端保持一致）
const LinesPerPage = 1000;
// 当前搜索结果
let currentSearchResults = [];
// 当前搜索结果索引
let currentSearchIndex = -1;
// 当前根目录索引
let currentRootIndex = 0;
// 所有根目录配置
let rootDirs = [];
// 当前编辑的文件内容（用于保存）
let currentFileContent = [];
// 是否是JSON文件
let isJsonFile = false;

// DOM 元素
const contentView = document.getElementById('contentView');
const fileList = document.getElementById('fileList');
const breadcrumb = document.getElementById('breadcrumb');
const fileContent = document.getElementById('fileContent');
const fileEditor = document.getElementById('fileEditor');
const fileName = document.getElementById('fileName');
const fileInfo = document.getElementById('fileInfo');
const loading = document.getElementById('loading');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const searchNav = document.getElementById('searchNav');
const prevResultBtn = document.getElementById('prevResultBtn');
const nextResultBtn = document.getElementById('nextResultBtn');
const searchNavInfo = document.getElementById('searchNavInfo');
const rootSelect = document.getElementById('rootSelect');

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

// 工具函数：规范化路径（将 Windows 反斜杠转换为正斜杠，并移除尾部斜杠）
function normalizePath(path) {
    if (!path) return '/';
    // 将所有反斜杠转换为正斜杠
    let normalized = path.replace(/\\/g, '/');
    // 移除尾部斜杠，但保留根目录的斜杠
    normalized = normalized.replace(/\/+$/, '');
    if (normalized === '') normalized = '/';
    return normalized;
}

// 工具函数：判断是否为文本文件
function isTextFile(extension) {
    if (!extension) return false; // 无扩展名的文件默认不是文本文件
    const textExtensions = [
        'txt', 'md', 'js', 'go', 'py', 'java', 'cpp', 'c', 'h', 'hpp',
        'html', 'htm', 'css', 'scss', 'sass', 'less',
        'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
        'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
        'rs', 'ts', 'tsx', 'jsx', 'vue', 'svelte',
        'php', 'rb', 'pl', 'lua', 'r', 'sql',
        'log', 'csv', 'tsv',
        'gitignore', 'gitattributes', 'env', 'dockerignore'
    ];
    return textExtensions.includes(extension.toLowerCase());
}

// 工具函数：获取文件图标
function getFileIcon(isDir, extension) {
    const size = 'width="14" height="14" viewBox="0 0 16 16" fill="currentColor"';

    if (isDir) {
        return `<svg ${size} style="color: #dcb67a;"><path d="M14.5 3H7.707L6.354 1.646A.5.5 0 006 1.5H1.5A.5.5 0 001 2v12a.5.5 0 00.5.5h13a.5.5 0 00.5-.5V3.5a.5.5 0 00-.5-.5zM2 2h4.293l1.354 1.354a.5.5 0 00.353.146H14v10H2V2z"/></svg>`;
    }

    if (!extension) {
        return `<svg ${size} style="color: #cccccc;"><path d="M4 0h5.293A1 1 0 0110 1.293L13.707 5a1 1 0 01.293.707V14a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2zm5.5 1.5v2h2l-2-2z"/></svg>`;
    }

    const icons = {
        'txt': `<svg ${size} style="color: #cccccc;"><path d="M4 0h5.293A1 1 0 0110 1.293L13.707 5a1 1 0 01.293.707V14a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2zm5.5 1.5v2h2l-2-2z"/></svg>`,
        'md': `<svg ${size} style="color: #519aba;"><path d="M4 0h5.293A1 1 0 0110 1.293L13.707 5a1 1 0 01.293.707V14a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2zm5.5 1.5v2h2l-2-2zM3 5v9a1 1 0 001 1h8a1 1 0 001-1V5H3z"/></svg>`,
        'js': `<svg ${size} style="color: #f1dd3f;"><path d="M0 0v16h16V0H0zm10.1 12.5c-.6.9-1.5 1.2-2.6 1.2-2.2 0-3.4-1.5-3.4-3.8h1.5c.1 1.4.7 2.3 1.9 2.3.7 0 1.2-.4 1.2-1.1 0-.7-.5-1-1.6-1.3l-.6-.2c-1.4-.4-2.2-1.2-2.2-2.4 0-1.5 1.3-2.7 3.1-2.7 1.8 0 2.9 1.1 3 2.9h-1.5c-.1-1.1-.6-1.7-1.5-1.7-.6 0-1.1.4-1.1.9 0 .6.4.9 1.4 1.2l.7.2c1.5.5 2.3 1.2 2.3 2.6 0 1.7-1.4 2.9-3.2 2.9z"/></svg>`,
        'go': `<svg ${size} style="color: #00add8;"><path d="M2.3 2.3L8 8l-5.7 5.7L1 12l4-4-4-4 1.3-1.3zm8 0L16 8l-5.7 5.7L9.3 12l4-4-4-4 1.3-1.3z"/></svg>`,
        'py': `<svg ${size} style="color: #ffde57;"><path d="M7 2.5c-.3 0-.5.2-.5.5v2c0 .3.2.5.5.5h2c.3 0 .5-.2.5-.5V3c0-.3-.2-.5-.5-.5H7zm1 1h1v1H8v-1zM3 5c-.6 0-1 .4-1 1v4c0 .6.4 1 1 1h10c.6 0 1-.4 1-1V6c0-.6-.4-1-1-1H3zm2 2h6v2H5V7z"/></svg>`,
        'java': `<svg ${size} style="color: #f89820;"><path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm-1-9h2v4h2l-3 3-3-3h2V5z"/></svg>`,
        'cpp': `<svg ${size} style="color: #00599c;"><path d="M0 8l2.5-2v4L0 8zm5-3l3 3-3 3V5zm5 0l3 3-3 3V5zm-7 1.5L9 8l-6 1.5V6.5z"/></svg>`,
        'c': `<svg ${size} style="color: #555555;"><path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm0 12c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm-1-8h2v6H7V5z"/></svg>`,
        'html': `<svg ${size} style="color: #e34c26;"><path d="M1 0l1.3 14.4L8 16l5.7-1.6L15 0H1zm11.5 4.7L8 13.4l-4.5-8.7H3l5 9 5-9h1.5z"/></svg>`,
        'css': `<svg ${size} style="color: #563d7c;"><path d="M1 0l1.3 14.4L8 16l5.7-1.6L15 0H1zm10 4H5l.3 3h5.4l-.3 3.3L8 11l-2.4-.7L5.3 9H3l.3 3 4.7 1.3 4.7-1.3.6-6H3l-.2-2h12.2z"/></svg>`,
        'json': `<svg ${size} style="color: #f1dd3f;"><path d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h1a.5.5 0 000-1H4a1 1 0 01-1-1V4a1 1 0 011-1h1a.5.5 0 000-1H4zm7 0a.5.5 0 000 1h1a1 1 0 011 1v8a1 1 0 01-1 1h-1a.5.5 0 000 1h1a2 2 0 002-2V4a2 2 0 00-2-2h-1zM6 7.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zm0 2a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z"/></svg>`,
        'xml': `<svg ${size} style="color: #0060ac;"><path d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h1a.5.5 0 000-1H4a1 1 0 01-1-1V4a1 1 0 011-1h1a.5.5 0 000-1H4zm7 0a.5.5 0 000 1h1a1 1 0 011 1v8a1 1 0 01-1 1h-1a.5.5 0 000 1h1a2 2 0 002-2V4a2 2 0 00-2-2h-1z"/></svg>`,
        'pdf': `<svg ${size} style="color: #f40f02;"><path d="M4 0h5.293A1 1 0 0110 1.293L13.707 5a1 1 0 01.293.707V14a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2zm5.5 1.5v2h2l-2-2zM4 4h2v2H4V4zm0 3h8v1H4V7zm0 2h8v1H4V9z"/></svg>`,
        'zip': `<svg ${size} style="color: #a074c4;"><path d="M10 0H4a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4l-4-4zm-1 2v2h2l-2-2zM4 9h2v2H4V9zm0 3h2v2H4v-2z"/></svg>`,
        'tar': `<svg ${size} style="color: #a074c4;"><path d="M10 0H4a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4l-4-4zm-1 2v2h2l-2-2zM4 5h2v2H4V5zm0 3h2v2H4V8zm0 3h2v2H4v-2zm3-6h2v2H7V5zm0 3h2v2H7V8zm0 3h2v2H7v-2z"/></svg>`,
        'gz': `<svg ${size} style="color: #a074c4;"><path d="M10 0H4a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4l-4-4zm-1 2v2h2l-2-2zM4 5h8v1H4V5zm0 3h8v1H4V8zm0 3h5v1H4v-1z"/></svg>`,
        'jpg': `<svg ${size} style="color: #a074c4;"><path d="M1 2a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V2zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1H3zm2 3a1 1 0 100 2 1 1 0 000-2zm0 3l2 3 2-2 2 3H5v-4z"/></svg>`,
        'jpeg': `<svg ${size} style="color: #a074c4;"><path d="M1 2a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V2zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1H3zm2 3a1 1 0 100 2 1 1 0 000-2zm0 3l2 3 2-2 2 3H5v-4z"/></svg>`,
        'png': `<svg ${size} style="color: #a074c4;"><path d="M1 2a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V2zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1H3zm2 3a1 1 0 100 2 1 1 0 000-2zm0 3l2 3 2-2 2 3H5v-4z"/></svg>`,
        'gif': `<svg ${size} style="color: #a074c4;"><path d="M1 2a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V2zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1H3zm2 3a1 1 0 100 2 1 1 0 000-2zm0 3l2 3 2-2 2 3H5v-4z"/></svg>`,
        'mp3': `<svg ${size} style="color: #41b883;"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 13A6 6 0 118 2a6 6 0 010 12zm-.5-8v4.3c-.2-.1-.4-.2-.6-.2-.8 0-1.5.7-1.5 1.5S6.1 13 7 13s1.5-.7 1.5-1.5V6h2V5H8.5v1z"/></svg>`,
        'mp4': `<svg ${size} style="color: #41b883;"><path d="M2 2a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V2zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V2a1 1 0 00-1-1H4zm5.5 4.5l-3 2v-4l3 2z"/></svg>`,
        'mov': `<svg ${size} style="color: #41b883;"><path d="M2 2a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V2zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V2a1 1 0 00-1-1H4zm5.5 4.5l-3 2v-4l3 2z"/></svg>`,
        'log': `<svg ${size} style="color: #888888;"><path d="M4 0h5.293A1 1 0 0110 1.293L13.707 5a1 1 0 01.293.707V14a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2zm5.5 1.5v2h2l-2-2zM4 5h2v2H4V5zm0 3h8v1H4V8zm0 2h6v1H4v-1z"/></svg>`,
    };

    return icons[extension.toLowerCase()] || `<svg ${size} style="color: #cccccc;"><path d="M4 0h5.293A1 1 0 0110 1.293L13.707 5a1 1 0 01.293.707V14a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2zm5.5 1.5v2h2l-2-2z"/></svg>`;
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

// 加载根目录列表
async function loadRoots() {
    try {
        const response = await fetch('/api/roots');
        if (!response.ok) {
            throw new Error('Failed to load roots');
        }
        rootDirs = await response.json();
        updateRootSelect();
    } catch (error) {
        console.error('加载根目录失败:', error);
    }
}

// 更新根目录选择器
function updateRootSelect() {
    // 重新获取元素引用
    const rootSelectEl = document.getElementById('rootSelect');
    if (!rootSelectEl) return;

    // 清空现有选项
    rootSelectEl.innerHTML = '';

    rootDirs.forEach((root, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = root.name;
        rootSelectEl.appendChild(option);
    });

    // 设置当前选中的根目录
    rootSelectEl.value = currentRootIndex;
}

// 更新面包屑导航
function updateBreadcrumb(path) {
    const parts = path.split('/').filter(p => p);
    let html = `<span class="breadcrumb-item" title="根目录">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle;">
            <path d="M8.354 1.146a.5.5 0 00-.708 0l-6 6A.5.5 0 001.5 7.5v7a.5.5 0 00.5.5h4.5a.5.5 0 00.5-.5v-4h1v4a.5.5 0 00.5.5h4.5a.5.5 0 00.5-.5v-7a.5.5 0 00-.146-.354z"/>
        </svg>
        根目录
    </span>`;

    parts.forEach((part, index) => {
        html += '<span class="breadcrumb-separator">/</span>';
        html += `<span class="breadcrumb-item">${part}</span>`;
    });

    breadcrumb.innerHTML = html;

    // 添加点击事件
    const items = breadcrumb.querySelectorAll('.breadcrumb-item');
    items.forEach((item, index) => {
        item.addEventListener('click', () => {
            // 根据索引重建路径
            if (index === 0) {
                loadDirectory('/');
            } else {
                const clickedPath = '/' + parts.slice(0, index).join('/');
                loadDirectory(clickedPath);
            }
        });
    });
}

// 加载目录内容
async function loadDirectory(path, rootIndex = currentRootIndex, hideContent = true) {
    try {
        showLoading();
        // 规范化路径
        path = normalizePath(path);

        const response = await fetch(`/api/list?path=${encodeURIComponent(path)}&root=${rootIndex}`);

        if (!response.ok) {
            throw new Error('Failed to load directory');
        }

        const files = await response.json();
        currentPath = path;
        currentRootIndex = rootIndex;
        renderFileList(files);
        updateBreadcrumb(path);

        // 更新根目录选择器
        rootSelect.value = currentRootIndex;

        // 根据参数决定是否隐藏文件内容视图
        if (hideContent) {
            document.getElementById('contentView').style.display = 'none';
        }
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 渲染文件列表
function renderFileList(files) {
    // 检查 files 是否为 null 或 undefined
    if (!files || files.length === 0) {
        fileList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M14.5 3H7.707L6.354 1.646A.5.5 0 006 1.5H1.5A.5.5 0 001 2v12a.5.5 0 00.5.5h13a.5.5 0 00.5-.5V3.5a.5.5 0 00-.5-.5zM2 2h4.293l1.354 1.354a.5.5 0 00.353.146H14v10H2V2z"/>
                    </svg>
                </div>
                <div class="empty-state-text">此文件夹为空</div>
            </div>
        `;
        return;
    }

    // 排序：文件夹在前（按名称排序），文件在后（按修改时间降序）
    files.sort((a, b) => {
        // 文件夹和文件分开
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;

        // 文件夹：按名称排序
        if (a.isDir && b.isDir) {
            return a.name.localeCompare(b.name);
        }

        // 文件：按修改时间降序（最新的在前）
        const timeA = new Date(a.modTime).getTime();
        const timeB = new Date(b.modTime).getTime();
        return timeB - timeA;
    });

    let html = `
        <div class="file-header">
            <div></div>
            <div>名称</div>
            <div class="file-actions-header">操作</div>
        </div>
    `;

    files.forEach(file => {
        const actionButtons = file.isDir ? '' : `
            <button class="btn-small btn-delete-list btn-action" data-path="${file.path}" data-action="delete" title="删除">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f48771;">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            </button>
        `;

        html += `
            <div class="file-item" data-path="${file.path}" data-is-dir="${file.isDir}">
                <div class="file-icon">${getFileIcon(file.isDir, file.extension)}</div>
                <div class="file-name-cell">${file.name}</div>
                <div class="file-actions">${actionButtons}</div>
            </div>
        `;
    });

    fileList.innerHTML = html;

    // 添加文件项点击事件
    document.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.getAttribute('data-path');
            const isDir = item.getAttribute('data-is-dir') === 'true';
            const extension = path.split('.').pop().toLowerCase();

            if (isDir) {
                loadDirectory(path);
            } else if (isTextFile(extension)) {
                // 文本文件：查看内容
                viewFile(path);
            } else {
                // 非文本文件：直接下载
                downloadFile(path);
            }
        });
    });

    // 添加操作按钮点击事件
    document.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡，避免触发文件项点击
            const path = btn.getAttribute('data-path');
            const action = btn.getAttribute('data-action');

            if (action === 'delete') {
                deleteFileFromList(path);
            }
        });
    });
}

// 下载文件
function downloadFile(path) {
    // 规范化路径
    path = normalizePath(path);
    // 创建下载链接
    const downloadUrl = `/api/download?path=${encodeURIComponent(path)}&root=${currentRootIndex}`;
    // 创建隐藏的 a 标签并点击
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = path.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 查看文件内容
async function viewFile(path, page = 1) {
    try {
        showLoading();
        // 规范化路径
        path = normalizePath(path);
        currentFilePath = path; // 保存当前文件路径

        // 从文件路径中提取目录路径，保存到 currentPath
        const pathParts = path.split('/');
        pathParts.pop(); // 移除文件名
        currentPath = pathParts.join('/') || '/';

        // 更新面包屑导航
        updateBreadcrumb(currentPath);

        const url = `/api/view?path=${encodeURIComponent(path)}&page=${page}&root=${currentRootIndex}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to load file');
        }

        const data = await response.json();
        currentPage = data.page;
        totalPages = data.totalPages;

        // 保存文件内容用于编辑
        currentFileContent = data.lines;

        // 检查是否是JSON文件
        isJsonFile = path.toLowerCase().endsWith('.json');

        renderFileContent(data);
        showContentView();

        // 同时加载文件列表（如果尚未加载）
        if (fileList.innerHTML === '' || fileList.children.length === 0) {
            loadDirectory(currentPath, currentRootIndex, false); // false = 不隐藏文件内容
        }
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 查看文件并滚动到指定行
async function viewFileAndScroll(path, page, lineNumber) {
    try {
        showLoading();
        currentFilePath = path;

        // 从文件路径中提取目录路径，保存到 currentPath
        const pathParts = path.split('/');
        pathParts.pop(); // 移除文件名
        currentPath = pathParts.join('/') || '/';

        // 更新面包屑导航
        updateBreadcrumb(currentPath);

        const url = `/api/view?path=${encodeURIComponent(path)}&page=${page}&root=${currentRootIndex}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to load file');
        }

        const data = await response.json();
        currentPage = data.page;
        totalPages = data.totalPages;

        renderFileContent(data);
        showContentView();

        // 等待 DOM 更新后滚动到指定行
        // 使用 requestAnimationFrame 确保 DOM 完全渲染
        requestAnimationFrame(() => {
            setTimeout(() => {
                scrollToLine(lineNumber);
            }, 50);
        });
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 滚动到指定行并高亮显示
function scrollToLine(lineNumber) {
    const lineElement = fileContent.querySelector(`[data-line-number="${lineNumber}"]`);
    if (!lineElement) {
        console.warn(`Line ${lineNumber} not found in DOM`);
        return;
    }

    // 移除之前的高亮
    fileContent.querySelectorAll('.line-highlight').forEach(el => {
        el.classList.remove('line-highlight');
    });

    // 添加高亮
    lineElement.classList.add('line-highlight');

    // 计算滚动位置：目标行前面显示5行，即从顶部开始第6行位置
    const container = fileContent.parentElement;
    const lineTop = lineElement.offsetTop;
    const lineHeight = lineElement.clientHeight;

    // 获取第一行的位置作为基准
    const firstLine = fileContent.querySelector('.file-line');
    const firstLineTop = firstLine ? firstLine.offsetTop : 0;

    // 计算目标行相对于第一行的距离
    const relativeTop = lineTop - firstLineTop;

    // 设置滚动位置，使目标行前面正好显示5行
    // 即：目标行位置 - 5行的高度
    const scrollTop = relativeTop - (5 * lineHeight);

    // 确保不会滚动到负数
    container.scrollTop = Math.max(0, scrollTop);

    // 3秒后移除高亮
    setTimeout(() => {
        lineElement.classList.remove('line-highlight');
    }, 3000);
}

// 渲染文件内容
function renderFileContent(data) {
    fileName.textContent = data.name;
    fileInfo.textContent = `${formatSize(data.size)} • ${data.totalLines.toLocaleString()} 行`;

    if (data.isPartial) {
        fileInfo.textContent += ` • 第 ${data.page}/${data.totalPages} 页`;
    }

    // 显示内容并标记行号（只读模式）
    const linesHtml = data.lines.map((line, index) => {
        const lineNum = (data.page - 1) * LinesPerPage + index + 1;
        return `<div class="file-line" data-line-number="${lineNum}">${escapeHtml(line)}</div>`;
    }).join('');

    fileContent.innerHTML = linesHtml;
    fileContent.style.display = 'block';
    fileEditor.style.display = 'none';

    // 显示编辑按钮（只对文本文件显示）
    const editFileBtn = document.getElementById('editFileBtn');
    const advancedEditBtn = document.getElementById('advancedEditBtn');
    if (editFileBtn && advancedEditBtn) {
        const extension = currentFilePath.split('.').pop().toLowerCase();
        if (isTextFile(extension)) {
            editFileBtn.style.display = 'inline-flex';
            // 如果是JSON文件，显示高级编辑按钮
            if (extension === 'json') {
                advancedEditBtn.style.display = 'inline-flex';
            } else {
                advancedEditBtn.style.display = 'none';
            }
        } else {
            editFileBtn.style.display = 'none';
            advancedEditBtn.style.display = 'none';
        }
    }

    // 如果是分页内容，显示分页控件
    if (data.isPartial) {
        renderPagination(currentFilePath, data.page, data.totalPages);
        pagination.style.display = 'flex';
    } else {
        pagination.style.display = 'none';
    }
}

// 渲染分页控件
function renderPagination(path, page, totalPages) {
    const createButton = (text, newPage, disabled = false) => {
        if (disabled) {
            return `<button class="btn btn-secondary" disabled>${text}</button>`;
        }
        // 使用 data 属性存储路径、页码和根目录索引，避免特殊字符问题
        return `<button class="btn btn-secondary pagination-btn" data-path="${escapeHtml(path)}" data-page="${newPage}" data-root="${currentRootIndex}">${text}</button>`;
    };

    let html = createButton('« 首页', 1, page === 1);
    html += createButton('‹ 上一页', page - 1, page === 1);
    html += `<span class="pagination-info">第 ${page} / ${totalPages} 页</span>`;
    html += createButton('下一页 ›', page + 1, page === totalPages);
    html += createButton('末页 »', totalPages, page === totalPages);

    pagination.innerHTML = html;

    // 添加分页按钮事件监听
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filePath = btn.getAttribute('data-path');
            const newPage = parseInt(btn.getAttribute('data-page'));
            const rootIndex = parseInt(btn.getAttribute('data-root'));
            currentRootIndex = rootIndex;
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

// 返回列表视图
function showListView() {
    // 隐藏文件内容视图
    document.getElementById('contentView').style.display = 'none';
    searchResults.style.display = 'none';
    searchNav.style.display = 'none';
    searchInput.value = ''; // 清空搜索框
    currentSearchResults = []; // 清空搜索结果
    currentSearchIndex = -1;

    // 侧边栏保持显示
    // 加载目录内容
    loadDirectory(currentPath);
}

// 显示内容视图
function showContentView() {
    // 显示文件内容视图
    document.getElementById('contentView').style.display = 'flex';
}

// 事件监听
document.getElementById('refreshBtn').addEventListener('click', () => {
    loadDirectory(currentPath);
});

document.getElementById('upBtn').addEventListener('click', () => {
    // 规范化路径
    let normalizedPath = normalizePath(currentPath);

    // 如果已经是根目录，不执行操作
    if (normalizedPath === '/') {
        return;
    }

    // 获取父目录路径
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) || '/';
    loadDirectory(parentPath);
});

document.getElementById('createFileBtn').addEventListener('click', () => {
    createNewFile();
});

document.getElementById('createDirBtn').addEventListener('click', () => {
    createNewDir();
});

// 上传文件功能
document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        uploadFiles(files);
    }
    // 清空input，允许重复选择同一文件
    e.target.value = '';
});

// 搜索功能
searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query && currentFilePath) {
        searchFile(currentFilePath, query);
    }
});

// 支持回车键搜索
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query && currentFilePath) {
            searchFile(currentFilePath, query);
        }
    }
});

// 搜索导航按钮
prevResultBtn.addEventListener('click', prevSearchResult);
nextResultBtn.addEventListener('click', nextSearchResult);

// 搜索文件内容
async function searchFile(path, query) {
    try {
        showLoading();
        const url = `/api/search?path=${encodeURIComponent(path)}&q=${encodeURIComponent(query)}&root=${currentRootIndex}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('搜索失败');
        }

        const results = await response.json();
        currentSearchResults = results;
        currentSearchIndex = -1;
        renderSearchResults(results, query);

        // 自动跳转到第一个结果
        if (results && results.length > 0) {
            goToSearchResult(0);
        }
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 渲染搜索结果
function renderSearchResults(results, query) {
    if (!results || results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">未找到匹配的结果</div>';
        searchResults.style.display = 'block';
        searchNav.style.display = 'none';
        return;
    }

    let html = `<div class="search-results-header">找到 ${results.length} 个结果</div>`;

    results.forEach((result, index) => {
        // 高亮匹配的文本
        const highlightedLine = highlightText(result.line, query);

        // 只有多页文件才显示页码
        const pageInfo = totalPages > 1 ? `<span class="search-result-page">第 ${result.page} 页</span>` : '';

        html += `
            <div class="search-result-item ${index === currentSearchIndex ? 'search-result-active' : ''}"
                 data-page="${result.page}"
                 data-line="${result.lineNumber}"
                 data-index="${index}">
                <div>
                    <span class="search-result-line-number">行 ${result.lineNumber}</span>
                    ${pageInfo}
                </div>
                <div class="search-result-content">${highlightedLine}</div>
            </div>
        `;
    });

    searchResults.innerHTML = html;
    searchResults.style.display = 'block';

    // 显示导航按钮
    searchNav.style.display = 'flex';
    updateSearchNavInfo();

    // 添加点击事件
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.getAttribute('data-index'));
            goToSearchResult(index);
        });
    });
}

// 跳转到指定的搜索结果
function goToSearchResult(index) {
    if (index < 0 || index >= currentSearchResults.length) return;

    currentSearchIndex = index;
    const result = currentSearchResults[index];

    // 更新高亮状态
    document.querySelectorAll('.search-result-item').forEach((item, i) => {
        if (i === index) {
            item.classList.add('search-result-active');
        } else {
            item.classList.remove('search-result-active');
        }
    });

    // 更新导航信息
    updateSearchNavInfo();

    // 判断搜索结果是否在当前页面
    if (result.page === currentPage) {
        // 在当前页面，直接滚动到目标行，无需重新加载
        scrollToLine(result.lineNumber);
    } else {
        // 不在当前页面，需要加载新页面
        viewFileAndScroll(currentFilePath, result.page, result.lineNumber);
    }
}

// 更新搜索导航信息
function updateSearchNavInfo() {
    if (currentSearchResults.length === 0) {
        searchNavInfo.textContent = '0/0';
        prevResultBtn.disabled = true;
        nextResultBtn.disabled = true;
        return;
    }

    searchNavInfo.textContent = `${currentSearchIndex + 1}/${currentSearchResults.length}`;
    prevResultBtn.disabled = currentSearchIndex <= 0;
    nextResultBtn.disabled = currentSearchIndex >= currentSearchResults.length - 1;
}

// 上一个搜索结果
function prevSearchResult() {
    if (currentSearchIndex > 0) {
        goToSearchResult(currentSearchIndex - 1);
    }
}

// 下一个搜索结果
function nextSearchResult() {
    if (currentSearchIndex < currentSearchResults.length - 1) {
        goToSearchResult(currentSearchIndex + 1);
    }
}

// 高亮搜索文本
function highlightText(text, query) {
    const escapedText = escapeHtml(text);
    const escapedQuery = escapeHtml(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escapedText.replace(regex, '<span class="search-highlight">$1</span>');
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (contentView.style.display !== 'none') {
        // 文件内容视图下的快捷键
        if (e.key === 'Escape') {
            // 如果正在编辑，先关闭编辑器
            const modal = document.getElementById('editModal');
            if (modal && modal.style.display !== 'none') {
                closeEditModal();
            } else {
                showListView();
            }
        } else if (e.key === 'ArrowLeft' && currentPage > 1) {
            if (currentFilePath) viewFile(currentFilePath, currentPage - 1);
        } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
            if (currentFilePath) viewFile(currentFilePath, currentPage + 1);
        }
    }
});

// 编辑文件（从列表）
async function editFile(path) {
    try {
        showLoading();
        // 规范化路径
        path = normalizePath(path);

        // 加载完整文件内容
        const url = `/api/view?path=${encodeURIComponent(path)}&root=${currentRootIndex}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to load file');
        }

        const data = await response.json();
        const fullContent = data.lines.join('\n');

        const modal = document.createElement('div');
        modal.id = 'editModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>编辑文件: ${escapeHtml(data.name)}</h3>
                    <button class="modal-close" onclick="closeEditModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <textarea id="editTextarea" class="edit-textarea" style="min-height: 500px;">${escapeHtml(fullContent)}</textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeEditModal()">取消</button>
                    <button class="btn btn-primary" onclick="saveFileEdit('${path}')">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // 自动聚焦到文本框
        document.getElementById('editTextarea').focus();
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 关闭编辑模态框
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.remove();
    }
}

// 保存文件编辑
async function saveFileEdit(path) {
    const textarea = document.getElementById('editTextarea');
    const newContent = textarea.value;

    // 保存到服务器
    try {
        showLoading();
        const response = await fetch(`/api/save?root=${currentRootIndex}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: path,
                content: newContent,
            }),
        });

        if (!response.ok) {
            throw new Error('保存失败');
        }

        const result = await response.json();
        alert(result.message);
        closeEditModal();

        // 重新加载目录列表
        await loadDirectory(currentPath);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 删除文件（从列表）
async function deleteFileFromList(path) {
    // 规范化路径
    path = normalizePath(path);

    if (!confirm('确定要删除文件 "' + path.split('/').pop() + '" 吗？此操作不可撤销！')) {
        return;
    }

    try {
        showLoading();
        const response = await fetch(`/api/delete?path=${encodeURIComponent(path)}&root=${currentRootIndex}`);

        if (!response.ok) {
            throw new Error('删除失败');
        }

        const result = await response.json();
        alert(result.message);

        // 重新加载目录列表
        await loadDirectory(currentPath);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 高级编辑文件（JSON文件）
async function advancedEditFile(path) {
    try {
        showLoading();
        // 规范化路径
        path = normalizePath(path);

        // 加载完整文件内容
        const url = `/api/view?path=${encodeURIComponent(path)}&root=${currentRootIndex}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to load file');
        }

        const data = await response.json();
        const fullContent = data.lines.join('\n');

        // 验证文件内容不为空
        if (!fullContent || fullContent.trim() === '') {
            throw new Error('JSON文件为空');
        }

        // 尝试解析JSON
        let jsonData;
        try {
            jsonData = JSON.parse(fullContent);
        } catch (parseError) {
            throw new Error('无效的JSON格式: ' + parseError.message);
        }

        currentFilePath = path;

        const modal = document.createElement('div');
        modal.id = 'advancedEditModal';
        modal.className = 'modal modal-large';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>JSON 高级编辑器: ${escapeHtml(data.name)}</h3>
                    <button class="modal-close" onclick="closeAdvancedEditModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="jsonEditor"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeAdvancedEditModal()">取消</button>
                    <button class="btn btn-primary" onclick="saveAdvancedEdit()">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // 渲染 JSON 编辑器
        renderJsonEditor(jsonData, document.getElementById('jsonEditor'));
    } catch (error) {
        showError('无法打开JSON高级编辑器: ' + error.message);
    } finally {
        hideLoading();
    }
}

// 渲染 JSON 编辑器
function renderJsonEditor(data, container, path = '') {
    container.innerHTML = '';

    if (typeof data === 'object' && data !== null) {
        if (Array.isArray(data)) {
            // 数组类型
            data.forEach((item, index) => {
                const itemPath = path ? `${path}[${index}]` : `[${index}]`;
                renderJsonItem(item, container, itemPath, index);
            });
            // 添加新项按钮
            const addBtn = document.createElement('button');
            addBtn.className = 'btn btn-secondary btn-add-field';
            addBtn.textContent = '+ 添加项';
            addBtn.onclick = () => addJsonArrayItem(data, path);
            container.appendChild(addBtn);
        } else {
            // 对象类型
            Object.keys(data).forEach((key) => {
                const itemPath = path ? `${path}.${key}` : key;
                renderJsonItem(data[key], container, itemPath, key);
            });
            // 添加新字段按钮
            const addBtn = document.createElement('button');
            addBtn.className = 'btn btn-secondary btn-add-field';
            addBtn.textContent = '+ 添加字段';
            addBtn.onclick = () => addJsonObjectField(data, path);
            container.appendChild(addBtn);
        }
    }
}

// 渲染 JSON 项
function renderJsonItem(value, container, path, key) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'json-item';
    itemDiv.dataset.path = path;

    const isNested = typeof value === 'object' && value !== null;

    itemDiv.innerHTML = `
        <div class="json-item-header">
            <span class="json-item-key">${escapeHtml(key.toString())}</span>
            <span class="json-item-type">${getJsonType(value)}</span>
            ${!isNested ? `<button class="btn btn-small btn-delete-field" onclick="deleteJsonField('${path}')">删除</button>` : ''}
        </div>
        ${isNested ? '<div class="json-item-children"></div>' : `<div class="json-item-value"><input type="text" class="json-value-input" value="${escapeHtml(value.toString())}" data-path="${path}"></div>`}
    `;

    container.appendChild(itemDiv);

    if (isNested) {
        const childrenContainer = itemDiv.querySelector('.json-item-children');
        renderJsonEditor(value, childrenContainer, path);
    }
}

// 获取 JSON 类型
function getJsonType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

// 添加 JSON 对象字段
function addJsonObjectField(data, path) {
    const key = prompt('请输入新字段名称:');
    if (!key) return;

    if (key in data) {
        alert('字段已存在');
        return;
    }

    const defaultValue = prompt('请输入字段值（支持JSON格式）:');
    if (defaultValue === null) return;

    try {
        data[key] = JSON.parse(defaultValue);
    } catch {
        data[key] = defaultValue;
    }

    // 重新渲染编辑器
    const container = document.getElementById('jsonEditor');
    renderJsonEditor(data, container, path);
}

// 添加 JSON 数组项
function addJsonArrayItem(data, path) {
    const value = prompt('请输入新项的值（支持JSON格式）:');
    if (value === null) return;

    try {
        data.push(JSON.parse(value));
    } catch {
        data.push(value);
    }

    // 重新渲染编辑器
    const container = document.getElementById('jsonEditor');
    renderJsonEditor(data, container, path);
}

// 删除 JSON 字段
function deleteJsonField(path) {
    if (!confirm(`确定要删除字段 "${path}" 吗？`)) {
        return;
    }

    // 从路径中获取并删除字段
    const fullContent = currentFileContent.join('\n');

    // 验证JSON格式
    let jsonData;
    try {
        jsonData = JSON.parse(fullContent);
    } catch (parseError) {
        showError('无法删除字段：无效的JSON格式 - ' + parseError.message);
        return;
    }

    const parts = path.split(/\[|\]|\./).filter(p => p);
    let current = jsonData;

    for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
    }

    delete current[parts[parts.length - 1]];

    // 重新渲染编辑器
    const container = document.getElementById('jsonEditor');
    renderJsonEditor(jsonData, container, '');
}

// 关闭高级编辑模态框
function closeAdvancedEditModal() {
    const modal = document.getElementById('advancedEditModal');
    if (modal) {
        modal.remove();
    }
}

// 保存高级编辑
async function saveAdvancedEdit() {
    try {
        showLoading();

        // 从原始文件内容中解析JSON数据作为基础
        const fullContent = currentFileContent.join('\n');

        // 尝试解析原始JSON数据
        let jsonData;
        if (!fullContent || fullContent.trim() === '') {
            // 文件为空，从编辑器重新构建数据结构
            jsonData = buildJsonFromEditor();
            if (!jsonData) {
                jsonData = {}; // 默认创建空对象
            }
        } else {
            // 验证JSON格式
            try {
                jsonData = JSON.parse(fullContent);
            } catch (parseError) {
                throw new Error('无效的JSON格式: ' + parseError.message);
            }

            // 创建一个映射来跟踪哪些值被修改了
            const modifiedValues = {};

            // 收集所有输入的值
            document.querySelectorAll('.json-value-input').forEach(input => {
                const path = input.dataset.path;
                const value = input.value;

                // 尝试解析为JSON，如果失败则作为字符串
                try {
                    const parsed = JSON.parse(value);
                    setJsonByPath(modifiedValues, path, parsed);
                } catch {
                    setJsonByPath(modifiedValues, path, value);
                }
            });

            // 将修改的值合并到原始数据中
            mergeJsonValues(jsonData, modifiedValues);
        }

        // 保存到服务器
        const newContent = JSON.stringify(jsonData, null, 2);

        const response = await fetch(`/api/save?root=${currentRootIndex}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: currentFilePath,
                content: newContent,
            }),
        });

        if (!response.ok) {
            throw new Error('保存失败');
        }

        const result = await response.json();
        alert(result.message);
        closeAdvancedEditModal();

        // 重新加载目录列表
        await loadDirectory(currentPath);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 根据路径设置 JSON 值
function setJsonByPath(obj, path, value) {
    const parts = path.split(/\[|\]|\./).filter(p => p);
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) {
            // 如果下一部分是数字，创建数组，否则创建对象
            const nextPart = parts[i + 1];
            current[parts[i]] = !isNaN(parseInt(nextPart)) ? [] : {};
        }
        current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
}

// 从编辑器 DOM 构建完整的 JSON 数据
function buildJsonFromEditor() {
    const editor = document.getElementById('jsonEditor');
    if (!editor) return null;

    const result = {};

    // 遍历所有输入框并构建 JSON 结构
    document.querySelectorAll('.json-value-input').forEach(input => {
        const path = input.dataset.path;
        const value = input.value;

        // 尝试解析为JSON，如果失败则作为字符串
        let parsedValue;
        try {
            parsedValue = JSON.parse(value);
        } catch {
            parsedValue = value;
        }

        setJsonByPath(result, path, parsedValue);
    });

    return result;
}

// 合并修改的值到原始JSON数据
function mergeJsonValues(target, source) {
    for (const path in source) {
        setJsonByPath(target, path, source[path]);
    }
}

// 创建新文件
function createNewFile() {
    const fileName = prompt('请输入文件名:');
    if (!fileName) return;
    if (fileName.includes('/') || fileName.includes('\\')) {
        showError('文件名不能包含路径分隔符');
        return;
    }
    createItem('file', fileName);
}

// 创建新文件夹
function createNewDir() {
    const dirName = prompt('请输入文件夹名:');
    if (!dirName) return;
    if (dirName.includes('/') || dirName.includes('\\')) {
        showError('文件夹名不能包含路径分隔符');
        return;
    }
    createItem('dir', dirName);
}

// 创建文件或文件夹
async function createItem(type, name) {
    try {
        showLoading();
        const apiUrl = type === 'file' ? '/api/create' : '/api/createDir';
        const response = await fetch(`${apiUrl}?root=${currentRootIndex}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: currentPath,
                name: name,
            }),
        });

        if (!response.ok) {
            if (response.status === 409) {
                throw new Error(type === 'file' ? '文件已存在' : '文件夹已存在');
            }
            throw new Error('创建失败');
        }

        const result = await response.json();
        alert(result.message);

        // 重新加载目录列表
        await loadDirectory(currentPath);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 上传文件
async function uploadFiles(files) {
    const uploadProgress = document.getElementById('uploadProgress');
    uploadProgress.style.display = 'block';
    uploadProgress.innerHTML = '';

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progressId = `upload-progress-${i}`;

        // 创建进度条
        const progressItem = document.createElement('div');
        progressItem.className = 'upload-progress-item';
        progressItem.innerHTML = `
            <div class="upload-progress-name">${escapeHtml(file.name)}</div>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" id="${progressId}" style="width: 0%"></div>
                <div class="upload-progress-text" id="${progressId}-text">0%</div>
            </div>
        `;
        uploadProgress.appendChild(progressItem);

        try {
            await uploadSingleFile(file, progressId, progressId + '-text');
            successCount++;

            // 标记完成
            document.getElementById(progressId).parentElement.parentElement.classList.add('upload-progress-complete');
        } catch (error) {
            failCount++;
            showError(`${file.name} 上传失败: ${error.message}`);
            document.getElementById(progressId).style.background = '#e74c3c';
        }
    }

    // 上传完成后显示总结
    setTimeout(() => {
        if (successCount > 0 && failCount === 0) {
            alert(`成功上传 ${successCount} 个文件`);
        } else if (successCount > 0 || failCount > 0) {
            alert(`上传完成：成功 ${successCount} 个，失败 ${failCount} 个`);
        }

        // 隐藏进度条并重新加载目录
        uploadProgress.style.display = 'none';
        loadDirectory(currentPath);
    }, 1000);
}

// 上传单个文件
async function uploadSingleFile(file, progressId, textId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentPath);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                const progressBar = document.getElementById(progressId);
                const progressText = document.getElementById(textId);

                if (progressBar) {
                    progressBar.style.width = percentComplete + '%';
                }
                if (progressText) {
                    progressText.textContent = percentComplete + '%';
                }
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                resolve();
            } else if (xhr.status === 409) {
                reject(new Error('文件已存在'));
            } else {
                reject(new Error('上传失败'));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('网络错误'));
        });

        xhr.open('POST', `/api/upload?root=${currentRootIndex}`);
        xhr.send(formData);
    });
}

// 初始化
window.onload = function() {
    // 添加侧边栏切换功能
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // 添加侧边栏拖动调整宽度功能
    const resizeHandle = document.getElementById('sidebarResizeHandle');
    let isResizing = false;

    if (resizeHandle && sidebar) {
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            resizeHandle.classList.add('active');
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const newWidth = e.clientX;
            // 限制最小和最大宽度
            if (newWidth >= 200 && newWidth <= 600) {
                sidebar.style.width = newWidth + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizeHandle.classList.remove('active');
            }
        });
    }

    // 编辑按钮事件
    const editFileBtn = document.getElementById('editFileBtn');
    const saveFileBtn = document.getElementById('saveFileBtn');
    const fileEditor = document.getElementById('fileEditor');
    let isEditMode = false;

    if (editFileBtn && saveFileBtn && fileEditor) {
        editFileBtn.addEventListener('click', () => {
            if (!isEditMode) {
                // 切换到编辑模式
                isEditMode = true;
                fileEditor.value = currentFileContent.join('\n');
                fileContent.style.display = 'none';
                fileEditor.style.display = 'block';
                saveFileBtn.style.display = 'inline-flex';
                editFileBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-3.97-3.03a.75.75 0 00-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 00-1.06 1.06L6.97 11.03a.75.75 0 001.079-.02l3.992-4.99a.75.75 0 00-.01-1.05z"/>
                    </svg>
                    取消
                `;
            } else {
                // 取消编辑，返回查看模式
                isEditMode = false;
                fileContent.style.display = 'block';
                fileEditor.style.display = 'none';
                saveFileBtn.style.display = 'none';
                editFileBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12.854 2.854a.5.5 0 00-.708 0L11 4l1.5 1.5 1.146-1.146a.5.5 0 000-.708l-.792-.792zM10 5l-8.5 8.5V15h1.5L11.5 6.5 10 5z"/>
                    </svg>
                `;
            }
        });

        saveFileBtn.addEventListener('click', async () => {
            try {
                showLoading();
                const newContent = fileEditor.value;
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        path: currentFilePath,
                        content: newContent,
                        root: currentRootIndex
                    })
                });

                if (!response.ok) {
                    throw new Error('保存失败');
                }

                // 更新当前内容
                currentFileContent = newContent.split('\n');

                // 返回查看模式
                isEditMode = false;
                fileContent.innerHTML = currentFileContent.map((line, index) => {
                    return `<div class="file-line" data-line-number="${index + 1}">${escapeHtml(line)}</div>`;
                }).join('');
                fileContent.style.display = 'block';
                fileEditor.style.display = 'none';
                saveFileBtn.style.display = 'none';
                editFileBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12.854 2.854a.5.5 0 00-.708 0L11 4l1.5 1.5 1.146-1.146a.5.5 0 000-.708l-.792-.792zM10 5l-8.5 8.5V15h1.5L11.5 6.5 10 5z"/>
                    </svg>
                `;

                alert('保存成功！');
            } catch (error) {
                showError(error.message);
            } finally {
                hideLoading();
            }
        });
    }

    // 高级编辑按钮事件（JSON文件）
    const advancedEditBtn = document.getElementById('advancedEditBtn');
    if (advancedEditBtn) {
        advancedEditBtn.addEventListener('click', () => {
            if (currentFilePath) {
                advancedEditFile(currentFilePath);
            }
        });
    }

    // 根目录选择器事件
    const rootSelectEl = document.getElementById('rootSelect');
    if (rootSelectEl) {
        rootSelectEl.addEventListener('change', (e) => {
            const newIndex = parseInt(e.target.value);
            if (!isNaN(newIndex) && newIndex !== currentRootIndex) {
                currentRootIndex = newIndex;
                // 重置路径并重新加载
                currentPath = '/';
                loadDirectory('/', currentRootIndex);
            }
        });
    }

    // 先加载根目录列表
    loadRoots().then(() => {
        // 检查URL中是否有文件路径参数（用于直接访问文件）
        const urlParams = new URLSearchParams(window.location.search);
        const filePath = urlParams.get('file');
        const rootParam = urlParams.get('root');

        if (filePath) {
            // 如果有文件路径参数，直接查看文件
            const rootIndex = rootParam ? parseInt(rootParam) : 0;
            if (!isNaN(rootIndex)) {
                currentRootIndex = rootIndex;
            }
            viewFile('/' + decodeURIComponent(filePath));
        } else {
            // 默认显示文件列表
            loadDirectory('/');
        }
    });
};
