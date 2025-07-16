const { ipcRenderer } = require('electron');

// Definição das cores por categoria
const categoryStyles = {
    palavras_chave: {
        backgroundColor: 'rgba(255, 251, 0, 0.2)',
        border: '2px solid rgba(255, 184, 0, 0.8)',
        boxShadow: '0 0 10px rgba(255, 184, 0, 0.5)'
    },
    pseudocodigo: {
        backgroundColor: 'rgba(0, 255, 255, 0.2)',
        border: '2px solid rgba(0, 184, 255, 0.8)',
        boxShadow: '0 0 10px rgba(0, 184, 255, 0.5)'
    },
    alternativas: {
        backgroundColor: 'rgba(0, 255, 0, 0.2)',
        border: '2px solid rgba(0, 184, 0, 0.8)',
        boxShadow: '0 0 10px rgba(0, 184, 0, 0.5)'
    },
    formulas: {
        backgroundColor: 'rgba(255, 0, 255, 0.2)',
        border: '2px solid rgba(255, 0, 255, 0.8)',
        boxShadow: '0 0 10px rgba(255, 0, 255, 0.5)'
    },
    estruturas: {
        backgroundColor: 'rgba(255, 128, 0, 0.2)',
        border: '2px solid rgba(255, 128, 0, 0.8)',
        boxShadow: '0 0 10px rgba(255, 128, 0, 0.5)'
    },
    ambiguidades: {
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        border: '2px solid rgba(255, 0, 0, 0.8)',
        boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)'
    }
};

// Função para criar um destaque com animação
function createHighlight(x, y, width, height, category, text) {
    const highlightDiv = document.createElement('div');
    
    highlightDiv.style.position = 'absolute';
    highlightDiv.style.left = x + 'px';
    highlightDiv.style.top = y + 'px';
    highlightDiv.style.width = width + 'px';
    highlightDiv.style.height = height + 'px';

    // Aplica o estilo da categoria
    const style = categoryStyles[category];
    Object.assign(highlightDiv.style, style);

    highlightDiv.style.borderRadius = '3px';
    highlightDiv.style.boxSizing = 'border-box';
    highlightDiv.style.animation = 'pulse 2s infinite';
    highlightDiv.style.zIndex = '1000';

    // Adiciona tooltip com categoria e texto
    highlightDiv.title = `${category.toUpperCase()}: ${text}`;

    return highlightDiv;
}

// Adiciona a animação de pulso ao documento
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.02); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Ouve as coordenadas e dimensões enviadas pelo processo principal
ipcRenderer.on('draw-highlight', (event, highlights) => {
    // Limpa destaques anteriores
    document.body.innerHTML = '';
    
    // Cria destaques para cada área
    highlights.forEach(({ x, y, width, height, category, text }) => {
        const highlightDiv = createHighlight(x, y, width, height, category, text);
        document.body.appendChild(highlightDiv);
    });

    // Fecha a janela de destaque após 8 segundos
    setTimeout(() => {
        window.close();
    }, 8000);
});

// Fecha a janela se for clicada
window.addEventListener('click', () => window.close());