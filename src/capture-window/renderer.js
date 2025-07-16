const { ipcRenderer } = require('electron');

let startX, startY;
let isDrawing = false;

// Cria um div que será nosso retângulo de seleção
const selectionDiv = document.createElement('div');
selectionDiv.style.position = 'absolute';
selectionDiv.style.border = '2px dashed #fff';
selectionDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
document.body.appendChild(selectionDiv);

document.body.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
    isDrawing = true;
});

document.body.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const width = currentX - startX;
    const height = currentY - startY;

    // Lógica para desenhar o retângulo em qualquer direção
    selectionDiv.style.left = (width > 0 ? startX : currentX) + 'px';
    selectionDiv.style.top = (height > 0 ? startY : currentY) + 'px';
    selectionDiv.style.width = Math.abs(width) + 'px';
    selectionDiv.style.height = Math.abs(height) + 'px';
});

document.body.addEventListener('mouseup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;
    
    const endX = e.clientX;
    const endY = e.clientY;

    const rect = {
        x: Math.round(Math.min(startX, endX)),
        y: Math.round(Math.min(startY, endY)),
        width: Math.round(Math.abs(endX - startX)),
        height: Math.round(Math.abs(endY - startY))
    };

    // Não envia se a área for muito pequena
    if (rect.width > 5 && rect.height > 5) {
        // Envia as coordenadas para o processo principal
        ipcRenderer.send('capture-area-selected', rect);
    } else {
        // Se a área for pequena, apenas fecha a janela
        ipcRenderer.send('capture-area-selected', null);
    }
});