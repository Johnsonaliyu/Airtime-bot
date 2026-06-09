const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const { handleGroupMessage, handleDMMessage, handleNewMember } = require('./handlers');
const { initScheduler } = require('./scheduler');

let pairingCodeRequested = false;

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  console.log(`🔧 Using Baileys v${version.join('.')}`);

  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '';

  // ── Connection Handler ──────────────────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {

    if (qr && !pairingCodeRequested) {
      pairingCodeRequested = true;
      if (!WHATSAPP_NUMBER) {
        console.log('❌ Set WHATSAPP_NUMBER in your Replit Secrets!');
        return;
      }
      try {
        const code = await sock.requestPairingCode(WHATSAPP_NUMBER);
        console.log('\n==============================');
        console.log('  AMÒFIN PAIRING CODE:', code);
        console.log('==============================');
        console.log('WhatsApp → Linked Devices → Link a Device → Link with phone number\n');
      } catch (err) {
        console.error('Pairing code error:', err.message);
      }
    }

    if (connection === 'open') {
      pairingCodeRequested = false;
      console.log('\n✅ Amòfin is connected to WhatsApp and ready! ⚖️\n');
      initScheduler(sock);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`⚠️  Connection closed. Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        pairingCodeRequested = false;
        startBot();
      }
    }
  });

  // ── New Group Member Handler ────────────────────────────────────────────────
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (action !== 'add') return;

    await new Promise(r => setTimeout(r, 2000));

    for (const participantJid of participants) {
      try {
        const [contact] = await sock.onWhatsApp(participantJid.split('@')[0]);
        const name = contact?.name || participantJid.split('@')[0];
        await handleNewMember(sock, id, participantJid, name);
      } catch {
        await handleNewMember(sock, id, participantJid, participantJid.split('@')[0]);
      }
    }
  });

  // ── Message Handler ─────────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const hasText =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption;

      if (!hasText) continue;

      const jid     = msg.key.remoteJid;
      const isGroup = jid?.endsWith('@g.us');

      try {
        if (isGroup) {
          await handleGroupMessage(sock, msg);
        } else {
          await handleDMMessage(sock, msg);
        }
      } catch (err) {
        console.error('Message handler error:', err.message);
      }
    }
  });
}

module.exports = { startBot };
