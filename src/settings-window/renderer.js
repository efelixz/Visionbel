const defaultModeSelect = document.getElementById('default-mode-select');
const modePromptSelect = document.getElementById('mode-prompt-select');
const promptEditor = document.getElementById('prompt-editor');
const savePromptBtn = document.getElementById('savePromptBtn');
const resetPromptBtn = document.getElementById('resetPromptBtn');

let customPrompts = {};
let defaultPrompts = {};

// Carrega a configuração atual quando a janela abre
async function loadCurrentSettings() {
    const defaultMode = await window.settingsAPI.getSetting('defaultMode');
    defaultModeSelect.value = defaultMode;
}

// Carrega os prompts customizados e padrão
async function loadCustomPrompts() {
    customPrompts = await window.settingsAPI.getCustomPrompts();
    defaultPrompts = await window.settingsAPI.getDefaultPrompts();
    updateEditorForSelectedMode();
}

// Atualiza o editor com base no modo selecionado
function updateEditorForSelectedMode() {
    const selectedMode = modePromptSelect.value;
    const customPrompt = customPrompts[selectedMode];
    const defaultPrompt = defaultPrompts[selectedMode];
    
    // Mostra o prompt customizado se existir, senão mostra o padrão
    promptEditor.value = customPrompt || defaultPrompt || '';
    
    // Atualiza o placeholder para indicar se é customizado ou padrão
    if (customPrompt) {
        promptEditor.style.backgroundColor = '#1f2937'; // Amarelo claro para customizado
    } else {
        promptEditor.style.backgroundColor = '#1f2937'; // Cinza claro para padrão
    }
}

// Salva a nova configuração quando o usuário muda a seleção do modo padrão
defaultModeSelect.addEventListener('change', (event) => {
    const newDefaultMode = event.target.value;
    window.settingsAPI.setSetting('defaultMode', newDefaultMode);
});

// Atualiza o editor quando o modo selecionado muda
modePromptSelect.addEventListener('change', updateEditorForSelectedMode);

// Salva o prompt customizado
savePromptBtn.addEventListener('click', async () => {
    const selectedMode = modePromptSelect.value;
    const newPrompt = promptEditor.value.trim();
    
    if (!newPrompt) {
        alert('Por favor, insira um prompt antes de salvar.');
        return;
    }
    
    customPrompts[selectedMode] = newPrompt; // Atualiza nosso cache local
    await window.settingsAPI.setCustomPrompt(selectedMode, newPrompt);
    updateEditorForSelectedMode(); // Atualiza a cor de fundo
    alert('Prompt salvo com sucesso!');
});

// Reseta o prompt para o padrão
resetPromptBtn.addEventListener('click', async () => {
    const selectedMode = modePromptSelect.value;
    if (confirm(`Tem certeza que deseja resetar o prompt para o modo '${selectedMode}'?`)) {
        delete customPrompts[selectedMode]; // Remove do cache local
        await window.settingsAPI.resetCustomPrompt(selectedMode);
        updateEditorForSelectedMode(); // Atualiza o editor
        alert('Prompt resetado para o padrão!');
    }
});

// Inicializa a interface
// Elementos da API
const apiTypeSelect = document.getElementById('api-type-select');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
const apiStatus = document.getElementById('apiStatus');

// Função para mascarar a chave da API
function maskApiKey(key) {
    if (!key) return '';
    return '*'.repeat(key.length);
}

// Carrega as configurações da API
async function loadApiSettings() {
    const apiSettings = await window.settingsAPI.getApiSettings();
    if (apiSettings) {
        apiTypeSelect.value = apiSettings.type || 'gemini';
        if (apiSettings.key) {
            apiKeyInput.value = maskApiKey(apiSettings.key);
            apiStatus.textContent = '✅ Chave da API configurada';
            apiKeyInput.dataset.masked = 'true';
            apiKeyInput.dataset.originalKey = apiSettings.key;
        } else {
            apiKeyInput.value = '';
            apiStatus.textContent = '⚠️ Chave da API não configurada';
        }
    }
}

// Toggle visibilidade da chave da API
toggleApiKeyVisibility.addEventListener('click', () => {
    const isMasked = apiKeyInput.dataset.masked === 'true';
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (isMasked) {
        // Mostra a chave original
        apiKeyInput.type = 'text';
        apiKeyInput.value = apiKeyInput.dataset.originalKey || '';
        apiKeyInput.dataset.masked = 'false';
        eyeIcon.textContent = '👁️‍🗨️';
    } else {
        // Mascara a chave
        apiKeyInput.type = 'password';
        apiKeyInput.value = apiKeyInput.dataset.originalKey || '';
        apiKeyInput.dataset.masked = 'true';
        eyeIcon.textContent = '👁️';
    }
});

// Salva as configurações da API
saveApiKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.dataset.masked === 'true' ? 
        apiKeyInput.dataset.originalKey : 
        apiKeyInput.value.trim();
        
    if (!apiKey) {
        alert('Por favor, insira uma chave de API válida.');
        return;
    }

    apiStatus.textContent = '⏳ Validando a chave da API...';
    
    try {
        // Testa a chave da API usando o serviço de AI
        const testResult = await window.settingsAPI.testApiKey({
            type: apiTypeSelect.value,
            key: apiKey
        });
        
        if (testResult.success) {
            const apiSettings = {
                type: apiTypeSelect.value,
                key: apiKey
            };
            
            await window.settingsAPI.setApiSettings(apiSettings);
            apiKeyInput.dataset.originalKey = apiKey;
            apiKeyInput.type = 'password';
            apiKeyInput.value = maskApiKey(apiKey);
            apiKeyInput.dataset.masked = 'true';
            apiStatus.textContent = '✅ Chave da API validada e salva com sucesso!';
            eyeIcon.textContent = '👁️';
        } else {
            apiStatus.textContent = '❌ Chave da API inválida: ' + testResult.error;
        }
    } catch (error) {
        apiStatus.textContent = '❌ Erro ao validar a chave: ' + error.message;
    }
});

// Atualiza o valor original quando o usuário digita
apiKeyInput.addEventListener('input', () => {
    // Armazena o valor digitado
    apiKeyInput.dataset.originalKey = apiKeyInput.value;
    
    // Se estiver mascarado, muda para não mascarado ao digitar
    if (apiKeyInput.dataset.masked === 'true') {
        apiKeyInput.dataset.masked = 'false';
        apiKeyInput.type = 'text';
        eyeIcon.textContent = '👁️‍🗨️';
    }
});

// Adiciona o carregamento das configurações da API na inicialização
loadCurrentSettings();
loadCustomPrompts();
loadApiSettings();


// NOVO: Carregar configurações de modelo
async function loadModelSettings() {
    try {
        const apiSettings = await window.electronAPI.getSetting('apiSettings');
        
        const primaryModelSelect = document.getElementById('primary-model-select');
        const fallbackModelSelect = document.getElementById('fallback-model-select');
        
        if (apiSettings.model) {
            primaryModelSelect.value = apiSettings.model;
        }
        
        if (apiSettings.fallbackModel) {
            fallbackModelSelect.value = apiSettings.fallbackModel;
        }
    } catch (error) {
        console.error('Erro ao carregar configurações de modelo:', error);
    }
}

// NOVO: Salvar configurações de modelo
async function saveModelSettings() {
    try {
        const primaryModel = document.getElementById('primary-model-select').value;
        const fallbackModel = document.getElementById('fallback-model-select').value;
        
        if (primaryModel === fallbackModel) {
            alert('⚠️ O modelo principal e o fallback devem ser diferentes!');
            return;
        }
        
        const currentSettings = await window.electronAPI.getSetting('apiSettings') || {};
        
        const updatedSettings = {
            ...currentSettings,
            model: primaryModel,
            fallbackModel: fallbackModel
        };
        
        await window.electronAPI.setSetting('apiSettings', updatedSettings);
        
        // Feedback visual
        const button = document.getElementById('saveModelConfigBtn');
        const originalText = button.innerHTML;
        button.innerHTML = '<span>✅</span> Configurações Salvas!';
        button.classList.add('bg-green-700');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('bg-green-700');
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao salvar configurações de modelo:', error);
        alert('Erro ao salvar configurações de modelo.');
    }
}

// NOVO: Gerenciamento de provedores de IA
const aiProviderSelect = document.getElementById('ai-provider-select');
const aiConfigStatus = document.getElementById('ai-config-status');
const saveAiConfigBtn = document.getElementById('save-ai-config-btn');

// Função para mostrar/ocultar configurações do provedor
function showProviderConfig(provider) {
    // Oculta todas as configurações
    document.querySelectorAll('.provider-config').forEach(config => {
        config.classList.add('hidden');
    });
    
    // Mostra a configuração do provedor selecionado
    const selectedConfig = document.getElementById(`${provider}-config`);
    if (selectedConfig) {
        selectedConfig.classList.remove('hidden');
    }
}

// Event listener para mudança de provedor
aiProviderSelect.addEventListener('change', (e) => {
    showProviderConfig(e.target.value);
});

// Função para carregar configurações de IA
async function loadAISettings() {
    try {
        const apiSettings = await window.electronAPI.getSetting('apiSettings');
        
        if (apiSettings) {
            // Define o provedor principal
            aiProviderSelect.value = apiSettings.provider || 'gemini';
            showProviderConfig(apiSettings.provider || 'gemini');
            
            // Carrega configurações do Gemini
            if (apiSettings.gemini) {
                document.getElementById('gemini-key').value = apiSettings.gemini.key || '';
                document.getElementById('gemini-primary-model').value = apiSettings.gemini.model || 'gemini-2.0-flash-exp';
                document.getElementById('gemini-fallback-model').value = apiSettings.gemini.fallbackModel || 'gemini-1.5-flash-latest';
            }
            
            // Carrega configurações do OpenAI
            if (apiSettings.openai) {
                document.getElementById('openai-key').value = apiSettings.openai.key || '';
                document.getElementById('openai-primary-model').value = apiSettings.openai.model || 'gpt-4o';
                document.getElementById('openai-fallback-model').value = apiSettings.openai.fallbackModel || 'gpt-3.5-turbo';
            }
            
            // Carrega configurações do Anthropic
            if (apiSettings.anthropic) {
                document.getElementById('anthropic-key').value = apiSettings.anthropic.key || '';
                document.getElementById('anthropic-primary-model').value = apiSettings.anthropic.model || 'claude-3-5-sonnet-20241022';
                document.getElementById('anthropic-fallback-model').value = apiSettings.anthropic.fallbackModel || 'claude-3-haiku-20240307';
            }
            
            // Carrega configurações do Cohere
            if (apiSettings.cohere) {
                document.getElementById('cohere-key').value = apiSettings.cohere.key || '';
                document.getElementById('cohere-primary-model').value = apiSettings.cohere.model || 'command-r-plus';
                document.getElementById('cohere-fallback-model').value = apiSettings.cohere.fallbackModel || 'command-r';
            }
        }
    } catch (error) {
        console.error('Erro ao carregar configurações de IA:', error);
    }
}

// Função para salvar configurações de IA
async function saveAISettings() {
    try {
        const provider = aiProviderSelect.value;
        
        const apiSettings = {
            provider: provider,
            gemini: {
                key: document.getElementById('gemini-key').value.trim(),
                model: document.getElementById('gemini-primary-model').value,
                fallbackModel: document.getElementById('gemini-fallback-model').value
            },
            openai: {
                key: document.getElementById('openai-key').value.trim(),
                model: document.getElementById('openai-primary-model').value,
                fallbackModel: document.getElementById('openai-fallback-model').value
            },
            anthropic: {
                key: document.getElementById('anthropic-key').value.trim(),
                model: document.getElementById('anthropic-primary-model').value,
                fallbackModel: document.getElementById('anthropic-fallback-model').value
            },
            cohere: {
                key: document.getElementById('cohere-key').value.trim(),
                model: document.getElementById('cohere-primary-model').value,
                fallbackModel: document.getElementById('cohere-fallback-model').value
            }
        };
        
        await window.electronAPI.setSetting('apiSettings', apiSettings);
        
        // Feedback visual
        const originalText = saveAiConfigBtn.innerHTML;
        saveAiConfigBtn.innerHTML = '<span>✅</span> Configurações Salvas!';
        saveAiConfigBtn.classList.add('bg-green-700');
        aiConfigStatus.textContent = '✅ Configurações salvas com sucesso!';
        
        setTimeout(() => {
            saveAiConfigBtn.innerHTML = originalText;
            saveAiConfigBtn.classList.remove('bg-green-700');
            aiConfigStatus.textContent = '';
        }, 3000);
        
    } catch (error) {
        console.error('Erro ao salvar configurações de IA:', error);
        aiConfigStatus.textContent = '❌ Erro ao salvar configurações.';
    }
}

// Função para testar provedor específico
async function testProvider(provider) {
    const keyInput = document.getElementById(`${provider}-key`);
    const primaryModel = document.getElementById(`${provider}-primary-model`).value;
    const testBtn = document.getElementById(`test-${provider}-btn`);
    
    if (!keyInput.value.trim()) {
        alert('Por favor, insira uma chave de API válida.');
        return;
    }
    
    const originalText = testBtn.innerHTML;
    testBtn.innerHTML = '⏳ Testando...';
    testBtn.disabled = true;
    
    try {
        const result = await window.electronAPI.testApiKey(provider, keyInput.value.trim(), primaryModel);
        
        if (result.success) {
            testBtn.innerHTML = '✅ Sucesso!';
            testBtn.classList.add('bg-green-600');
            aiConfigStatus.textContent = `✅ ${provider.toUpperCase()} configurado com sucesso!`;
        } else {
            testBtn.innerHTML = '❌ Falhou';
            testBtn.classList.add('bg-red-600');
            aiConfigStatus.textContent = `❌ Erro no ${provider.toUpperCase()}: ${result.error}`;
        }
    } catch (error) {
        testBtn.innerHTML = '❌ Erro';
        testBtn.classList.add('bg-red-600');
        aiConfigStatus.textContent = `❌ Erro ao testar ${provider.toUpperCase()}: ${error.message}`;
    }
    
    setTimeout(() => {
        testBtn.innerHTML = originalText;
        testBtn.disabled = false;
        testBtn.classList.remove('bg-green-600', 'bg-red-600');
    }, 3000);
}

// Event listeners para testes
document.getElementById('test-gemini-btn').addEventListener('click', () => testProvider('gemini'));
document.getElementById('test-openai-btn').addEventListener('click', () => testProvider('openai'));
document.getElementById('test-anthropic-btn').addEventListener('click', () => testProvider('anthropic'));
document.getElementById('test-cohere-btn').addEventListener('click', () => testProvider('cohere'));

// Event listener para salvar configurações
saveAiConfigBtn.addEventListener('click', saveAISettings);

// Adicionar na inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // ... existing code ...
    
    // NOVO: Carregar configurações de IA
    await loadAISettings();
});