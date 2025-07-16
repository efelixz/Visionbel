// src/services/ai-service.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const settingsService = require('./settings-service');

let genAI = null;

// NOVO: Objeto com os prompts padrão
const defaultPrompts = {
    destaque: `Você é um especialista em análise de questões...`,
    sugestao: `Você é um assistente de programação especializado em fornecer explicações detalhadas e contextuais.

Sua função é:
1. EXPLICAR conceitos de maneira clara e abrangente
2. IDENTIFICAR quando faltam informações importantes
3. SOLICITAR contexto adicional quando necessário
4. RELACIONAR o conceito com outros temas relevantes
5. FORNECER exemplos práticos e casos de uso

Ao analisar o texto:
1. Se for um termo técnico:
   - Explique seu significado
   - Descreva seus usos comuns
   - Mencione conceitos relacionados
   - Forneça exemplos práticos
   - Indique possíveis problemas comuns

2. Se for um trecho de código:
   - Explique a funcionalidade
   - Destaque padrões importantes
   - Sugira possíveis melhorias
   - Aponte possíveis problemas
   - Peça mais contexto se necessário

3. Se for uma dúvida:
   - Identifique o conceito principal
   - Forneça uma explicação inicial
   - Solicite esclarecimentos se necessário
   - Sugira tópicos relacionados
   - Ofereça recursos adicionais

4. Se faltar contexto:
   - Indique quais informações estão faltando
   - Faça perguntas específicas
   - Sugira diferentes cenários possíveis
   - Explique por que o contexto é importante

Sempre:
- Use linguagem clara e profissional
- Forneça exemplos relevantes
- Indique quando mais informações são necessárias
- Relacione com outros conceitos importantes
- Mantenha foco no objetivo do usuário`,
    autocorrecao: `Analise o seguinte bloco de código...`,
    etico: `Você é um tutor especialista no "Modo Ético"...`,
    directo: `Como um assistente especialista em programação e lógica...`,
    raciocinio: `💬 RACIOCÍNIO...`,
    shadow: `Você é um assistente especializado em modo shadow...`
};

async function initializeAI() {
    const store = await settingsService.initStore();
    const apiSettings = store.get('apiSettings');
    
    if (apiSettings && apiSettings.key) {
        genAI = new GoogleGenerativeAI(apiSettings.key);
    } else {
        genAI = null;
    }
}

// NOVA: Função para tentar com fallback
async function getModelWithFallback() {
    const store = await settingsService.initStore();
    const apiSettings = store.get('apiSettings');
    
    const primaryModel = apiSettings.model || 'gemini-2.0-flash-exp';
    const fallbackModel = apiSettings.fallbackModel || 'gemini-1.5-flash-latest';
    
    return { primaryModel, fallbackModel };
}

// NOVA: Função para executar com fallback automático
async function executeWithFallback(operation, primaryModel, fallbackModel) {
    try {
        console.log(`Tentando com modelo principal: ${primaryModel}`);
        return await operation(primaryModel);
    } catch (error) {
        console.warn(`Erro com modelo principal (${primaryModel}):`, error.message);
        
        // Verifica se é um erro que justifica fallback
        if (error.status === 404 || error.status === 400 || error.message.includes('model not found')) {
            console.log(`Tentando fallback para: ${fallbackModel}`);
            try {
                return await operation(fallbackModel);
            } catch (fallbackError) {
                console.error(`Erro também no modelo fallback (${fallbackModel}):`, fallbackError.message);
                throw new Error(`Ambos os modelos falharam. Principal: ${error.message}, Fallback: ${fallbackError.message}`);
            }
        } else {
            // Para outros tipos de erro (quota, rede, etc.), não tenta fallback
            throw error;
        }
    }
}

async function getAIResponse({ text, mode, signal = null }) {
    if (!genAI) {
        await initializeAI();
    }

    if (!genAI) {
        return "Erro: Nenhuma chave da API configurada. Por favor, configure uma chave nas configurações do aplicativo.";
    }

    try {
        // Verifica cancelamento antes de iniciar
        if (signal && signal.aborted) {
            throw new Error('Operação cancelada');
        }
        
        const { primaryModel, fallbackModel } = await getModelWithFallback();
        
        // NOVO: Lógica dinâmica para buscar o prompt
        const customPrompts = await settingsService.getCustomPrompts();
        const promptTemplate = customPrompts[mode] || defaultPrompts[mode];
        
        if (!promptTemplate) {
            return `Erro: Modo '${mode}' não reconhecido ou sem prompt definido.`;
        }

        // Verifica cancelamento antes da chamada da API
        if (signal && signal.aborted) {
            throw new Error('Operação cancelada');
        }

        // Monta o prompt final
        const prompt = `${promptTemplate} "${text}"`;

        // NOVO: Operação com fallback
        const operation = async (modelName) => {
            const model = genAI.getGenerativeModel({ model: modelName });
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
        
        const result = await executeWithFallback(operation, primaryModel, fallbackModel);
        const response = await result.response;
        let aiText = response.text();
        
        // Remove formatação markdown se for modo destaque
        if (mode === 'destaque') {
            aiText = aiText.replace(/```json\s*|```\s*|`/g, '');
            aiText = aiText.trim();
            
            if (!aiText.startsWith('{') || !aiText.endsWith('}')) {
                throw new Error('Resposta da IA não está no formato JSON esperado');
            }
        }
        
        console.log('Resposta do Gemini recebida com sucesso.');
        return aiText;

    } catch (error) {
        if (error.message.includes('cancelada') || error.message.includes('Operação cancelada')) {
            throw new Error('IA cancelada pelo usuário');
        }
        
        // NOVO: Tratamento específico para erro de quota
        if (error.status === 429) {
            return "⚠️ Limite diário da API atingido. Tente novamente amanhã ou considere fazer upgrade do plano. Para mais informações: https://ai.google.dev/gemini-api/docs/rate-limits";
        }
        
        console.error('Erro ao chamar a API do Google AI:', error);
        return `Ocorreu um erro ao conectar com o Gemini. Detalhes: ${error.message}`;
    }
}

async function testApiKey(apiSettings) {
    try {
        const genAI = new GoogleGenerativeAI(apiSettings.key);
        const { primaryModel, fallbackModel } = await getModelWithFallback();
        
        const operation = async (modelName) => {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test");
            await result.response;
            return { success: true, model: modelName };
        };
        
        return await executeWithFallback(operation, primaryModel, fallbackModel);
        
    } catch (error) {
        return { 
            success: false, 
            error: error.message || 'Erro ao validar a chave da API'
        };
    }
}

async function analyzeWithContextCheck({ text, mode, conversationHistory = [], signal = null }) {
    if (!genAI) {
        await initializeAI();
    }

    if (!genAI) {
        return {
            response: "Erro: Nenhuma chave da API configurada. Por favor, configure uma chave nas configurações do aplicativo.",
            needsMoreContext: false,
            isComplete: false
        };
    }

    try {
        const { primaryModel, fallbackModel } = await getModelWithFallback();
        const customPrompts = await settingsService.getCustomPrompts();
        let promptTemplate = customPrompts[mode] || defaultPrompts[mode];
        
        // Melhora o prompt para incluir o contexto da conversa
        if (conversationHistory.length > 0) {
            promptTemplate += `\n\nCONTEXTO DA CONVERSA:\n`;
            
            for (let i = 0; i < conversationHistory.length; i++) {
                if (i === 0 && conversationHistory[i].startsWith('Texto capturado:')) {
                    promptTemplate += `${conversationHistory[i]}\n`;
                } else if (i % 2 === 1) {
                    promptTemplate += `IA: ${conversationHistory[i]}\n`;
                } else {
                    promptTemplate += `Usuário: ${conversationHistory[i]}\n`;
                }
            }
            
            promptTemplate += `\n\nNOVA PERGUNTA DO USUÁRIO: "${text}"\n\nCom base em todo o contexto da conversa acima, responda à nova pergunta do usuário. Se você já forneceu informações relevantes anteriormente, faça referência a elas. Se ainda precisar de mais contexto específico, indique claramente o que falta.`;
        } else {
            promptTemplate += ` "${text}"\n\nAntes de responder, avalie se você tem contexto suficiente para fornecer uma resposta completa e útil. Se precisar de mais informações específicas, indique claramente o que falta.`;
        }

        if (signal && signal.aborted) {
            throw new Error('Operação cancelada');
        }

        const operation = async (modelName) => {
            const model = genAI.getGenerativeModel({ model: modelName });
            return await model.generateContent(promptTemplate);
        };
        
        const result = await executeWithFallback(operation, primaryModel, fallbackModel);
        const response = await result.response;
        let aiText = response.text();
        
        const needsContext = needsMoreContext(aiText);
        const isComplete = !needsContext && aiText.length > 100;
        
        return {
            response: aiText,
            needsMoreContext: needsContext,
            isComplete: isComplete
        };
        
    } catch (error) {
        if (error.message.includes('cancelada') || error.message.includes('Operação cancelada')) {
            throw new Error('IA cancelada pelo usuário');
        }
        
        // NOVO: Tratamento específico para erro de quota
        if (error.status === 429) {
            return {
                response: "⚠️ Limite diário da API atingido. Tente novamente amanhã ou considere fazer upgrade do plano.",
                needsMoreContext: false,
                isComplete: false
            };
        }
        
        console.error('Erro ao chamar a API do Google AI:', error);
        return {
            response: `Ocorreu um erro ao conectar com o Gemini. Detalhes: ${error.message}`,
            needsMoreContext: false,
            isComplete: false
        };
    }
}

// Inicializa o serviço de AI
initializeAI();

module.exports = { 
    getAIResponse, 
    getDefaultPrompts,
    testApiKey,
    needsMoreContext,
    analyzeWithContextCheck,
    getModelWithFallback, // NOVO
    executeWithFallback   // NOVO
};

// Adicionar cache de respostas
const responseCache = new Map();

// Implementar retry com backoff
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Detectar erro de quota e mostrar mensagem amigável
      if (error.status === 429) {
        return {
          text: "⚠️ Limite diário da API atingido. Tente novamente amanhã ou considere fazer upgrade do plano.",
          needsMoreContext: false
        };
      }
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};