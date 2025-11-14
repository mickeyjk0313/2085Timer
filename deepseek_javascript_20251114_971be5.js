// 倒计时项类
class CountdownTimer {
    constructor(name, group, initialPhase, remainingDays, remainingHours, remainingMinutes, remainingSeconds) {
        this.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        this.name = name;
        this.group = group || '未分组';
        this.currentPhase = initialPhase;
        this.checked = false;
        this.previousPhase = initialPhase;
        
        // 计算阶段结束时间
        const now = new Date();
        const remainingMs = (parseInt(remainingDays) * 24 * 60 * 60 * 1000) +
                          (parseInt(remainingHours) * 60 * 60 * 1000) +
                          (parseInt(remainingMinutes) * 60 * 1000) +
                          (parseInt(remainingSeconds) * 1000);
        
        this.nextPhaseChange = new Date(now.getTime() + remainingMs);
        this.phaseStart = new Date(this.nextPhaseChange.getTime() - 
            (this.currentPhase === 'protection' ? 
                3 * 24 * 60 * 60 * 1000 : 
                1 * 24 * 60 * 60 * 1000));
    }
    
    // 更新倒计时状态
    update() {
        const now = new Date();
        let phaseChanged = false;
        
        if (now >= this.nextPhaseChange) {
            this.previousPhase = this.currentPhase;
            this.phaseStart = new Date(this.nextPhaseChange);
            this.currentPhase = this.currentPhase === 'protection' ? 'capture' : 'protection';
            phaseChanged = true;
            
            const phaseDuration = this.currentPhase === 'protection' ? 
                3 * 24 * 60 * 60 * 1000 : 
                1 * 24 * 60 * 60 * 1000;
            this.nextPhaseChange = new Date(this.phaseStart.getTime() + phaseDuration);
            
            if (this.previousPhase === 'capture' && this.currentPhase === 'protection') {
                this.checked = false;
            }
        }
        
        const timeLeft = this.nextPhaseChange - now;
        
        if (timeLeft <= 0) {
            return {
                time: this.formatTime(0),
                progress: 100,
                phaseChanged: phaseChanged
            };
        }
        
        const totalPhaseTime = this.currentPhase === 'protection' ? 
            3 * 24 * 60 * 60 * 1000 : 1 * 24 * 60 * 60 * 1000;
        const elapsedInPhase = totalPhaseTime - timeLeft;
        const progress = Math.max(0, Math.min(100, (elapsedInPhase / totalPhaseTime) * 100));
        
        return {
            time: this.formatTime(timeLeft),
            progress: progress,
            phaseChanged: phaseChanged
        };
    }
    
    // 格式化时间为天、时、分、秒（2d 21:10:52格式）
    formatTime(milliseconds) {
        const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
        const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
        
        if (days > 0) {
            return {
                display: `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                days: days,
                hours: hours,
                minutes: minutes,
                seconds: seconds
            };
        } else {
            return {
                display: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                days: 0,
                hours: hours,
                minutes: minutes,
                seconds: seconds
            };
        }
    }
    
    getPhaseName() {
        return this.currentPhase === 'protection' ? '보호 상태' : '쟁탈 가능 상태';
    }
    
    getPhaseClass() {
        return this.currentPhase === 'protection' ? 'phase-protection' : 'phase-capture';
    }
    
    getProgressClass() {
        return this.currentPhase === 'protection' ? 'progress-protection' : 'progress-capture';
    }
    
    getPhaseDescription() {
        return this.currentPhase === 'protection' ? 
            '3天保护期' : '1天争夺期';
    }
    
    getRemainingTime() {
        return this.nextPhaseChange - new Date();
    }
    
    toggleChecked() {
        this.checked = !this.checked;
    }
    
    shouldShowCheckmark() {
        return this.currentPhase === 'capture';
    }
    
    // 更新名称和分组
    updateInfo(name, group) {
        this.name = name;
        this.group = group || '未分组';
    }
}

// 倒计时管理器
class CountdownManager {
    constructor() {
        this.timers = [];
        this.currentFilter = 'all';
        this.editingTimerId = null;
        this.loadFromStorage();
        this.render();
        this.startUpdating();
        this.setupEditModal();
        this.setupDataManagement();
    }
    
    addTimer(name, group, initialPhase, remainingDays, remainingHours, remainingMinutes, remainingSeconds) {
        const timer = new CountdownTimer(name, group, initialPhase, remainingDays, remainingHours, remainingMinutes, remainingSeconds);
        this.timers.push(timer);
        this.saveToStorage();
        this.render();
        return timer;
    }
    
    removeTimer(id) {
        this.timers = this.timers.filter(timer => timer.id !== id);
        this.saveToStorage();
        this.render();
    }
    
    // 编辑计时器
    editTimer(id, name, group) {
        const timer = this.timers.find(t => t.id === id);
        if (timer) {
            timer.updateInfo(name, group);
            this.saveToStorage();
            this.render();
        }
    }
    
    // 打开编辑模态框
    openEditModal(timerId) {
        const timer = this.timers.find(t => t.id === timerId);
        if (timer) {
            this.editingTimerId = timerId;
            document.getElementById('editTimerName').value = timer.name;
            document.getElementById('editTimerGroup').value = timer.group;
            document.getElementById('editModal').style.display = 'flex';
        }
    }
    
    // 设置编辑模态框事件
    setupEditModal() {
        const modal = document.getElementById('editModal');
        const cancelBtn = document.getElementById('cancelEditBtn');
        const saveBtn = document.getElementById('saveEditBtn');
        
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        saveBtn.addEventListener('click', () => {
            const name = document.getElementById('editTimerName').value.trim();
            const group = document.getElementById('editTimerGroup').value.trim();
            
            if (!name) {
                alert('请输入倒计时名称');
                return;
            }
            
            if (!group) {
                alert('请输入分组名称');
                return;
            }
            
            this.editTimer(this.editingTimerId, name, group);
            modal.style.display = 'none';
        });
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // 设置数据管理功能
    setupDataManagement() {
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');
        const importFile = document.getElementById('importFile');
        
        exportBtn.addEventListener('click', () => {
            this.exportData();
        });
        
        importBtn.addEventListener('click', () => {
            importFile.click();
        });
        
        importFile.addEventListener('change', (e) => {
            this.importData(e);
        });
    }
    
    // 导出数据
    exportData() {
        const data = JSON.stringify(this.timers, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `timers-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('数据导出成功！文件已下载');
    }
    
    // 导入数据
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedData)) {
                    throw new Error('文件格式不正确');
                }
                
                if (confirm(`确定要导入 ${importedData.length} 个倒计时吗？这将覆盖当前所有数据。`)) {
                    this.timers = importedData.map(data => {
                        const timer = new CountdownTimer(
                            data.name, 
                            data.group,
                            data.currentPhase, 
                            0, 0, 0, 0
                        );
                        timer.id = data.id;
                        timer.checked = data.checked || false;
                        timer.previousPhase = data.previousPhase || data.currentPhase;
                        timer.phaseStart = new Date(data.phaseStart);
                        timer.nextPhaseChange = new Date(data.nextPhaseChange);
                        return timer;
                    });
                    
                    this.saveToStorage();
                    this.render();
                    alert('数据导入成功！');
                }
            } catch (error) {
                alert('导入失败：文件格式不正确或已损坏');
                console.error('导入错误:', error);
            }
            
            // 清空文件输入
            event.target.value = '';
        };
        
        reader.readAsText(file);
    }
    
    updateAll() {
        let needsSave = false;
        
        this.timers.forEach(timer => {
            const result = timer.update();
            if (result.phaseChanged) {
                needsSave = true;
            }
        });
        
        if (needsSave) {
            this.saveToStorage();
        }
        
        this.render();
    }
    
    setFilter(group) {
        this.currentFilter = group;
        this.render();
    }
    
    startUpdating() {
        setInterval(() => {
            this.updateAll();
        }, 1000);
    }
    
    // 获取所有分组
    getGroups() {
        const groups = new Set();
        this.timers.forEach(timer => {
            groups.add(timer.group);
        });
        return Array.from(groups).sort();
    }
    
    // 排序所有计时器（全部视图使用）
    getAllTimersSorted() {
        return this.timers.sort((a, b) => {
            // 按状态排序: 쟁탈 가능 상태 在前, 보호 상태 在后
            if (a.currentPhase !== b.currentPhase) {
                return a.currentPhase === 'capture' ? -1 : 1;
            }
            
            // 相同状态下按剩余时间排序
            const aTime = a.getRemainingTime();
            const bTime = b.getRemainingTime();
            
            // 쟁탈 가능 상태: 剩余时间长的在前
            if (a.currentPhase === 'capture') {
                return bTime - aTime;
            }
            // 보호 상태: 剩余时间短的在前
            else {
                return aTime - bTime;
            }
        });
    }
    
    // 按分组获取计时器
    getTimersByGroup() {
        const groups = {};
        
        this.timers.forEach(timer => {
            if (!groups[timer.group]) {
                groups[timer.group] = [];
            }
            groups[timer.group].push(timer);
        });
        
        // 对每个分组内的计时器排序
        Object.keys(groups).forEach(group => {
            groups[group].sort((a, b) => {
                if (a.currentPhase !== b.currentPhase) {
                    return a.currentPhase === 'capture' ? -1 : 1;
                }
                
                const aTime = a.getRemainingTime();
                const bTime = b.getRemainingTime();
                
                if (a.currentPhase === 'capture') {
                    return bTime - aTime;
                } else {
                    return aTime - bTime;
                }
            });
        });
        
        return groups;
    }
    
    render() {
        this.renderGroupFilter();
        this.renderTimers();
    }
    
    renderGroupFilter() {
        const filterContainer = document.getElementById('groupFilter');
        const groups = this.getGroups();
        
        let filterHTML = '<button class="filter-btn active" data-group="all">全部</button>';
        
        groups.forEach(group => {
            const isActive = this.currentFilter === group ? 'active' : '';
            filterHTML += `<button class="filter-btn ${isActive}" data-group="${group}">${group}</button>`;
        });
        
        filterContainer.innerHTML = filterHTML;
        
        // 添加筛选按钮事件
        filterContainer.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const group = e.target.getAttribute('data-group');
                this.setFilter(group);
                
                // 更新按钮激活状态
                filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
    }
    
    renderTimers() {
        const container = document.getElementById('timersContainer');
        const noTimersMessage = document.getElementById('noTimersMessage');
        
        if (this.timers.length === 0) {
            container.innerHTML = '<div class="no-timers" id="noTimersMessage">暂无倒计时，请添加一个</div>';
            return;
        }
        
        noTimersMessage?.remove();
        
        if (this.currentFilter === 'all') {
            this.renderAllTimers(container);
        } else {
            this.renderGroupTimers(container);
        }
    }
    
    // 渲染全部视图（按时间排序）
    renderAllTimers(container) {
        const sortedTimers = this.getAllTimersSorted();
        let containerHTML = '<div class="all-timers">';
        
        sortedTimers.forEach(timer => {
            const result = timer.update();
            const time = result.time;
            const progress = result.progress;
            const showCheckmark = timer.shouldShowCheckmark();
            
            containerHTML += `
                <div class="timer-card">
                    <div class="checkmark-container ${showCheckmark ? 'visible' : ''}">
                        <div class="checkmark ${timer.checked ? 'checked' : ''}" data-id="${timer.id}"></div>
                    </div>
                    <div class="timer-header">
                        <div class="timer-title">
                            <span class="timer-group-badge">${timer.group}</span>${timer.name}
                        </div>
                        <div class="timer-phase ${timer.getPhaseClass()}">
                            ${timer.getPhaseName()}
                        </div>
                    </div>
                    <div class="timer-display">
                        ${time.display}
                    </div>
                    <div class="timer-progress">
                        <div class="progress-bar ${timer.getProgressClass()}" style="width: ${progress}%"></div>
                    </div>
                    <div class="timer-info">
                        ${timer.getPhaseDescription()} | 结束于: ${timer.nextPhaseChange.toLocaleString()}
                    </div>
                    <div class="timer-actions">
                        <button class="edit-btn" data-id="${timer.id}">编辑</button>
                        <button class="delete-btn" data-id="${timer.id}">删除</button>
                    </div>
                </div>
            `;
        });
        
        containerHTML += '</div>';
        container.innerHTML = containerHTML;
        this.attachEventListeners(container);
    }
    
    // 渲染分组视图
    renderGroupTimers(container) {
        const groups = this.getTimersByGroup();
        let containerHTML = '';
        
        Object.keys(groups).forEach(group => {
            // 如果设置了筛选且不是当前筛选的分组，则跳过
            if (this.currentFilter !== 'all' && this.currentFilter !== group) {
                return;
            }
            
            const groupTimers = groups[group];
            const captureCount = groupTimers.filter(t => t.currentPhase === 'capture').length;
            const protectionCount = groupTimers.length - captureCount;
            
            let groupHTML = `
                <div class="group-section">
                    <div class="group-header">
                        <div class="group-name">${group}</div>
                        <div class="group-stats">
                            쟁탈 가능: ${captureCount} | 보호: ${protectionCount}
                        </div>
                    </div>
                    <div class="group-timers">
            `;
            
            groupTimers.forEach(timer => {
                const result = timer.update();
                const time = result.time;
                const progress = result.progress;
                const showCheckmark = timer.shouldShowCheckmark();
                
                groupHTML += `
                    <div class="timer-card">
                        <div class="checkmark-container ${showCheckmark ? 'visible' : ''}">
                            <div class="checkmark ${timer.checked ? 'checked' : ''}" data-id="${timer.id}"></div>
                        </div>
                        <div class="timer-header">
                            <div class="timer-title">${timer.name}</div>
                            <div class="timer-phase ${timer.getPhaseClass()}">
                                ${timer.getPhaseName()}
                            </div>
                        </div>
                        <div class="timer-display">
                            ${time.display}
                        </div>
                        <div class="timer-progress">
                            <div class="progress-bar ${timer.getProgressClass()}" style="width: ${progress}%"></div>
                        </div>
                        <div class="timer-info">
                            ${timer.getPhaseDescription()} | 结束于: ${timer.nextPhaseChange.toLocaleString()}
                        </div>
                        <div class="timer-actions">
                            <button class="edit-btn" data-id="${timer.id}">编辑</button>
                            <button class="delete-btn" data-id="${timer.id}">删除</button>
                        </div>
                    </div>
                `;
            });
            
            groupHTML += `
                    </div>
                </div>
            `;
            
            containerHTML += groupHTML;
        });
        
        container.innerHTML = containerHTML;
        this.attachEventListeners(container);
    }
    
    // 附加事件监听器
    attachEventListeners(container) {
        // 添加删除按钮事件监听
        container.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                this.removeTimer(id);
            });
        });
        
        // 添加编辑按钮事件监听
        container.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                this.openEditModal(id);
            });
        });
        
        // 添加打勾标记事件监听
        container.querySelectorAll('.checkmark-container.visible .checkmark').forEach(checkmark => {
            checkmark.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const timer = this.timers.find(t => t.id === id);
                if (timer) {
                    timer.toggleChecked();
                    this.saveToStorage();
                    this.render();
                }
            });
        });
    }
    
    saveToStorage() {
        localStorage.setItem('countdownTimers', JSON.stringify(this.timers));
    }
    
    loadFromStorage() {
        const stored = localStorage.getItem('countdownTimers');
        if (stored) {
            const timersData = JSON.parse(stored);
            this.timers = timersData.map(data => {
                const timer = new CountdownTimer(
                    data.name, 
                    data.group || '未分组',
                    data.currentPhase, 
                    0, 0, 0, 0
                );
                timer.id = data.id;
                timer.checked = data.checked || false;
                timer.previousPhase = data.previousPhase || data.currentPhase;
                timer.phaseStart = new Date(data.phaseStart);
                timer.nextPhaseChange = new Date(data.nextPhaseChange);
                return timer;
            });
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const manager = new CountdownManager();
    
    function updateRemainingTimeHint() {
        const phase = document.getElementById('initialPhase').value;
        const hint = document.getElementById('remainingTimeHint');
        if (phase === 'protection') {
            hint.textContent = '保护状态最多可设置 3 天';
        } else {
            hint.textContent = '争夺状态最多可设置 1 天';
        }
    }
    
    updateRemainingTimeHint();
    
    document.getElementById('addTimerBtn').addEventListener('click', () => {
        const name = document.getElementById('timerName').value.trim();
        const group = document.getElementById('timerGroup').value.trim();
        const initialPhase = document.getElementById('initialPhase').value;
        const remainingDays = parseInt(document.getElementById('remainingDays').value) || 0;
        const remainingHours = parseInt(document.getElementById('remainingHours').value) || 0;
        const remainingMinutes = parseInt(document.getElementById('remainingMinutes').value) || 0;
        const remainingSeconds = parseInt(document.getElementById('remainingSeconds').value) || 0;
        
        if (!name) {
            alert('请输入倒计时名称');
            return;
        }
        
        if (!group) {
            alert('请输入分组（联盟）名称');
            return;
        }
        
        const totalHours = remainingDays * 24 + remainingHours + remainingMinutes/60 + remainingSeconds/3600;
        const maxHours = initialPhase === 'protection' ? 72 : 24;
        
        if (totalHours > maxHours) {
            alert(`剩余时间不能超过${maxHours}小时`);
            return;
        }
        
        manager.addTimer(name, group, initialPhase, remainingDays, remainingHours, remainingMinutes, remainingSeconds);
        
        // 清空表单
        document.getElementById('timerName').value = '';
        document.getElementById('timerGroup').value = '';
        document.getElementById('remainingDays').value = '0';
        document.getElementById('remainingHours').value = '0';
        document.getElementById('remainingMinutes').value = '0';
        document.getElementById('remainingSeconds').value = '0';
    });
    
    document.getElementById('initialPhase').addEventListener('change', updateRemainingTimeHint);
});