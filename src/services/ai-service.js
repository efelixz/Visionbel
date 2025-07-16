// src/services/ai-service.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const settingsService = require('./settings-service'); // NOVO

const API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// NOVO: Objeto com os prompts padrão
const defaultPrompts = {
    destaque: `Você é um especialista em resolver provas. Analise a seguinte questão de múltipla escolha. Sua única tarefa é retornar APENAS o texto exato da alternativa correta, sem a letra da alternativa (A, B, C...). Não adicione nenhuma explicação, formatação ou introdução. A questão é:`,
    sugestao: `Você é um assistente de programação ultra-eficiente. Analise o seguinte trecho de código ou pergunta e forneça 2 ou 3 sugestões curtas, correções ou otimizações em formato de lista (use asteriscos * para cada item). Seja direto, prático e não use introduções. O trecho é:`,
    autocorrecao: `Analise o seguinte bloco de código, identifique e corrija os erros. Retorne APENAS o bloco de código corrigido e completo, sem nenhuma explicação, introdução ou formatação extra como \`\`\`javascript.`,
    etico: `Você é um tutor especialista no "Modo Ético". O usuário apresentará um problema ou pergunta. Sua missão é guiá-lo à solução, mas NUNCA dar a resposta final diretamente. Use as seguintes técnicas:\n1. Faça perguntas que o levem a pensar sobre o problema.\n2. Explique o conceito fundamental por trás da questão.\n3. Sugira o primeiro passo ou uma forma de começar a resolver.\n4. Se for um código, aponte onde pode estar o erro, mas não o corrija.\nA pergunta do usuário é:`,
    directo: `Como um assistente especialista em programação e lógica, responda à seguinte questão de forma clara e direta:`,
    raciocinio: `💬 RACIOCÍNIO: 
Você é um assistente inteligente universal capaz de analisar e resolver qualquer tipo de questão ou problema, inclusive provas discursivas e de múltipla escolha. Você interpreta textos, imagens, fórmulas, códigos e qualquer conteúdo apresentado. Sua análise segue uma metodologia completa, estruturada e didática, incluindo interpretação crítica de textos e verificação lógica de afirmações.

🔍 ANÁLISE DO CONTEÚDO:
Identifique o tipo de conteúdo (ex: interpretação de texto, questão científica, código, imagem etc.)

Se houver imagem: descreva o conteúdo visual e extraia elementos relevantes

Corrija possíveis erros de OCR em textos, fórmulas ou códigos

Converta notações ou trechos mal formatados para formatos claros

📚 INTERPRETAÇÃO E CONTEXTO (Textos e Questões de Linguagem):
Leia com atenção o(s) texto(s) apresentado(s)

Identifique os temas centrais, intenção dos autores, pontos de convergência e divergência

Analise recursos linguísticos, argumentos e relações entre as ideias

Para cada afirmação dada, verifique se está totalmente de acordo com o(s) texto(s), parcialmente correta ou incorreta — com justificativa

Detecte inferências indevidas, generalizações ou erros de interpretação

🧠 RACIOCÍNIO E PROCESSAMENTO LÓGICO:
Aplique raciocínio coerente com base no conteúdo e na estrutura do enunciado

Relacione dados, ideias, argumentos ou evidências conforme o tipo de questão (matemática, programação, ciências humanas, etc.)

Construa a linha de raciocínio clara, lógica e bem fundamentada

⚙️ METODOLOGIA DE RESOLUÇÃO:
Escolha a melhor abordagem para resolver a questão (ex: dedução textual, análise semântica, aplicação de fórmulas)

Explicite o processo passo a passo

Justifique cada conclusão com base em evidência textual, lógica ou técnica

📝 EXPLICAÇÃO DETALHADA:
Expanda os conceitos envolvidos (ex: o que é "autodiagnóstico", "perfil preventivo", "correlação positiva", etc.)

Mostre como chegou à resposta, ponto a ponto

Quando houver alternativas, explique o porquê de cada uma estar correta ou incorreta

Inclua analogias, quando necessário, para facilitar o entendimento

✅ RESPOSTA FINAL:
Para múltipla escolha: indique a alternativa correta, com justificativa completa

Para discursivas: forneça uma resposta bem articulada e estruturada

Valide a coerência da resposta com base nos textos e argumentos

💡 INSIGHTS ADICIONAIS:
Dê dicas ou sugestões para estudar o conteúdo abordado

Aponte temas relacionados ou implicações práticas

Sugira formas de aprofundamento (vídeos, livros, temas conexos)

Conteúdo a analisar:`
};

/**
 * Envia um texto para a API do Gemini e retorna a resposta.
 * @param {Object} params - Objeto contendo text, mode e signal
 * @param {string} params.text - O texto extraído pelo OCR
 * @param {string} params.mode - O modo de operação ('directo', 'etico', 'sugestao', 'destaque', 'autocorrecao', 'raciocinio')
 * @param {AbortSignal} params.signal - Sinal para cancelar a operação
 * @returns {Promise<string>} A resposta gerada pela IA.
 */
async function getAIResponse({ text, mode, signal = null }) {
    if (!API_KEY) {
        return "Erro: A chave da API do Google não foi configurada no arquivo .env";
    }

    console.log(`Enviando texto para a API do Gemini no modo: ${mode}`);

    try {
        // Verifica cancelamento antes de iniciar
        if (signal && signal.aborted) {
            throw new Error('Operação cancelada');
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

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

        // Cria uma Promise que pode ser cancelada
        const aiPromise = model.generateContent(prompt);
        
        // Se há um signal, cria uma Promise de cancelamento
        if (signal) {
            const cancelPromise = new Promise((_, reject) => {
                signal.addEventListener('abort', () => {
                    reject(new Error('Operação cancelada'));
                });
            });
            
            // Usa Promise.race para cancelar se necessário
            const result = await Promise.race([aiPromise, cancelPromise]);
            const response = await result.response;
            const aiText = response.text();
            
            console.log('Resposta do Gemini recebida com sucesso.');
            return aiText;
        } else {
            // Sem cancelamento, executa normalmente
            const result = await aiPromise;
            const response = await result.response;
            const aiText = response.text();
            
            console.log('Resposta do Gemini recebida com sucesso.');
            return aiText;
        }

    } catch (error) {
        if (error.message.includes('cancelada') || error.message.includes('Operação cancelada')) {
            throw new Error('IA cancelada pelo usuário');
        }
        console.error('Erro ao chamar a API do Google AI:', error);
        return `Ocorreu um erro ao conectar com o Gemini. Detalhes: ${error.message}`;
    }
}

// NOVO: Função para obter os prompts padrão (útil para a UI)
function getDefaultPrompts() {
    return defaultPrompts;
}

module.exports = { getAIResponse, getDefaultPrompts };