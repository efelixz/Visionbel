window.PROVIDERS_DATA = {
    gemini: {
        name: "Google Gemini",
        models: {
            "gemini-2.5-pro": "🌟 Gemini 2.5 Pro (Mais Avançado)",
            "gemini-2.5-flash": "⚡ Gemini 2.5 Flash (Ultra Rápido)",
            "gemini-2.0-flash-exp": "🚀 Gemini 2.0 Flash (Experimental)",
            "gemini-1.5-flash-latest": "⚡ Gemini 1.5 Flash (Estável)",
            "gemini-1.5-pro-latest": "💎 Gemini 1.5 Pro (Avançado)"
        }
    },
    openai: {
        name: "OpenAI",
        models: {
            "gpt-4-turbo": "🌟 GPT-4 Turbo",
            "gpt-4": "💎 GPT-4",
            "gpt-3.5-turbo": "⚡ GPT-3.5 Turbo"
        }
    },
    anthropic: {
        name: "Anthropic Claude",
        models: {
            "claude-3-opus": "🌟 Claude 3 Opus",
            "claude-3-sonnet": "💎 Claude 3 Sonnet",
            "claude-3-haiku": "⚡ Claude 3 Haiku"
        }
    },
    cohere: {
        name: "Cohere",
        models: {
            "command-r": "⚡ Command-R",
            "command": "💎 Command"
        }
    }
};

// Elementos da UI
const providerSelect = document.getElementById('provider-select');
const apiKeyInput = document.getElementById('api-key-input');
const modelSelect = document.getElementById('model-select');
const testButton = document.getElementById('test-button');
const saveButton = document.getElementById('save-button');
const toggleKeyButton = document.getElementById('toggle-key');
const statusMessage = document.getElementById('status-message');

// Função que atualiza a lista de modelos baseado no provedor selecionado
function updateModelSelect(provider) {
    if (!window.PROVIDERS_DATA[provider]) return;

    modelSelect.innerHTML = '';
    const models = window.PROVIDERS_DATA[provider].models;
    Object.entries(models).forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        modelSelect.appendChild(option);
    });
}

// Função que inicializa toda a tela
async function initializeSettingsPage() {
    try {
        // Preenche o seletor de provedores
        providerSelect.innerHTML = '';
        Object.entries(PROVIDERS_DATA).forEach(([key, data]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = data.name;
            providerSelect.appendChild(option);
        });

        // Carrega as configurações salvas
        const settings = await window.settingsAPI.getSetting('apiSettings');
        if (settings) {
            providerSelect.value = settings.provider || 'gemini';
            updateModelSelect(providerSelect.value);
            
            const providerSettings = settings[settings.provider];
            if (providerSettings) {
                apiKeyInput.value = providerSettings.key || '';
                modelSelect.value = providerSettings.model || '';
            }
        } else {
            updateModelSelect(providerSelect.value);
        }
    } catch (error) {
        showStatus(`Erro ao inicializar configurações: ${error.message}`, 'error');
    }
}

// Mostrar/ocultar chave da API
toggleKeyButton.addEventListener('click', () => {
    const type = apiKeyInput.type;
    apiKeyInput.type = type === 'password' ? 'text' : 'password';
    toggleKeyButton.textContent = type === 'password' ? '🔒' : '👁️';
});

// Função para formatar mensagens de erro específicas por provedor
function formatErrorMessage(provider, error) {
    const errorMessage = error.message.toLowerCase();
    
    // Mensagens específicas para o Gemini
    if (provider === 'gemini') {
        if (errorMessage.includes('api key not valid') || errorMessage.includes('api_key_invalid')) {
            return 'A chave da API do Google Gemini é inválida. Por favor, verifique se você inseriu a chave corretamente.';
        }
        if (errorMessage.includes('quota exceeded')) {
            return 'Sua cota da API do Gemini foi excedida. Por favor, verifique seus limites de uso.';
        }
    }
    
    // Mensagens específicas para OpenAI
    if (provider === 'openai') {
        if (errorMessage.includes('invalid api key')) {
            return 'A chave da API da OpenAI é inválida. Por favor, verifique se você inseriu a chave corretamente.';
        }
        if (errorMessage.includes('rate limit')) {
            return 'Limite de requisições da OpenAI atingido. Por favor, aguarde um momento e tente novamente.';
        }
    }
    
    // Mensagens específicas para Anthropic
    if (provider === 'anthropic') {
        if (errorMessage.includes('invalid api key') || errorMessage.includes('invalid_api_key')) {
            return 'A chave da API do Claude é inválida. Por favor, verifique se você inseriu a chave corretamente.';
        }
    }
    
    // Mensagens específicas para Cohere
    if (provider === 'cohere') {
        if (errorMessage.includes('invalid api key') || errorMessage.includes('invalid_api_key')) {
            return 'A chave da API da Cohere é inválida. Por favor, verifique se você inseriu a chave corretamente.';
        }
    }
    
    // Mensagem genérica para outros erros
    return `Erro ao conectar com ${PROVIDERS_DATA[provider].name}. Por favor, verifique sua chave e conexão.`;
}

// Testar conexão
async function testConnection() {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (!apiKey) {
        showStatus('Por favor, insira uma chave de API', 'error');
        return;
    }

    testButton.disabled = true;
    testButton.classList.add('testing');
    showStatus('Testando conexão...', 'warning');

    try {
        const result = await window.settingsAPI.testApiKey(provider, apiKey, model);
        
        if (result.success) {
            showStatus('Conexão estabelecida com sucesso!', 'success');
        } else {
            showStatus(formatErrorMessage(provider, { message: result.message }), 'error');
        }
    } catch (error) {
        showStatus(formatErrorMessage(provider, error), 'error');
    } finally {
        testButton.disabled = false;
        testButton.classList.remove('testing');
    }
}

// Salvar configurações
async function saveSettings() {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (!apiKey) {
        showStatus('Por favor, insira uma chave de API', 'error');
        return;
    }

    try {
        const currentSettings = await window.settingsAPI.getSetting('apiSettings') || {};
        const updatedSettings = {
            ...currentSettings,
            provider: provider,
            [provider]: {
                key: apiKey,
                model: model
            }
        };
        await window.settingsAPI.setSetting('apiSettings', updatedSettings);
        showStatus('Configurações salvas com sucesso!', 'success');
    } catch (error) {
        showStatus('Erro ao salvar configurações: ' + error.message, 'error');
    }
}

// Exibir mensagens de status
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `mt-6 p-4 rounded-lg status-${type}`;
    statusMessage.classList.remove('hidden');
}

// Event Listeners
providerSelect.addEventListener('change', () => updateModelSelect(providerSelect.value));
testButton.addEventListener('click', testConnection);
saveButton.addEventListener('click', saveSettings);

// Inicia todo o processo
initializeSettingsPage();

