let store = null;

// Initialize store with schema to ensure data structure
async function initStore() {
    if (store) return store;
    
    const Store = await import('electron-store');
    store = new Store.default({
        schema: {
            apiSettings: {
                type: 'object',
                default: {
                    provider: 'gemini',
                    gemini: { key: '', model: 'gemini-1.5-flash-latest' },
                    openai: { key: '', model: 'gpt-4o' },
                    anthropic: { key: '', model: 'claude-3-5-sonnet-20241022' },
                    cohere: { key: '', model: 'command-r-plus' }
                }
            },
            customPrompts: {
                type: 'object',
                default: {}
            }
        }
    });
    return store;
}

// All functions are now async to handle store initialization
async function getSetting(key) {
    const storeInstance = await initStore();
    return storeInstance.get(key);
}

async function setSetting(key, value) {
    const storeInstance = await initStore();
    storeInstance.set(key, value);
}

// Specific functions for custom prompts
async function getCustomPrompts() {
    const storeInstance = await initStore();
    return storeInstance.get('customPrompts');
}

async function setCustomPrompt(mode, prompt) {
    const storeInstance = await initStore();
    const prompts = await getCustomPrompts();
    prompts[mode] = prompt;
    storeInstance.set('customPrompts', prompts);
}

async function resetCustomPrompt(mode) {
    const storeInstance = await initStore();
    const prompts = await getCustomPrompts();
    delete prompts[mode];
    storeInstance.set('customPrompts', prompts);
}

module.exports = {
    initStore,
    getSetting,
    setSetting,
    getCustomPrompts,
    setCustomPrompt,
    resetCustomPrompt
};