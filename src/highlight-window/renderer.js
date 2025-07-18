const { ipcRenderer } = require('electron');

let currentTool = null;
let isSelecting = false;
let startX, startY;

const contentDiv = document.getElementById('content');
const overlayDiv = document.getElementById('overlay');
const toolButtons = document.querySelectorAll('.tool-button');

// Inicializa a ferramenta
ipcRenderer.on('set-content', (event, content) => {
    contentDiv.innerHTML = content;
    initializeHighlighting();
});

function initializeHighlighting() {
    // Configura os botões da barra de ferramentas
    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            toolButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentTool = button.dataset.type;
        });
    });

    // Eventos de seleção
    contentDiv.addEventListener('mousedown', startSelection);
    contentDiv.addEventListener('mousemove', updateSelection);
    contentDiv.addEventListener('mouseup', endSelection);
}

function detectContentType(content) {
    // Detecta código
    if (content.match(/[{};]/) || 
        content.match(/(function|class|const|let|var|if|for|while|return)\b/) || 
        content.match(/^\s*[\w]+\s*\([^)]*\)/) ||
        content.match(/<[^>]+>/) // HTML tags
    ) {
        return 'code';
    }

    // Detecta fórmulas matemáticas
    if (content.match(/[+\-*/=^]/) && 
        content.match(/\d/) || 
        content.match(/[∑∏∫√π∆]/) ||
        content.match(/\([^)]+\)/) && content.match(/[\d+\-*/]/) ||
        content.match(/[a-z][\d²³]/) // Variáveis com expoentes
    ) {
        return 'formula';
    }

    // Detecta alternativas/opções
    if (content.match(/^\s*[A-E][).:-]\s+/) || // Padrão A), B), etc
        content.match(/^\s*\([✓xX]\)/) || // Marcadores de seleção
        content.match(/^\s*□\s+/) || // Checkbox vazio
        content.match(/\bcorreta?\b|\bincorreta?\b/i) // Palavras-chave
    ) {
        return 'option';
    }

    // Padrão: texto
    return 'text';
}

function createHighlightElement(type, x, y) {
    const highlight = document.createElement('div');
    highlight.className = `highlight-element highlight-${type}`;
    highlight.style.left = `${x}px`;
    highlight.style.top = `${y}px`;
    highlight.dataset.type = type;
    
    // Adiciona efeito de pulso ao criar
    highlight.style.animation = 'pulse 0.5s ease-out';
    
    // Adiciona ícone indicador do tipo
    const icon = document.createElement('span');
    icon.className = 'type-indicator';
    icon.textContent = getTypeIcon(type);
    highlight.appendChild(icon);
    
    return highlight;
}

function getTypeIcon(type) {
    const icons = {
        code: '💻',
        formula: '📐',
        text: '📝',
        option: '✓'
    };
    return icons[type] || '📌';
}

function startSelection(e) {
    if (!currentTool && !isSelecting) {
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;

        const highlight = createHighlightElement('detecting', startX, startY);
        overlayDiv.appendChild(highlight);
        
        // Adiciona efeito de scanner
        highlight.classList.add('scanning');
    } else if (currentTool && !isSelecting) {
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;

        const highlight = createHighlightElement(currentTool, startX, startY);
        overlayDiv.appendChild(highlight);
    }
}

function updateSelection(e) {
    if (!isSelecting) return;

    const highlight = overlayDiv.lastElementChild;
    const width = e.clientX - startX;
    const height = e.clientY - startY;

    highlight.style.left = `${width > 0 ? startX : e.clientX}px`;
    highlight.style.top = `${height > 0 ? startY : e.clientY}px`;
    highlight.style.width = `${Math.abs(width)}px`;
    highlight.style.height = `${Math.abs(height)}px`;

    // Atualiza a posição do ícone
    const icon = highlight.querySelector('.type-indicator');
    if (icon) {
        icon.style.left = `${Math.abs(width) - 20}px`;
        icon.style.top = '5px';
    }
}

function getContentDescription(type, content) {
    const descriptions = {
        code: 'Trecho de código identificado:\n' + content,
        formula: 'Expressão matemática:\n' + content,
        text: 'Texto destacado:\n' + content,
        option: 'Alternativa selecionada:\n' + content
    };
    return descriptions[type] || content;
}

function createTooltip(highlight, type, content) {
    const tooltip = document.createElement('div');
    tooltip.className = 'highlight-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-header">
            <span class="tooltip-icon">${getTypeIcon(type)}</span>
            <span class="tooltip-type">${type.toUpperCase()}</span>
        </div>
        <div class="tooltip-content">${getContentDescription(type, content)}</div>
    `;
    return tooltip;
}

function updateTooltipPosition(tooltip, highlight, e) {
    const rect = highlight.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Posiciona o tooltip evitando que saia da tela
    let left = e.clientX + 10;
    let top = e.clientY + 10;
    
    if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    
    if (top + tooltipRect.height > window.innerHeight) {
        top = window.innerHeight - tooltipRect.height - 10;
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function analyzeRelevance(content, type) {
    const relevancePatterns = {
        code: {
            high: /(for|while|do).*\{[^}]*for|while|do|recursion|recursive|nested loop/i,
            medium: /(if|switch|try|catch|function|class|method|algorithm)/i,
            low: /.+/
        },
        formula: {
            high: /([+\-*/^].*){3,}|\b(integral|derivative|lim|sum|product)\b/i,
            medium: /[+\-*/^=]|\b(sqrt|log|sin|cos|tan)\b/i,
            low: /.+/
        },
        text: {
            high: /\b(importante|crucial|essencial|fundamental|chave|crítico|relevante)\b/i,
            medium: /\b(nota|observação|atenção|destaque|considere)\b/i,
            low: /.+/
        },
        option: {
            high: /\b(correta|verdadeira|certa)\b/i,
            medium: /\b(possível|provável|talvez)\b/i,
            low: /.+/
        }
    };

    const patterns = relevancePatterns[type] || relevancePatterns.text;
    if (patterns.high.test(content)) return 'high';
    if (patterns.medium.test(content)) return 'medium';
    return 'low';
}

function applyRelevanceZoom(highlight, content, type) {
    const relevance = analyzeRelevance(content, type);
    const zoomLevels = {
        high: 1.15,
        medium: 1.08,
        low: 1.02
    };

    highlight.dataset.relevance = relevance;
    highlight.style.setProperty('--zoom-level', zoomLevels[relevance]);
}

let highlightOrder = [];
let currentHighlightIndex = -1;

function addToNavigationOrder(highlight) {
    const index = highlightOrder.length + 1;
    highlight.dataset.order = index;
    highlightOrder.push(highlight);
    
    // Adiciona indicador de ordem
    const orderIndicator = document.createElement('div');
    orderIndicator.className = 'order-indicator';
    orderIndicator.textContent = index;
    highlight.appendChild(orderIndicator);

    // Atualiza navegação
    updateNavigationPanel();
}

function updateNavigationPanel() {
    const navPanel = document.getElementById('navigation-panel');
    navPanel.innerHTML = '';

    highlightOrder.forEach((highlight, index) => {
        const navItem = document.createElement('div');
        navItem.className = 'nav-item';
        if (index === currentHighlightIndex) {
            navItem.classList.add('current');
        }

        const number = document.createElement('span');
        number.className = 'nav-number';
        number.textContent = index + 1;

        const type = document.createElement('span');
        type.className = 'nav-type';
        type.textContent = getTypeLabel(highlight.dataset.type);

        const preview = document.createElement('span');
        preview.className = 'nav-preview';
        preview.textContent = truncateText(highlight.dataset.content, 30);

        navItem.appendChild(number);
        navItem.appendChild(type);
        navItem.appendChild(preview);

        navItem.addEventListener('click', () => navigateToHighlight(index));
        navPanel.appendChild(navItem);
    });
}

function getTypeLabel(type) {
    const labels = {
        text: 'Enunciado',
        code: 'Código',
        formula: 'Fórmula',
        option: 'Alternativa'
    };
    return labels[type] || type;
}

function truncateText(text, maxLength) {
    return text.length > maxLength 
        ? text.substring(0, maxLength) + '...' 
        : text;
}

function navigateToHighlight(index) {
    if (index < 0 || index >= highlightOrder.length) return;

    currentHighlightIndex = index;
    const highlight = highlightOrder[index];
    
    // Remove destaque anterior
    highlightOrder.forEach(h => h.classList.remove('current-highlight'));
    
    // Adiciona novo destaque
    highlight.classList.add('current-highlight');
    
    // Scroll suave até o elemento
    highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Atualiza painel de navegação
    updateNavigationPanel();
}

function endSelection() {
    if (!isSelecting) return;
    isSelecting = false;

    const highlight = overlayDiv.lastElementChild;
    const rect = highlight.getBoundingClientRect();
    const content = getContentInBounds(rect);

    if (!currentTool) {
        const detectedType = detectContentType(content);
        highlight.className = `highlight-element highlight-${detectedType}`;
        highlight.dataset.type = detectedType;
        highlight.dataset.content = content;

        highlight.classList.add('detected');
        setTimeout(() => highlight.classList.remove('detected'), 1000);
    } else {
        highlight.dataset.content = content;
    }

    // Adiciona à ordem de navegação
    addToNavigationOrder(highlight);

    // Aplica zoom baseado na relevância
    applyRelevanceZoom(highlight, content, detectedType);

    highlight.classList.add('detected');
    setTimeout(() => highlight.classList.remove('detected'), 1000);
}

// Adiciona navegação por teclado
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        navigateToHighlight(currentHighlightIndex + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        navigateToHighlight(currentHighlightIndex - 1);
    }
});

// Adicione estes estilos ao arquivo index.html na seção <style>
/*
.highlight-tooltip {
    position: fixed;
    background: rgba(255, 255, 255, 0.98);
    border-radius: 8px;
    padding: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 300px;
    z-index: 1000;
    font-size: 14px;
    pointer-events: none;
    transition: opacity 0.2s ease;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.tooltip-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.tooltip-icon {
    font-size: 16px;
}

.tooltip-type {
    font-weight: 600;
    color: #1a1a1a;
}

.tooltip-content {
    white-space: pre-wrap;
    color: #4a4a4a;
    max-height: 200px;
    overflow-y: auto;
    line-height: 1.4;
}

.dark .highlight-tooltip {
    background: rgba(30, 30, 30, 0.98);
    border-color: rgba(255, 255, 255, 0.1);
}

.dark .tooltip-type {
    color: #e5e5e5;
}

.dark .tooltip-content {
    color: #b0b0b0;
}
*/

// Adicione estes estilos ao arquivo index.html na seção <style>
/*
.highlight-element {
    --zoom-level: 1;
    transform-origin: center;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.highlight-element[data-relevance="high"] {
    border-width: 3px;
}

.highlight-element[data-relevance="medium"] {
    border-width: 2px;
}

.zoom-active {
    transform: scale(var(--zoom-level));
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.zoom-active[data-relevance="high"] {
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2);
}

.dark .zoom-active {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.dark .zoom-active[data-relevance="high"] {
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
}
*/

// Função para processar o conteúdo destacado
function processHighlightedContent(element) {
    const type = element.dataset.type;
    const rect = element.getBoundingClientRect();
    const content = getContentInBounds(rect);

    return {
        type,
        content,
        bounds: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        }
    };
}

// Função auxiliar para obter o conteúdo dentro de uma área
function getContentInBounds(bounds) {
    const range = document.createRange();
    const elements = [];

    // Função recursiva para encontrar elementos de texto dentro dos limites
    function findTextInBounds(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const rect = range.setStart(node, 0) && range.getBoundingClientRect();
            if (rectsOverlap(rect, bounds)) {
                elements.push(node.textContent);
            }
        } else {
            node.childNodes.forEach(findTextInBounds);
        }
    }

    findTextInBounds(contentDiv);
    return elements.join(' ');
}

// Função auxiliar para verificar sobreposição de retângulos
function rectsOverlap(rect1, rect2) {
    return !(rect1.right < rect2.left || 
            rect1.left > rect2.right || 
            rect1.bottom < rect2.top || 
            rect1.top > rect2.bottom);
}

// Configuração dos modos de entrada
const INPUT_MODES = {
    SCREEN_CAPTURE: 'screen',
    IMAGE_UPLOAD: 'image',
    PDF_OCR: 'pdf',
    WEB_OVERLAY: 'web'
};

let currentInputMode = null;

// Inicialização dos modos de entrada
ipcRenderer.on('initialize-input-mode', (event, mode, content) => {
    currentInputMode = mode;
    switch (mode) {
        case INPUT_MODES.SCREEN_CAPTURE:
            initializeScreenCapture(content);
            break;
        case INPUT_MODES.IMAGE_UPLOAD:
            initializeImageUpload(content);
            break;
        case INPUT_MODES.PDF_OCR:
            initializePDFWithOCR(content);
            break;
        case INPUT_MODES.WEB_OVERLAY:
            initializeWebOverlay(content);
            break;
    }
});

// Modo: Captura de Tela
function initializeScreenCapture(streamContent) {
    contentDiv.innerHTML = '';
    const video = document.createElement('video');
    video.autoplay = true;
    video.srcObject = streamContent;
    contentDiv.appendChild(video);
    
    // Adiciona controles de captura
    const captureControls = document.createElement('div');
    captureControls.className = 'capture-controls';
    captureControls.innerHTML = `
        <button class="capture-button" title="Capturar área">
            <span class="icon">📷</span>
        </button>
        <button class="stream-button" title="Iniciar/Parar stream">
            <span class="icon">🎥</span>
        </button>
    `;
    overlayDiv.appendChild(captureControls);
}

// Modo: Upload de Imagem
function initializeImageUpload(imageContent) {
    contentDiv.innerHTML = '';
    if (imageContent) {
        const img = document.createElement('img');
        img.src = imageContent;
        img.className = 'uploaded-image';
        contentDiv.appendChild(img);
    }
    
    // Adiciona área de drop e botão de upload
    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';
    dropZone.innerHTML = `
        <div class="drop-message">
            <span class="icon">🖼️</span>
            <p>Arraste uma imagem ou clique para selecionar</p>
        </div>
        <input type="file" accept="image/*" style="display: none">
    `;
    overlayDiv.appendChild(dropZone);
}

// Modo: PDF com OCR
function initializePDFWithOCR(pdfContent) {
    contentDiv.innerHTML = '';
    
    // Adiciona visualizador de PDF
    const pdfViewer = document.createElement('div');
    pdfViewer.className = 'pdf-viewer';
    pdfViewer.innerHTML = `
        <div class="pdf-toolbar">
            <button class="ocr-button" title="Executar OCR">
                <span class="icon">📄</span> OCR
            </button>
            <div class="page-controls">
                <button class="prev-page">◀</button>
                <span class="page-info">Página 1 de 1</span>
                <button class="next-page">▶</button>
            </div>
        </div>
        <div class="pdf-content"></div>
    `;
    contentDiv.appendChild(pdfViewer);
    
    if (pdfContent) {
        loadPDFContent(pdfContent);
    }
}

// Modo: Overlay Web
function initializeWebOverlay(domContent) {
    // Configura o modo overlay
    document.body.classList.add('overlay-mode');
    
    // Adiciona barra de ferramentas flutuante
    const toolbar = document.createElement('div');
    toolbar.className = 'floating-toolbar';
    toolbar.innerHTML = `
        <button class="inspect-button" title="Inspecionar elemento">
            <span class="icon">🔍</span>
        </button>
        <button class="highlight-button" title="Destacar elemento">
            <span class="icon">✨</span>
        </button>
        <button class="extract-button" title="Extrair conteúdo">
            <span class="icon">📋</span>
        </button>
    `;
    document.body.appendChild(toolbar);
    
    // Inicializa observador do DOM
    initializeDOMObserver();
}

// Funções auxiliares para o modo Web Overlay
function initializeDOMObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                updateHighlights();
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

function updateHighlights() {
    const highlights = document.querySelectorAll('.highlight-element');
    highlights.forEach(highlight => {
        const rect = highlight.getBoundingClientRect();
        highlight.style.position = 'fixed';
        highlight.style.left = `${rect.left}px`;
        highlight.style.top = `${rect.top}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
    });
}