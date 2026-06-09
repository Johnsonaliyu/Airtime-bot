const {
  getAmofinResponse,
  getWelcomeMessage,
  getWelcomeReply,
  getIntroduction,
  getYorubaGreeting
} = require('./ai');

const { handleAirtimeDM } = require('./airtimeFlow');

const {
  setGroupJid,
  addMessageToContext,
  getContext,
  hasBeenWelcomed,
  markAsWelcomed
} = require('./store');

const {
  sendMeetingAnnouncement,
  scheduleOneTimeReminder,
  sendNewMonthMessage
} = require('./scheduler');

const ADMIN_NUMBER = process.env.ADMIN_NUMBER || '';

// ── Utility: Get sender's display name ───────────────────────────────────────

function getSenderName(msg) {
  return (
    msg.pushName ||
    msg.key.participant?.split('@')[0] ||
    msg.key.remoteJid?.split('@')[0] ||
    'Member'
  );
}

// ── Utility: Extract full message text ───────────────────────────────────────

function getMessageText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  );
}

// ── Utility: Check if Amòfin was mentioned ────────────────────────────────────

function isBotMentioned(msg, botJid) {
  const botNumber = botJid.split(':')[0].split('@')[0];

  // Method 1: Official mentionedJid array
  const mentionedJids =
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg.message?.imageMessage?.contextInfo?.mentionedJid ||
    msg.message?.videoMessage?.contextInfo?.mentionedJid ||
    [];
  if (mentionedJids.some(jid => jid.replace('@s.whatsapp.net', '').includes(botNumber))) return true;

  // Method 2: @phonenumber in text
  const text = getMessageText(msg);
  if (text.includes('@' + botNumber)) return true;

  // Method 3: @amofin or @amòfin
  if (/(@amofin|@amòfin)/i.test(text)) return true;

  // Method 4: Direct address at start
  const trimmed = text.trim().toLowerCase();
  if (trimmed.startsWith('amofin,') || trimmed.startsWith('amofin ') ||
      trimmed.startsWith('amòfin,') || trimmed.startsWith('amòfin ')) return true;

  return false;
}

// ── Utility: Check if message is welcoming Amòfin ────────────────────────────

function isWelcomingBot(text) {
  const lower = text.toLowerCase();
  const welcomeWords = [
    'welcome amofin', 'welcome amòfin', 'hi amofin', 'hello amofin',
    'ekabo amofin', 'ẹ káàbọ̀ amofin', 'glad to have amofin',
    'welcome to the group amofin', 'good to have amofin'
  ];
  return welcomeWords.some(w => lower.includes(w));
}

// ── Utility: Parse reminder text ─────────────────────────────────────────────

function parseReminderText(text) {
  const lower = text.toLowerCase();
  if (lower.includes('remind') || lower.includes('reminder')) {
    const match = text.match(/(?:remind(?:er)?(?:\s+everyone)?|set reminder)\s+(.+)/i);
    return match ? match[1].trim() : null;
  }
  return null;
}

function parseDelay(text) {
  const lower = text.toLowerCase();
  if (lower.includes('in 1 hour') || lower.includes('in an hour'))  return 60 * 60 * 1000;
  if (lower.includes('in 2 hours'))                                  return 2 * 60 * 60 * 1000;
  if (lower.includes('in 30 minutes') || lower.includes('in 30 mins')) return 30 * 60 * 1000;
  if (lower.includes('in 15 minutes') || lower.includes('in 15 mins')) return 15 * 60 * 1000;
  if (lower.includes('in 10 minutes') || lower.includes('in 10 mins')) return 10 * 60 * 1000;
  if (lower.includes('tomorrow'))                                    return 24 * 60 * 60 * 1000;
  return null;
}

// ── Utility: Quick rule-based constitutional answers (no AI tokens wasted) ───
// These are crisp, precise answers that don't need AI

function getQuickConstitutionalFact(text) {
  const lower = text.toLowerCase();

  // Monthly dues
  if ((lower.includes('monthly') && lower.includes('contribution')) ||
      (lower.includes('monthly') && lower.includes('dues')) ||
      lower.includes('1500') || lower.includes('₦1500')) {
    return '📋 Per Article 8(A), every member pays a monthly contribution of ₦1,500. — Amòfin';
  }

  // Hosting right
  if (lower.includes('hosting right') || lower.includes('host') && lower.includes('money')) {
    return '🏠 Per Article 8(A), the Age Grade pays the host ₦30,000 (hosting right) two weeks before their hosting date. The host must provide a minimum of 1 carton of beer, 1 crate of malt, and 2 cartons of Cabin Biscuits. — Amòfin';
  }

  // Wedding/marriage benefit
  if (lower.includes('wedding') || lower.includes('marriage') || lower.includes('wed') ||
      lower.includes('life right')) {
    return '💍 Per Article 9(1), an active member who plans to wed must notify the Age Grade at least 30 days before the wedding. The Age Grade honours the occasion with ₦50,000 cash. The member must also entertain those present. — Amòfin';
  }

  // Death of parent benefit
  if ((lower.includes('death') || lower.includes('burial') || lower.includes('bereave')) &&
      lower.includes('parent')) {
    return '🕊️ Per Article 9(4), the Age Grade pays a condolence visit; members must attend both wake-keep and burial. No-shows are fined ₦500 each. The bereaved member receives ₦50,000 cash on burial day. — Amòfin';
  }

  // Fighting fine
  if (lower.includes('fight') && (lower.includes('fine') || lower.includes('penalty'))) {
    return '⚠️ Per Article 10(2):\n• Two members fighting: ₦2,000 each (instigator pays extra)\n• Fighting with a dangerous weapon: ₦5,000\n• Group fighting: ₦5,000 per person\n• Fighting in public: ₦5,000\n— Amòfin';
  }

  // Stealing punishment
  if (lower.includes('steal') || lower.includes('theft') || lower.includes('embezzl')) {
    return '🚨 Per Article 10(4), a member found guilty of stealing must provide:\n• 1 goat\n• 4 tubers of yam\n• ₦5,000 cash\n• 25 litres of palm wine\n• 1 carton of beer\nAiding the thief attracts the same punishment. — Amòfin';
  }

  // Election tenure
  if ((lower.includes('tenure') || lower.includes('term')) &&
      (lower.includes('executive') || lower.includes('officer') || lower.includes('election'))) {
    return '🗳️ Per Article 6, executives serve 2 calendar years from oath of office. They may re-contest once, but no more than two terms in the same position. — Amòfin';
  }

  // Bank account / signatories
  if (lower.includes('signator') || lower.includes('bank account') || lower.includes('withdrawal')) {
    return '🏦 Per Article 12, the Age Grade has THREE signatories: the Chairman, Treasurer, and Financial Secretary. Any withdrawal requires TWO signatures, which must include the Chairman, and must be authorized by the Age Grade. — Amòfin';
  }

  // Membership year
  if (lower.includes('born') || lower.includes('birth year') || lower.includes('qualify') && lower.includes('member')) {
    return '📋 Per Article 4(A), membership is open to males and females born between 1991 and 1993 who are indigenes of Owalusin, Iwaro-Oka, Akoko. — Amòfin';
  }

  // Late joiner
  if (lower.includes('late') && (lower.includes('join') || lower.includes('register'))) {
    return '📋 Per Article 4(A), a late joiner (1991–1993 born) must provide: 25 litres of palm wine, a minimum ₦2,000 (Megbe ro), and one crate of malt. — Amòfin';
  }

  // Quorum
  if (lower.includes('quorum')) {
    return '📅 Per Article 8(B), the meeting commences when members who are home/present are deemed enough to start business. Decisions reached are legally binding. — Amòfin';
  }

  // Meeting time
  if (lower.includes('meeting time') || (lower.includes('meeting') && lower.includes('when'))) {
    return '📅 Per Article 8(A), general meetings hold every 2 weeks. Time: 4:00 PM – 5:30 PM. Venue rotates among members. — Amòfin';
  }

  // Absence/absenteeism
  if (lower.includes('absent') || lower.includes('absentee')) {
    return '⚠️ Per Article 8(A), absence from 3 consecutive meetings without a genuine reason attracts a fine of ₦500. For a burial or wake-keep, absence also attracts ₦500 per event. — Amòfin';
  }

  // Motto
  if (lower.includes('motto') || lower.includes('ajenjetan')) {
    return '🐯 Per Article 1, our motto is "Olaoluwa, Ajenjetan". The response to "Olaoluwa!" is "Ajenjetan!" — Amòfin';
  }

  // Amendment procedure
  if (lower.includes('amend') || lower.includes('amendment')) {
    return '📜 Per Article 15, the constitution may be amended by a simple majority of members present at a specially convened meeting. The process: written/oral petition → simple majority support → 5-man review committee constituted. — Amòfin';
  }

  return null; // Let AI handle it
}

// ── Utility: Typing indicator ─────────────────────────────────────────────────
// Shows the "typing..." bubble in WhatsApp while Amòfin is preparing a reply.
// Automatically clears after the response is sent (or after maxMs as safety net).

async function withTyping(sock, jid, asyncFn, maxMs = 20000) {
  try {
    await sock.sendPresenceUpdate('composing', jid);
  } catch (_) { /* non-critical — continue even if presence fails */ }

  // Safety-net timeout: always stop the typing indicator eventually
  const stopTyping = async () => {
    try { await sock.sendPresenceUpdate('paused', jid); } catch (_) {}
  };
  const safetyTimer = setTimeout(stopTyping, maxMs);

  try {
    return await asyncFn();
  } finally {
    clearTimeout(safetyTimer);
    await stopTyping();
  }
}

// ── GROUP MESSAGE HANDLER ─────────────────────────────────────────────────────

async function handleGroupMessage(sock, msg) {
  const groupJid   = msg.key.remoteJid;
  const senderJid  = msg.key.participant || msg.key.remoteJid;
  const senderName = getSenderName(msg);
  const botJid     = sock.user.id;
  const text       = getMessageText(msg);

  if (!text.trim()) return;

  setGroupJid(groupJid);
  addMessageToContext(senderName, text);

  const mentioned = isBotMentioned(msg, botJid);
  if (!mentioned) return;

  // Clean text — strip @mentions
  const cleanText = text
    .replace(/@\d+/g, '')
    .replace(/@amofin/gi, '')
    .replace(/@amòfin/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const lower = cleanText.toLowerCase();

  async function reply(message) {
    await sock.sendMessage(groupJid, { text: message }, { quoted: msg });
  }

  // ── Introduction ─────────────────────────────────────────────────────────────
  const isIntroQuery =
    lower.includes('introduce yourself') ||
    lower.includes('who are you') ||
    lower.includes('what are you') ||
    lower.includes('about you') ||
    lower.includes('introduce') ||
    lower.includes('ki ni oruko re') ||
    lower.includes('ta ni e') ||
    lower === '' || lower === 'hi' || lower === 'hello' || lower === 'hey';

  if (isIntroQuery) {
    await withTyping(sock, groupJid, () => reply(getIntroduction(senderName)));
    return;
  }

  // ── Welcome reply ─────────────────────────────────────────────────────────────
  if (isWelcomingBot(lower)) {
    await withTyping(sock, groupJid, async () => {
      const replyMsg = await getWelcomeReply(senderName);
      await reply(replyMsg);
    });
    return;
  }

  // ── Admin checks ──────────────────────────────────────────────────────────────
  const adminNumbers = (ADMIN_NUMBER || '').split(',').map(n => n.trim());
  const isAdmin = !ADMIN_NUMBER || adminNumbers.some(num => senderJid.includes(num));

  // ── Meeting Announcement (admin only) ─────────────────────────────────────────
  if (
    (lower.includes('announce') || lower.includes('post meeting') || lower.includes('meeting announcement')) &&
    isAdmin
  ) {
    const details = cleanText.replace(/announce|post meeting|meeting announcement/gi, '').trim();
    if (details.length > 5) {
      await withTyping(sock, groupJid, async () => {
        await sendMeetingAnnouncement(groupJid, details);
        await reply(`✅ Meeting announcement posted, ${senderName}!`);
      });
    } else {
      await withTyping(sock, groupJid, () =>
        reply(
          `Please include the meeting details, e.g:\n` +
          `_@Amòfin announce: Monthly meeting this Saturday at 4PM, Community Hall_`
        )
      );
    }
    return;
  }

  // ── Reminder ──────────────────────────────────────────────────────────────────
  const reminderText = parseReminderText(cleanText);
  if (reminderText) {
    const delay = parseDelay(reminderText);
    if (delay) {
      await withTyping(sock, groupJid, async () => {
        scheduleOneTimeReminder(sock, groupJid, reminderText, delay);
        await reply(`✅ Reminder set! I'll remind everyone: _"${reminderText}"_ 🔔 — Amòfin ⚖️`);
      });
    } else {
      await withTyping(sock, groupJid, () =>
        reply(
          `Noted the reminder: _"${reminderText}"_ 📝\n\n` +
          `For timed reminders, specify:\n` +
          `• _in 30 minutes_\n• _in 1 hour_\n• _in 2 hours_\n• _tomorrow_\n\n` +
          `— Amòfin ⚖️`
        )
      );
    }
    return;
  }

  // ── Test New Month (admin only) ───────────────────────────────────────────────
  if (lower.includes('test new month') && isAdmin) {
    await withTyping(sock, groupJid, async () => {
      await sendNewMonthMessage();
      await reply('✅ New month message sent!');
    });
    return;
  }

  // ── Quick constitutional facts (no AI needed) ────────────────────────────────
  const quickFact = getQuickConstitutionalFact(cleanText);
  if (quickFact) {
    await withTyping(sock, groupJid, () => reply(quickFact));
    return;
  }

  // ── AI constitutional response ────────────────────────────────────────────────
  await withTyping(sock, groupJid, async () => {
    const context  = getContext();
    const response = await getAmofinResponse(cleanText, senderName, context);
    await reply(response);
  });
}

// ── DM (Private Chat) HANDLER ─────────────────────────────────────────────────

async function handleDMMessage(sock, msg) {
  // All private DMs are handled by the airtime giveaway flow
  await handleAirtimeDM(sock, msg);
}

// ── NEW MEMBER HANDLER ────────────────────────────────────────────────────────

async function handleNewMember(sock, groupJid, participantJid, participantName) {
  if (hasBeenWelcomed(participantJid)) return;
  markAsWelcomed(participantJid);

  try {
    await withTyping(sock, groupJid, async () => {
      const welcomeMsg = await getWelcomeMessage(participantName || participantJid.split('@')[0]);
      await sock.sendMessage(groupJid, {
        text: welcomeMsg,
        mentions: [participantJid]
      });
    });
    console.log(`✅ Welcomed new member: ${participantName}`);
  } catch (err) {
    console.error('Failed to send welcome:', err.message);
  }
}

module.exports = {
  handleGroupMessage,
  handleDMMessage,
  handleNewMember
};
