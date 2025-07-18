const { ipcRenderer } = require('electron');

// Elementos da interface
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.querySelector('textarea');
const sendButton = document.querySelector('button:contains("Enviar")');
const newCaptureButton = document.querySelector('button:contains("Nova Captura")');
const copyButton = document.querySelector('button:contains("Copiar")');
const applyButton = document.querySelector('button:contains("Aplicar Correção")');
const depthSelect = document.querySelector('select');
const contextIndicator = document.querySelector('.w-2.h-2');
const contextStatus = document.querySelector('span:contains("Detectando")'); 

// Estado global
let isProcessing = false;
let corrections = [];

// Funções de UI
function updateContextStatus(status, type = 'detecting') {
    const colors = {
        detecting: 'bg-yellow-500',
        active: 'bg-green-500',
        error: 'bg-red-500'
    };
    
    contextIndicator.className = `w-2 h-2 rounded-full ${colors[type]}`;
    contextStatus.textContent = status;
}

function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function displayCorrections(correctionsList) {
    const container = document.getElementById('corrections-content');
    container.innerHTML = '';
    
    correctionsList.forEach((correction, index) => {
        const element = document.createElement('div');
        element.className = 'correction-item';
        element.style.animationDelay = `${index * 0.1}s`;
        element.innerHTML = correction;
        container.appendChild(element);
    });
}

// Event Listeners
sendButton.addEventListener('click', () => {
    const text = chatInput.value.trim();
    if (text) {
        addMessage(text, true);
        ipcRenderer.send('send-chat-message', text);
        chatInput.value = '';
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
    }
});

newCaptureButton.addEventListener('click', () => {
    ipcRenderer.send('request-new-capture');
});

copyButton.addEventListener('click', () => {
    // Implementar lógica de cópia
});

applyButton.addEventListener('click', () => {
    ipcRenderer.send('apply-corrections', corrections);
});

depthSelect.addEventListener('change', (e) => {
    ipcRenderer.send('change-depth-level', e.target.value);
});

// IPC Handlers
ipcRenderer.on('correction-update', (event, data) => {
    corrections = data.corrections;
    displayCorrections(corrections);
    updateContextStatus('Ativo', 'active');
});

ipcRenderer.on('ai-response', (event, message) => {
    addMessage(message);
});

ipcRenderer.on('processing-status', (event, { status, type }) => {
    updateContextStatus(status, type);
});

// Responsividade
window.addEventListener('resize', () => {
    const isMobile = window.innerWidth < 768;
    const chatArea = document.getElementById('chat-area');
    chatArea.style.display = isMobile ? 'none' : 'flex';
});

// Inicialização
updateContextStatus('Detectando...', 'detecting');

// Controles da janela
const minimizeButton = document.querySelector('.minimize-button');
const closeButton = document.querySelector('.close-button');

minimizeButton.addEventListener('click', () => {
    window.autocorrection.minimize();
});

closeButton.addEventListener('click', () => {
    window.autocorrection.close();
});