const { ipcRenderer } = require('electron');

// Variáveis para controle de arraste
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Elementos
const dragArea = document.getElementById('drag-area');
const container = document.getElementById('container');

// Função para iniciar o arraste
function startDrag(e) {
    isDragging = true;
    
    // Calcula o offset do mouse em relação à janela
    const rect = container.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    // Adiciona classe visual de arraste
    container.style.cursor = 'grabbing';
    
    // Previne seleção de texto
    e.preventDefault();
}

// Função para mover a janela
function drag(e) {
    if (!isDragging) return;
    
    // Calcula nova posição
    const newX = e.screenX - dragOffset.x;
    const newY = e.screenY - dragOffset.y;
    
    // Envia comando para mover a janela
    ipcRenderer.send('move-thinking-window', { x: newX, y: newY });
    
    e.preventDefault();
}

// Função para parar o arraste
function stopDrag() {
    if (!isDragging) return;
    
    isDragging = false;
    container.style.cursor = 'default';
}

// Event listeners para mouse
dragArea.addEventListener('mousedown', startDrag);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', stopDrag);

// Event listeners para touch (dispositivos móveis)
dragArea.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startDrag({
        clientX: touch.clientX,
        clientY: touch.clientY,
        screenX: touch.screenX,
        screenY: touch.screenY,
        preventDefault: () => e.preventDefault()
    });
});

document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    drag({
        screenX: touch.screenX,
        screenY: touch.screenY,
        preventDefault: () => e.preventDefault()
    });
});

document.addEventListener('touchend', stopDrag);

// Previne o menu de contexto
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Adiciona efeito hover na área de arraste
dragArea.addEventListener('mouseenter', () => {
    if (!isDragging) {
        container.style.cursor = 'grab';
    }
});

dragArea.addEventListener('mouseleave', () => {
    if (!isDragging) {
        container.style.cursor = 'default';
    }
});

console.log('Thinking window renderer carregado - funcionalidade de arraste ativada');