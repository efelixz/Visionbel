// Elementos do DOM
const closeButton = document.getElementById('close-button');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const originalQuestion = document.getElementById('original-question');
const directResponse = document.getElementById('direct-response');

// Fechar janela
closeButton.addEventListener('click', () => {
    window.directAPI.closeWindow();
});

// Enviar mensagem
async function sendMessage() {
    const message = userInput.value.trim();
    if (message) {
        // Atualiza a pergunta
        originalQuestion.textContent = message;
        userInput.value = '';

        // Envia a mensagem e recebe a resposta
        const response = await window.directAPI.sendMessage(message);
        directResponse.textContent = response;
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

// Receber resposta inicial
window.directAPI.onResponse((event, data) => {
    if (data.originalText) {
        originalQuestion.textContent = data.originalText;
    }
    if (data.response) {
        directResponse.textContent = data.response;
    }
});