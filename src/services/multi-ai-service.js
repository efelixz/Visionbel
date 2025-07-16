// src/services/multi-ai-service.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const settingsService = require('./settings-service');

// Configurações dos provedores
const PROVIDERS = {
    gemini: {
        name: 'Google Gemini',
        models: {
            'gemini-2.0-flash-exp': '🚀 Gemini 2.0 Flash (Experimental)',
            'gemini-1.5-flash-latest': '⚡ Gemini 1.5 Flash (Estável)',
            'gemini-1.5-pro-latest': '💎 Gemini 1.5 Pro (Avançado)'
        }
    },
    openai: {
        name: 'OpenAI',
        models: {
            'gpt-4o': '🧠 GPT-4o (Mais Avançado)',
            'gpt-4o-mini': '⚡ GPT-4o Mini (Rápido)',
            'gpt-4-turbo': '💎 GPT-4 Turbo',
            'gpt-3.5-turbo': '💰 GPT-3.5 Turbo (Econômico)'
        }
    },
    anthropic: {
        name: 'Anthropic Claude',
        models: {
            'claude-3-5-sonnet-20241022': '🎭 Claude 3.5 Sonnet (Mais Recente)',
            'claude-3-5-haiku-20241022': '⚡ Claude 3.5 Haiku (Rápido)',
            'claude-3-opus-20240229': '💎 Claude 3 Opus (Mais Poderoso)',
            'claude-3-haiku-20240307': '💰 Claude 3 Haiku (Econômico)'
        }
    },
    cohere: {
        name: 'Cohere',
        models: {
            'command-r-plus': '🚀 Command R+ (Avançado)',
            'command-r': '⚡ Command R (Padrão)',
            'command-light': '💰 Command Light (Econômico)'
        }
    }
};

let aiClients = {};

// Inicializar clientes de IA
async function initializeAI() {
    const store = await settingsService.initStore();
    const apiSettings = store.get('apiSettings');
    
    // Inicializar Gemini
    if (apiSettings.gemini?.key) {
        aiClients.gemini = new GoogleGenerativeAI(apiSettings.gemini.key);
    }
    
    // Inicializar OpenAI (quando implementado)
    if (apiSettings.openai?.key) {
        // aiClients.openai = new OpenAI({ apiKey: apiSettings.openai.key });
    }
    
    // Inicializar Anthropic (quando implementado)
    if (apiSettings.anthropic?.key) {
        // aiClients.anthropic = new Anthropic({ apiKey: apiSettings.anthropic.key });
    }
    
    // Inicializar Cohere (quando implementado)
    if (apiSettings.cohere?.key) {
        // aiClients.cohere = new CohereClient({ token: apiSettings.cohere.key });
    }
}

// Função para executar com fallback
async function executeWithFallback(provider, operation, primaryModel, fallbackModel) {
    try {
        console.log(`[${provider.toUpperCase()}] Tentando com modelo principal: ${primaryModel}`);
        return await operation(primaryModel);
    } catch (error) {
        console.warn(`[${provider.toUpperCase()}] Erro com modelo principal (${primaryModel}):`, error.message);
        
        // Verifica se é um erro que justifica fallback
        if (error.status === 404 || error.status === 400 || error.message.includes('model not found')) {
            console.log(`[${provider.toUpperCase()}] Tentando fallback para: ${fallbackModel}`);
            try {
                return await operation(fallbackModel);
            } catch (fallbackError) {
                console.error(`[${provider.toUpperCase()}] Erro também no modelo fallback (${fallbackModel}):`, fallbackError.message);
                throw new Error(`Ambos os modelos falharam. Principal: ${error.message}, Fallback: ${fallbackError.message}`);
            }
        } else {
            throw error;
        }
    }
}

// Implementação para Gemini
async function callGemini(prompt, models, signal) {
    if (!aiClients.gemini) {
        throw new Error('Cliente Gemini não inicializado');
    }
    
    const operation = async (modelName) => {
        const model = aiClients.gemini.getGenerativeModel({ model: modelName });
        const aiPromise = model.generateContent(prompt);
        
        if (signal) {
            const cancelPromise = new Promise((_, reject) => {
                signal.addEventListener('abort', () => {
                    reject(new Error('Operação cancelada'));
                });
            });
            return await Promise.race([aiPromise, cancelPromise]);
        } else {
            return await aiPromise;
        }
    };
    
    const result = await executeWithFallback('gemini', operation, models.primary, models.fallback);
    const response = await result.response;
    return response.text();
}

// Implementação para OpenAI (placeholder)
async function callOpenAI(prompt, models, signal) {
    // TODO: Implementar quando a biblioteca OpenAI for adicionada
    throw new Error('OpenAI ainda não implementado');
}

// Implementação para Anthropic (placeholder)
async function callAnthropic(prompt, models, signal) {
    // TODO: Implementar quando a biblioteca Anthropic for adicionada
    throw new Error('Anthropic ainda não implementado');
}

// Implementação para Cohere (placeholder)
async function callCohere(prompt, models, signal) {
    // TODO: Implementar quando a biblioteca Cohere for adicionada
    throw new Error('Cohere ainda não implementado');
}

// Função principal para obter resposta da IA
async function getAIResponse({ text, mode, signal = null }) {
    if (Object.keys(aiClients).length === 0) {
        await initializeAI();
    }
    
    const store = await settingsService.initStore();
    const apiSettings = store.get('apiSettings');
    const provider = apiSettings.provider || 'gemini';
    
    if (!aiClients[provider]) {
        return `Erro: Provedor ${provider} não configurado. Configure a chave da API nas configurações.`;
    }
    
    try {
        // Verifica cancelamento
        if (signal && signal.aborted) {
            throw new Error('Operação cancelada');
        }
        
        // Busca prompt personalizado
        const customPrompts = await settingsService.getCustomPrompts();
        const defaultPrompts = require('./ai-service').getDefaultPrompts();
        const promptTemplate = customPrompts[mode] || defaultPrompts[mode];
        
        if (!promptTemplate) {
            return `Erro: Modo '${mode}' não reconhecido ou sem prompt definido.`;
        }
        
        const prompt = `${promptTemplate} "${text}"`;
        const providerSettings = apiSettings[provider];
        const models = {
            primary: providerSettings.model,
            fallback: providerSettings.fallbackModel
        };
        
        let aiText;
        
        // Chama o provedor apropriado
        switch (provider) {
            case 'gemini':
                aiText = await callGemini(prompt, models, signal);
                break;
            case 'openai':
                aiText = await callOpenAI(prompt, models, signal);
                break;
            case 'anthropic':
                aiText = await callAnthropic(prompt, models, signal);
                break;
            case 'cohere':
                aiText = await callCohere(prompt, models, signal);
                break;
            default:
                throw new Error(`Provedor ${provider} não suportado`);
        }
        
        // Processamento específico para modo destaque
        if (mode === 'destaque') {
            aiText = aiText.replace(/```json\s*|```\s*|`/g, '').trim();
            if (!aiText.startsWith('{') || !aiText.endsWith('}')) {
                throw new Error('Resposta da IA não está no formato JSON esperado');
            }
        }
        
        console.log(`[${provider.toUpperCase()}] Resposta recebida com sucesso.`);
        return aiText;
        
    } catch (error) {
        if (error.message.includes('cancelada') || error.message.includes('Operação cancelada')) {
            throw new Error('IA cancelada pelo usuário');
        }
        
        // Tratamento específico para erro de quota
        if (error.status === 429) {
            return `⚠️ Limite da API ${provider} atingido. Tente novamente mais tarde ou considere trocar de provedor.`;
        }
        
        console.error(`Erro ao chamar ${provider}:`, error);
        return `Ocorreu um erro ao conectar com ${PROVIDERS[provider].name}. Detalhes: ${error.message}`;
    }
}

// Função para testar chave da API
async function testApiKey(provider, apiKey, model) {
    try {
        let testClient;
        
        switch (provider) {
            case 'gemini':
                testClient = new GoogleGenerativeAI(apiKey);
                const geminiModel = testClient.getGenerativeModel({ model });
                const result = await geminiModel.generateContent("Test");
                await result.response;
                break;
            case 'openai':
                // TODO: Implementar teste OpenAI
                throw new Error('Teste OpenAI ainda não implementado');
            case 'anthropic':
                // TODO: Implementar teste Anthropic
                throw new Error('Teste Anthropic ainda não implementado');
            case 'cohere':
                // TODO: Implementar teste Cohere
                throw new Error('Teste Cohere ainda não implementado');
            default:
                throw new Error(`Provedor ${provider} não suportado`);
        }
        
        return { success: true, provider, model };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.message || `Erro ao validar a chave da API ${provider}`
        };
    }
}

// Função para obter provedores disponíveis
function getAvailableProviders() {
    return PROVIDERS;
}

// Inicializa o serviço
initializeAI();

module.exports = {
    getAIResponse,
    testApiKey,
    getAvailableProviders,
    initializeAI
};