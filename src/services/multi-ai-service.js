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

async function getAIResponse({ text, mode, signal }) {
    try {
        // Obter as configurações do provedor
        const apiSettings = await settingsService.getSetting('apiSettings');
        const provider = apiSettings.provider;
        const key = apiSettings[provider].key;
        
        switch (provider) {
            case 'gemini':
                const genAI = new GoogleGenerativeAI(key);
                const models = {
                    primary: apiSettings[provider].model,
                    fallback: 'gemini-1.5-pro-latest'
                };
                
                const operation = async (modelName) => {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    let formattedPrompt;
                    if (mode === 'autocorrecao') {
                        formattedPrompt = `${text}\n\nIMPORTANTE: Atue como um corretor técnico...`; // resto do prompt
                    } else {
                        formattedPrompt = text;
                    }

                    const result = await model.generateContent(formattedPrompt, { signal });
                    console.log('Resposta recebida:', result);
                    return result;
                };
                
                const result = await executeWithFallback('gemini', operation, models.primary, models.fallback);
                const response = await result.response;
                const responseText = response.text(); // Renomeado para evitar conflito

                // Processamento da resposta
                if (mode === 'directo') {
                    return responseText;
                } else if (mode === 'sugestoes' || mode === 'autocorrecao') {
                    try {
                        const parsedJson = JSON.parse(responseText); // Usando responseText
                        return JSON.stringify(parsedJson);
                    } catch (error) {
                        console.error(`Erro ao processar JSON do modo ${mode}:`, error);
                        console.error('Texto recebido:', text);
                        
                        if (mode === 'autocorrecao') {
                            return JSON.stringify({
                                content_type: "error",
                                analysis_summary: "Erro ao processar a resposta",
                                identified_errors: [],
                                corrections: [],
                                explanations: [
                                    "🔍 Houve um erro ao processar a análise",
                                    "⚠️ O formato da resposta não está adequado"
                                ],
                                best_practices: [
                                    "📋 Verifique se o conteúdo está formatado corretamente",
                                    "🔄 Tente novamente com uma entrada diferente"
                                ],
                                learning_points: [],
                                references: [],
                                improvement_suggestions: [
                                    "1. Reformule o conteúdo",
                                    "2. Verifique a formatação",
                                    "3. Tente uma abordagem diferente"
                                ],
                                validation_steps: []
                            });
                        }
                        return JSON.stringify({
                            domain: "error",
                            content_type: "error_report",
                            difficulty_level: "n/a",
                            prerequisites: [],
                            key_concepts: [],
                            reflexive_questions: [
                                "🤔 O conteúdo fornecido está no formato esperado?",
                                "📝 As instruções foram seguidas corretamente?",
                                "🔄 Vale a pena tentar novamente com uma entrada diferente?"
                            ],
                            technical_hints: [
                                "📋 Verifique se o texto de entrada é válido",
                                "🔍 Certifique-se de que o modo sugestões é apropriado para este conteúdo",
                                "⚙️ Considere usar outro modo de análise"
                            ],
                            step_suggestions: [
                                "1. Verifique o formato do conteúdo",
                                "2. Tente reformular a entrada",
                                "3. Considere usar o modo direto"
                            ],
                            learning_resources: [],
                            suggested_path: [],
                            progress_markers: [],
                            common_mistakes: [],
                            validation_points: [],
                            encouragement: [
                                "✨ Não desanime, vamos tentar de outra forma!",
                                "💪 Cada tentativa nos aproxima da solução ideal"
                            ]
                        });
                    }
                } else {
                    return responseText;
                }
            
            case 'openai':
                throw new Error('OpenAI ainda não implementado');

            case 'anthropic':
                throw new Error('Anthropic ainda não implementado');

            case 'cohere':
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