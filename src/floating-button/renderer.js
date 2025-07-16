const assistantButton = document.getElementById('assistant-button');
let isDragging = false;
let dragStartTime = 0;

// Função para salvar posição
function savePosition(x, y) {
    localStorage.setItem('assistantPosition', JSON.stringify({ x, y }));
}

// Função para carregar posição salva
function loadSavedPosition() {
    const saved = localStorage.getItem('assistantPosition');
    if (saved) {
        const { x, y } = JSON.parse(saved);
        window.floatingButtonAPI.setPosition(x, y);
    }
}

// Detecta início do arraste
assistantButton.addEventListener('mousedown', (e) => {
    isDragging = false;
    dragStartTime = Date.now();
    document.body.classList.add('dragging');
});

// Detecta movimento durante o arraste
document.addEventListener('mousemove', (e) => {
    if (Date.now() - dragStartTime > 100) { // Só considera arraste após 100ms
        isDragging = true;
    }
});

// Detecta fim do arraste
document.addEventListener('mouseup', (e) => {
    document.body.classList.remove('dragging');
    
    if (isDragging) {
        // Se foi um arraste, salva a nova posição
        window.floatingButtonAPI.getCurrentPosition().then(({ x, y }) => {
            savePosition(x, y);
        });
        isDragging = false;
    } else {
        // Se foi um clique rápido, executa a ação
        if (Date.now() - dragStartTime < 200) {
            window.floatingButtonAPI.buttonClicked();
        }
    }
});

// Efeitos visuais baseados na posição
function checkEdgeProximity() {
    window.floatingButtonAPI.getScreenBounds().then(({ screenWidth, screenHeight, windowX, windowY }) => {
        const threshold = 50;
        const isNearEdge = windowX < threshold || 
                          windowY < threshold || 
                          windowX > screenWidth - 60 - threshold || 
                          windowY > screenHeight - 60 - threshold;
        
        if (isNearEdge) {
            assistantButton.classList.add('near-edge');
        } else {
            assistantButton.classList.remove('near-edge');
        }
    });
}

// Verifica proximidade das bordas periodicamente
setInterval(checkEdgeProximity, 1000);

// Carrega posição salva ao inicializar
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadSavedPosition, 100);
});

// Previne seleção de texto durante o arraste
document.addEventListener('selectstart', (e) => {
    e.preventDefault();
});