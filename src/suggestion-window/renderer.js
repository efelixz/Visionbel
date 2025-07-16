const suggestionsContent = document.getElementById('suggestions-content');
const closeBtn = document.getElementById('closeBtn');
const footer = document.getElementById('footer');
const interactionArea = document.getElementById('interaction-area');
const chatMessages = document.getElementById('chat-messages');
// Elementos principais do chat
const contextInput = document.getElementById('context-input');
const sendContextBtn = document.getElementById('send-context-btn');
const newCaptureBtn = document.getElementById('new-capture-btn');
// Elementos da área de interação
const interactionInput = document.getElementById('interaction-input');
const interactionSendBtn = document.getElementById('interaction-send-btn');
const interactionNewCaptureBtn = document.getElementById('interaction-new-capture-btn');

const pinBtn = document.getElementById('pinBtn');
let isPinned = false;
let closeTimeout = null;
let inactivityTimeout = null;
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos

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

// Função para mostrar área de interação quando necessário
function showInteractionArea(message) {
    interactionArea.classList.remove('hidden');
    if (message) {
        contextInput.placeholder = message;
    }
}

// Função para processar a resposta da IA
function processAIResponse(suggestions) {
    // Verifica se a resposta indica necessidade de mais contexto
    if (suggestions.toLowerCase().includes('preciso de mais informações') ||
        suggestions.toLowerCase().includes('poderia fornecer mais detalhes') ||
        suggestions.toLowerCase().includes('necessito de contexto adicional') ||
        suggestions.toLowerCase().includes('por favor, especifique')) {
        
        showInteractionArea('Por favor, forneça mais informações para uma resposta mais precisa...');
    }
    
    return formatSuggestionContent(suggestions);
}

// Função para verificar se precisa de mais contexto
function needsMoreContext(suggestions) {
    return suggestions.toLowerCase().includes('preciso de mais informações') ||
           suggestions.toLowerCase().includes('poderia fornecer mais detalhes') ||
           suggestions.toLowerCase().includes('necessito de contexto adicional') ||
           suggestions.toLowerCase().includes('por favor, especifique');
}

// Função para adicionar mensagem ao chat
function addChatMessage(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user' : 'ai'}`;
    messageDiv.innerHTML = `<p class="text-sm">${escapeHtml(message)}</p>`;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Mostra a área de chat se estiver oculta
    document.getElementById('chat-area').classList.remove('hidden');
}

// Função para mostrar indicador de carregamento no chat
function addLoadingMessage() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message ai loading-message';
    loadingDiv.innerHTML = `
        <div class="flex items-center gap-2">
            <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <p class="text-sm text-gray-400">IA está pensando...</p>
        </div>
    `;
    
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return loadingDiv;
}

// Função para remover mensagem de carregamento
function removeLoadingMessage() {
    const loadingMessage = chatMessages.querySelector('.loading-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// Função para copiar para clipboard
function copyToClipboard(text, buttonId) {
    navigator.clipboard.writeText(text).then(() => {
        const button = document.getElementById(buttonId);
        const originalText = button.innerHTML;
        button.innerHTML = '✓ Copiado!';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    });
}

// Função para resetar o temporizador de inatividade
function resetInactivityTimer() {
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
    }
    inactivityTimeout = setTimeout(() => {
        if (!isPinned) {
            window.suggestionAPI.closeWindow();
        }
    }, INACTIVITY_TIMEOUT);
}

// Função para configurar fechamento automático
function setupAutoClose() {
    resetInactivityTimer();
}

// Event listeners para os botões de controle
document.getElementById('minimizeBtn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Botão minimizar clicado'); // Debug
    window.suggestionAPI.minimizeWindow();
});

document.getElementById('closeBtn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Botão fechar clicado'); // Debug
    window.suggestionAPI.closeWindow();
});

// Event listener para envio de contexto principal
if (sendContextBtn) {
    sendContextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Botão enviar clicado'); // Debug
        const additionalContext = contextInput.value.trim();
        if (additionalContext) {
            console.log('Enviando contexto:', additionalContext); // Debug
            // Adiciona mensagem do usuário
            addChatMessage(additionalContext, true);
            
            // Envia contexto para o backend
            window.suggestionAPI.sendAdditionalContext(additionalContext);
            
            // Limpa o campo de input
            contextInput.value = '';
            resetInactivityTimer();
        } else {
            console.log('Campo de contexto vazio'); // Debug
        }
    });
}

// Event listener para nova captura principal
if (newCaptureBtn) {
    newCaptureBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Botão nova captura clicado'); // Debug
        window.suggestionAPI.requestNewCapture();
    });
}

// Event listener para envio de contexto da área de interação
if (interactionSendBtn) {
    interactionSendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const additionalContext = interactionInput.value.trim();
        if (additionalContext) {
            addChatMessage(additionalContext, true);
            window.suggestionAPI.sendAdditionalContext(additionalContext);
            interactionInput.value = '';
            interactionArea.classList.add('hidden');
            resetInactivityTimer();
        }
    });
}

// Event listener para nova captura da área de interação
if (interactionNewCaptureBtn) {
    interactionNewCaptureBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.suggestionAPI.requestNewCapture();
    });
}

// Event listener para tecla Enter no textarea principal
if (contextInput) {
    contextInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('Enter pressionado no contexto principal'); // Debug
            if (sendContextBtn) {
                sendContextBtn.click();
            }
        }
    });
}

// Event listener para tecla Enter no textarea de interação
if (interactionInput) {
    interactionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (interactionSendBtn) {
                interactionSendBtn.click();
            }
        }
    });
}

// ÚNICO handler de recebimento de sugestões
window.suggestionAPI.onReceiveSuggestions((event, { suggestions, mode }) => {
    console.log('Recebendo sugestões:', suggestions, mode); // Debug
    
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
    const formattedContent = processAIResponse(suggestions);
    suggestionsContent.innerHTML = `<div class="fade-in">${formattedContent}</div>`;
    
    // Adiciona a resposta ao chat se necessário
    if (chatMessages.children.length > 0 || needsMoreContext(suggestions)) {
        addChatMessage(suggestions, false);
        document.getElementById('chat-area').classList.remove('hidden');
    }
    
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
    
    // Inicia o temporizador de inatividade
    resetInactivityTimer();
});

// Monitora atividade do usuário
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('click', resetInactivityTimer);

// Configurar fechamento automático após carregar
setupAutoClose();

// Novos handlers para chat
window.suggestionAPI.onChatLoading((event, isLoading) => {
    if (!isLoading) {
        removeLoadingMessage();
    }
});

// Atualizar o handler de resposta do chat
window.suggestionAPI.onChatResponse((event, { message, isUser, needsMoreContext, isComplete }) => {
    removeLoadingMessage();
    
    if (isUser) {
        addChatMessage(message, true);
    } else {
        addChatMessage(message, false);
        
        // Se ainda precisa de contexto, mantém a área de interação visível
        if (needsMoreContext) {
            showInteractionArea('A IA precisa de mais informações. Continue a conversa...');
        }
    }
});

// Handler para mostrar área de interação
if (typeof window.suggestionAPI.onShowInteractionArea === 'function') {
    window.suggestionAPI.onShowInteractionArea((event, { message }) => {
        showInteractionArea(message);
    });
}

// Handler para carregamento do chat
if (typeof window.suggestionAPI.onChatLoading === 'function') {
    window.suggestionAPI.onChatLoading((event, isLoading) => {
        if (isLoading) {
            addLoadingMessage();
        } else {
            removeLoadingMessage();
        }
    });
}

// Novo handler para mostrar área de interação
window.suggestionAPI.onShowInteractionArea((event, { message }) => {
    showInteractionArea(message);
});