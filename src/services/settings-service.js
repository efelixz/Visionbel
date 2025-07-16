let Store;
let store;

// Importação dinâmica do electron-store
async function initStore() {
    if (!Store) {
        const module = await import('electron-store');
        Store = module.default;
        
        const schema = {
            defaultMode: {
                type: 'string',
                default: 'sugestao'
            },
            customPrompts: {
                type: 'object',
                default: {}
            },
            // NOVO: configurações expandidas da API
            apiSettings: {
                type: 'object',
                default: {
                    provider: 'gemini', // gemini, openai, anthropic, cohere
                    gemini: {
                        key: '',
                        model: 'gemini-2.0-flash-exp',
                        fallbackModel: 'gemini-1.5-flash-latest'
                    },
                    openai: {
                        key: '',
                        model: 'gpt-4o',
                        fallbackModel: 'gpt-3.5-turbo'
                    },
                    anthropic: {
                        key: '',
                        model: 'claude-3-5-sonnet-20241022',
                        fallbackModel: 'claude-3-haiku-20240307'
                    },
                    cohere: {
                        key: '',
                        model: 'command-r-plus',
                        fallbackModel: 'command-r'
                    }
                }
            }
        };
        
        store = new Store({ schema });
    }
    return store;
}

async function getSetting(key) {
    const storeInstance = await initStore();
    return storeInstance.get(key);
}

async function setSetting(key, value) {
    const storeInstance = await initStore();
    storeInstance.set(key, value);
}

// NOVO: Funções específicas para os prompts
async function getCustomPrompts() {
    const storeInstance = await initStore();
    return storeInstance.get('customPrompts');
}

async function setCustomPrompt(mode, prompt) {
    const storeInstance = await initStore();
    const prompts = storeInstance.get('customPrompts');
    prompts[mode] = prompt;
    storeInstance.set('customPrompts', prompts);
}

async function resetCustomPrompt(mode) {
    const storeInstance = await initStore();
    const prompts = storeInstance.get('customPrompts');
    delete prompts[mode];
    storeInstance.set('customPrompts', prompts);
}

// Exporta todas as funções necessárias
module.exports = { 
    initStore,
    getSetting, 
    setSetting, 
    getCustomPrompts, 
    setCustomPrompt, 
    resetCustomPrompt 
};