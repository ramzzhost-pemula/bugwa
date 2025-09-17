console.clear();  
require('./settings/config')
console.log('starting...');  
process.on("uncaughtException", console.error);  
  
const {
    default: makeWASocket,   
    prepareWAMessageMedia,   
    removeAuthState,  
    useMultiFileAuthState,   
    DisconnectReason,   
    fetchLatestBaileysVersion,   
    makeInMemoryStore,   
    generateWAMessageFromContent,   
    generateWAMessageContent,   
    generateWAMessage,  
    jidDecode,   
    proto,   
    delay,  
    relayWAMessage,   
    getContentType,   
    generateMessageTag,  
    getAggregateVotesInPollMessage,   
    downloadContentFromMessage,   
    fetchLatestWaWebVersion,   
    InteractiveMessage,   
    makeCacheableSignalKeyStore,   
    Browsers,   
    generateForwardMessageContent,   
    MessageRetryMap   
} = require("@whiskeysockets/baileys");  
const pino = require('pino');  
const readline = require("readline");  
const fs = require('fs');  
const express = require("express");  
const session = require("express-session")
const bodyParser = require('body-parser');  
const cors = require("cors");  
const path = require("path");    
const { loadDatabase, saveDatabase, findUserByTelegramId, isExpired } = require("./settings/db");

// ======== Inisialisasi Bot Telegram ========


// Start Command
bot.start((ctx) => ctx.reply(`Halo ${ctx.from.first_name}, selamat datang!`));

// /costumeuser username|password|role|expiredDate
bot.command("costumeuser", async (ctx) => {
  const input = ctx.message.text.split(" ").slice(1).join(" ");
  if (!input || input.split("|").length !== 4)
    return ctx.reply("❌ Format: /costumeuser username|password|role|expired");

  const [username, password, role, expiredDate] = input.split("|").map(v => v.trim());
  const db = loadDatabase();

  if (db.find(u => u.username === username))
    return ctx.reply("❌ Username sudah terdaftar!");

  db.push({ username, password, role, expiredDate, telegram_id: null });
  saveDatabase(db);
  ctx.reply(`✅ User berhasil dibuat!\nUsername: ${username}\nRole: ${role}`);
});

// /login username|password
bot.command("login", (ctx) => {
  const input = ctx.message.text.split(" ").slice(1).join(" ");
  const [username, password] = input.split("|").map(s => s.trim());
  const db = loadDatabase();
  const user = db.find(u => u.username === username && u.password === password);

  if (!user) return ctx.reply("❌ Username atau password salah!");
  if (isExpired(user)) return ctx.reply("⛔ Masa aktif akun kamu telah habis!");

  user.telegram_id = ctx.from.id;
  saveDatabase(db);
  ctx.reply(`✅ Login berhasil sebagai ${user.role}`);
});

// /deluser username
bot.command("deluser", (ctx) => {
  const input = ctx.message.text.split(" ")[1];
  if (!input) return ctx.reply("❌ Format: /deluser username");

  let db = loadDatabase();
  const before = db.length;
  db = db.filter(u => u.username !== input);
  if (db.length === before) return ctx.reply("❌ User tidak ditemukan!");

  saveDatabase(db);
  ctx.reply(`🗑️ User ${input} dihapus.`);
});

// /listuser
bot.command("listuser", (ctx) => {
  const db = loadDatabase();
  if (db.length === 0) return ctx.reply("📭 Belum ada user.");

  const list = db.map(u => `👤 ${u.username} | ${u.role} | Expires: ${u.expiredDate}`).join("\n");
  ctx.reply("📄 Daftar user:\n\n" + list);
});

// /setexpired username|2025-12-31
bot.command("setexpired", (ctx) => {
  const input = ctx.message.text.split(" ").slice(1).join(" ");
  const [username, expiredDate] = input.split("|").map(s => s.trim());
  const db = loadDatabase();
  const user = db.find(u => u.username === username);

  if (!user) return ctx.reply("❌ User tidak ditemukan!");
  user.expiredDate = expiredDate;
  saveDatabase(db);
  ctx.reply(`✅ Masa aktif ${username} diubah ke ${expiredDate}`);
});

// ======== Bot WhatsApp: Multi-Session Baileys ========
async function startWA(sessionName) {
  const sessionPath = path.resolve("Linux-here", sessionName);
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    logger: require("pino")({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`WA ${sessionName} terputus. Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) startWA(sessionName);
    } else if (connection === "open") {
      console.log(`✅ WhatsApp ${sessionName} tersambung`);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    // Contoh: Balas jika kirim "ping"
    if (text.toLowerCase() === "ping") {
      await sock.sendMessage(msg.key.remoteJid, { text: "pong!" });
    }
  });
}

// Mulai dua sesi WA
startWA("session1");
startWA("session2");

// Jalankan bot Telegram
bot.launch();
console.log(chalk.red(`⠀⠀⠀             
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣿⢛⡛⠿⠛⠿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⡿⠟⡉⣡⡖⠘⢗⣀⣀⡀⢢⣐⣤⣉⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⡿⠉⣠⣲⣾⡭⣀⢟⣩⣶⣶⡦⠈⣿⣿⣿⣷⣖⠍⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⡛⢀⠚⢩⠍⠀⠀⠡⠾⠿⣋⡥⠀⣤⠈⢷⠹⣿⣎⢳⣶⡘⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⡏⢀⡤⠉⠀⠀⠀⣴⠆⠠⠾⠋⠁⣼⡿⢰⣸⣇⢿⣿⡎⣿⡷⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⠀⢸⢧⠁⠀⠀⢸⠇⢐⣂⣠⡴⠶⣮⢡⣿⢃⡟⡘⣿⣿⢸⣷⡀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣯⢀⡏⡾⢠⣿⣶⠏⣦⢀⠈⠉⡙⢻⡏⣾⡏⣼⠇⢳⣿⡇⣼⡿⡁⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⠈⡇⡇⡘⢏⡃⠀⢿⣶⣾⣷⣿⣿⣿⡘⡸⠇⠌⣾⢏⡼⣿⠇⠀⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⡀⠀⢇⠃⢢⡙⣜⣾⣿⣿⣿⣿⣿⣿⣧⣦⣄⡚⣡⡾⣣⠏⠀⠀⢀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣷⡀⡀⠃⠸⣧⠘⢿⣿⣿⣿⣿⣿⣻⣿⣿⣿⣿⠃⠘⠁⢈⣤⡀⣬⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣇⣅⠀⠀⠸⠀⣦⡙⢿⣿⣿⣿⣿⣿⣿⡿⠃⢀⣴⣿⣿⣿⣷⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⡿⢛⣉⣉⣀⡀⠀⢸⣿⣿⣷⣬⣛⠛⢛⣩⣵⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⢋⣴⣿⣿⣿⣿⣿⣦⣬⣛⣻⠿⢿⣿⡇⠈⠙⢛⣛⣩⣭⣭⣝⡛⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⡇⣼⣿⣿⣿⣿⣿⡿⡹⢿⣿⣽⣭⣭⣭⣄⣙⠻⢿⣿⡿⣝⣛⣛⡻⢆⠙⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⢥⣿⣿⣿⣿⣿⣿⢇⣴⣿⣿⣿⣿⣿⡿⣿⣿⣿⣷⣌⢻⣿⣿⣿⣿⣿⣷⣶⣌⠛⢿⣿⣿⣿⣿⣿⣿⣿⣿
⡆⣿⣿⣿⣿⣿⡟⣸⣿⣿⣿⣿⣿⣿⣄⣸⣿⣿⣿⣿⣦⢻⣿⣿⣿⣿⣿⣿⣿⠁⠊⠻⣿⣿⣿⣿⣿⣿⣿
⣿⠸⣿⣿⣿⣿⡇⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢸⣿⣿⣿⣿⣿⣿⣿⣷⣿⠀⣿⣿⣿⣿⣿⣿⣿
⣿⣄⢻⣿⣿⣿⣿⡸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠸⣿⣿⣿⣿⣿⣿⣿⣿⣿⢀⣿⣿⣿⣿⣿⣿⣿
⣿⣿⠈⣿⣿⣿⣿⣷⢙⠿⣿⣿⣿⣿⣿⣿⣿⠿⣟⣩⣴⣷⣌⠻⣿⣿⣿⣿⣿⣿⡟⢠⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣆⢻⣿⣿⣿⣿⡇⣷⣶⣭⣭⣭⣵⣶⣾⣿⣿⣿⣿⣿⣿⣷⣌⠹⢿⣿⡿⢋⣠⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⡚⣿⣿⣿⣿⡇⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣯⢀⣤⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⡇⢻⣿⣿⣿⡇⠘⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣿⣿⠘⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣷⠈⣿⣿⣿⣿⢆⠀⢋⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⣿⣿⣥⡘⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⠀⣻⣿⣿⣿⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣎⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣒⣻⣿⣿⢏⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⢻⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣇⢹⣿⡏⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣟⣿⣿⣿⣿⣿⣷⣬⡻⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⡄⠻⢱⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣝⢎⢻⣿⣿⣿
⣿⣿⣿⣿⣿⣷⢀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⣿⣿⣾⣦⢻⣿⣿
⣿⣿⣿⣿⣿⡇⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⣼⣿⣿⣿⣿⣆⢻⣿
⣿⣿⣿⣿⡿⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣮⡙⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⣰⣿⣿⣿⣿⣿⣿⣆⣿
⣿⣿⣿⣿⡇⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣝⢿⣿⣿⣿⣿⣿⣿⣿⢡⣿⣿⣿⣿⣿⣿⣿⣿⡎
⣿⣿⣿⣿⡇⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣝⢿⣿⡆⢿⣿⡿⢸⣿⣿⣿⣿⣿⣿⣿⣿⡇
⣿⣿⣿⣿⡇⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣆⢻⣿⢸⣿⡇⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷
⣿⣿⣿⣿⣧⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⢹⠸⠁⣰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⡌⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡆⢰⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣷⡘⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡌⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
`));
console.log("🤖 Bot Telegram & WhatsApp aktif!");
