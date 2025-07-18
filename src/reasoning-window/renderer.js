// Elementos do DOM
const closeButton = document.getElementById('close-button');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const originalCode = document.getElementById('original-code');
const detailedAnalysis = document.getElementById('detailed-analysis');

// Fechar janela
closeButton.addEventListener('click', () => {
    window.reasoningAPI.closeWindow();
});

// Enviar mensagem
async function sendMessage() {
    const message = userInput.value.trim();
    if (message) {
        // Adiciona a pergunta do usuário
        addAnalysisSection('Pergunta', message, 'user');
        userInput.value = '';

        // Envia a mensagem e recebe a resposta
        const response = await window.reasoningAPI.sendMessage(message);
        addAnalysisSection('Resposta', response, 'assistant');
    }
}

// Eventos de envio
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Adicionar seção de análise
function addAnalysisSection(title, content, type) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = `p-4 rounded-lg ${
        type === 'user' 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }`;

    const titleElement = document.createElement('h3');
    titleElement.className = 'text-sm font-medium mb-2';
    titleElement.textContent = title;

    const contentElement = document.createElement('div');
    contentElement.className = 'text-sm';
    contentElement.textContent = content;

    sectionDiv.appendChild(titleElement);
    sectionDiv.appendChild(contentElement);
    detailedAnalysis.appendChild(sectionDiv);
    sectionDiv.scrollIntoView({ behavior: 'smooth' });
}

// Receber análise inicial
window.reasoningAPI.onAnalysis((event, data) => {
    if (data.originalText) {
        originalCode.textContent = data.originalText;
    }
    if (data.analysis) {
        addAnalysisSection('Análise Inicial', data.analysis, 'assistant');
    }
});