// Данные приложения
let appState = {
    spheres: {
        finance: { name: "Финансы", progress: 0, color: "#4CAF50", tasks: [] },
        health: { name: "Здоровье", progress: 10, color: "#2196F3", tasks: [] },
        career: { name: "Карьера", progress: 20, color: "#FF9800", tasks: [] },
        rest: { name: "Отдых", progress: 5, color: "#9C27B0", tasks: [] },
        family: { name: "Семья", progress: 15, color: "#FF5722", tasks: [] },
        development: { name: "Развитие", progress: 8, color: "#009688", tasks: [] },
        creativity: { name: "Творчество", progress: 12, color: "#E91E63", tasks: [] },
        environment: { name: "Окружение", progress: 3, color: "#795548", tasks: [] }
    },
    tasks: [],
    lastTaskId: 0
};

// Взаимосвязи сфер
const connections = {
    finance: { health: 1.2, development: 1.1 },
    health: { career: 1.3, rest: 0.9 },
    rest: { health: 1.2, creativity: 1.1 },
    development: { career: 1.4, finance: 1.1 }
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    renderTree();
    renderTasks();
    renderProgressBars();
    calculateBalance();
    
    // Регистрация PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js');
    }
    
    // Быстрое добавление по Enter
    document.getElementById('taskInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addQuickTask();
    });
});

// Отрисовка дерева на Canvas
function renderTree() {
    const canvas = document.getElementById('treeCanvas');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.7;
    
    // Очистка
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Фон
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем ветви (сферы)
    const spheres = Object.values(appState.spheres);
    const angleStep = (2 * Math.PI) / spheres.length;
    
    spheres.forEach((sphere, index) => {
        const angle = index * angleStep;
        const length = (sphere.progress / 100) * maxRadius;
        const endX = centerX + Math.cos(angle) * length;
        const endY = centerY + Math.sin(angle) * length;
        
        // Ветвь
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = sphere.color;
        ctx.lineWidth = 3 + (sphere.progress / 100) * 10;
        ctx.stroke();
        
        // Конец ветви
        ctx.beginPath();
        ctx.arc(endX, endY, 8, 0, Math.PI * 2);
        ctx.fillStyle = sphere.color;
        ctx.fill();
        
        // Название сферы
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            sphere.name.substring(0, 4), 
            centerX + Math.cos(angle) * (length + 25),
            centerY + Math.sin(angle) * (length + 25)
        );
    });
    
    // Центр дерева
    ctx.beginPath();
    ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#4CAF50';
    ctx.fill();
}

// Быстрое добавление задачи
function addQuickTask() {
    const input = document.getElementById('taskInput');
    const select = document.getElementById('sphereSelect');
    
    if (!input.value.trim()) {
        input.focus();
        return;
    }
    
    const task = {
        id: ++appState.lastTaskId,
        text: input.value,
        sphere: select.value,
        done: false,
        date: new Date().toISOString().split('T')[0]
    };
    
    appState.tasks.push(task);
    updateSphereProgress(task.sphere, 5); // +5% за задачу
    
    // Применяем связи
    applyConnections(task.sphere);
    
    // Очищаем и фокусируем
    input.value = '';
    input.focus();
    
    // Обновляем UI
    renderTasks();
    renderTree();
    renderProgressBars();
    calculateBalance();
    saveToStorage();
}

// Обновление прогресса сферы
function updateSphereProgress(sphereId, amount) {
    if (appState.spheres[sphereId]) {
        appState.spheres[sphereId].progress = 
            Math.min(100, appState.spheres[sphereId].progress + amount);
    }
}

// Применение взаимосвязей
function applyConnections(sourceSphere) {
    if (connections[sourceSphere]) {
        Object.entries(connections[sourceSphere]).forEach(([targetSphere, multiplier]) => {
            if (appState.spheres[targetSphere]) {
                appState.spheres[targetSphere].progress = 
                    Math.min(100, appState.spheres[targetSphere].progress * multiplier);
            }
        });
    }
}

// Отрисовка задач
function renderTasks() {
    const container = document.getElementById('tasksList');
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = appState.tasks.filter(t => t.date === today && !t.done);
    
    container.innerHTML = todayTasks.length 
        ? todayTasks.map(task => `
            <div class="task-item">
                <input type="checkbox" class="task-checkbox" 
                       onchange="toggleTask(${task.id})">
                <span class="task-text">${task.text}</span>
                <span class="task-sphere" style="background: ${appState.spheres[task.sphere].color}">
                    ${appState.spheres[task.sphere].name.substring(0, 2)}
                </span>
            </div>
        `).join('')
        : '<p style="text-align: center; color: #999;">Нет задач на сегодня</p>';
    
    // Обновляем счетчик
    document.getElementById('todayProgress').textContent = 
        `Сегодня: ${todayTasks.length} задач`;
}

// Отрисовка прогресс-баров
function renderProgressBars() {
    const container = document.getElementById('progressBars');
    container.innerHTML = Object.values(appState.spheres).map(sphere => `
        <div class="progress-item">
            <div class="progress-label">
                <span>${sphere.name}</span>
                <span>${Math.round(sphere.progress)}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${sphere.progress}%; background: ${sphere.color}"></div>
            </div>
        </div>
    `).join('');
}

// Переключение задачи
function toggleTask(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (task) {
        task.done = !task.done;
        if (task.done) {
            updateSphereProgress(task.sphere, 10); // +10% за выполнение
            applyConnections(task.sphere);
        }
        
        renderTasks();
        renderTree();
        renderProgressBars();
        calculateBalance();
        saveToStorage();
    }
}

// Расчет баланса
function calculateBalance() {
    const progresses = Object.values(appState.spheres).map(s => s.progress);
    const avg = progresses.reduce((a, b) => a + b) / progresses.length;
    
    // Штраф за дисбаланс
    const variance = progresses.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / progresses.length;
    const balanceScore = Math.max(0, avg - (variance / 2));
    
    document.getElementById('balanceScore').textContent = 
        `Баланс: ${Math.round(balanceScore)}%`;
    
    // Визуальная индикация
    document.getElementById('balanceScore').style.color = 
        balanceScore > 60 ? '#4CAF50' : balanceScore > 30 ? '#FF9800' : '#F44336';
}

// Сохранение в LocalStorage
function saveToStorage() {
    localStorage.setItem('lifeContourData', JSON.stringify(appState));
}

// Загрузка из LocalStorage
function loadFromStorage() {
    const saved = localStorage.getItem('lifeContourData');
    if (saved) {
        const parsed = JSON.parse(saved);
        appState = { ...appState, ...parsed };
        appState.lastTaskId = Math.max(...appState.tasks.map(t => t.id), 0);
    }
}

// Экспорт данных
function exportData() {
    const dataStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `contour-life-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

// Переключение меню
function toggleMenu() {
    document.getElementById('sideMenu').classList.toggle('active');
}

// Навигация
function showToday() { document.querySelector('.nav-btn.active').classList.remove('active'); event.target.classList.add('active'); }
function showTree() { document.querySelector('.nav-btn.active').classList.remove('active'); event.target.classList.add('active'); }
function showAnalytics() { document.querySelector('.nav-btn.active').classList.remove('active'); event.target.classList.add('active'); }

// PWA: Сервис-воркер
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
}
