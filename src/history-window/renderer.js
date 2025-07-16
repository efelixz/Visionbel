const historyContainer = document.getElementById('history-container');
const lineChartCanvas = document.getElementById('performanceChart');
const pieChartCanvas = document.getElementById('modeChart');
const filtersContainer = document.getElementById('mode-filters');

let fullHistoryData = [];
let filteredHistoryData = [];
let resizeTimeout;

// Função principal que aplica os filtros e atualiza toda a tela
function applyFiltersAndRender() {
    const selectedModes = Array.from(filtersContainer.querySelectorAll('input:checked')).map(cb => cb.value);
    filteredHistoryData = fullHistoryData.filter(item => selectedModes.includes(item.mode));
    
    // Inverte a lista para o gráfico de linha (ordem cronológica)
    const chronologicalHistory = [...filteredHistoryData].reverse();
    
    // Recalcula as estatísticas para o gráfico de pizza
    const modeStats = selectedModes.map(mode => ({
        mode: mode,
        count: filteredHistoryData.filter(item => item.mode === mode).length
    })).filter(s => s.count > 0);

    renderLineChart(chronologicalHistory);
    renderModeChart(modeStats);
    renderHistoryList(filteredHistoryData);
}

// Função para aplicar filtro de data
function applyDateFilter(data, startDate, endDate) {
    return data.filter(item => {
        const itemDate = new Date(item.timestamp);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate + 'T23:59:59') : null;
        
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
    });
}

// Função para configurar canvas responsivo
function setupResponsiveCanvas(canvas) {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    return { width: displayWidth, height: displayHeight, ctx };
}

// Função para criar gráfico de linha melhorado
function renderLineChart(data) {
    // Remove loading
    const loadingElement = document.getElementById('line-chart-loading');
    if (loadingElement) loadingElement.style.display = 'none';
    
    const { width, height, ctx } = setupResponsiveCanvas(lineChartCanvas);
    
    // Limpa o canvas com a cor de fundo correta
    const isDark = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#1f2937' : '#f9fafb';
    ctx.fillRect(0, 0, width, height);
    
    if (data.length === 0) {
        ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
        ctx.font = `${Math.max(14, width * 0.03)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('📊 Nenhum dado disponível', width / 2, height / 2);
        return;
    }
    
    // Prepara os dados
    const values = data.map(item => item.duration_seconds || 0);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue || 1;
    
    // Configurações responsivas do gráfico
    const padding = Math.max(40, width * 0.08);
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // Cores para modo escuro/claro
    const axisColor = isDark ? '#4b5563' : '#d1d5db';
    const gridColor = isDark ? '#374151' : '#f3f4f6';
    const lineColor = isDark ? '#60a5fa' : '#3b82f6';
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const pointColor = isDark ? '#93c5fd' : '#1d4ed8';
    
    // Desenha grade de fundo
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding + (i / gridLines) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        const x = padding + (i / gridLines) * chartWidth;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
    }
    
    // Desenha os eixos principais
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Eixo Y
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    // Eixo X
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Desenha área sob a curva
    if (values.length > 1) {
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(59, 130, 246, 0.2)');
        gradient.addColorStop(1, isDark ? 'rgba(96, 165, 250, 0.05)' : 'rgba(59, 130, 246, 0.05)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        
        values.forEach((value, index) => {
            const x = padding + (index / (values.length - 1)) * chartWidth;
            const y = height - padding - ((value - minValue) / range) * chartHeight;
            ctx.lineTo(x, y);
        });
        
        ctx.lineTo(width - padding, height - padding);
        ctx.closePath();
        ctx.fill();
    }
    
    // Desenha a linha dos dados
    if (values.length > 1) {
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = Math.max(3, width * 0.004);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        values.forEach((value, index) => {
            const x = padding + (index / (values.length - 1)) * chartWidth;
            const y = height - padding - ((value - minValue) / range) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Desenha os pontos
        ctx.fillStyle = pointColor;
        const pointRadius = Math.max(4, width * 0.006);
        values.forEach((value, index) => {
            const x = padding + (index / (values.length - 1)) * chartWidth;
            const y = height - padding - ((value - minValue) / range) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Borda branca nos pontos
            ctx.strokeStyle = isDark ? '#1f2937' : '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }
    
    // Labels dos valores no eixo Y
    ctx.fillStyle = textColor;
    ctx.font = `${Math.max(10, width * 0.02)}px Inter, sans-serif`;
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const value = minValue + (range * i / 4);
        const y = height - padding - (i / 4) * chartHeight;
        ctx.fillText(value.toFixed(1) + 's', padding - 10, y + 4);
    }
    
    // Labels do eixo X (últimos 5 pontos)
    ctx.textAlign = 'center';
    const maxLabels = Math.min(5, values.length);
    for (let i = 0; i < maxLabels; i++) {
        const dataIndex = Math.floor((i / (maxLabels - 1)) * (values.length - 1));
        const x = padding + (dataIndex / (values.length - 1)) * chartWidth;
        const date = new Date(data[dataIndex].timestamp);
        const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        ctx.fillText(label, x, height - padding + 20);
    }
    
    // Título
    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.max(12, width * 0.025)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('📈 Tempo de Resposta (segundos)', width / 2, 25);
}

// Função para criar gráfico de pizza melhorado
function renderModeChart(stats) {
    // Remove loading
    const loadingElement = document.getElementById('pie-chart-loading');
    if (loadingElement) loadingElement.style.display = 'none';
    
    const { width, height, ctx } = setupResponsiveCanvas(pieChartCanvas);
    
    // Limpa o canvas com a cor de fundo correta
    const isDark = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#1f2937' : '#f9fafb';
    ctx.fillRect(0, 0, width, height);
    
    if (stats.length === 0) {
        ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
        ctx.font = `${Math.max(14, width * 0.03)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🎯 Nenhum dado disponível', width / 2, height / 2);
        return;
    }
    
    const centerX = width / 2;
    const centerY = height / 2 + 10;
    const radius = Math.min(centerX, centerY) - Math.max(60, width * 0.15);
    
    const total = stats.reduce((sum, stat) => sum + stat.count, 0);
    const colors = {
        'destaque': '#f59e0b',
        'sugestao': '#10b981', 
        'autocorrecao': '#3b82f6',
        'directo': '#8b5cf6',
        'etico': '#ef4444',
        'shadow': '#6b7280'
    };
    
    let currentAngle = -Math.PI / 2;
    
    // Desenha as fatias com sombra
    stats.forEach((stat, index) => {
        const sliceAngle = (stat.count / total) * 2 * Math.PI;
        const color = colors[stat.mode] || '#94a3b8';
        
        // Sombra
        ctx.save();
        ctx.translate(2, 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Fatia principal
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        
        // Borda
        ctx.strokeStyle = isDark ? '#1f2937' : '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        currentAngle += sliceAngle;
    });
    
    // Desenha legendas na lateral
    const legendStartY = Math.max(30, height * 0.15);
    const legendItemHeight = Math.max(20, height * 0.08);
    const fontSize = Math.max(11, width * 0.022);
    
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    
    stats.forEach((stat, index) => {
        const y = legendStartY + (index * legendItemHeight);
        const x = Math.max(15, width * 0.03);
        const color = colors[stat.mode] || '#94a3b8';
        
        // Quadrado da cor
        ctx.fillStyle = color;
        ctx.fillRect(x, y - fontSize/2, fontSize, fontSize);
        
        // Borda do quadrado
        ctx.strokeStyle = isDark ? '#374151' : '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y - fontSize/2, fontSize, fontSize);
        
        // Texto da legenda
        ctx.fillStyle = isDark ? '#e5e7eb' : '#374151';
        const percentage = ((stat.count / total) * 100).toFixed(1);
        const modeNames = {
            'destaque': '✨ Destaque',
            'sugestao': '💡 Sugestões',
            'autocorrecao': '🤖 AutoCorreção',
            'directo': '🎯 Resposta Direta',
            'etico': '🛡️ Modo Ético',
            'shadow': '👤 Modo Shadow'
        };
        const modeName = modeNames[stat.mode] || stat.mode;
        ctx.fillText(`${modeName}: ${stat.count} (${percentage}%)`, x + fontSize + 8, y + fontSize/3);
    });
    
    // Título
    ctx.fillStyle = isDark ? '#e5e7eb' : '#374151';
    ctx.font = `bold ${Math.max(12, fontSize * 1.1)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🎯 Distribuição por Modo de Operação', centerX, 20);
}

// NOVO: Variáveis para seleção múltipla
let selectedItems = new Set();
let selectionMode = false;

// NOVO: Funções para gerenciar seleção
// CORRIGIDO: Expor todas as funções globalmente no final do arquivo
window.toggleSelectionMode = toggleSelectionMode;
window.toggleItemSelection = toggleItemSelection;
window.selectAllItems = selectAllItems;
window.deleteSelectedItems = deleteSelectedItems;
window.deleteHistoryItem = deleteHistoryItem;
window.deleteOlderThan = deleteOlderThan;
window.clearAllHistory = clearAllHistory;

// CORRIGIDO: Função para atualizar a interface de seleção
function updateSelectionUI() {
    const selectionInfo = document.getElementById('selection-info');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    const selectionControls = document.getElementById('selection-controls');
    const selectionModeText = document.getElementById('selection-mode-text');
    
    if (selectionMode) {
        selectionControls.classList.remove('hidden');
        selectionControls.classList.add('flex');
        selectionModeText.textContent = 'Cancelar Seleção';
        selectionInfo.textContent = `${selectedItems.size} item(ns) selecionado(s)`;
        deleteSelectedBtn.disabled = selectedItems.size === 0;
    } else {
        selectionControls.classList.add('hidden');
        selectionControls.classList.remove('flex');
        selectionModeText.textContent = 'Seleção Múltipla';
        selectedItems.clear();
    }
    
    // Atualiza a renderização para mostrar/ocultar checkboxes
    applyFiltersAndRender();
}

// CORRIGIDO: Função toggleSelectionMode
function toggleSelectionMode() {
    selectionMode = !selectionMode;
    selectedItems.clear();
    updateSelectionUI();
}

// CORRIGIDO: Função toggleItemSelection
function toggleItemSelection(id) {
    if (selectedItems.has(id)) {
        selectedItems.delete(id);
    } else {
        selectedItems.add(id);
    }
    updateSelectionUI();
    // Re-renderiza apenas o item específico para atualizar o visual
    applyFiltersAndRender();
}

function selectAllItems() {
    selectedItems.clear();
    filteredHistoryData.forEach(item => selectedItems.add(item.id));
    updateSelectionUI();
}

function updateSelectionUI() {
    const selectionInfo = document.getElementById('selection-info');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    
    if (selectionMode) {
        selectionInfo.textContent = `${selectedItems.size} item(ns) selecionado(s)`;
        deleteSelectedBtn.disabled = selectedItems.size === 0;
    }
}

// NOVO: Funções para deletar
async function deleteHistoryItem(id) {
    if (!confirm('Tem certeza que deseja deletar este registro?')) {
        return;
    }
    
    try {
        const result = await window.historyAPI.deleteHistoryItem(id);
        if (result.success) {
            // Remove da lista local
            fullHistoryData = fullHistoryData.filter(item => item.id !== id);
            applyFiltersAndRender();
            showNotification('✅ Registro deletado com sucesso!', 'success');
        } else {
            showNotification('❌ ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao deletar:', error);
        showNotification('❌ Erro ao deletar registro', 'error');
    }
}

async function deleteSelectedItems() {
    if (selectedItems.size === 0) return;
    
    if (!confirm(`Tem certeza que deseja deletar ${selectedItems.size} registro(s) selecionado(s)?`)) {
        return;
    }
    
    try {
        const ids = Array.from(selectedItems);
        const result = await window.historyAPI.deleteMultipleItems(ids);
        
        if (result.success) {
            // Remove da lista local
            fullHistoryData = fullHistoryData.filter(item => !selectedItems.has(item.id));
            selectedItems.clear();
            selectionMode = false;
            applyFiltersAndRender();
            showNotification(`✅ ${result.deletedCount} registro(s) deletado(s)!`, 'success');
        } else {
            showNotification('❌ ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao deletar múltiplos:', error);
        showNotification('❌ Erro ao deletar registros', 'error');
    }
}

async function clearAllHistory() {
    if (!confirm('⚠️ ATENÇÃO: Isso irá deletar TODO o histórico permanentemente. Tem certeza?')) {
        return;
    }
    
    if (!confirm('Esta ação não pode ser desfeita. Confirma a exclusão de TODOS os registros?')) {
        return;
    }
    
    try {
        const result = await window.historyAPI.clearAllHistory();
        
        if (result.success) {
            fullHistoryData = [];
            selectedItems.clear();
            selectionMode = false;
            applyFiltersAndRender();
            showNotification(`✅ Todo o histórico foi limpo! ${result.deletedCount} registro(s) deletado(s)`, 'success');
        } else {
            showNotification('❌ ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao limpar histórico:', error);
        showNotification('❌ Erro ao limpar histórico', 'error');
    }
}

async function deleteOlderThan(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    if (!confirm(`Deletar todos os registros anteriores a ${date.toLocaleDateString('pt-BR')}?`)) {
        return;
    }
    
    try {
        const result = await window.historyAPI.deleteOlderThan(date.toISOString());
        
        if (result.success) {
            // Recarrega os dados
            await loadInitialData();
            showNotification(`✅ ${result.deletedCount} registro(s) antigo(s) deletado(s)!`, 'success');
        } else {
            showNotification('❌ ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao deletar registros antigos:', error);
        showNotification('❌ Erro ao deletar registros antigos', 'error');
    }
}

// NOVO: Função para mostrar notificações
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove após 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// MODIFICADO: Atualiza a função renderHistoryList para incluir botões de deletar
function renderHistoryList(data) {
    historyContainer.innerHTML = '';
    
    if (data.length === 0) {
        historyContainer.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">📭</div>
                <div class="text-lg text-gray-500 dark:text-gray-400 mb-2">
                    Nenhum histórico encontrado
                </div>
                <div class="text-sm text-gray-400 dark:text-gray-500">
                    Ajuste os filtros para ver mais resultados
                </div>
            </div>
        `;
        return;
    }

    data.forEach(item => {
        const itemDiv = document.createElement('div');
        const isSelected = selectedItems.has(item.id);
        
        itemDiv.className = `bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 transition-all duration-300 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 text-center relative ${
            isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
        }`;

        const formattedDate = new Date(item.timestamp).toLocaleString('pt-BR', { 
            timeStyle: 'short', 
            dateStyle: 'short'
        });
        const durationText = item.duration_seconds ? `${item.duration_seconds}s` : 'N/A';
        
        const modeEmojis = {
            'destaque': '✨',
            'sugestao': '💡', 
            'autocorrecao': '🤖',
            'directo': '🎯',
            'etico': '🛡️',
            'shadow': '👤'
        };
        
        const modeNames = {
            'destaque': 'Destaque',
            'sugestao': 'Sugestões',
            'autocorrecao': 'AutoCorreção', 
            'directo': 'Resposta Direta',
            'etico': 'Modo Ético',
            'shadow': 'Modo Shadow'
        };
        
        const modeEmoji = modeEmojis[item.mode] || '📝';
        const modeName = modeNames[item.mode] || item.mode;

        itemDiv.innerHTML = `
            <!-- Controles de seleção e deletar -->
            <div class="absolute top-2 right-2 flex gap-2">
                ${selectionMode ? `
                    <button onclick="toggleItemSelection(${item.id})" 
                            class="w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 hover:border-blue-400'
                            }">
                        ${isSelected ? '✓' : ''}
                    </button>
                ` : `
                    <button onclick="deleteHistoryItem(${item.id})" 
                            class="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                            title="Deletar registro">
                        🗑️
                    </button>
                `}
            </div>
            
            <div class="flex flex-col items-center justify-center mb-4 gap-3 mt-8">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${modeEmoji}</span>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${formattedDate}</span>
                </div>
                <div class="flex items-center gap-3 flex-wrap justify-center">
                    <span class="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">${modeName}</span>
                    <span class="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">${durationText}</span>
                </div>
            </div>
            <div class="space-y-4">
                <div>
                    <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-center gap-2">
                        📝 <span>Texto Capturado</span>
                    </p>
                    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 max-h-32 overflow-y-auto mx-auto max-w-4xl">
                        <pre class="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono break-words leading-relaxed text-center">${item.question_text}</pre>
                    </div>
                </div>
                <div>
                    <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-center gap-2">
                        🤖 <span>Resposta da IA</span>
                    </p>
                    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 max-h-40 overflow-y-auto mx-auto max-w-4xl">
                        <pre class="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed text-center">${item.response_text}</pre>
                    </div>
                </div>
            </div>
        `;
        historyContainer.appendChild(itemDiv);
    });
}

// Função inicial que carrega todos os dados
async function loadInitialData() {
    try {
        historyContainer.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">🔄</div>
                <div class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Carregando Histórico
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    Aguarde enquanto buscamos seus dados...
                </div>
            </div>
        `;
        
        fullHistoryData = await window.historyAPI.getAllHistory();
        
        // Marca todos os checkboxes como selecionados inicialmente
        filtersContainer.querySelectorAll('input[name="mode-filter"]').forEach(checkbox => {
            checkbox.checked = true;
        });
        
        applyFiltersAndRender();

        // Adiciona os listeners aos checkboxes
        filtersContainer.querySelectorAll('input[name="mode-filter"]').forEach(checkbox => {
            checkbox.addEventListener('change', applyFiltersAndRender);
        });

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        historyContainer.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">❌</div>
                <div class="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
                    Erro ao Carregar Dados
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Não foi possível carregar o histórico
                </div>
                <div class="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 max-w-md mx-auto">
                    Detalhes: ${error.message}
                </div>
            </div>
        `;
    }
}

// Redimensiona os gráficos quando a janela muda de tamanho (com debounce)
function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (fullHistoryData.length > 0) {
            applyFiltersAndRender();
        }
    }, 250);
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

// Observer para mudanças de tema
const themeObserver = new MutationObserver(() => {
    if (fullHistoryData.length > 0) {
        applyFiltersAndRender();
    }
});

themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
});

// Inicia o processo
loadInitialData();