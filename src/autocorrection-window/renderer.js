// Elementos do DOM
const closeButton = document.getElementById('close-button');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const originalCode = document.getElementById('original-code');
const suggestedCorrections = document.getElementById('suggested-corrections');

// Fechar janela
closeButton.addEventListener('click', () => {
    window.autocorrectionAPI.closeWindow();
});

// Enviar mensagem
async function sendMessage() {
    const message = userInput.value.trim();
    if (message) {
        // Adiciona a pergunta do usuário
        addMessage('user', message);
        userInput.value = '';

        // Envia a mensagem e recebe a resposta
        const response = await window.autocorrectionAPI.sendMessage(message);
        addMessage('assistant', response);
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

// Adicionar mensagem ao container
function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `p-4 rounded-lg mt-4 ${
        type === 'user' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }`;
    messageDiv.textContent = content;
    suggestedCorrections.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
}

// Receber correções iniciais
window.autocorrectionAPI.onCorrections((event, data) => {
    if (data.originalText) {
        originalCode.textContent = data.originalText;
    }
    if (data.corrections) {
        addMessage('assistant', data.corrections);
    }
});