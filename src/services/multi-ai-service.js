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

async function getAIResponse({ text, mode, signal = null }) {
    try {
        const apiSettings = await settingsService.getSetting('apiSettings');
        const provider = apiSettings?.provider || 'gemini';

        // Carrega os prompts padrão do arquivo ai-service.js
        const defaultPrompts = require('./ai-service').getDefaultPrompts();
        const customPrompts = await settingsService.getCustomPrompts();

        const promptTemplate = customPrompts[mode] || defaultPrompts[mode] || "Responda a seguinte questão:";
        const prompt = `${promptTemplate} \"${text}\"`;

        const providerSettings = apiSettings[provider];

        // A verificação principal que estava causando o erro
        if (!providerSettings || !providerSettings.key) {
            // Esta mensagem agora será mais precisa
            return `Erro: Provedor ${provider} não configurado. Por favor, configure a chave da API nas Configurações.`;
        }

        const models = {
            primary: providerSettings.model,
            fallback: providerSettings.fallbackModel
        };

        // Adiciona um AbortSignal para cancelar a requisição se necessário
        const operationWithSignal = (modelName) => {
            const operation = async (model) => {
                if (signal && signal.aborted) {
                    throw new Error('Operação cancelada pelo usuário');
                }
                const genAI = new GoogleGenerativeAI(providerSettings.key);
                const geminiModel = genAI.getGenerativeModel({ model });
                return await geminiModel.generateContent(prompt);
            };

            if (provider === 'gemini') {
                return executeWithFallback('gemini', operation, modelName, models.fallback);
            }
            // Adicione aqui a lógica para outros provedores (OpenAI, etc.)
            throw new Error(`Provedor ${provider} não suportado`);
        };

        switch (provider) {
            case 'gemini':
                console.log('Iniciando chamada Gemini com configurações:', {
                    model: models.primary,
                    fallback: models.fallback,
                    prompt: prompt
                });
                const genAI = new GoogleGenerativeAI(providerSettings.key);
                const operation = async (modelName) => {
                    console.log('Tentando modelo:', modelName);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt, { signal });
                    console.log('Resposta recebida:', result);
                    return result;
                };
                const result = await executeWithFallback('gemini', operation, models.primary, models.fallback);
                const response = await result.response;
                const text = response.text();

                // Verificar o modo e processar adequadamente
                if (mode === 'directo') {
                    // Para resposta direta, retornar o texto puro
                    return text;
                } else {
                    // Para outros modos, manter o processamento JSON
                    try {
                        const cleanText = text.replace(/```json\s*|```\s*|`/g, '').trim();
                        JSON.parse(cleanText);
                        return cleanText;
                    } catch (error) {
                        console.error('Erro ao processar JSON:', error);
                        return JSON.stringify({
                            links: [],
                            keywords: [],
                            important_text: [`Erro ao processar resposta: ${error.message}`]
                        });
                    }
                }
                // Remover estas linhas duplicadas
                // const response = await result.response;
                // console.log('Resposta final:', response.text());
                // return response.text();

            case 'openai':
                // Implementar chamada para OpenAI aqui
                throw new Error('OpenAI ainda não implementado');
            case 'anthropic':
                // Implementar chamada para Anthropic aqui
                throw new Error('Anthropic ainda não implementado');
            case 'cohere':
                // Implementar chamada para Cohere aqui
                throw new Error('Cohere ainda não implementado');
            default:
                throw new Error(`Provedor ${provider} não suportado`);
        }
    } catch (error) {
        console.error(`Erro em getAIResponse:`, error);
        if (error.message.includes('cancelada')) {
            return 'Análise cancelada.';
        }
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