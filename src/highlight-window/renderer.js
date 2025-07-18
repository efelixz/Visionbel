const { ipcRenderer } = require('electron');

// Sistema de Detecção e Análise
const detectionSystem = {
    // Análise de Texto (OCR + NLP)
    textAnalysis: {
        backgroundColor: 'rgba(255, 251, 0, 0.2)',
        border: '2px solid rgba(255, 184, 0, 0.8)',
        boxShadow: '0 0 10px rgba(255, 184, 0, 0.5)',
        confidence: 0, // Confiança da detecção OCR
        nlpScore: 0,   // Relevância NLP
        icon: '📝'
    },
    
    // Análise Semântica (LLM)
    semanticAnalysis: {
        backgroundColor: 'rgba(147, 112, 219, 0.2)',
        border: '2px solid rgba(147, 112, 219, 0.8)',
        boxShadow: '0 0 10px rgba(147, 112, 219, 0.5)',
        contextScore: 0, // Relevância contextual
        semanticScore: 0, // Pontuação semântica
        icon: '🧠'
    },
    
    // Análise Visual (Visão Computacional)
    visualAnalysis: {
        backgroundColor: 'rgba(0, 191, 255, 0.2)',
        border: '2px solid rgba(0, 191, 255, 0.8)',
        boxShadow: '0 0 10px rgba(0, 191, 255, 0.5)',
        patternScore: 0, // Força do padrão detectado
        visualScore: 0,  // Relevância visual
        icon: '👁️'
    },
    
    // Heatmap de Importância
    attentionHeatmap: {
        backgroundColor: 'rgba(255, 69, 0, 0.2)',
        border: '2px solid rgba(255, 69, 0, 0.8)',
        boxShadow: '0 0 10px rgba(255, 69, 0, 0.5)',
        attentionScore: 0, // Pontuação de atenção
        priorityScore: 0,  // Prioridade do elemento
        icon: '🎯'
    }
};

// Definição das cores por categoria
const categoryStyles = {
    // Textos, Provas e Perguntas
    palavras_chave: {
        backgroundColor: 'rgba(255, 251, 0, 0.2)',
        border: '2px solid rgba(255, 184, 0, 0.8)',
        boxShadow: '0 0 10px rgba(255, 184, 0, 0.5)',
        icon: '📝'
    },
    comandos_tarefa: {
        backgroundColor: 'rgba(147, 112, 219, 0.2)',
        border: '2px solid rgba(147, 112, 219, 0.8)',
        boxShadow: '0 0 10px rgba(147, 112, 219, 0.5)',
        icon: '❓'
    },
    conceitos_principais: {
        backgroundColor: 'rgba(0, 191, 255, 0.2)',
        border: '2px solid rgba(0, 191, 255, 0.8)',
        boxShadow: '0 0 10px rgba(0, 191, 255, 0.5)',
        icon: '📌'
    },
    pegadinhas: {
        backgroundColor: 'rgba(255, 69, 0, 0.2)',
        border: '2px solid rgba(255, 69, 0, 0.8)',
        boxShadow: '0 0 10px rgba(255, 69, 0, 0.5)',
        icon: '⚠️'
    },
    alternativas_similares: {
        backgroundColor: 'rgba(255, 165, 0, 0.2)',
        border: '2px solid rgba(255, 165, 0, 0.8)',
        boxShadow: '0 0 10px rgba(255, 165, 0, 0.5)',
        icon: '📊'
    },

    // Código Fonte
    erros_bugs: {
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        border: '2px solid rgba(255, 0, 0, 0.8)',
        boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)',
        icon: '🔧'
    },
    estrutura_logica: {
        backgroundColor: 'rgba(0, 255, 255, 0.2)',
        border: '2px solid rgba(0, 184, 255, 0.8)',
        boxShadow: '0 0 10px rgba(0, 184, 255, 0.5)',
        icon: '🧠'
    },
    ma_praticas: {
        backgroundColor: 'rgba(255, 0, 255, 0.2)',
        border: '2px solid rgba(255, 0, 255, 0.8)',
        boxShadow: '0 0 10px rgba(255, 0, 255, 0.5)',
        icon: '📌'
    },
    input_output: {
        backgroundColor: 'rgba(50, 205, 50, 0.2)',
        border: '2px solid rgba(50, 205, 50, 0.8)',
        boxShadow: '0 0 10px rgba(50, 205, 50, 0.5)',
        icon: '✅'
    },
    dependencias: {
        backgroundColor: 'rgba(139, 69, 19, 0.2)',
        border: '2px solid rgba(139, 69, 19, 0.8)',
        boxShadow: '0 0 10px rgba(139, 69, 19, 0.5)',
        icon: '📦'
    },

    // Interfaces e Apps
    elementos_interativos: {
        backgroundColor: 'rgba(30, 144, 255, 0.2)',
        border: '2px solid rgba(30, 144, 255, 0.8)',
        boxShadow: '0 0 10px rgba(30, 144, 255, 0.5)',
        icon: '🧭'
    },
    alertas_avisos: {
        backgroundColor: 'rgba(255, 140, 0, 0.2)',
        border: '2px solid rgba(255, 140, 0, 0.8)',
        boxShadow: '0 0 10px rgba(255, 140, 0, 0.5)',
        icon: '🚨'
    },
    foco_visual: {
        backgroundColor: 'rgba(218, 112, 214, 0.2)',
        border: '2px solid rgba(218, 112, 214, 0.8)',
        boxShadow: '0 0 10px rgba(218, 112, 214, 0.5)',
        icon: '👁️'
    },
    campos_sensiveis: {
        backgroundColor: 'rgba(128, 0, 0, 0.2)',
        border: '2px solid rgba(128, 0, 0, 0.8)',
        boxShadow: '0 0 10px rgba(128, 0, 0, 0.5)',
        icon: '🔒'
    },
    call_to_action: {
        backgroundColor: 'rgba(0, 128, 0, 0.2)',
        border: '2px solid rgba(0, 128, 0, 0.8)',
        boxShadow: '0 0 10px rgba(0, 128, 0, 0.5)',
        icon: '🎯'
    },

    // Gráficos e Tabelas
    tendencias: {
        backgroundColor: 'rgba(65, 105, 225, 0.2)',
        border: '2px solid rgba(65, 105, 225, 0.8)',
        boxShadow: '0 0 10px rgba(65, 105, 225, 0.5)',
        icon: '📈'
    },
    numeros_discrepantes: {
        backgroundColor: 'rgba(220, 20, 60, 0.2)',
        border: '2px solid rgba(220, 20, 60, 0.8)',
        boxShadow: '0 0 10px rgba(220, 20, 60, 0.5)',
        icon: '🧮'
    },
    elementos_mal_posicionados: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        border: '2px solid rgba(255, 215, 0, 0.8)',
        boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
        icon: '🟨'
    },
    insights_chave: {
        backgroundColor: 'rgba(75, 0, 130, 0.2)',
        border: '2px solid rgba(75, 0, 130, 0.8)',
        boxShadow: '0 0 10px rgba(75, 0, 130, 0.5)',
        icon: '🔑'
    },

    // Material Didático
    definicoes_formulas: {
        backgroundColor: 'rgba(0, 139, 139, 0.2)',
        border: '2px solid rgba(0, 139, 139, 0.8)',
        boxShadow: '0 0 10px rgba(0, 139, 139, 0.5)',
        icon: '🧩'
    },
    questoes_relevantes: {
        backgroundColor: 'rgba(186, 85, 211, 0.2)',
        border: '2px solid rgba(186, 85, 211, 0.8)',
        boxShadow: '0 0 10px rgba(186, 85, 211, 0.5)',
        icon: '❓'
    },
    exemplos: {
        backgroundColor: 'rgba(255, 182, 193, 0.2)',
        border: '2px solid rgba(255, 182, 193, 0.8)',
        boxShadow: '0 0 10px rgba(255, 182, 193, 0.5)',
        icon: '💡'
    },
    comparacoes: {
        backgroundColor: 'rgba(176, 196, 222, 0.2)',
        border: '2px solid rgba(176, 196, 222, 0.8)',
        boxShadow: '0 0 10px rgba(176, 196, 222, 0.5)',
        icon: '⚖️'
    }
};

// Função para detectar tipo de link
function detectLinkType(text) {
    // Regex para detectar URLs
    const urlPattern = /https?:\/\/[\w\-]+(\.[\w\-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+/;
    
    // Regex específica para Google Drive
    const googleDrivePattern = /drive\.google\.com\/(drive\/folders\/|file\/d\/|spreadsheets\/d\/)[a-zA-Z0-9-_]+/;
    
    if (googleDrivePattern.test(text)) {
        return 'google_drive_link';
    } else if (urlPattern.test(text)) {
        return 'url_link';
    }
    return null;
}

// Função para criar um destaque com animação
function createHighlight(x, y, width, height, category, text) {
    // Detecta automaticamente se é um link
    const linkType = detectLinkType(text);
    if (linkType) {
        category = linkType;
    }

    const highlightDiv = document.createElement('div');
    const style = categoryStyles[category] || categoryStyles.palavras_chave;
    
    // Análise integrada
    const analysis = {
        ocr: detectionSystem.textAnalysis,
        llm: detectionSystem.semanticAnalysis,
        vision: detectionSystem.visualAnalysis,
        attention: detectionSystem.attentionHeatmap
    };
    
    // Calcula pontuação composta
    const compositeScore = calculateCompositeScore(text, analysis);
    
    // Ajusta opacidade baseado na pontuação
    const opacity = Math.min(0.2 + (compositeScore * 0.6), 0.8);
    
    // Aplica estilo com base na análise
    Object.assign(highlightDiv.style, {
        position: 'absolute',
        left: x + 'px',
        top: y + 'px',
        width: width + 'px',
        height: height + 'px',
        backgroundColor: `rgba(255, 251, 0, ${opacity})`,
        border: style.border,
        boxShadow: style.boxShadow,
        borderRadius: '3px',
        boxSizing: 'border-box',
        animation: 'pulse 2s infinite',
        zIndex: Math.floor(1000 + (compositeScore * 100)), // Prioridade visual
        cursor: 'pointer'
    });
    
    // Tooltip avançado com métricas
    highlightDiv.title = `${style.icon} ${category.toUpperCase()}\n` +
                        `Confiança OCR: ${analysis.ocr.confidence}%\n` +
                        `Relevância Semântica: ${analysis.llm.semanticScore}%\n` +
                        `Força do Padrão: ${analysis.vision.patternScore}%\n` +
                        `Prioridade: ${analysis.attention.priorityScore}%\n` +
                        `Texto: ${text}`;
    
    // Eventos interativos
    setupInteractiveEvents(highlightDiv, text, analysis);
    
    return highlightDiv;
}

// Função para calcular pontuação composta
function calculateCompositeScore(text, analysis) {
    // Pesos para cada tipo de análise
    const weights = {
        ocr: 0.25,
        llm: 0.30,
        vision: 0.25,
        attention: 0.20
    };
    
    // Calcula pontuação ponderada
    return (
        (analysis.ocr.confidence * weights.ocr) +
        (analysis.llm.semanticScore * weights.llm) +
        (analysis.vision.patternScore * weights.vision) +
        (analysis.attention.priorityScore * weights.attention)
    ) / 100; // Normaliza para 0-1
}

// Configuração de eventos interativos
function setupInteractiveEvents(element, text, analysis) {
    // Clique para copiar com feedback visual
    element.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        
        // Feedback visual avançado
        const originalStyle = element.style.cssText;
        element.style.transform = 'scale(1.05)';
        element.style.border = '2px solid #00ff00';
        
        setTimeout(() => {
            element.style.cssText = originalStyle;
        }, 500);
    });
    
    // Hover para mostrar heatmap
    element.addEventListener('mouseover', () => {
        const heatmapOverlay = createHeatmapOverlay(analysis.attention.attentionScore);
        element.appendChild(heatmapOverlay);
    });
    
    element.addEventListener('mouseout', () => {
        const heatmap = element.querySelector('.heatmap-overlay');
        if (heatmap) heatmap.remove();
    });
}

// Criação de overlay de heatmap
function createHeatmapOverlay(attentionScore) {
    const overlay = document.createElement('div');
    overlay.className = 'heatmap-overlay';
    
    // Gradiente baseado na pontuação de atenção
    const intensity = Math.min(attentionScore / 100, 1);
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
            45deg,
            rgba(255, 0, 0, ${intensity * 0.3}),
            rgba(255, 255, 0, ${intensity * 0.5})
        );
        border-radius: 3px;
        pointer-events: none;
    `;
    
    return overlay;
}

// Adiciona a animação de pulso ao documento
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.02); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
    }
    
    /* Estilo para a lista lateral */
    #summary-list {
        position: fixed;
        right: 10px;
        top: 10px;
        max-width: 300px;
        max-height: 80vh;
        overflow-y: auto;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 8px;
        padding: 10px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 2000;
    }
    
    #summary-list h3 {
        margin: 0 0 10px 0;
        padding-bottom: 5px;
        border-bottom: 1px solid #ddd;
    }
    
    .summary-item {
        margin: 5px 0;
        padding: 5px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .summary-item:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }
`;
document.head.appendChild(style);

// Função para criar a lista lateral de resumo
function createSummaryList(highlights) {
    const summaryList = document.createElement('div');
    summaryList.id = 'summary-list';
    summaryList.innerHTML = '<h3>📌 Resumo Inteligente</h3>';
    
    const categorizedHighlights = {};
    
    // Agrupa highlights por categoria
    highlights.forEach(highlight => {
        if (!categorizedHighlights[highlight.category]) {
            categorizedHighlights[highlight.category] = [];
        }
        categorizedHighlights[highlight.category].push(highlight);
    });
    
    // Cria itens do resumo por categoria
    Object.entries(categorizedHighlights).forEach(([category, items]) => {
        const style = categoryStyles[category] || categoryStyles.palavras_chave;
        items.forEach(item => {
            const summaryItem = document.createElement('div');
            summaryItem.className = 'summary-item';
            summaryItem.textContent = `${style.icon} ${item.text}`;
            summaryItem.addEventListener('click', () => {
                navigator.clipboard.writeText(item.text);
                summaryItem.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
                setTimeout(() => {
                    summaryItem.style.backgroundColor = '';
                }, 500);
            });
            summaryList.appendChild(summaryItem);
        });
    });
    
    return summaryList;
}

// Ouve as coordenadas e dimensões enviadas pelo processo principal
ipcRenderer.on('draw-highlight', (event, highlights) => {
    // Limpa destaques anteriores
    document.body.innerHTML = '';
    
    // Cria destaques para cada área
    highlights.forEach(({ x, y, width, height, category, text }) => {
        const highlightDiv = createHighlight(x, y, width, height, category, text);
        document.body.appendChild(highlightDiv);
    });
    
    // Adiciona a lista lateral de resumo
    const summaryList = createSummaryList(highlights);
    document.body.appendChild(summaryList);
    
    // Fecha a janela de destaque após 15 segundos (aumentado para dar mais tempo de leitura)
    setTimeout(() => {
        window.close();
    }, 15000);
});

// Fecha a janela se for clicada fora de um destaque ou da lista de resumo
window.addEventListener('click', (e) => {
    if (e.target === document.body) {
        window.close();
    }
});