window.PROVIDERS_DATA = {
  gemini: {
    name: "Gemini",
    models: {
      "gemini-2.5-pro": "🌟 Gemini 2.5 Pro (Mais Avançado)",
      "gemini-2.5-flash": "⚡ Gemini 2.5 Flash (Ultra Rápido)",
      "gemini-2.0-flash-exp": "🚀 Gemini 2.0 Flash (Experimental)",
      "gemini-1.5-flash-latest": "⚡ Gemini 1.5 Flash (Estável)",
      "gemini-1.5-pro-latest": "💎 Gemini 1.5 Pro (Avançado)"
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
        // Removido: PROVIDERS_DATA = await window.settingsAPI.getAvailableProviders();
        // 2. Preenche o seletor de provedores dinamicamente
        providerSelect.innerHTML = '';
        Object.keys(PROVIDERS_DATA).forEach(providerKey => {
            const option = document.createElement('option');
            option.value = providerKey;
            option.textContent = PROVIDERS_DATA[providerKey].name;
            providerSelect.appendChild(option);
        });

        // 3. Carrega as configurações salvas do usuário
        const settings = await window.settingsAPI.getSetting('apiSettings');
        if (settings && settings.provider) {
            providerSelect.value = settings.provider;
            
            // Atualiza a lista de modelos para o provedor salvo
            updateModelSelect(settings.provider);
            
            const providerSettings = settings[settings.provider];
            if (providerSettings) {
                apiKeyInput.value = providerSettings.key || '';
                modelSelect.value = providerSettings.model || '';
            }
        } else {
            // Se não houver nada salvo, apenas inicializa com o primeiro provedor
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

// Testar conexão
async function testConnection() {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (!apiKey || !model) {
        showStatus('Erro: Chave de API e Modelo são obrigatórios.', 'error');
        return;
    }

    testButton.disabled = true;
    testButton.classList.add('testing');
    showStatus(`Testando ${provider.toUpperCase()} com o modelo ${model}...`, 'warning');

    try {
        const result = await window.settingsAPI.testApiKey(provider, apiKey, model);
        
        if (result.success) {
            showStatus(result.message || 'Conexão estabelecida com sucesso!', 'success');
        } else {
            showStatus(`Erro: ${result.message || 'Falha no teste de conexão'}`, 'error');
        }
    } catch (error) {
        showStatus(`Erro inesperado: ${error.message}`, 'error');
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

    // Defensive check for PROVIDERS_DATA
    if (!PROVIDERS_DATA[provider] || !PROVIDERS_DATA[provider].models) {
        showStatus('Erro interno: dados do provedor não carregados.', 'error');
        return;
    }

    try {
        const currentSettings = await window.settingsAPI.getSetting('apiSettings') || {};
        const updatedSettings = {
            ...currentSettings,
            provider: provider,
            [provider]: {
                key: apiKey,
                model: model,
                fallbackModel: Object.keys(PROVIDERS_DATA[provider].models)[1] || model
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
    statusMessage.className = `mt-4 p-4 rounded status-${type}`;
    statusMessage.classList.remove('hidden');
}

// Event Listeners
providerSelect.addEventListener('change', () => updateModelSelect(providerSelect.value));
testButton.addEventListener('click', testConnection);
saveButton.addEventListener('click', saveSettings);

// Inicia todo o processo
initializeSettingsPage();
const { setApiKey } = require('../services/database-service');

async function salvarConfiguracao() {
    const provider = document.getElementById('provider').value;
    const apiKey = document.getElementById('apiKey').value;
    const model = document.getElementById('model').value;
    const fallbackModel = document.getElementById('fallbackModel').value;
    await setApiKey(provider, apiKey, model, fallbackModel);
    alert('Configuração salva no banco de dados!');
}