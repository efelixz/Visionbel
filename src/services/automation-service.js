const ks = require('node-key-sender');
const { clipboard } = require('electron');

class AutomationService {
    constructor() {
        this.isEnabled = true;
    }

    /**
     * Digita texto automaticamente
     * @param {string} text - Texto para digitar
     * @param {number} delay - Delay antes de começar (ms)
     */
    async typeText(text, delay = 1000) {
        if (!this.isEnabled) {
            throw new Error('Automação desabilitada');
        }

        try {
            // Aguarda o delay especificado
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Digita o texto usando node-key-sender
            await ks.sendText(text);
            
            return { success: true, message: 'Texto digitado com sucesso' };
        } catch (error) {
            console.error('Erro ao digitar texto:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Pressiona uma combinação de teclas
     * @param {Array} keys - Array de teclas para pressionar
     */
    async pressKeys(keys) {
        if (!this.isEnabled) {
            throw new Error('Automação desabilitada');
        }

        try {
            await ks.sendCombination(keys);
            return { success: true };
        } catch (error) {
            console.error('Erro ao pressionar teclas:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Copia texto para a área de transferência e cola
     * @param {string} text - Texto para colar
     */
    async pasteText(text) {
        try {
            // Copia para o clipboard
            clipboard.writeText(text);
            
            // Aguarda um pouco
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Pressiona Ctrl+V
            await ks.sendCombination(['control', 'v']);
            
            return { success: true, message: 'Texto colado com sucesso' };
        } catch (error) {
            console.error('Erro ao colar texto:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Método híbrido que tenta digitação direta, depois clipboard
     * @param {string} text - Texto para aplicar
     * @param {number} delay - Delay antes de começar
     */
    async applyText(text, delay = 1500) {
        try {
            // Tenta digitação direta primeiro
            const typeResult = await this.typeText(text, delay);
            if (typeResult.success) {
                return typeResult;
            }
        } catch (error) {
            console.log('Digitação direta falhou, tentando clipboard...');
        }

        // Fallback para clipboard
        try {
            const pasteResult = await this.pasteText(text);
            return pasteResult;
        } catch (error) {
            return { 
                success: false, 
                error: 'Ambos os métodos falharam',
                fallback: text 
            };
        }
    }

    /**
     * Habilita/desabilita a automação
     * @param {boolean} enabled 
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
}

module.exports = new AutomationService();