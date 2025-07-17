const { GoogleGenerativeAI } = require("@google/generative-ai");
const settingsService = require('./settings-service');

// Configurações dos provedores
const PROVIDERS = {
    gemini: {
        name: 'Google Gemini',
        models: {
            'gemini-2.5-pro': '🌟 Gemini 2.5 Pro (Mais Avançado)',
            'gemini-2.5-flash': '⚡ Gemini 2.5 Flash (Ultra Rápido)',
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

async function executeWithFallback(provider, operation, primaryModel, fallbackModel) {
    try {
        console.log(`[${provider.toUpperCase()}] Tentando com modelo principal: ${primaryModel}`);
        return await operation(primaryModel);
    } catch (error) {
        console.warn(`[${provider.toUpperCase()}] Erro com modelo principal (${primaryModel}):`, error.message);
        
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

async function callGemini(prompt, models) {
    const apiSettings = await settingsService.getSetting('apiSettings');
    if (!apiSettings?.gemini?.key) {
        throw new Error('Chave da API do Gemini não encontrada nas configurações.');
    }
    const genAI = new GoogleGenerativeAI(apiSettings.gemini.key);
    const operation = async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        return await model.generateContent(prompt);
    };
    const result = await executeWithFallback('gemini', operation, models.primary, models.fallback);
    const response = await result.response;
    return response.text();
}

async function callOpenAI(prompt, models) {
    throw new Error('OpenAI ainda não implementado');
}

async function callAnthropic(prompt, models) {
    throw new Error('Anthropic ainda não implementado');
}

async function callCohere(prompt, models) {
    throw new Error('Cohere ainda não implementado');
}

async function getAIResponse({ text, mode }) {
    try {
        const apiSettings = await settingsService.getSetting('apiSettings');
        const provider = apiSettings?.provider || 'gemini';
        const customPrompts = await settingsService.getCustomPrompts();
        const defaultPrompts = require('./ai-service').getDefaultPrompts();
        const promptTemplate = customPrompts[mode] || defaultPrompts[mode] || "Responda a seguinte questão:";
        const prompt = `${promptTemplate} \"${text}\"`;
        const providerSettings = apiSettings[provider];
        if (!providerSettings || !providerSettings.key) {
            return `Erro: Provedor ${provider} não configurado. Por favor, configure a chave da API.`;
        }
        const models = {
            primary: providerSettings.model,
            fallback: providerSettings.fallbackModel
        };
        switch (provider) {
            case 'gemini':
                return await callGemini(prompt, models);
            case 'openai':
                return await callOpenAI(prompt, models);
            case 'anthropic':
                return await callAnthropic(prompt, models);
            case 'cohere':
                return await callCohere(prompt, models);
            default:
                throw new Error(`Provedor ${provider} não suportado`);
        }
    } catch (error) {
        console.error(`Erro em getAIResponse:`, error);
        return `Ocorreu um erro ao conectar com a IA. Detalhes: ${error.message}`;
    }
}

async function testApiKey(provider, key, model) {
    try {
        if (!provider || !key || !model) {
            const missingParams = [];
            if (!provider) missingParams.push('provedor');
            if (!key) missingParams.push('chave');
            if (!model) missingParams.push('modelo');
            
            return { 
                success: false, 
                message: `Parâmetros inválidos: ${missingParams.join(', ')} são obrigatórios` 
            };
        }

        const providerConfig = PROVIDERS[provider];
        if (!providerConfig) {
            return { 
                success: false, 
                message: `Provedor ${provider} não encontrado. Provedores disponíveis: ${Object.keys(PROVIDERS).join(', ')}` 
            };
        }

        if (!providerConfig.models[model]) {
            const availableModels = Object.keys(providerConfig.models)
                .map(m => `${m} (${providerConfig.models[m]})`)
                .join('\n- ');
            return { 
                success: false, 
                message: `Modelo ${model} não encontrado para o provedor ${provider}. \n\nModelos disponíveis para ${providerConfig.name}:\n- ${availableModels}` 
            };
        }

        if (provider === 'gemini') {
            try {
                const genAI = new GoogleGenerativeAI(key);
                const geminiModel = genAI.getGenerativeModel({ model });
                await geminiModel.generateContent('Test connection');
                return { 
                    success: true, 
                    message: 'Conexão com Gemini estabelecida com sucesso!' 
                };
            } catch (error) {
                const errorMsg = error.message || 'Erro desconhecido';
                return { 
                    success: false, 
                    message: `Erro ao conectar com Gemini: ${errorMsg}` 
                };
            }
        }

        return { 
            success: false, 
            message: `Teste para o provedor ${provider} ainda não implementado` 
        };
    } catch (error) {
        const errorMsg = error.message || 'Erro desconhecido';
        return { 
            success: false, 
            message: `Erro ao testar conexão: ${errorMsg}` 
        };
    }
}

function getAvailableProviders() {
    return PROVIDERS;
}

module.exports = {
    getAIResponse,
    testApiKey,
    getAvailableProviders
};