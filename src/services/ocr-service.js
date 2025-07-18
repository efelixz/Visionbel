const Tesseract = require('tesseract.js');

/**
 * Reconhece o texto em uma imagem usando Tesseract.js.
 * @param {string} imageDataUrl A imagem em formato Data URL.
 * @param {AbortSignal} signal Sinal para cancelar a operação.
 * @returns {Promise<string>} O texto extraído da imagem.
 */
async function recognizeText(imageDataUrl, signal = null) {
  try {
    console.log('Iniciando reconhecimento de texto...');
    
    // Verifica cancelamento antes de iniciar
    if (signal && signal.aborted) {
      throw new Error('Operação cancelada');
    }
    
    // Validação do Data URL
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      throw new Error('Formato de imagem inválido');
    }
    
    // Configurações otimizadas para o Tesseract
    const worker = await Tesseract.createWorker('por');
    
    // Listener para cancelamento
    if (signal) {
      signal.addEventListener('abort', () => {
        worker.terminate();
      });
    }
    
    // Cria uma Promise que pode ser cancelada
    const recognizePromise = worker.recognize(imageDataUrl, {
      // Removido logger para evitar DataCloneError
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?;:()[]{}"\'-àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß',
      preserve_interword_spaces: '1'
    });
    
    // Se há um signal, cria uma Promise de cancelamento
    if (signal) {
      const cancelPromise = new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          worker.terminate();
          reject(new Error('Operação cancelada'));
        });
      });
      
      // Usa Promise.race para cancelar se necessário
      const { data: { text } } = await Promise.race([recognizePromise, cancelPromise]);
      await worker.terminate();
      
      console.log('Reconhecimento concluído.');
      return text.trim();
    } else {
      // Sem cancelamento, executa normalmente
      const { data: { text } } = await recognizePromise;
      await worker.terminate();
      
      console.log('Reconhecimento concluído.');
      return text.trim();
    }
    
  } catch (error) {
    if (error.message.includes('cancelada') || error.message.includes('Operação cancelada')) {
      throw new Error('OCR cancelado pelo usuário');
    }
    console.error('Erro no serviço de OCR:', error);
    throw new Error('Falha ao tentar reconhecer o texto da imagem.');
  }
}

/**
 * NOVO: Reconhece texto e retorna dados detalhados, incluindo coordenadas de palavras.
 * @param {string} imageDataUrl A imagem em formato Data URL.
 * @param {AbortSignal} signal Sinal para cancelar a operação.
 * @returns {Promise<object>} Um objeto contendo o texto completo e um array de palavras com seus dados.
 */
async function recognizeWithDetails(imageDataUrl, signal = null) {
  try {
    console.log(`Iniciando reconhecimento detalhado...`);
    
    // Verifica cancelamento antes de iniciar
    if (signal && signal.aborted) {
      throw new Error('Operação cancelada');
    }
    
    // Validação do Data URL
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      throw new Error('Formato de imagem inválido');
    }
    
    // Usamos o mesmo método, mas vamos processar a resposta completa
    const worker = await Tesseract.createWorker('por');
    
    // Listener para cancelamento
    if (signal) {
      signal.addEventListener('abort', () => {
        worker.terminate();
      });
    }
    
    // Cria uma Promise que pode ser cancelada
    const recognizePromise = worker.recognize(imageDataUrl, {
      // Removido logger para evitar DataCloneError
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?;:()[]{}"\'-àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß',
      preserve_interword_spaces: '1'
    });
    
    // Se há um signal, cria uma Promise de cancelamento
    if (signal) {
      const cancelPromise = new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          worker.terminate();
          reject(new Error('Operação cancelada'));
        });
      });
      
      // Usa Promise.race para cancelar se necessário
      const { data } = await Promise.race([recognizePromise, cancelPromise]);
      await worker.terminate();
      
      console.log('Reconhecimento detalhado concluído.');
      return {
          fullText: data.text,
          words: data.paragraphs?.[0]?.lines?.[0]?.words?.map(w => ({
              text: w.text,
              confidence: w.confidence,
              bbox: w.bbox // { x0, y0, x1, y1 }
          })) || []
      };
    } else {
      // Sem cancelamento, executa normalmente
      const { data } = await recognizePromise;
      await worker.terminate();
      
      console.log('Reconhecimento detalhado concluído.');
      return {
          fullText: data.text,
          words: data.paragraphs?.[0]?.lines?.[0]?.words?.map(w => ({
              text: w.text,
              confidence: w.confidence,
              bbox: w.bbox // { x0, y0, x1, y1 }
          })) || []
      };
    }
  } catch (error) {
    if (error.message.includes('cancelada') || error.message.includes('Operação cancelada')) {
      throw new Error('OCR cancelado pelo usuário');
    }
    console.error('Erro no serviço de OCR detalhado:', error);
    throw new Error('Falha ao tentar extrair detalhes da imagem.');
  }
}

// ATUALIZE AS EXPORTAÇÕES
module.exports = { recognizeText, recognizeWithDetails };