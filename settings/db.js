const fs = require("fs");
const dbPath = "./database.json";

function loadDatabase() {
  if (!fs.existsSync(dbPath)) return [];
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDatabase(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function findUserByTelegramId(id) {
  return loadDatabase().find(u => u.telegram_id === id);
}

function isExpired(user) {
  const today = new Date().toISOString().split("T")[0];
  return user.expiredDate && user.expiredDate < today;
}

module.exports = { loadDatabase, saveDatabase, findUserByTelegramId, isExpired };
