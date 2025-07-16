const defaultModeSelect = document.getElementById('default-mode-select');
const modePromptSelect = document.getElementById('mode-prompt-select');
const promptEditor = document.getElementById('prompt-editor');
const savePromptBtn = document.getElementById('savePromptBtn');
const resetPromptBtn = document.getElementById('resetPromptBtn');

let customPrompts = {};
let defaultPrompts = {};

// Carrega a configuração atual quando a janela abre
async function loadCurrentSettings() {
    const defaultMode = await window.settingsAPI.getSetting('defaultMode');
    defaultModeSelect.value = defaultMode;
}

// Carrega os prompts customizados e padrão
async function loadCustomPrompts() {
    customPrompts = await window.settingsAPI.getCustomPrompts();
    defaultPrompts = await window.settingsAPI.getDefaultPrompts();
    updateEditorForSelectedMode();
}

// Atualiza o editor com base no modo selecionado
function updateEditorForSelectedMode() {
    const selectedMode = modePromptSelect.value;
    const customPrompt = customPrompts[selectedMode];
    const defaultPrompt = defaultPrompts[selectedMode];
    
    // Mostra o prompt customizado se existir, senão mostra o padrão
    promptEditor.value = customPrompt || defaultPrompt || '';
    
    // Atualiza o placeholder para indicar se é customizado ou padrão
    if (customPrompt) {
        promptEditor.style.backgroundColor = '#1f2937'; // Amarelo claro para customizado
    } else {
        promptEditor.style.backgroundColor = '#1f2937'; // Cinza claro para padrão
    }
}

// Salva a nova configuração quando o usuário muda a seleção do modo padrão
defaultModeSelect.addEventListener('change', (event) => {
    const newDefaultMode = event.target.value;
    window.settingsAPI.setSetting('defaultMode', newDefaultMode);
});

// Atualiza o editor quando o modo selecionado muda
modePromptSelect.addEventListener('change', updateEditorForSelectedMode);

// Salva o prompt customizado
savePromptBtn.addEventListener('click', async () => {
    const selectedMode = modePromptSelect.value;
    const newPrompt = promptEditor.value.trim();
    
    if (!newPrompt) {
        alert('Por favor, insira um prompt antes de salvar.');
        return;
    }
    
    customPrompts[selectedMode] = newPrompt; // Atualiza nosso cache local
    await window.settingsAPI.setCustomPrompt(selectedMode, newPrompt);
    updateEditorForSelectedMode(); // Atualiza a cor de fundo
    alert('Prompt salvo com sucesso!');
});

// Reseta o prompt para o padrão
resetPromptBtn.addEventListener('click', async () => {
    const selectedMode = modePromptSelect.value;
    if (confirm(`Tem certeza que deseja resetar o prompt para o modo '${selectedMode}'?`)) {
        delete customPrompts[selectedMode]; // Remove do cache local
        await window.settingsAPI.resetCustomPrompt(selectedMode);
        updateEditorForSelectedMode(); // Atualiza o editor
        alert('Prompt resetado para o padrão!');
    }
});

// Inicializa a interface
loadCurrentSettings();
loadCustomPrompts();