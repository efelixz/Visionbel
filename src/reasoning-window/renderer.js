// Elementos da interface
const reasoningContent = document.getElementById('reasoning-content');
const reasoningSteps = document.getElementById('reasoning-steps');
const closeBtn = document.getElementById('closeBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const copyBtn = document.getElementById('copyBtn');
const applyBtn = document.getElementById('applyBtn');

// Função para formatar o conteúdo do raciocínio
function formatReasoningContent(content) {
    // Detecta se é código ou texto
    const isCode = content.includes('```') || 
                   content.includes('function') || 
                   content.includes('const ') || 
                   content.includes('let ') || 
                   content.includes('var ') ||
                   content.includes('{') && content.includes('}');
    
    if (isCode) {
        return `<div class="code-block">${escapeHtml(content)}</div>`;
    } else {
        return `<div class="reasoning-text">${escapeHtml(content)}</div>`;
    }
}

// Função para escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Função para adicionar um passo de raciocínio
function addReasoningStep(step, index) {
    const stepElement = document.createElement('div');
    stepElement.className = 'reasoning-step';
    stepElement.innerHTML = `
        <div class="reasoning-step-number">Passo ${index + 1}</div>
        <div class="reasoning-step-content">${escapeHtml(step)}</div>
    `;
    reasoningSteps.appendChild(stepElement);
    reasoningSteps.scrollTop = reasoningSteps.scrollHeight;
}

// Função para copiar para clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = '✓ Copiado!';
        setTimeout(() => {
            copyBtn.innerHTML = '📋 Copiar';
        }, 2000);
    });
}

// Event listeners
closeBtn.addEventListener('click', () => {
    window.reasoningAPI.closeWindow();
});

minimizeBtn.addEventListener('click', () => {
    window.reasoningAPI.minimizeWindow();
});

copyBtn.addEventListener('click', () => {
    const content = reasoningContent.textContent;
    copyToClipboard(content);
});

applyBtn.addEventListener('click', () => {
    const content = reasoningContent.textContent;
    window.reasoningAPI.applyReasoning(content);
});

// Registrar eventos da API
window.reasoningAPI.onReceiveReasoning((event, content) => {
    reasoningContent.innerHTML = formatReasoningContent(content);
});

window.reasoningAPI.onReasoningStep((event, step, index) => {
    addReasoningStep(step, index);
});

window.reasoningAPI.onReasoningComplete((event, summary) => {
    applyBtn.disabled = false;
    applyBtn.classList.remove('opacity-50');
});