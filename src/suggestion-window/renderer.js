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
    console.log('Formatando conteúdo:', { suggestions, mode }); // Debug
    
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
    
    console.log('Conteúdo formatado:', formattedContent); // Debug
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
function processAIResponse(suggestions, mode) {
    // Verifica se a resposta indica necessidade de mais contexto
    if (suggestions.toLowerCase().includes('preciso de mais informações') ||
        suggestions.toLowerCase().includes('poderia fornecer mais detalhes') ||
        suggestions.toLowerCase().includes('necessito de contexto adicional') ||
        suggestions.toLowerCase().includes('por favor, especifique')) {
        
        showInteractionArea('Por favor, forneça mais informações para uma resposta mais precisa...');
    }
    
    return formatSuggestionContent(suggestions, mode);
}

// Função auxiliar para formatar conteúdo
function formatContent(content) {
    return formatSuggestionContent(content, 'sugestao');
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

// Função para explicação de conceito
function detectTechnicalTerms(content) {
    const technicalTerms = [
        'recursão', 'recursivo', 'iteração', 'complexidade', 'algoritmo',
        'estrutura de dados', 'array', 'lista', 'pilha', 'fila',
        'árvore', 'grafo', 'hash', 'ordenação', 'busca',
        'programação dinâmica', 'backtracking', 'greedy',
        'divide e conquista', 'força bruta', 'otimização',
        'big o', 'notação big o', 'tempo de execução', 'espaço de memória',
        'condição de parada', 'caso base', 'chamada recursiva',
        'overflow', 'stack overflow', 'memoização', 'cache'
    ];
    
    const foundTerms = [];
    const contentLower = content.toLowerCase();
    
    technicalTerms.forEach(term => {
        if (contentLower.includes(term.toLowerCase()) && !foundTerms.includes(term)) {
            foundTerms.push(term);
        }
    });
    
    return foundTerms.slice(0, 6); // Limita a 6 termos para não sobrecarregar
}

function requestConceptExplanation(term) {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'concept-loading';
    loadingDiv.textContent = `Explicando "${term}"...`;
    
    const conceptSection = document.querySelector('.concept-explanation-section');
    if (conceptSection) {
        conceptSection.appendChild(loadingDiv);
    }
    
    const prompt = `Explique de forma clara e didática o conceito técnico "${term}" em programação. 
    Inclua:
    - Definição simples
    - Como funciona
    - Exemplo prático
    - Quando usar
    
    Mantenha a explicação concisa mas completa, adequada para estudantes.`;
    
    window.electronAPI.sendChatMessage(prompt)
        .then(response => {
            if (loadingDiv.parentNode) {
                loadingDiv.remove();
            }
            
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'concept-explanation';
            explanationDiv.innerHTML = `
                <h4>💡 ${term}</h4>
                <div>${formatContent(response)}</div>
            `;
            
            if (conceptSection) {
                conceptSection.appendChild(explanationDiv);
            }
            
            addToChatHistory(`Explicação: ${term}`, response);
        })
        .catch(error => {
            if (loadingDiv.parentNode) {
                loadingDiv.remove();
            }
            console.error('Erro ao explicar conceito:', error);
        });
}

function requestAlternativeApproach() {
    const prompt = `Com base no problema apresentado, sugira uma abordagem alternativa de solução. 
    Inclua:
    - Método diferente
    - Vantagens da nova abordagem
    - Exemplo de implementação
    - Comparação com a abordagem original`;
    
    sendChatMessage(prompt, 'Solicitando abordagem alternativa...');
} 
// Corrigindo as funções que estavam com nomes incorretos
function requestExpandTip() {
    const prompt = `Expanda a dica atual com mais detalhes. Inclua:
    - Explicação mais detalhada
    - Passos específicos
    - Exemplos adicionais
    - Possíveis armadilhas a evitar`;
    
    sendChatMessage(prompt, 'Expandindo dica atual...');
}

function requestTipHistory() {
    const chatMessages = document.querySelectorAll('.chat-message.ai');
    if (chatMessages.length === 0) {
        const prompt = `Forneça um resumo das principais orientações e dicas que foram discutidas até agora sobre este problema.`;
        sendChatMessage(prompt, 'Gerando histórico de dicas...');
        return;
    }
    
    let historyContent = '<h4>📚 Histórico de Orientações</h4>';
    chatMessages.forEach((msg, index) => {
        const content = msg.textContent.substring(0, 100) + '...';
        historyContent += `<p><strong>Dica ${index + 1}:</strong> ${content}</p>`;
    });
    
    const historyDiv = document.createElement('div');
    historyDiv.className = 'concept-explanation';
    historyDiv.innerHTML = historyContent;
    
    // Adiciona ao conteúdo principal
    const suggestionsContent = document.getElementById('suggestions-content');
    if (suggestionsContent) {
        suggestionsContent.appendChild(historyDiv);
    }
}

// Função auxiliar para enviar mensagens de chat
function sendChatMessage(prompt, loadingMessage) {
    // Adiciona mensagem de carregamento
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'concept-loading';
    loadingDiv.textContent = loadingMessage;
    
    const suggestionsContent = document.getElementById('suggestions-content');
    if (suggestionsContent) {
        suggestionsContent.appendChild(loadingDiv);
    }
    
    // Envia para o chat
    window.electronAPI.sendChatMessage(prompt)
        .then(response => {
            if (loadingDiv.parentNode) {
                loadingDiv.remove();
            }
            
            const responseDiv = document.createElement('div');
            responseDiv.className = 'concept-explanation';
            responseDiv.innerHTML = formatContent(response);
            
            if (suggestionsContent) {
                suggestionsContent.appendChild(responseDiv);
            }
            
            addToChatHistory(prompt, response);
        })
        .catch(error => {
            if (loadingDiv.parentNode) {
                loadingDiv.remove();
            }
            console.error('Erro ao processar solicitação:', error);
        });
}

// Função para adicionar ao histórico do chat
function addToChatHistory(userMessage, aiResponse) {
    addChatMessage(userMessage, true);
    addChatMessage(aiResponse, false);
    document.getElementById('chat-area').classList.remove('hidden');
}

// Variável global para rastrear o modo atual
let currentMode = 'sugestao';

// ÚNICO handler de recebimento de sugestões
window.suggestionAPI.onReceiveSuggestions((event, { suggestions, mode }) => {
    console.log('Recebendo sugestões:', suggestions, mode); // Debug
    
    // Verificação adicional
    if (!suggestions || suggestions.trim() === '') {
        console.error('Sugestões vazias recebidas');
        suggestionsContent.innerHTML = '<div class="error-message">Nenhuma resposta foi gerada pela IA.</div>';
        return;
    }
    
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
    const formattedContent = processAIResponse(suggestions, mode); // ✅ Passando o mode
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
    } else if (mode === 'sugestao') {
        // NOVO: Recursos Complementares para o modo Sugestão
        footer.classList.remove('hidden');
        
        // Detecta termos técnicos no conteúdo
        const technicalTerms = detectTechnicalTerms(suggestions);
        const hasTerms = technicalTerms.length > 0;
        
        footer.innerHTML = `
            <div class="flex flex-col gap-3">
                <!-- Primeira linha: Recursos Complementares -->
                <div class="flex flex-wrap gap-2 justify-center">
                    <span class="text-xs text-gray-400 font-medium mb-1 w-full text-center">🎓 Recursos Complementares</span>
                    ${hasTerms ? `
                        <div class="flex flex-wrap gap-1 justify-center mb-2">
                            ${technicalTerms.slice(0, 3).map(term => `
                                <button class="concept-btn" data-concept="${term}">
                                    💡 ${term.charAt(0).toUpperCase() + term.slice(1)}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                    <button id="alternativeBtn" class="resource-button">
                        🔄 Outra Abordagem
                    </button>
                    <button id="expandBtn" class="resource-button">
                        🔍 Expandir Dica
                    </button>
                    <button id="historyBtn" class="resource-button">
                        📚 Histórico
                    </button>
                </div>
                
                <!-- Segunda linha: Ações principais -->
                <div class="flex gap-3 justify-end">
                    <button id="copyBtn" class="action-button secondary">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                        Copiar Sugestão
                    </button>
                </div>
            </div>
        `;
        
        // Event listeners para os novos botões
        document.getElementById('copyBtn').addEventListener('click', () => {
            copyToClipboard(suggestions, 'copyBtn');
        });
        
        document.getElementById('alternativeBtn').addEventListener('click', () => {
            requestAlternativeApproach();
        });
        
        document.getElementById('expandBtn').addEventListener('click', () => {
            requestExpandTip();
        });
        
        document.getElementById('historyBtn').addEventListener('click', () => {
            requestTipHistory();
        });
        
        // Event listeners para botões de conceitos técnicos
        document.querySelectorAll('.concept-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const concept = btn.getAttribute('data-concept');
                requestConceptExplanation(concept);
            });
        });
        
    } else if (mode === 'raciocinio' || mode === 'directo' || mode === 'etico') {
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

// Variáveis globais para as novas funcionalidades
let currentDepthLevel = 'auto';
let contextDetectionResult = null;
let progressMetrics = {
    tipsGiven: 0,
    conceptsExplained: 0,
    alternativeApproaches: 0,
    progressPercentage: 0
};

// Inicialização das novas funcionalidades
function initializeEnhancedFeatures() {
    initializeDepthLevelSelector();
    initializeContextDetection();
    initializeProgressTracking();
    loadUserPreferences();
}

// Seletor de Nível de Profundidade
function initializeDepthLevelSelector() {
    const depthSelector = document.getElementById('depth-level');
    
    depthSelector.addEventListener('change', (e) => {
        currentDepthLevel = e.target.value;
        saveUserPreference('depthLevel', currentDepthLevel);
        
        // Atualizar sugestões se houver conteúdo ativo
        if (document.getElementById('suggestions-content').innerHTML.trim()) {
            refreshSuggestionsWithNewLevel();
        }
        
        console.log(`Nível de profundidade alterado para: ${currentDepthLevel}`);
    });
}

// Detecção Automática de Contexto
function initializeContextDetection() {
    // Detectar contexto quando receber nova captura
    window.electronAPI.onReceiveScreenshot((screenshot) => {
        detectContextFromScreenshot(screenshot);
    });
}

// Análise de contexto da captura de tela
async function detectContextFromScreenshot(screenshot) {
    const contextIndicator = document.getElementById('context-indicator');
    const contextStatus = document.getElementById('context-status');
    
    // Mostrar estado de detecção
    contextIndicator.className = 'flex items-center gap-1 detecting';
    contextStatus.textContent = 'Analisando...';
    
    try {
        // Enviar para análise de contexto
        const contextAnalysis = await analyzeScreenshotContext(screenshot);
        contextDetectionResult = contextAnalysis;
        
        // Atualizar indicador baseado no resultado
        updateContextIndicator(contextAnalysis);
        
        // Ajustar nível automaticamente se estiver em modo auto
        if (currentDepthLevel === 'auto') {
            adjustDepthLevelAutomatically(contextAnalysis);
        }
        
    } catch (error) {
        console.error('Erro na detecção de contexto:', error);
        contextIndicator.className = 'flex items-center gap-1 context-missing';
        contextStatus.textContent = 'Erro na detecção';
    }
}

// Análise do contexto da captura
async function analyzeScreenshotContext(screenshot) {
    const contextPrompt = `
Analise esta captura de tela e determine:
1. Tipo de conteúdo (código, documentação, erro, interface, etc.)
2. Nível de complexidade aparente (básico, intermediário, avançado)
3. Linguagem/tecnologia identificada
4. Contexto educacional (iniciante, estudante, profissional)
5. Presença de erros ou problemas visíveis

Retorne um JSON com:
{
  "contentType": "string",
  "complexity": "basico|intermediario|avancado",
  "technology": "string",
  "userLevel": "basico|intermediario|avancado|tutor",
  "hasErrors": boolean,
  "confidence": number (0-1),
  "suggestions": ["array de sugestões específicas"]
}`;

    try {
        const response = await sendChatMessage(contextPrompt, screenshot, false);
        return JSON.parse(response);
    } catch (error) {
        // Fallback para análise básica
        return {
            contentType: "unknown",
            complexity: "intermediario",
            technology: "unknown",
            userLevel: "intermediario",
            hasErrors: false,
            confidence: 0.3,
            suggestions: []
        };
    }
}

// Atualizar indicador de contexto
function updateContextIndicator(analysis) {
    const contextIndicator = document.getElementById('context-indicator');
    const contextStatus = document.getElementById('context-status');
    
    let statusClass = 'context-partial';
    let statusText = 'Contexto parcial';
    
    if (analysis.confidence > 0.8) {
        statusClass = 'context-detected';
        statusText = `${analysis.contentType} detectado`;
    } else if (analysis.confidence < 0.4) {
        statusClass = 'context-missing';
        statusText = 'Contexto limitado';
    }
    
    contextIndicator.className = `flex items-center gap-1 ${statusClass}`;
    contextStatus.textContent = statusText;
    
    // Atualizar cor do indicador
    const indicator = contextIndicator.querySelector('.w-2');
    if (statusClass === 'context-detected') {
        indicator.className = 'w-2 h-2 bg-green-500 rounded-full';
    } else if (statusClass === 'context-partial') {
        indicator.className = 'w-2 h-2 bg-yellow-500 rounded-full';
    } else {
        indicator.className = 'w-2 h-2 bg-red-500 rounded-full';
    }
}

// Ajuste automático do nível de profundidade
function adjustDepthLevelAutomatically(analysis) {
    const depthSelector = document.getElementById('depth-level');
    let suggestedLevel = analysis.userLevel || 'intermediario';
    
    // Ajustar baseado na confiança da análise
    if (analysis.confidence < 0.5) {
        suggestedLevel = 'intermediario'; // Padrão seguro
    }
    
    // Ajustar baseado na presença de erros
    if (analysis.hasErrors && suggestedLevel === 'basico') {
        suggestedLevel = 'intermediario'; // Mais suporte para erros
    }
    
    depthSelector.value = suggestedLevel;
    currentDepthLevel = suggestedLevel;
    
    console.log(`Nível ajustado automaticamente para: ${suggestedLevel} (confiança: ${analysis.confidence})`);
}

// Rastreamento de Progresso
function initializeProgressTracking() {
    updateProgressDisplay();
}

// Atualizar métricas de progresso
function updateProgressMetrics(action) {
    switch (action) {
        case 'tip_given':
            progressMetrics.tipsGiven++;
            break;
        case 'concept_explained':
            progressMetrics.conceptsExplained++;
            break;
        case 'alternative_approach':
            progressMetrics.alternativeApproaches++;
            break;
    }
    
    // Calcular progresso baseado nas interações
    const totalInteractions = progressMetrics.tipsGiven + 
                            progressMetrics.conceptsExplained + 
                            progressMetrics.alternativeApproaches;
    
    progressMetrics.progressPercentage = Math.min(100, totalInteractions * 10);
    
    updateProgressDisplay();
    saveProgressMetrics();
}

// Atualizar display das métricas
function updateProgressDisplay() {
    const tipsCount = document.getElementById('tips-count');
    const progressIndicator = document.getElementById('progress-indicator');
    
    tipsCount.textContent = `${progressMetrics.tipsGiven} dicas`;
    progressIndicator.textContent = `${progressMetrics.progressPercentage}% progresso`;
}

// Atualizar sugestões com novo nível
async function refreshSuggestionsWithNewLevel() {
    const currentContent = document.getElementById('suggestions-content').innerHTML;
    if (!currentContent.trim()) return;
    
    const refreshPrompt = `
Ajuste o nível de profundidade das sugestões para: ${currentDepthLevel}

Nível atual: ${currentDepthLevel}
Contexto detectado: ${contextDetectionResult ? JSON.stringify(contextDetectionResult) : 'Não disponível'}

Mantenha o mesmo tópico, mas ajuste a complexidade e abordagem conforme o novo nível selecionado.`;
    
    try {
        showLoadingState();
        const response = await sendChatMessage(refreshPrompt, null, false);
        
        // Atualizar conteúdo com nova profundidade
        document.getElementById('suggestions-content').innerHTML = formatSuggestionContent(response);
        
        // Re-detectar termos técnicos e adicionar botões
        if (currentMode === 'sugestao') {
            detectTechnicalTerms();
            addComplementaryFeatures();
        }
        
    } catch (error) {
        console.error('Erro ao atualizar nível:', error);
    } finally {
        hideLoadingState();
    }
}

// Salvar preferências do usuário
function saveUserPreference(key, value) {
    localStorage.setItem(`skillvision_${key}`, value);
}

// Carregar preferências do usuário
function loadUserPreferences() {
    const savedLevel = localStorage.getItem('skillvision_depthLevel');
    if (savedLevel) {
        currentDepthLevel = savedLevel;
        document.getElementById('depth-level').value = savedLevel;
    }
    
    loadProgressMetrics();
}

// Salvar métricas de progresso
function saveProgressMetrics() {
    localStorage.setItem('skillvision_progress', JSON.stringify(progressMetrics));
}

// Carregar métricas de progresso
function loadProgressMetrics() {
    const saved = localStorage.getItem('skillvision_progress');
    if (saved) {
        progressMetrics = { ...progressMetrics, ...JSON.parse(saved) };
        updateProgressDisplay();
    }
}

// Estados de carregamento
function showLoadingState() {
    const content = document.getElementById('suggestions-content');
    content.style.opacity = '0.6';
    content.style.pointerEvents = 'none';
}

function hideLoadingState() {
    const content = document.getElementById('suggestions-content');
    content.style.opacity = '1';
    content.style.pointerEvents = 'auto';
}

// Modificar funções existentes para incluir rastreamento
const originalRequestConceptExplanation = requestConceptExplanation;
requestConceptExplanation = function(term) {
    updateProgressMetrics('concept_explained');
    return originalRequestConceptExplanation.call(this, term);
};

const originalRequestAlternativeApproach = requestAlternativeApproach;
requestAlternativeApproach = function() {
    updateProgressMetrics('alternative_approach');
    return originalRequestAlternativeApproach.call(this);
};

const originalOnReceiveSuggestions = onReceiveSuggestions;
onReceiveSuggestions = function(suggestions, mode = 'sugestao') {
    updateProgressMetrics('tip_given');
    return originalOnReceiveSuggestions.call(this, suggestions, mode);
};

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    initializeEnhancedFeatures();
});