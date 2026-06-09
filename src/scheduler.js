const cron = require('node-cron');
const { getGroupJid } = require('./store');

let sockRef = null;

/**
 * Initialize all scheduled tasks
 * @param {object} sock - Baileys socket
 */
function initScheduler(sock) {
  sockRef = sock;

  // Happy New Month — 1st of every month at 7:00 AM WAT (WAT = UTC+1)
  cron.schedule('0 6 1 * *', async () => {
    await sendNewMonthMessage();
  }, { timezone: 'Africa/Lagos' });

  console.log('⏰ Scheduler initialized — New Month message scheduled for 1st of every month at 7:00 AM WAT');
}

// ── New Month Message ─────────────────────────────────────────────────────────

const NEW_MONTH_MESSAGES = [
  () => {
    const month = new Date().toLocaleString('en-NG', { month: 'long', timeZone: 'Africa/Lagos' });
    const year  = new Date().getFullYear();
    return (
      `🎉 *Happy New Month, Olaoluwa Family!* 🎉\n\n` +
      `Welcome to *${month} ${year}*! 🗓️\n\n` +
      `May this month bring every member good health, prosperity, and the unity that defines us.\n\n` +
      `Ẹ káàbọ̀ sí oṣù tuntun! Let's honour our constitution and make it a great one. 💪🏾\n\n` +
      `— Amòfin | IT Unit, Olaoluwa Age Group`
    );
  },
  () => {
    const month = new Date().toLocaleString('en-NG', { month: 'long', timeZone: 'Africa/Lagos' });
    return (
      `🌅 A new month has arrived — *${month}* is here!\n\n` +
      `On behalf of the Olaoluwa Age Group, I wish every member a month filled with blessings, good news, and togetherness. 🙏🏾\n\n` +
      `Ẹ káàárọ̀ oṣù tuntun, Olaoluwa family! And remember — the constitution is always your guide. 📜\n\n` +
      `— Amòfin`
    );
  },
  () => {
    const month = new Date().toLocaleString('en-NG', { month: 'long', timeZone: 'Africa/Lagos' });
    return (
      `✨ *${month} is here!* ✨\n\n` +
      `Dear Olaoluwa family, as we step into this new month, may our bond grow stronger, our plans succeed, and our community thrive. 🤝🏾\n\n` +
      `E jẹ́ ká ṣe rere nínú oṣù tuntun yìí — let's do well, and let's do it by the book! 📋\n\n` +
      `Happy New Month! 🎊\n— Amòfin`
    );
  }
];

async function sendNewMonthMessage() {
  const groupJid = getGroupJid();
  if (!groupJid || !sockRef) {
    console.log('⚠️  Cannot send new month message — group JID not set');
    return;
  }

  const msgFn  = NEW_MONTH_MESSAGES[new Date().getMonth() % NEW_MONTH_MESSAGES.length];
  const message = msgFn();

  try {
    await sockRef.sendMessage(groupJid, { text: message });
    console.log(`✅ New month message sent to group`);
  } catch (err) {
    console.error('Failed to send new month message:', err.message);
  }
}

// ── Meeting Announcement ──────────────────────────────────────────────────────

async function sendMeetingAnnouncement(groupJid, details) {
  if (!sockRef) return;
  const message =
    `📢 *MEETING ANNOUNCEMENT*\n\n` +
    `${details}\n\n` +
    `Per *Article 8(A)* of our constitution, please take note and plan to attend. Absence fines apply! 🙏🏾\n\n` +
    `— Amòfin | Olaoluwa Age Group`;

  await sockRef.sendMessage(groupJid, { text: message });
}

// ── Custom Reminder ───────────────────────────────────────────────────────────

async function sendReminder(groupJid, message) {
  if (!sockRef) return;
  const text =
    `🔔 *REMINDER*\n\n` +
    `${message}\n\n` +
    `— Amòfin`;

  await sockRef.sendMessage(groupJid, { text });
}

// ── Schedule a one-time reminder ──────────────────────────────────────────────

function scheduleOneTimeReminder(sock, groupJid, message, delayMs) {
  setTimeout(async () => {
    await sendReminder(groupJid, message);
  }, delayMs);
}

module.exports = {
  initScheduler,
  sendMeetingAnnouncement,
  sendReminder,
  scheduleOneTimeReminder,
  sendNewMonthMessage
};
