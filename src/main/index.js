require('dotenv').config();
const { app, BrowserWindow, desktopCapturer, ipcMain, screen, globalShortcut, Notification, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
// NOVA DEPENDÊNCIA: node-key-sender (substitui robotjs)
const ks = require('node-key-sender');
const settingsService = require('../services/settings-service');
const automationService = require('../services/automation-service');

// MODIFICADO: Importamos o serviço completo para usar ambas as funções
const ocrService = require('../services/ocr-service');
const { getAIResponse } = require('../services/ai-service');
const dbService = require('../services/database-service');

let mainWindow;
let tray = null;
let quickCaptureEnabled = true;
// NOVO: Controle de estado da análise
let isAnalysisRunning = false;
let currentAnalysisController = null;

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
// ... existing code ...

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
            
            // Limpa a resposta da IA para encontrar as palavras-chave
            const targetWords = aiResponse.replace(/[.,*]/g, '').trim().split(/\s+/);
        
            // Encontra as palavras correspondentes e suas coordenadas
            const foundWords = [];
            for (const word of ocrData.words) {
                if (targetWords.some(target => word.text.toLowerCase().includes(target.toLowerCase()))) {
                    foundWords.push(word);
                }
            }
            
            if (foundWords.length > 0) {
                // Calcula o retângulo que engloba todas as palavras encontradas
                const minX = Math.min(...foundWords.map(w => w.bbox.x0));
                const minY = Math.min(...foundWords.map(w => w.bbox.y0));
                const maxX = Math.max(...foundWords.map(w => w.bbox.x1));
                const maxY = Math.max(...foundWords.map(w => w.bbox.y1));
        
                // Coordenadas absolutas na tela
                const highlightRect = {
                    x: capturedRect.x + minX,
                    y: capturedRect.y + minY,
                    width: maxX - minX,
                    height: maxY - minY,
                };
        
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
                    highlightWindow.webContents.send('draw-highlight', highlightRect);
                });
                
                // Mostra notificação de sucesso
                new Notification({
                    title: 'SkillVision™ - Destaque',
                    body: `Destacando: ${targetWords.join(', ')}`,
                    silent: true
                }).show();
            } else {
                // Se não encontrou palavras para destacar
                new Notification({
                    title: 'SkillVision™ - Destaque',
                    body: 'Nenhuma palavra relevante encontrada para destacar',
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
            
            const suggestionWindow = new BrowserWindow({
                x: capturedRect.x + capturedRect.width + 10,
                y: capturedRect.y,
                width: 400, // Aumentado
                height: mode === 'autocorrecao' ? 350 : 300, // Aumentado
                frame: false,
                transparent: true,
                alwaysOnTop: true,
                skipTaskbar: true,
                resizable: false,
                webPreferences: {
                    preload: path.join(__dirname, '../suggestion-window/preload.js'),
                    contextIsolation: true
                }
            });

            suggestionWindow.loadFile('src/suggestion-window/index.html');

            suggestionWindow.webContents.on('did-finish-load', () => {
                suggestionWindow.webContents.send('send-suggestions', { suggestions: aiResponseText, mode: mode });
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
            
            const responseWindow = new BrowserWindow({
                x: capturedRect.x + capturedRect.width + 10,
                y: capturedRect.y,
                width: 450, // Aumentado para acomodar respostas mais longas
                height: mode === 'raciocinio' ? 400 : 350, // Altura maior para modo raciocínio
                frame: false,
                transparent: true,
                alwaysOnTop: true,
                skipTaskbar: true,
                resizable: false,
                webPreferences: {
                    preload: path.join(__dirname, '../suggestion-window/preload.js'),
                    contextIsolation: true
                }
            });

            responseWindow.loadFile('src/suggestion-window/index.html');

            responseWindow.webContents.on('did-finish-load', () => {
                responseWindow.webContents.send('send-suggestions', { suggestions: aiResponseText, mode: mode });
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

// REMOVIDO: Todos os handlers relacionados ao assistente flutuante
// (toggle-assistant-window, floating-button-clicked, etc.)

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

// NOVO: Handler para definir o modo selecionado
ipcMain.handle('set-mode', async (event, mode) => {
    selectedMode = mode;
    console.log(`Modo selecionado atualizado para: ${mode}`);
    return { success: true };
});

// NOVO: Handler para obter o modo atual
ipcMain.handle('get-selected-mode', () => {
    return selectedMode;
});

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