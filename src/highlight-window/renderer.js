const { ipcRenderer } = require('electron');

// Ouve as coordenadas e dimensões enviadas pelo processo principal
ipcRenderer.on('draw-highlight', (event, { x, y, width, height }) => {
    const highlightDiv = document.createElement('div');
    
    highlightDiv.style.position = 'absolute';
    highlightDiv.style.left = x + 'px';
    highlightDiv.style.top = y + 'px';
    highlightDiv.style.width = width + 'px';
    highlightDiv.style.height = height + 'px';

    // Estilo do Destaque
    highlightDiv.style.backgroundColor = 'rgba(255, 251, 0, 0.4)'; // Amarelo translúcido
    highlightDiv.style.border = '2px solid #FFB800';
    highlightDiv.style.borderRadius = '5px';
    highlightDiv.style.boxSizing = 'border-box';

    document.body.appendChild(highlightDiv);

    // Fecha a janela de destaque após 3 segundos
    setTimeout(() => {
        window.close();
    }, 3000);
});

// Fecha a janela se for clicada
window.addEventListener('click', () => window.close());