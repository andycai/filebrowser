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
    if (!rootSelect) return;

    rootSelect.innerHTML = '';
    rootDirs.forEach((root, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = root.name;
        rootSelect.appendChild(option);
    });

    // 设置当前选中的根目录
    rootSelect.value = currentRootIndex;

    // 添加切换事件
    rootSelect.addEventListener('change', (e) => {
        const newIndex = parseInt(e.target.value);
        if (newIndex !== currentRootIndex) {
            currentRootIndex = newIndex;
            // 重置路径并重新加载
            currentPath = '/';
            loadDirectory('/', currentRootIndex);
        }
    });
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
async function loadDirectory(path, rootIndex = currentRootIndex) {
    try {
        showLoading();
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

        // 只切换视图，不重新加载
        listView.style.display = 'block';
        contentView.style.display = 'none';
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
            <div class="file-actions-header">操作</div>
        </div>
    `;

    files.forEach(file => {
        const isJsonFile = !file.isDir && file.extension === 'json';
        const actionButtons = file.isDir ? '' : `
            <button class="btn-small btn-edit-list" onclick="event.stopPropagation(); editFile('${file.path}')" title="编辑">✏️</button>
            ${isJsonFile ? `<button class="btn-small btn-advanced-edit-list" onclick="event.stopPropagation(); advancedEditFile('${file.path}')" title="高级编辑">⚙️</button>` : ''}
            <button class="btn-small btn-delete-list" onclick="event.stopPropagation(); deleteFileFromList('${file.path}')" title="删除">🗑️</button>
        `;

        html += `
            <div class="file-item" data-path="${file.path}" data-is-dir="${file.isDir}">
                <div class="file-icon">${getFileIcon(file.isDir, file.extension)}</div>
                <div class="file-name-cell">${file.name}</div>
                <div class="file-size">${file.isDir ? '' : formatSize(file.size)}</div>
                <div class="file-date">${formatDate(file.modTime)}</div>
                <div class="file-actions">${actionButtons}</div>
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
        setTimeout(() => {
            scrollToLine(lineNumber);
        }, 100);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// 滚动到指定行并高亮显示
function scrollToLine(lineNumber) {
    const lineElement = fileContent.querySelector(`[data-line-number="${lineNumber}"]`);
    if (!lineElement) return;

    // 移除之前的高亮
    fileContent.querySelectorAll('.line-highlight').forEach(el => {
        el.classList.remove('line-highlight');
    });

    // 添加高亮
    lineElement.classList.add('line-highlight');

    // 计算滚动位置：目标行前面显示5行，即从顶部开始第6行位置
    const container = fileContent;
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
        // 使用 data 属性存储路径、页码和根目录索引，避免特殊字符问题
        return `<button class="btn btn-secondary pagination-btn" data-path="${escapeHtml(path)}" data-page="${newPage}" data-root="${currentRootIndex}">${text}</button>`;
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

// 显示列表视图
function showListView() {
    listView.style.display = 'block';
    contentView.style.display = 'none';
    searchResults.style.display = 'none';
    searchNav.style.display = 'none';
    searchInput.value = ''; // 清空搜索框
    currentSearchResults = []; // 清空搜索结果
    currentSearchIndex = -1;

    // 加载目录内容
    loadDirectory(currentPath);
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

        // 加载完整文件内容
        const url = `/api/view?path=${encodeURIComponent(path)}&root=${currentRootIndex}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to load file');
        }

        const data = await response.json();
        const fullContent = data.lines.join('\n');
        const jsonData = JSON.parse(fullContent);

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
        showError('不是有效的JSON文件: ' + error.message);
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
    let jsonData = JSON.parse(fullContent);

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

        // 从编辑器中收集所有修改
        let jsonData = {};

        // 收集所有输入的值
        document.querySelectorAll('.json-value-input').forEach(input => {
            const path = input.dataset.path;
            const value = input.value;

            // 尝试解析为JSON，如果失败则作为字符串
            try {
                const parsed = JSON.parse(value);
                setJsonByPath(jsonData, path, parsed);
            } catch {
                setJsonByPath(jsonData, path, value);
            }
        });

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
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
}

// 初始化
window.onload = function() {
    // 先加载根目录列表
    loadRoots().then(() => {
        // 检查 URL 参数，如果有 file 参数则直接打开该文件
        const urlParams = new URLSearchParams(window.location.search);
        const fileParam = urlParams.get('file');

        if (fileParam) {
            // 直接打开文件
            viewFile(decodeURIComponent(fileParam), 1);
        } else {
            // 加载根目录
            loadDirectory('/');
        }
    });
};
