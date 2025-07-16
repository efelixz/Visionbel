const { app, BrowserWindow, desktopCapturer, ipcMain, screen, globalShortcut, Notification, Tray, nativeImage, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
// NOVA DEPENDÊNCIA: node-key-sender (substitui robotjs)
const ks = require('node-key-sender');
const settingsService = require('../services/settings-service');
const automationService = require('../services/automation-service');

// MODIFICADO: Importamos o serviço completo para usar ambas as funções
const ocrService = require('../services/ocr-service');
const { getAIResponse, getDefaultPrompts, testApiKey, needsMoreContext, analyzeWithContextCheck } = require('../services/ai-service');
const dbService = require('../services/database-service');

let mainWindow;
let tray = null;
let quickCaptureEnabled = true;
// NOVO: Controle de estado da análise
let isAnalysisRunning = false;
let currentAnalysisController = null;
const defaultSelectedMode = 'sugestao'; // Default mode for storing selected mode

// Armazenar histórico de conversa por janela
const conversationHistories = new Map();

// Armazenar o texto original capturado por janela
const originalCapturedTexts = new Map();

// NOVO: Função para criar o ícone da bandeja
function createTray() {
    // Cria um ícone simples programaticamente (16x16 pixels)
    const iconData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0xF3, 0xFF, 0x61, 0x00, 0x00, 0x00,
        0x4F, 0x49, 0x44, 0x41, 0x54, 0x38, 0x8D, 0x63, 0xF8, 0x0F, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x1C, 0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const icon = nativeImage.createFromBuffer(iconData);
    
    tray = new Tray(icon);
    
    updateTrayMenu();
    
    // Tooltip dinâmico baseado no estado
    updateTrayTooltip();
    
    // Clique duplo no ícone da bandeja abre o aplicativo
    tray.on('double-click', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        } else {
            createMainWindow();
        }
    });
    
    // Clique simples executa captura rápida se estiver ativada
    tray.on('click', () => {
        if (quickCaptureEnabled) {
            executeQuickCapture();
        }
    });
}

// NOVO: Função para executar captura rápida
async function executeQuickCapture() {
    try {
        const defaultMode = await settingsService.getSetting('defaultMode') || 'sugestao';
        
        // Mostra notificação de início
        new Notification({
            title: 'SkillVision™',
            body: 'Iniciando captura rápida...',
            silent: true
        }).show();
        
        const { result } = await executeFullCaptureFlow(defaultMode);
        
        // Mostra notificação de conclusão
        if (result && result !== 'Captura cancelada.' && result !== 'Nenhum texto encontrado.') {
            new Notification({
                title: 'SkillVision™',
                body: 'Captura processada com sucesso!',
                silent: true
            }).show();
        }
    } catch (error) {
        console.error('Erro na captura rápida:', error);
        new Notification({
            title: 'SkillVision™ - Erro',
            body: 'Falha na captura rápida',
            silent: true
        }).show();
    }
}

// NOVO: Função para atualizar o menu da bandeja
function updateTrayMenu() {
    if (!tray) return;
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'SkillVision™',
            enabled: false
        },
        {
            type: 'separator'
        },
        {
            label: 'Abrir Aplicativo',
            click: () => {
                if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.show();
                    mainWindow.focus();
                } else {
                    createMainWindow();
                }
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Captura Rápida',
            type: 'checkbox',
            checked: quickCaptureEnabled,
            click: () => {
                quickCaptureEnabled = !quickCaptureEnabled;
                updateTrayMenu();
                updateTrayTooltip();
                
                // Notificação de estado
                new Notification({
                    title: 'SkillVision™',
                    body: quickCaptureEnabled ? 
                        'Captura rápida ATIVADA - Clique no ícone da bandeja para capturar' : 
                        'Captura rápida DESATIVADA',
                    silent: true
                }).show();
            }
        },
        {
            label: 'Executar Captura Agora',
            enabled: quickCaptureEnabled,
            click: () => {
                executeQuickCapture();
            }
        },
        {
            label: 'Atalho Global (Ctrl+Shift+X)',
            click: async () => {
                const defaultMode = await settingsService.getSetting('defaultMode') || 'sugestao';
                executeFullCaptureFlow(defaultMode);
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Histórico',
            click: () => {
                const historyWindow = new BrowserWindow({
                    width: 700,
                    height: 800,
                    title: 'Histórico de Interações',
                    webPreferences: {
                        preload: path.join(__dirname, '../history-window/preload.js')
                    }
                });
                historyWindow.loadFile('src/history-window/index.html');
            }
        },
        {
            label: 'Configurações',
            click: () => {
                const settingsWindow = new BrowserWindow({
                    width: 500,
                    height: 400,
                    title: 'Configurações',
                    webPreferences: {
                        preload: path.join(__dirname, '../settings-window/preload.js'),
                        contextIsolation: true
                    }
                });
                settingsWindow.loadFile('src/settings-window/index.html');
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Sair',
            click: () => {
                app.quit();
            }
        }
    ]);
    
    tray.setContextMenu(contextMenu);
}

// NOVO: Função para atualizar o tooltip da bandeja
function updateTrayTooltip() {
    if (!tray) return;
    
    const tooltip = quickCaptureEnabled ? 
        'SkillVision™ - Captura Rápida ATIVADA (Clique para capturar)' :
        'SkillVision™ - Captura Rápida DESATIVADA';
    
    tray.setToolTip(tooltip);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  mainWindow.loadFile('src/renderer/index.html');
  
  // Minimizar para a bandeja em vez de fechar
  mainWindow.on('minimize', (event) => {
    if (tray) {
      event.preventDefault();
      mainWindow.hide();
      
      // Mostra notificação apenas na primeira vez
      if (!mainWindow.wasMinimizedToTray) {
        new Notification({
          title: 'SkillVision™',
          body: 'Aplicativo minimizado para a bandeja do sistema',
          silent: true
        }).show();
        mainWindow.wasMinimizedToTray = true;
      }
    }
  });
  
  // Previne o fechamento e minimiza para a bandeja
  mainWindow.on('close', (event) => {
    if (tray && !app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      
      new Notification({
        title: 'SkillVision™',
        body: 'Aplicativo continua rodando na bandeja do sistema',
        silent: true
      }).show();
    }
  });
}

/**
 * MODIFICADO: Esta função agora retorna tanto o resultado quanto o retângulo de captura.
 * @param {string} mode - O modo de operação ('directo', 'etico', 'shadow', 'sugestao', 'destaque').
 * @returns {Promise<{result: string|null, rect: object|null}>} A resposta final da IA e o retângulo de captura.
 */
/**
 * MODIFICADO: Função com controle de cancelamento
 */
// Adicione estes handlers após os outros ipcMain.handle existentes

ipcMain.handle('get-api-settings', async () => {
    const storeInstance = await settingsService.initStore();
    return storeInstance.get('apiSettings');
});

ipcMain.handle('set-api-settings', async (event, settings) => {
    try {
        // Testa a chave antes de salvar
        const testResult = await testApiKey(settings);
        if (!testResult.success) {
            throw new Error(testResult.error);
        }
        
        // Se a validação passar, salva as configurações
        const storeInstance = await settingsService.initStore();
        storeInstance.set('apiSettings', settings);
        return { success: true };
    } catch (error) {
        return { 
            success: false, 
            error: error.message || 'Erro ao validar a chave da API'
        };
    }
});

// Adicionar o novo handler test-api-key
ipcMain.handle('test-api-key', async (event, settings) => {
    try {
        const result = await testApiKey(settings);
        return result;
    } catch (error) {
        return { 
            success: false, 
            error: error.message || 'Erro ao validar a chave da API'
        };
    }
});

// Função para criar popup de "Pensando..."
function createThinkingWindow(capturedRect) {
    const thinkingWindow = new BrowserWindow({
        x: capturedRect ? capturedRect.x + capturedRect.width + 10 : 100,
        y: capturedRect ? capturedRect.y : 100,
        width: 280,
        height: 200,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    
    thinkingWindow.loadFile('src/thinking-window/index.html');
    return thinkingWindow;
}

async function executeFullCaptureFlow(mode) {
    if (isAnalysisRunning) {
        throw new Error('Uma análise já está em andamento');
    }
    
    isAnalysisRunning = true;
    currentAnalysisController = new AbortController();
    
    // Notifica a interface sobre o início da análise
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('analysis-state-changed', { isRunning: true });
    }
    
    const startTime = Date.now();
    console.log(`Iniciando fluxo completo no modo: ${mode}`);
    
    let thinkingWindow = null;

    try {
        // Verifica cancelamento antes de cada etapa
        if (currentAnalysisController.signal.aborted) {
            throw new Error('Análise cancelada pelo usuário');
        }
        
        // Passo 1: Captura de tela seletiva
        const captureResult = await new Promise((resolve, reject) => {
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;
            const captureWindow = new BrowserWindow({
                width, height, x: 0, y: 0, frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
                webPreferences: { nodeIntegration: true, contextIsolation: false }
            });
            captureWindow.loadFile(path.join(__dirname, '../capture-window/index.html'));
            
            // Listener para cancelamento
            const abortListener = () => {
                captureWindow.close();
                reject(new Error('Análise cancelada pelo usuário'));
            };
            currentAnalysisController.signal.addEventListener('abort', abortListener);
            
            ipcMain.once('capture-area-selected', async (event, rect) => {
                currentAnalysisController.signal.removeEventListener('abort', abortListener);
                captureWindow.close();
                
                if (currentAnalysisController.signal.aborted) {
                    reject(new Error('Análise cancelada pelo usuário'));
                    return;
                }
                
                if (!rect) { 
                    resolve({ dataUrl: null, rect: null }); 
                    return; 
                }
                
                // NOVO: Mostra popup de "Pensando..." após a captura
                thinkingWindow = createThinkingWindow(rect);
                
                try {
                    // Aguarda um pouco para garantir que a janela foi fechada
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    const sources = await desktopCapturer.getSources({ 
                        types: ['screen'],
                        thumbnailSize: { 
                            width: screen.getPrimaryDisplay().bounds.width,
                            height: screen.getPrimaryDisplay().bounds.height
                        }
                    });
                    
                    const primaryScreenSource = sources.find(s => 
                        s.display_id.toString() === screen.getPrimaryDisplay().id.toString()
                    );
                    
                    if (!primaryScreenSource) {
                        throw new Error('Fonte de tela não encontrada');
                    }
                    
                    const croppedImage = primaryScreenSource.thumbnail.crop(rect);
                    
                    let finalImage = croppedImage;
                    if (croppedImage.getSize().width < 50 || croppedImage.getSize().height < 50) {
                        finalImage = croppedImage.resize({ 
                            width: Math.max(50, croppedImage.getSize().width * 2),
                            height: Math.max(50, croppedImage.getSize().height * 2)
                        });
                    }
                    
                    const pngBuffer = finalImage.toPNG();
                    const base64Data = pngBuffer.toString('base64');
                    const dataUrl = `data:image/png;base64,${base64Data}`;
                    
                    console.log(`Imagem capturada: ${finalImage.getSize().width}x${finalImage.getSize().height}`);
                    resolve({ dataUrl, rect });
                    
                } catch (error) {
                    console.error("Falha ao capturar e recortar a tela:", error);
                    reject(error);
                }
            });
        });

        const { dataUrl: imagePath, rect: capturedRect } = captureResult;
        if (!imagePath) {
            if (thinkingWindow && !thinkingWindow.isDestroyed()) {
                thinkingWindow.close();
            }
            return { result: "Captura cancelada.", rect: null };
        }

        // Verifica cancelamento antes do OCR
        if (currentAnalysisController.signal.aborted) {
            throw new Error('Análise cancelada pelo usuário');
        }

        // Passo 2: OCR
        const ocrData = await ocrService.recognizeWithDetails(imagePath, currentAnalysisController.signal);
        if (!ocrData || !ocrData.fullText) {
            if (thinkingWindow && !thinkingWindow.isDestroyed()) {
                thinkingWindow.close();
            }
            return { result: "Nenhum texto encontrado.", rect: capturedRect };
        }

        const text = ocrData.fullText;

        // Verifica cancelamento antes da IA
        if (currentAnalysisController.signal.aborted) {
            throw new Error('Análise cancelada pelo usuário');
        }

        // NOVO: Lógica específica para o modo Destaque
        if (mode === 'destaque') {
            const textToAnalyze = ocrData.fullText;
            const aiResponse = await getAIResponse({ text: textToAnalyze, mode: 'destaque', signal: currentAnalysisController.signal });
            
            // Fecha o popup de "Pensando..."
            if (thinkingWindow && !thinkingWindow.isDestroyed()) {
                thinkingWindow.close();
            }
            
            // Processa a resposta JSON da IA
            let highlights = [];
            try {
                const categories = JSON.parse(aiResponse);
                
                // Processa cada categoria
                for (const [category, phrases] of Object.entries(categories)) {
                    for (const phrase of phrases) {
                        const words = phrase.toLowerCase().split(' ');
                        const matchedWords = ocrData.words.filter(word => {
                            return words.some(w => word.text.toLowerCase().includes(w));
                        });

                        if (matchedWords.length > 0) {
                            // Calcula o retângulo que engloba todas as palavras da frase
                            const minX = Math.min(...matchedWords.map(w => w.bbox.x0));
                            const minY = Math.min(...matchedWords.map(w => w.bbox.y0));
                            const maxX = Math.max(...matchedWords.map(w => w.bbox.x1));
                            const maxY = Math.max(...matchedWords.map(w => w.bbox.y1));

                            highlights.push({
                                x: capturedRect.x + minX,
                                y: capturedRect.y + minY,
                                width: maxX - minX,
                                height: maxY - minY,
                                category: category,
                                text: phrase
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Erro ao processar resposta da IA:', error);
                highlights = [];
            }
            
            if (highlights.length > 0) {
                // Cria a janela de Destaque
                const highlightWindow = new BrowserWindow({
                    x: 0, y: 0,
                    width: screen.getPrimaryDisplay().workAreaSize.width,
                    height: screen.getPrimaryDisplay().workAreaSize.height,
                    frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
                    webPreferences: {
                        nodeIntegration: true,
                        contextIsolation: false
                    }
                });
                highlightWindow.loadFile('src/highlight-window/index.html');
                
                highlightWindow.webContents.on('did-finish-load', () => {
                    highlightWindow.webContents.send('draw-highlight', highlights);
                });
                
                // Mostra notificação de sucesso com contagem por categoria
                const categoryCounts = highlights.reduce((acc, h) => {
                    acc[h.category] = (acc[h.category] || 0) + 1;
                    return acc;
                }, {});

                const countText = Object.entries(categoryCounts)
                    .map(([cat, count]) => `${count} ${cat.replace('_', ' ')}`)
                    .join('\n');

                new Notification({
                    title: 'SkillVision™ - Elementos Encontrados',
                    body: countText,
                    silent: true
                }).show();
            } else {
                new Notification({
                    title: 'SkillVision™ - Destaque',
                    body: 'Nenhum elemento relevante encontrado para destacar',
                    silent: true
                }).show();
            }
            
            // Salva no banco de dados
            const durationInSeconds = Math.round((Date.now() - startTime) / 1000);
            dbService.addHistory(textToAnalyze, aiResponse, durationInSeconds, mode);
            
            return { result: aiResponse, rect: capturedRect };
        }

        // Passo 3: IA e Lógica de Modos (para outros modos)
        let aiResponseText;
        if (mode === 'shadow') {
            aiResponseText = '(Observado no Modo Shadow)';
        } else {
            aiResponseText = await getAIResponse({ text, mode, signal: currentAnalysisController.signal });
        }
        
        // Passo 4: Salvar no Banco de Dados
        const durationInSeconds = Math.round((Date.now() - startTime) / 1000);
        // MODIFICADO: Passa o 'mode' para a função de salvar
        dbService.addHistory(text, aiResponseText, durationInSeconds, mode);

        // MODIFICADO: Popup de sugestão para modos sugestao e autocorrecao
        if ((mode === 'sugestao' || mode === 'autocorrecao') && capturedRect) {
            // Fecha o popup de "Pensando..." antes de mostrar o popup de sugestões
            if (thinkingWindow && !thinkingWindow.isDestroyed()) {
                thinkingWindow.close();
            }
            
            // Obtém as dimensões da tela
            const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
            
            // Calcula dimensões responsivas (80% da tela, mas com limites)
            const windowWidth = Math.min(Math.max(Math.floor(screenWidth * 0.8), 800), 1400);
            const windowHeight = Math.min(Math.max(Math.floor(screenHeight * 0.8), 600), 900);
            
            // Centraliza a janela na tela
            const x = Math.floor((screenWidth - windowWidth) / 2);
            const y = Math.floor((screenHeight - windowHeight) / 2);
            
            const suggestionWindow = new BrowserWindow({
                x: x,
                y: y,
                width: windowWidth,
                height: windowHeight,
                frame: false,
                transparent: true,
                alwaysOnTop: true,
                skipTaskbar: true,
                resizable: true,
                movable: true, // Permite mover a janela
                minWidth: 600,
                minHeight: 400,
                maxWidth: screenWidth,
                maxHeight: screenHeight,
                webPreferences: {
                    preload: path.join(__dirname, '../suggestion-window/preload.js'),
                    contextIsolation: true
                }
            });

            suggestionWindow.loadFile('src/suggestion-window/index.html');

            suggestionWindow.webContents.on('did-finish-load', () => {
                const windowId = suggestionWindow.id;
                
                // NOVO: Salvar o texto original capturado
                originalCapturedTexts.set(windowId, text);
                
                // Inicializar o histórico da conversa
                if (!conversationHistories.has(windowId)) {
                    conversationHistories.set(windowId, []);
                }
                const history = conversationHistories.get(windowId);
                
                // Adiciona o contexto inicial: texto capturado + resposta da IA
                history.push(`Texto capturado: "${text}"`);
                history.push(aiResponseText);
                
                // Envia as sugestões para a janela
                suggestionWindow.webContents.send('send-suggestions', { 
                    suggestions: aiResponseText, 
                    mode: mode,
                    originalText: text,
                    hasInitialContext: true
                });
            });
            
            ipcMain.once('close-suggestion-window', () => {
                if (suggestionWindow && !suggestionWindow.isDestroyed()) {
                    suggestionWindow.close();
                }
                // Garante que o thinkingWindow também seja fechado se ainda estiver aberto
                if (thinkingWindow && !thinkingWindow.isDestroyed()) {
                    thinkingWindow.close();
                }
            });
        }

        // MODIFICADO: Interface para todos os outros modos incluindo raciocinio
        else if ((mode === 'directo' || mode === 'etico' || mode === 'raciocinio') && capturedRect) {
            // Fecha o popup de "Pensando..." antes de mostrar o popup de resposta
            if (thinkingWindow && !thinkingWindow.isDestroyed()) {
                thinkingWindow.close();
            }
            
            // Obtém as dimensões da tela
            const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
            
            // Calcula dimensões responsivas para janelas menores
            const windowWidth = Math.min(Math.max(Math.floor(screenWidth * 0.4), 450), 600);
            const windowHeight = Math.min(Math.max(mode === 'raciocinio' ? Math.floor(screenHeight * 0.6) : Math.floor(screenHeight * 0.5), mode === 'raciocinio' ? 500 : 400), 700);
            
            // Centraliza a janela na tela
            const x = Math.floor((screenWidth - windowWidth) / 2);
            const y = Math.floor((screenHeight - windowHeight) / 2);
            
            const responseWindow = new BrowserWindow({
                x: x,
                y: y,
                width: windowWidth,
                height: windowHeight,
                frame: false,
                transparent: true,
                alwaysOnTop: true,
                skipTaskbar: true,
                resizable: true, // Permite redimensionar
                movable: true, // Permite mover
                minWidth: 400,
                minHeight: 300,
                maxWidth: screenWidth,
                maxHeight: screenHeight,
                webPreferences: {
                    preload: path.join(__dirname, '../suggestion-window/preload.js'),
                    contextIsolation: true
                }
            });

            responseWindow.loadFile('src/suggestion-window/index.html');

            responseWindow.webContents.on('did-finish-load', () => {
                const windowId = responseWindow.id;
                
                // NOVO: Salvar o texto original capturado
                originalCapturedTexts.set(windowId, text);
                
                // Inicializar o histórico da conversa
                if (!conversationHistories.has(windowId)) {
                    conversationHistories.set(windowId, []);
                }
                const history = conversationHistories.get(windowId);
                
                // Adiciona o contexto inicial: texto capturado + resposta da IA
                history.push(`Texto capturado: "${text}"`);
                history.push(aiResponseText);
                
                // Envia as sugestões para a janela
                responseWindow.webContents.send('send-suggestions', { 
                    suggestions: aiResponseText, 
                    mode: mode,
                    originalText: text,
                    hasInitialContext: true
                });
            });
            
            ipcMain.once('close-suggestion-window', () => {
                if (responseWindow && !responseWindow.isDestroyed()) {
                    responseWindow.close();
                }
                // Garante que o thinkingWindow também seja fechado se ainda estiver aberto
                if (thinkingWindow && !thinkingWindow.isDestroyed()) {
                    thinkingWindow.close();
                }
            });
        }

        // NOVO: Notificação para modo Shadow
        else if (mode === 'shadow') {
            // Fecha o popup de "Pensando..." para o modo shadow também
            if (thinkingWindow && !thinkingWindow.isDestroyed()) {
                thinkingWindow.close();
            }
            
            new Notification({
                title: 'SkillVision™ - Modo Shadow',
                body: 'Texto observado e salvo no histórico silenciosamente',
                silent: true
            }).show();
        }

        return { result: aiResponseText, rect: capturedRect };
        
    } catch (error) {
        // Fecha o popup de "Pensando..." em caso de erro
        if (thinkingWindow && !thinkingWindow.isDestroyed()) {
            thinkingWindow.close();
        }
        
        if (error.message.includes('cancelada')) {
            console.log('Análise cancelada pelo usuário');
            return { result: 'Análise cancelada pelo usuário.', rect: null };
        }
        console.error('Erro no fluxo completo:', error);
        throw error;
    } finally {
        // Limpa o estado da análise
        isAnalysisRunning = false;
        currentAnalysisController = null;
        
        // Notifica a interface sobre o fim da análise
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('analysis-state-changed', { isRunning: false });
        }
    }
}

// NOVO: Handler para cancelar análise
ipcMain.handle('cancel-analysis', () => {
    if (isAnalysisRunning && currentAnalysisController) {
        currentAnalysisController.abort();
        return { success: true, message: 'Análise cancelada com sucesso' };
    }
    return { success: false, message: 'Nenhuma análise em andamento' };
});

// NOVO: Handler para verificar estado da análise
ipcMain.handle('get-analysis-state', () => {
    return { isRunning: isAnalysisRunning };
});

// Handler atualizado para contexto adicional com verificação contínua
ipcMain.on('send-additional-context', async (event, additionalContext) => {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    const windowId = currentWindow.id;
    
    try {
        // Envia indicador de carregamento para o chat
        if (currentWindow && !currentWindow.isDestroyed()) {
            currentWindow.webContents.send('chat-loading', true);
        }
        
        // Obtém o histórico da conversa (que agora inclui o contexto inicial)
        if (!conversationHistories.has(windowId)) {
            conversationHistories.set(windowId, []);
        }
        const history = conversationHistories.get(windowId);
        
        // Adiciona a nova mensagem do usuário ao histórico
        history.push(additionalContext);
        
        // Obtém o texto original se disponível
        const originalText = originalCapturedTexts.get(windowId) || '';
        
        // Cria um contexto mais completo para a IA
        let contextForAI = additionalContext;
        if (originalText && history.length <= 3) { // Primeiras interações
            contextForAI = `Contexto original: "${originalText}"\n\nPergunta adicional: ${additionalContext}`;
        }
        
        // Analisa com verificação de contexto
        const analysis = await analyzeWithContextCheck({
            text: contextForAI,
            mode: 'sugestao',
            conversationHistory: history,
            signal: null
        });
        
        // Adiciona a resposta da IA ao histórico
        history.push(analysis.response);
        
        // Remove indicador de carregamento
        if (currentWindow && !currentWindow.isDestroyed()) {
            currentWindow.webContents.send('chat-loading', false);
            
            // Envia a resposta para o chat
            currentWindow.webContents.send('chat-response', {
                message: analysis.response,
                isUser: false,
                needsMoreContext: analysis.needsMoreContext,
                isComplete: analysis.isComplete
            });
            
            // Se ainda precisa de contexto, mostra a área de interação
            if (analysis.needsMoreContext) {
                currentWindow.webContents.send('show-interaction-area', {
                    message: 'Por favor, forneça mais informações para uma resposta mais precisa...'
                });
            }
        }
        
    } catch (error) {
        console.error('Erro ao processar contexto adicional:', error);
        
        // Remove indicador de carregamento em caso de erro
        if (currentWindow && !currentWindow.isDestroyed()) {
            currentWindow.webContents.send('chat-loading', false);
            currentWindow.webContents.send('chat-response', {
                message: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
                isUser: false,
                needsMoreContext: false,
                isComplete: false
            });
        }
    }
});

ipcMain.on('request-new-capture', () => {
    // Fecha a janela atual de sugestões
    const windows = BrowserWindow.getAllWindows();
    const suggestionWindow = windows.find(w => w.webContents.getURL().includes('suggestion-window'));
    if (suggestionWindow) {
        suggestionWindow.close();
    }
    
    // Inicia nova captura
    executeFullCaptureFlow('sugestao').catch(console.error);
});

app.whenReady().then(() => {
    createMainWindow();
    createTray(); // Cria o ícone da bandeja
    dbService.initDatabase();

    // Atalho global mantido
globalShortcut.register('CommandOrControl+Shift+X', async () => {
    console.log(`Atalho global ativado no modo: ${selectedMode}!`);
    const { result: finalResponse } = await executeFullCaptureFlow(selectedMode); // <- CORRIGIDO
    
    if (finalResponse && finalResponse !== '(Observado no Modo Shadow)' && finalResponse !== 'Captura cancelada.' && finalResponse !== 'Nenhum texto encontrado.') {
        const notification = new Notification({
            title: `SkillVision™ ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)}`,
            body: 'Análise concluída!',
            silent: true
        });
        notification.on('click', () => {
            if(mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });
        notification.show();
    }
});

    console.log('Atalho global "CommandOrControl+Shift+X" registrado.');

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

// Garante que o app feche completamente
app.on('before-quit', () => {
    app.isQuiting = true;
});

app.on('will-quit', () => { 
    globalShortcut.unregisterAll(); 
});

app.on('window-all-closed', () => { 
    // No Windows, mantém o app rodando na bandeja mesmo sem janelas
    if (process.platform !== 'darwin' && !tray) {
        app.quit();
    }
});



// Mantidos os handlers existentes para outras funcionalidades
ipcMain.handle('start-full-flow', async (event, mode) => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
    
    const { result } = await executeFullCaptureFlow(mode);
    return result;
});

// Handler para abrir a janela de histórico
ipcMain.on('open-history-window', () => {
    const historyWindow = new BrowserWindow({
        width: 700,
        height: 800,
        title: 'Histórico de Interações',
        webPreferences: {
            preload: path.join(__dirname, '../history-window/preload.js')
        }
    });
    historyWindow.loadFile('src/history-window/index.html');
});

// Handler que fornece os dados do histórico
ipcMain.handle('get-all-history', async () => {
    const history = await dbService.getAllHistory();
    return history;
});

// NOVO: Handler para fornecer estatísticas dos modos
ipcMain.handle('get-mode-stats', async () => {
    return await dbService.getModeUsageStats();
});

// ATUALIZADO: Listener para o evento de aplicar a correção
ipcMain.on('apply-fix', async (event, codeToType) => {
    // Fecha a janela de popup para não atrapalhar
    const popup = BrowserWindow.fromWebContents(event.sender);
    if(popup) popup.close();

    try {
        console.log('Aplicando correção:', codeToType);
        
        // Aguarda um momento para garantir que o popup foi fechado
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // NOVA IMPLEMENTAÇÃO: Usa node-key-sender para digitação
        await ks.sendText(codeToType);
        
        console.log("Correção aplicada com sucesso!");
        
        new Notification({
            title: 'SkillVision™',
            body: 'O código foi corrigido e aplicado com sucesso!'
        }).show();
        
    } catch (error) {
        console.error('Erro ao aplicar correção:', error);
        
        // Fallback: Tenta usar clipboard
        try {
            const { clipboard } = require('electron');
            clipboard.writeText(codeToType);
            
            // Simula Ctrl+V
            await ks.sendCombination(['control', 'v']);
            
            new Notification({
                title: 'SkillVision™',
                body: 'Código copiado e colado com sucesso!'
            }).show();
            
        } catch (fallbackError) {
            console.log('Código para aplicar manualmente:', codeToType);
            new Notification({
                title: 'SkillVision™ - Manual',
                body: 'Verifique o console para o código corrigido.'
            }).show();
        }
    }
});

// Handler para minimizar a janela de sugestões
ipcMain.on('minimize-suggestion-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
        console.log('Minimizando janela de sugestões'); // Debug
        win.minimize();
        // NÃO fechar a janela, apenas minimizar
    }
});

// Handler para fechar a janela de sugestões (separado do minimizar)
ipcMain.on('close-suggestion-window', (event) => {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    const windowId = currentWindow.id;
    
    // Remove o histórico da conversa e o texto original
    conversationHistories.delete(windowId);
    originalCapturedTexts.delete(windowId);
    
    if (currentWindow && !currentWindow.isDestroyed()) {
        console.log('Fechando janela de sugestões'); // Debug
        currentWindow.close();
    }
});

// NOVO: Handlers para ler e salvar configurações
ipcMain.handle('get-setting', async (event, key) => {
    return await settingsService.getSetting(key);
});

ipcMain.handle('set-setting', async (event, { key, value }) => {
    await settingsService.setSetting(key, value);
});

// NOVO: Listener para abrir a janela de configurações
ipcMain.on('open-settings-window', () => {
    const settingsWindow = new BrowserWindow({
        width: 500,
        height: 400,
        title: 'Configurações',
        webPreferences: {
            preload: path.join(__dirname, '../settings-window/preload.js'),
            contextIsolation: true
        }
    });
    settingsWindow.loadFile('src/settings-window/index.html');
});

// NOVO: Handlers para prompts customizados
ipcMain.handle('get-custom-prompts', async () => {
    return await settingsService.getCustomPrompts();
});

ipcMain.handle('set-custom-prompt', async (event, { mode, prompt }) => {
    await settingsService.setCustomPrompt(mode, prompt);
});

ipcMain.handle('reset-custom-prompt', async (event, mode) => {
    await settingsService.resetCustomPrompt(mode);
});

ipcMain.handle('get-default-prompts', () => {
    const { getDefaultPrompts } = require('../services/ai-service');
    return getDefaultPrompts();
});

// NOVO: Listener para mostrar/esconder o botão flutuante
// Adicionar estas linhas após as outras declarações de variáveis (linha ~15)
let savedFloatingPosition = { x: 100, y: 100 }; // Posição padrão

// Modificar a criação da janela flutuante (substituir a função existente):
ipcMain.on('toggle-assistant-window', () => {
    if (floatingButtonWindow && !floatingButtonWindow.isDestroyed()) {
        // Salva a posição atual antes de fechar
        const [x, y] = floatingButtonWindow.getPosition();
        savedFloatingPosition = { x, y };
        floatingButtonWindow.close();
        floatingButtonWindow = null;
    } else {
        // Cria a janela na posição salva
        floatingButtonWindow = new BrowserWindow({
            width: 60,
            height: 60,
            x: savedFloatingPosition.x,
            y: savedFloatingPosition.y,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            resizable: false,
            skipTaskbar: true,
            movable: true, // Permite movimento
            webPreferences: {
                preload: path.join(__dirname, '../floating-button/preload.js')
            }
        });
        floatingButtonWindow.loadFile('src/floating-button/index.html');
        
        // Limpa a variável quando a janela é fechada
        floatingButtonWindow.on('closed', () => {
            floatingButtonWindow = null;
        });
        
        // Salva a posição quando a janela é movida
        floatingButtonWindow.on('moved', () => {
            if (floatingButtonWindow && !floatingButtonWindow.isDestroyed()) {
                const [x, y] = floatingButtonWindow.getPosition();
                savedFloatingPosition = { x, y };
            }
        });
    }
});

// Adicionar após os outros handlers IPC (por volta da linha 700)
let selectedMode = 'sugestao'; // Variável para armazenar o modo selecionado



// Handler para definir posição da janela flutuante
ipcMain.on('set-floating-position', (event, { x, y }) => {
    if (floatingButtonWindow && !floatingButtonWindow.isDestroyed()) {
        // Garante que a janela não saia da tela
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        const clampedX = Math.max(0, Math.min(x, width - 60));
        const clampedY = Math.max(0, Math.min(y, height - 60));
        
        floatingButtonWindow.setPosition(clampedX, clampedY);
        savedFloatingPosition = { x: clampedX, y: clampedY };
    }
});

// Handler para obter posição atual
ipcMain.handle('get-floating-position', () => {
    if (floatingButtonWindow && !floatingButtonWindow.isDestroyed()) {
        const [x, y] = floatingButtonWindow.getPosition();
        return { x, y };
    }
    return savedFloatingPosition;
});

// Handler para obter dimensões da tela
ipcMain.handle('get-screen-bounds', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const position = floatingButtonWindow ? floatingButtonWindow.getPosition() : [0, 0];
    return {
        screenWidth: width,
        screenHeight: height,
        windowX: position[0],
        windowY: position[1]
    };
});

// NOVO: Listener para quando o botão flutuante é clicado
ipcMain.on('floating-button-clicked', () => {
    // Esconde o botão durante a captura para não ser capturado junto
    if (floatingButtonWindow && !floatingButtonWindow.isDestroyed()) {
        floatingButtonWindow.hide();
    }

    // Pega o modo padrão das configurações e executa o fluxo
    const defaultMode = settingsService.getSetting('defaultMode') || 'sugestao';
    executeFullCaptureFlow(defaultMode).finally(() => {
        // Mostra o botão novamente após o fluxo terminar
        if (floatingButtonWindow && !floatingButtonWindow.isDestroyed()) {
            floatingButtonWindow.show();
        }
    });
});

// MODIFICADO: Garante que o app feche completamente
app.on('before-quit', () => {
    app.isQuiting = true;
});

app.on('will-quit', () => { 
    globalShortcut.unregisterAll(); 
});

app.on('window-all-closed', () => { 
    // MODIFICADO: No Windows, mantém o app rodando na bandeja mesmo sem janelas
    if (process.platform !== 'darwin' && !tray) {
        app.quit();
    }
});

// NOVOS: Handlers para deletar histórico
ipcMain.handle('delete-history-item', async (event, id) => {
    try {
        const success = await dbService.deleteHistoryItem(id);
        return { success, message: success ? 'Registro deletado com sucesso' : 'Registro não encontrado' };
    } catch (error) {
        console.error('Erro ao deletar registro:', error);
        return { success: false, message: 'Erro ao deletar registro: ' + error.message };
    }
});

ipcMain.handle('delete-multiple-history-items', async (event, ids) => {
    try {
        const deletedCount = await dbService.deleteMultipleHistoryItems(ids);
        return { 
            success: deletedCount > 0, 
            deletedCount,
            message: `${deletedCount} registro(s) deletado(s) com sucesso` 
        };
    } catch (error) {
        console.error('Erro ao deletar múltiplos registros:', error);
        return { success: false, message: 'Erro ao deletar registros: ' + error.message };
    }
});

ipcMain.handle('clear-all-history', async () => {
    try {
        const deletedCount = await dbService.clearAllHistory();
        return { 
            success: true, 
            deletedCount,
            message: `Todo o histórico foi limpo. ${deletedCount} registro(s) deletado(s)` 
        };
    } catch (error) {
        console.error('Erro ao limpar histórico:', error);
        return { success: false, message: 'Erro ao limpar histórico: ' + error.message };
    }
});

ipcMain.handle('delete-history-older-than', async (event, date) => {
    try {
        const deletedCount = await dbService.deleteHistoryOlderThan(new Date(date));
        return { 
            success: true, 
            deletedCount,
            message: `${deletedCount} registro(s) antigo(s) deletado(s)` 
        };
    } catch (error) {
        console.error('Erro ao deletar registros antigos:', error);
        return { success: false, message: 'Erro ao deletar registros antigos: ' + error.message };
    }
});
// Add these handlers after the other ipcMain.handle declarations
ipcMain.handle('set-mode', async (event, mode) => {
    selectedMode = mode;
    console.log('Mode updated:', mode);
    return mode;
});

ipcMain.handle('get-selected-mode', async () => {
    return selectedMode;
});