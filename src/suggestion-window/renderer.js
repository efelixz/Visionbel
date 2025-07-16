const suggestionsContent = document.getElementById('suggestions-content');
const closeBtn = document.getElementById('closeBtn');
const footer = document.getElementById('footer');

// Função para formatar o conteúdo das sugestões
function formatSuggestionContent(suggestions, mode) {
    // Detecta se é código ou texto
    const isCode = suggestions.includes('```') || 
                   suggestions.includes('function') || 
                   suggestions.includes('const ') || 
                   suggestions.includes('let ') || 
                   suggestions.includes('var ') ||
                   suggestions.includes('{') && suggestions.includes('}');
    
    let formattedContent = '';
    
    if (isCode) {
        // Se contém blocos de código markdown
        if (suggestions.includes('```')) {
            const parts = suggestions.split('```');
            for (let i = 0; i < parts.length; i++) {
                if (i % 2 === 0) {
                    // Texto normal
                    if (parts[i].trim()) {
                        formattedContent += `<div class="suggestion-text">${escapeHtml(parts[i].trim())}</div>`;
                    }
                } else {
                    // Bloco de código
                    const codeContent = parts[i].replace(/^\w+\n/, ''); // Remove language identifier
                    formattedContent += `<div class="code-block">${escapeHtml(codeContent)}</div>`;
                }
            }
        } else {
            // Código simples sem markdown
            formattedContent = `<div class="code-block">${escapeHtml(suggestions)}</div>`;
        }
    } else {
        // Texto normal - processa listas e parágrafos
        const lines = suggestions.split('\n');
        let currentList = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
                currentList.push(trimmedLine.substring(2));
            } else {
                if (currentList.length > 0) {
                    formattedContent += '<ul class="suggestion-list">';
                    currentList.forEach(item => {
                        formattedContent += `<li>${escapeHtml(item)}</li>`;
                    });
                    formattedContent += '</ul>';
                    currentList = [];
                }
                
                if (trimmedLine) {
                    if (trimmedLine.endsWith(':') && trimmedLine.length < 50) {
                        formattedContent += `<div class="suggestion-title">${escapeHtml(trimmedLine)}</div>`;
                    } else {
                        formattedContent += `<div class="suggestion-text">${escapeHtml(trimmedLine)}</div>`;
                    }
                }
            }
        }
        
        // Processa lista restante
        if (currentList.length > 0) {
            formattedContent += '<ul class="suggestion-list">';
            currentList.forEach(item => {
                formattedContent += `<li>${escapeHtml(item)}</li>`;
            });
            formattedContent += '</ul>';
        }
    }
    
    return formattedContent;
}

// Função para escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Recebe sugestões da IA
window.suggestionAPI.onReceiveSuggestions((event, { suggestions, mode }) => {
    // Limpa conteúdo anterior
    suggestionsContent.innerHTML = '';
    footer.innerHTML = '';
    footer.classList.add('hidden');
    
    // Atualiza o título baseado no modo
    const header = document.querySelector('header h1');
    const modeNames = {
        'sugestao': 'Sugestões da IA',
        'autocorrecao': 'Correção Automática',
        'raciocinio': 'Raciocínio Profundo',
        'directo': 'Resposta Direta',
        'etico': 'Modo Ético'
    };
    header.textContent = modeNames[mode] || 'Resposta da IA';
    
    // Formata e exibe o conteúdo
    const formattedContent = formatSuggestionContent(suggestions, mode);
    suggestionsContent.innerHTML = `<div class="fade-in">${formattedContent}</div>`;
    
    // Adiciona botões baseados no modo
    if (mode === 'autocorrecao') {
        footer.classList.remove('hidden');
        footer.innerHTML = `
            <div class="flex gap-3 justify-end">
                <button id="copyBtn" class="action-button secondary">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    Copiar
                </button>
                <button id="applyBtn" class="action-button primary">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Aplicar Correção
                </button>
            </div>
        `;
        
        // Event listeners para os botões
        document.getElementById('applyBtn').addEventListener('click', () => {
            window.suggestionAPI.applyFix(suggestions);
        });
        
        document.getElementById('copyBtn').addEventListener('click', () => {
            copyToClipboard(suggestions, 'copyBtn');
        });
    } else if (mode === 'sugestao' || mode === 'raciocinio' || mode === 'directo' || mode === 'etico') {
        footer.classList.remove('hidden');
        const buttonText = mode === 'raciocinio' ? 'Copiar Análise' : 
                          mode === 'directo' ? 'Copiar Resposta' :
                          mode === 'etico' ? 'Copiar Orientação' : 'Copiar Sugestão';
        
        footer.innerHTML = `
            <div class="flex gap-3 justify-end">
                <button id="copyBtn" class="action-button secondary">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    ${buttonText}
                </button>
            </div>
        `;
        
        document.getElementById('copyBtn').addEventListener('click', () => {
            copyToClipboard(suggestions, 'copyBtn');
        });
    }
});

// Função auxiliar para copiar para clipboard
function copyToClipboard(text, buttonId) {
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById(buttonId);
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Copiado!
        `;
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    });
}

// Event listeners
closeBtn.addEventListener('click', () => {
    window.suggestionAPI.closeWindow();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.suggestionAPI.closeWindow();
    }
});

window.addEventListener('blur', () => {
    window.suggestionAPI.closeWindow();
});