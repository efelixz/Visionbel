const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

// Define o caminho do banco de dados dentro da pasta de dados do usuário
const dbPath = path.join(app.getPath('userData'), 'skillvision.db');
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
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // NOVO: Adiciona a nova coluna se ela não existir.
        // O "IGNORE" previne erros se a coluna já foi adicionada.
        db.run("ALTER TABLE history ADD COLUMN duration_seconds INTEGER", (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error("Erro ao adicionar coluna 'duration_seconds':", err);
            } else {
                console.log("Coluna 'duration_seconds' pronta.");
            }
        });
        
        // NOVO: Adiciona a coluna de modo
        db.run("ALTER TABLE history ADD COLUMN mode TEXT", (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error("Erro ao adicionar coluna 'mode':", err);
            } else {
                console.log("Coluna 'mode' pronta.");
            }
        });
    });
}

// MODIFICADO: para aceitar 'mode'
function addHistory(question, response, duration, mode) {
    const stmt = db.prepare("INSERT INTO history (question_text, response_text, duration_seconds, mode) VALUES (?, ?, ?, ?)");
    stmt.run(question, response, duration, mode, (err) => {
        if (err) {
            return console.error("Erro ao salvar no histórico:", err.message);
        }
        console.log(`Novo registro salvo com sucesso. ID: ${stmt.lastID}`);
    });
    stmt.finalize();
}

// MODIFICADO: para buscar a nova coluna
function getAllHistory() {
    return new Promise((resolve, reject) => {
        const query = "SELECT id, question_text, response_text, timestamp, duration_seconds, mode FROM history ORDER BY timestamp DESC";
        db.all(query, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * NOVO: Busca estatísticas de uso de cada modo.
 * @returns {Promise<Array<Object>>} Um array de objetos, ex: [{ mode: 'sugestao', count: 5 }]
 */
function getModeUsageStats() {
    return new Promise((resolve, reject) => {
        const query = "SELECT mode, COUNT(*) as count FROM history WHERE mode IS NOT NULL GROUP BY mode";
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * Deleta um registro específico do histórico
 * @param {number} id - ID do registro a ser deletado
 * @returns {Promise<boolean>} True se deletado com sucesso
 */
function deleteHistoryItem(id) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare("DELETE FROM history WHERE id = ?");
        stmt.run(id, function(err) {
            if (err) {
                console.error("Erro ao deletar registro:", err.message);
                reject(err);
            } else {
                console.log(`Registro ${id} deletado. Linhas afetadas: ${this.changes}`);
                resolve(this.changes > 0);
            }
        });
        stmt.finalize();
    });
}

/**
 * Deleta múltiplos registros do histórico
 * @param {Array<number>} ids - Array de IDs dos registros a serem deletados
 * @returns {Promise<number>} Número de registros deletados
 */
function deleteMultipleHistoryItems(ids) {
    return new Promise((resolve, reject) => {
        if (!ids || ids.length === 0) {
            resolve(0);
            return;
        }
        
        const placeholders = ids.map(() => '?').join(',');
        const query = `DELETE FROM history WHERE id IN (${placeholders})`;
        
        db.run(query, ids, function(err) {
            if (err) {
                console.error("Erro ao deletar múltiplos registros:", err.message);
                reject(err);
            } else {
                console.log(`${this.changes} registros deletados`);
                resolve(this.changes);
            }
        });
    });
}

/**
 * Limpa todo o histórico
 * @returns {Promise<number>} Número de registros deletados
 */
function clearAllHistory() {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM history", function(err) {
            if (err) {
                console.error("Erro ao limpar histórico:", err.message);
                reject(err);
            } else {
                console.log(`Todo o histórico foi limpo. ${this.changes} registros deletados`);
                resolve(this.changes);
            }
        });
    });
}

/**
 * Deleta registros mais antigos que uma data específica
 * @param {Date} date - Data limite (registros anteriores serão deletados)
 * @returns {Promise<number>} Número de registros deletados
 */
function deleteHistoryOlderThan(date) {
    return new Promise((resolve, reject) => {
        const dateString = date.toISOString();
        db.run("DELETE FROM history WHERE timestamp < ?", [dateString], function(err) {
            if (err) {
                console.error("Erro ao deletar registros antigos:", err.message);
                reject(err);
            } else {
                console.log(`${this.changes} registros antigos deletados`);
                resolve(this.changes);
            }
        });
    });
}

// ATUALIZE AS EXPORTAÇÕES
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