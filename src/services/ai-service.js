// src/services/ai-service.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const settingsService = require("./settings-service");
const databaseService = require("./database-service");

let genAI = null;

// NOVO: Objeto com os prompts padrão
const defaultPrompts = {
    destaque: `Você é um especialista em análise visual e destaque inteligente...

Analise o seguinte conteúdo e aplique o realce ativo:`,
    sugestao: `🧠 MODO SUGESTÕES – Copiloto de Ideias
"Orientar o usuário com dicas, pistas, perguntas guiadas e caminhos estratégicos, sem entregar a resposta final."

Você é um mentor invisível que treina o cérebro do usuário para pensar como especialista.

🧠 Finalidade Principal:
• Estimular raciocínio autônomo
• Ensinar como pensar, não o que responder
• Treinar para entrevistas, provas, desafios de lógica e programação

🎯 Como Atuar por Situação:
• Prova de faculdade (recorrência/algoritmo): Sugere técnicas específicas (ex: indução)
• Código malfeito: Aponta pontos a revisar sem mostrar solução
• Questão dissertativa: Indica estrutura lógica para montar raciocínio
• Entrevista técnica: Simula "dicas" de um entrevistador inteligente

🔍 Suas Funções Principais:
1. 🧠 Perguntas Reflexivas: Faça perguntas guias (ex: "Qual é o caso base?")
2. 🧩 Pistas Técnicas: Dê dicas pontuais sobre conceitos (ex: "Lembre do Teorema Mestre")
3. 🔁 Sugestão por Etapas: Divida a resolução em pequenas pistas progressivas
4. ⚙️ Adaptável ao Nível: Iniciante recebe mais ajuda, avançado menos
5. 🧭 Caminho Sugerido: Mostre como pensar (ex: "Comece pela complexidade")
6. ❌ NUNCA entregue a resposta: Interrompa antes da conclusão (ex: "Você consegue terminar!")

💬 Tipos de Sugestões:
• 🧠 Pergunta: "Qual é a condição de parada da recursão?"
• 📌 Lembrete conceitual: "Lembre-se: vetores ordenados ajudam no merge sort"
• 🪜 Caminho lógico: "1. Divida a questão. 2. Avalie subproblemas. 3. Compare custos"
• ⚠️ Alertas: "Cuidado: esse algoritmo tem pior caso oculto"
• 🔄 Estratégia alternativa: "Tente resolver com árvore de recursão também"

🧠 Níveis de Profundidade:
• Básico: Dicas mais diretas, foco no entendimento fundamental
• Intermediário: Dicas mais conceituais, menos explícitas
• Avançado: Estímulo à dedução com mínima orientação
• Modo Tutor: Dicas + perguntas + analogias pedagógicas

🧠 Estratégias Didáticas:
• Socratic Prompting: Guie com perguntas ("Por que você acha que...?")
• Pistas em Camadas: Dica → subdica → quase-resposta (sem concluir)
• Reforço Positivo: "Você está no caminho certo! Veja esse detalhe..."
• Analogias: "Pense em merge sort como empilhar livros por tamanho"

📋 Formato de Resposta:
Sempre estruture suas sugestões assim:

🔍 **Dica 1:** [Observação inicial sobre o problema]
🤔 **Dica 2:** [Pergunta reflexiva para guiar o pensamento]
📌 **Lembrete:** [Conceito técnico relevante]
💡 **Dica Final:** [Orientação para conclusão SEM dar a resposta]

🎓 Recursos Complementares Disponíveis:
• "Explicação de Conceito": Explique termo técnico sugerido
• "Tente Outra Abordagem": Sugira forma alternativa de pensar
• "Expandir Dica": Detalhe uma dica específica
• "Histórico de Dicas": Mostre dicas anteriores

🎯 Regras Fundamentais:
• NUNCA dê a resposta completa
• Sempre termine com uma pergunta ou desafio
• Use linguagem motivacional e encorajadora
• Adapte o nível de dificuldade das dicas ao contexto
• Foque em ensinar o processo de pensamento
• Interrompa antes da conclusão final

💪 Ideal para:
• Estudantes autodidatas
• Treinamento para provas com consulta limitada
• Treinamento ético para concursos e vestibulares
• Simulação de entrevistas técnicas (sem cola)

Analise o seguinte conteúdo e forneça sugestões guiadas:`,
    autocorrecao: `Analise o seguinte bloco de código e identifique possíveis erros, problemas de lógica, má práticas ou oportunidades de melhoria. Forneça sugestões específicas e práticas para correção.

Foque em:
• Erros de sintaxe
• Problemas de lógica
• Performance e otimização
• Legibilidade e manutenibilidade
• Boas práticas da linguagem
• Segurança

Forneça as correções de forma clara e explicativa:`,
    etico: `Você é um tutor especialista no "Modo Ético" - focado em orientar estudantes de forma pedagógica e responsável.

Seu objetivo é:
• Ensinar conceitos fundamentais
• Estimular o pensamento crítico
• Promover boas práticas acadêmicas
• Desenvolver habilidades de resolução de problemas
• Manter integridade acadêmica

NUNCA forneça respostas diretas para:
• Exercícios de casa
• Provas ou exames
• Trabalhos acadêmicos
• Questões de concursos

Em vez disso, ofereça:
• Explicações conceituais
• Dicas de estudo
• Metodologias de resolução
• Recursos de aprendizagem
• Orientação pedagógica

Analise o seguinte conteúdo e forneça orientação ética:`,
    directo: `Como um assistente especialista em programação e lógica, forneça uma resposta direta, clara e completa para a questão apresentada.

Sua resposta deve ser:
• Precisa e técnica
• Bem estruturada
• Com exemplos práticos quando relevante
• Focada na solução
• Completa e definitiva

Analise e responda:`,
    raciocinio: `💬 RACIOCÍNIO PASSO A PASSO

Você deve demonstrar seu processo de pensamento de forma transparente e didática.

Estruture sua resposta assim:

🔍 **ANÁLISE INICIAL:**
[Identifique os elementos principais do problema]

🧠 **PROCESSO DE RACIOCÍNIO:**
[Mostre cada etapa do seu pensamento]

⚙️ **APLICAÇÃO DE CONCEITOS:**
[Explique quais conceitos/técnicas está usando]

✅ **SOLUÇÃO FINAL:**
[Apresente a resposta completa]

🎯 **VERIFICAÇÃO:**
[Valide se a solução faz sentido]

Analise o seguinte problema e demonstre seu raciocínio:`,
    shadow: `Você é um assistente especializado em modo shadow - análise discreta e observação silenciosa.

Seu papel é:
• Observar padrões
• Identificar tendências
• Detectar anomalias
• Fornecer insights sutis
• Manter discrição

Analise silenciosamente e forneça observações discretas:`
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
    // Busca a chave da API do banco de dados
    const apiKeyData = await databaseService.getApiKey("gemini");
    const key = apiKeyData?.api_key;
    // Use only one declaration for model and fallbackModel
    // Get model from API key data or use default, ensuring no redeclaration
    if (!apiKeyData?.model) {
        const model = 'gemini-2.0-flash-exp';
    }
    // Use fallback model from API key data or default
    const modelFallback = apiKeyData?.fallback_model || 'gemini-1.5-flash-latest';
    if (!key) {
        return "Erro: Nenhuma chave da API configurada. Por favor, configure uma chave nas configurações do aplicativo.";
    }
    const genAI = new GoogleGenerativeAI(key);
    const { model = 'gemini-2.0-flash-exp', fallbackModel = 'gemini-1.5-flash-latest' } = apiSettings;
    // ... rest of your prompt/template/model fallback logic ...
}

// Substituir a função testApiKey (linha ~290)
async function testApiKey(apiSettings) {
    try {
        console.log('Testando API com configurações:', apiSettings);
        
        // Aceitar tanto o formato antigo quanto o novo
        const key = apiSettings.key || apiSettings.apiKey;
        const model = apiSettings.model || 'gemini-2.0-flash-exp';
        
        if (!key) {
            return {
                success: false,
                error: 'Chave da API não fornecida'
            };
        }
        
        const genAI = new GoogleGenerativeAI(key);
        
        // Usar o modelo especificado ou fallback
        const testModel = genAI.getGenerativeModel({ model: model });
        
        // Teste simples com prompt mínimo
        const result = await testModel.generateContent("Teste de conectividade. Responda apenas 'OK'.");
        const response = await result.response;
        const text = response.text();
        
        console.log('Teste bem-sucedido:', text);
        
        return { 
            success: true, 
            model: model,
            response: text.trim()
        };
        
    } catch (error) {
        console.error('Erro no teste da API:', error);
        
        // Tratamento específico de erros
        let errorMessage = error.message || 'Erro desconhecido';
        
        if (error.status === 400) {
            errorMessage = 'Chave da API inválida ou modelo não suportado';
        } else if (error.status === 403) {
            errorMessage = 'Acesso negado - verifique sua chave da API';
        } else if (error.status === 429) {
            errorMessage = 'Limite de requisições atingido';
        } else if (error.message.includes('API_KEY_INVALID')) {
            errorMessage = 'Chave da API inválida';
        } else if (error.message.includes('model not found')) {
            errorMessage = 'Modelo não encontrado - tente um modelo diferente';
        }
        
        return { 
            success: false, 
            error: errorMessage
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

// Função para verificar se a resposta indica necessidade de mais contexto
function needsMoreContext(response) {
    const contextIndicators = [
        'preciso de mais informações',
        'mais contexto',
        'informações adicionais',
        'não tenho informações suficientes',
        'poderia fornecer mais detalhes',
        'falta contexto',
        'mais detalhes',
        'informações específicas',
        'contexto adicional'
    ];
    
    const lowerResponse = response.toLowerCase();
    return contextIndicators.some(indicator => lowerResponse.includes(indicator));
}

// Função para obter os prompts padrão
function getDefaultPrompts() {
    return defaultPrompts;
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

// Função para processar nível de profundidade no prompt
// ... existing code ...

// Definir recursos complementares disponíveis
const complementaryResources = {
    concept_explanation: {
        type: 'concept_explanation',
        icon: '🎓',
        description: 'Explicação detalhada de conceito técnico',
        formatResponse: (concept, explanation) => `
🎓 Explicação do Conceito: ${concept}

${explanation}

💡 Aplicação Prática:
- Como usar: [exemplo básico]
- Quando usar: [casos de uso]
- Dica extra: [insight adicional]`
    },
    alternative_approach: {
        type: 'alternative_approach',
        icon: '🔄',
        description: 'Sugestão de abordagem alternativa',
        formatResponse: (currentApproach, alternativeApproach) => `
🔄 Abordagem Alternativa:

📍 Atual: ${currentApproach}
↓
🔍 Alternativa: ${alternativeApproach}

💭 Reflexão:
- Vantagens: [pontos positivos]
- Desafios: [pontos a considerar]
- Escolha: [quando preferir cada uma]`
    },
    expand_hint: {
        type: 'expand_hint',
        icon: '🧩',
        description: 'Detalhamento de uma dica específica',
        formatResponse: (hint, details) => `
🧩 Expansão da Dica:

📌 Dica Original: ${hint}

🔍 Detalhamento:
${details}

💡 Pontos-Chave:
- Conceito base: [fundamento]
- Aplicação: [como usar]
- Próximos passos: [sugestão de continuidade]`
    },
    hint_history: {
        type: 'hint_history',
        icon: '📈',
        description: 'Histórico de dicas fornecidas',
        formatResponse: (hints) => `
📈 Histórico de Dicas:

${hints.map((hint, index) => `${index + 1}. ${hint.text}
   ↳ Foco: ${hint.focus}
   ↳ Progresso: ${hint.progress}`).join('\n\n')}

🎯 Progresso:
- Conceitos abordados: [lista]
- Próximo foco sugerido: [recomendação]`
    }
};

// Função para processar recurso complementar
function processComplementaryResource(resourceType, context) {
    const resource = complementaryResources[resourceType];
    if (!resource) return null;

    switch (resourceType) {
        case 'concept_explanation':
            return resource.formatResponse(
                context.concept,
                context.explanation
            );
        case 'alternative_approach':
            return resource.formatResponse(
                context.currentApproach,
                context.alternativeApproach
            );
        case 'expand_hint':
            return resource.formatResponse(
                context.hint,
                context.details
            );
        case 'hint_history':
            return resource.formatResponse(
                context.hints || []
            );
        default:
            return null;
    }
}

// Modificar a função getAIResponse para incluir recursos complementares
async function getAIResponse({ 
    text, 
    mode, 
    resource = null, 
    resourceContext = {}, 
    conversationHistory = [],
    signal = null 
}) {
    // Busca a chave da API do banco de dados
    const apiKeyData = await databaseService.getApiKey("gemini");
    const key = apiKeyData?.api_key;
    // Use only one declaration for model and fallbackModel
    // Get model from API key data or use default, ensuring no redeclaration
    if (!apiKeyData?.model) {
        const model = 'gemini-2.0-flash-exp';
    }
    // Use fallback model from API key data or default
    const modelFallback = apiKeyData?.fallback_model || 'gemini-1.5-flash-latest';
    if (!key) {
        return "Erro: Nenhuma chave da API configurada. Por favor, configure uma chave nas configurações do aplicativo.";
    }
    const genAI = new GoogleGenerativeAI(key);
    const { model = 'gemini-2.0-flash-exp', fallbackModel = 'gemini-1.5-flash-latest' } = apiSettings;
    // ... rest of your prompt/template/model fallback logic ...
}

const { getApiKey } = require('./database-service');

async function getAIResponse(provider, prompt) {
    const apiData = await getApiKey(provider);
    if (!apiData || !apiData.api_key) {
        throw new Error('Nenhuma chave API configurada para o provedor selecionado.');
    }
    // Use apiData.api_key, apiData.model, apiData.fallback_model conforme necessário
    // ... lógica de chamada da IA ...
}