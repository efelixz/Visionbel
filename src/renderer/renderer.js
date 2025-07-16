// Simplified renderer.js without capture button logic

// Theme management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
}

// Mode selection handling
function initializeModeSelection() {
    const modeInputs = document.querySelectorAll('input[name="mode"]');
    
    modeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const selectedMode = e.target.value;
            console.log('Modo selecionado:', selectedMode);
            
            // Save selected mode
            localStorage.setItem('selectedMode', selectedMode);
            
            // Update mode in main process
            if (window.electronAPI && window.electronAPI.setMode) {
                window.electronAPI.setMode(selectedMode);
            }
        });
    });
    
    // Load saved mode
    const savedMode = localStorage.getItem('selectedMode') || 'sugestao';
    const savedModeInput = document.querySelector(`input[value="${savedMode}"]`);
    if (savedModeInput) {
        savedModeInput.checked = true;
    }
    
    // NOVO: Enviar o modo salvo para o processo principal na inicialização
    if (window.electronAPI && window.electronAPI.setMode) {
        window.electronAPI.setMode(savedMode);
        console.log('Modo inicial enviado ao processo principal:', savedMode);
    }
}

// Button handlers
function initializeButtons() {
    // History button
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.openHistoryWindow) {
                window.electronAPI.openHistoryWindow();
            }
        });
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.openSettingsWindow) {
                window.electronAPI.openSettingsWindow();
            }
        });
    }
    
    // Theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeModeSelection();
    initializeButtons();
    
    console.log('SkillVision interface initialized');
});