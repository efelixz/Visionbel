// Elementos do DOM
const closeButton = document.getElementById('close-button');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const suggestionsContainer = document.getElementById('suggestions-container');

// Fechar janela
closeButton.addEventListener('click', () => {
    window.suggestionAPI.closeSuggestionWindow();
});

// Enviar mensagem
async function sendMessage() {
    const message = userInput.value.trim();
    if (message) {
        // Adiciona a mensagem do usuário ao container
        addMessageToContainer('user', message);
        userInput.value = '';

        // Envia a mensagem e recebe a resposta
        const response = await window.suggestionAPI.sendMessage(message);
        addMessageToContainer('assistant', response);
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
function addMessageToContainer(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `p-4 rounded-lg ${
        type === 'user' 
            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }`;
    messageDiv.textContent = content;
    suggestionsContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
}

// Receber sugestões iniciais
window.suggestionAPI.onSuggestions((event, data) => {
    if (data.suggestions) {
        addMessageToContainer('assistant', data.suggestions);
    }
});