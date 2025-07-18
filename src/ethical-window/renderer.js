// Elementos do DOM
const closeButton = document.getElementById('close-button');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const originalContext = document.getElementById('original-context');
const ethicalGuidance = document.getElementById('ethical-guidance');

// Fechar janela
closeButton.addEventListener('click', () => {
    window.ethicalAPI.closeWindow();
});

// Enviar mensagem
async function sendMessage() {
    const message = userInput.value.trim();
    if (message) {
        // Adiciona a pergunta do usuário
        addGuidanceSection('Pergunta', message, 'user');
        userInput.value = '';

        // Envia a mensagem e recebe a resposta
        const response = await window.ethicalAPI.sendMessage(message);
        addGuidanceSection('Orientação', response, 'assistant');
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

// Adicionar seção de orientação
function addGuidanceSection(title, content, type) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = `p-4 rounded-lg ${
        type === 'user' 
            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' 
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
    ethicalGuidance.appendChild(sectionDiv);
    sectionDiv.scrollIntoView({ behavior: 'smooth' });
}

// Receber orientação inicial
window.ethicalAPI.onGuidance((event, data) => {
    if (data.originalText) {
        originalContext.textContent = data.originalText;
    }
    if (data.guidance) {
        addGuidanceSection('Orientação Inicial', data.guidance, 'assistant');
    }
});