const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

// Define o caminho do banco de dados dentro da pasta de dados do usuário
const dbPath = path.join(app.getPath('userData'), 'visionbel.db');
const db = new sqlite3.Database(dbPath);

/**
 * Inicializa o banco de dados e cria a tabela de histórico se ela não existir.
 */
function initDatabase() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_text TEXT NOT NULL,
                response_text TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                duration_seconds INTEGER,
                mode TEXT
            )
        `);
    });
}

// Remover as funções setApiKey e getApiKey do final do arquivo
module.exports = { 
    initDatabase, 
    addHistory, 
    getAllHistory, 
    getModeUsageStats,
    deleteHistoryItem,
    deleteMultipleHistoryItems,
    clearAllHistory,
    deleteHistoryOlderThan
};

function setApiKey(provider, apiKey, model = null, fallbackModel = null) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO api_keys (provider, api_key, model, fallback_model) VALUES (?, ?, ?, ?)`,
            [provider, apiKey, model, fallbackModel],
            function(err) {
                if (err) reject(err);
                else resolve(true);
            }
        );
    });
}

function getApiKey(provider) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT api_key, model, fallback_model FROM api_keys WHERE provider = ?`,
            [provider],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

/**
 * Adiciona um novo registro ao histórico
 * @param {string} questionText - O texto da pergunta
 * @param {string} responseText - O texto da resposta
 * @param {number} durationSeconds - A duração em segundos
 * @param {string} mode - O modo utilizado (destaque, sugestao, etc)
 * @returns {Promise} Uma promise que resolve quando o registro é adicionado
 */
function addHistory(questionText, responseText, durationSeconds, mode) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO history (question_text, response_text, duration_seconds, mode) 
             VALUES (?, ?, ?, ?)`,
            [questionText, responseText, durationSeconds, mode],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

/**
 * Retorna todos os registros do histórico ordenados por data
 * @returns {Promise<Array>} Uma promise que resolve com um array de registros
 */
function getAllHistory() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM history ORDER BY timestamp DESC`,
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

/**
 * Retorna estatísticas de uso por modo
 * @returns {Promise<Array>} Uma promise que resolve com um array de estatísticas por modo
 */
function getModeUsageStats() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT 
                mode,
                COUNT(*) as total_uses,
                AVG(duration_seconds) as avg_duration,
                MIN(timestamp) as first_use,
                MAX(timestamp) as last_use
            FROM history 
            WHERE mode IS NOT NULL 
            GROUP BY mode
            ORDER BY total_uses DESC`,
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

/**
 * Deleta um item específico do histórico
 * @param {number} id - O ID do item a ser deletado
 * @returns {Promise<boolean>} Uma promise que resolve com true se o item foi deletado com sucesso
 */
function deleteHistoryItem(id) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM history WHERE id = ?`,
            [id],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            }
        );
    });
}

/**
 * Deleta múltiplos itens do histórico
 * @param {number[]} ids - Array com os IDs dos itens a serem deletados
 * @returns {Promise<{success: boolean, deletedCount: number}>} Uma promise que resolve com o status da operação
 */
function deleteMultipleHistoryItems(ids) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(ids) || ids.length === 0) {
            resolve({ success: false, deletedCount: 0 });
            return;
        }

        const placeholders = ids.map(() => '?').join(',');
        db.run(
            `DELETE FROM history WHERE id IN (${placeholders})`,
            ids,
            function(err) {
                if (err) reject(err);
                else resolve({
                    success: true,
                    deletedCount: this.changes
                });
            }
        );
    });
}

/**
 * Limpa todo o histórico
 * @returns {Promise<boolean>} Uma promise que resolve com true se o histórico foi limpo com sucesso
 */
function clearAllHistory() {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM history`,
            [],
            function(err) {
                if (err) reject(err);
                else resolve(true);
            }
        );
    });
}

/**
 * Deleta registros do histórico mais antigos que a data especificada
 * @param {Date} date - Data limite para manter os registros
 * @returns {Promise<{success: boolean, deletedCount: number}>} Uma promise que resolve com o status da operação
 */
function deleteHistoryOlderThan(date) {
    return new Promise((resolve, reject) => {
        if (!(date instanceof Date) || isNaN(date)) {
            resolve({ success: false, deletedCount: 0 });
            return;
        }

        db.run(
            `DELETE FROM history WHERE timestamp < datetime(?)`,
            [date.toISOString()],
            function(err) {
                if (err) reject(err);
                else resolve({
                    success: true,
                    deletedCount: this.changes
                });
            }
        );
    });
}