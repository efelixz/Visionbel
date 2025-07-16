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
                default: 'sugestao' // O modo 'sugestao' será o padrão inicial
            },
            // NOVO: Schema para guardar os prompts customizados
            customPrompts: {
                type: 'object',
                default: {}
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

// ATUALIZE AS EXPORTAÇÕES
module.exports = { getSetting, setSetting, getCustomPrompts, setCustomPrompt, resetCustomPrompt };