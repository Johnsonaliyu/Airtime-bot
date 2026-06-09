/**
 * Airtime Giveaway — Conversation Flow Handler (DM)
 *
 * Flow:
 *  1. User starts DM → greeted by name, asked for compelling reason
 *  2. User sends reason → AI scores 0–10 (pass mark: 5)
 *  3. If pass → ask for phone number
 *  4. User sends number → detect network → ask to confirm
 *  5. User confirms → send airtime via Peyflex → done
 *  6. Each user can only win ONCE (tracked by JID + name)
 */

const { scoreAirtimeReason } = require('./ai');
const { detectNetwork, sendAirtime, AIRTIME_AMOUNT } = require('./airtime');
const {
  hasWon, markWinner,
  getSession, setSession, clearSession
} = require('./airtimeStore');

// ── Typing indicator helper ───────────────────────────────────────────────────

async function withTyping(sock, jid, fn, maxMs = 20000) {
  try { await sock.sendPresenceUpdate('composing', jid); } catch (_) {}
  const stopTyping = async () => {
    try { await sock.sendPresenceUpdate('paused', jid); } catch (_) {}
  };
  const timer = setTimeout(stopTyping, maxMs);
  try { return await fn(); }
  finally { clearTimeout(timer); await stopTyping(); }
}

// ── Send a plain text reply ───────────────────────────────────────────────────

async function send(sock, jid, text) {
  await sock.sendMessage(jid, { text });
}

// ── Main entry — called for every DM ─────────────────────────────────────────

async function handleAirtimeDM(sock, msg) {
  const jid  = msg.key.remoteJid;
  const name = (
    msg.pushName ||
    msg.key.participant?.split('@')[0] ||
    jid.split('@')[0] ||
    'Friend'
  ).trim();

  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).trim();

  if (!text) return;

  const lower   = text.toLowerCase();
  const session = getSession(jid);

  await withTyping(sock, jid, async () => {

    // ── ALREADY WON ─────────────────────────────────────────────────────────
    if (hasWon(jid, name)) {
      await send(sock, jid,
        `Hi ${name}! 😊\n\n` +
        `Our records show you have already received airtime from this giveaway. ` +
        `Each person can only win once — this keeps it fair for everyone.\n\n` +
        `Thank you for participating! 🙏`
      );
      return;
    }

    // ── STATE: start / restart ────────────────────────────────────────────────
    if (session.state === 'start' || lower === 'hi' || lower === 'hello' || lower === 'start') {
      setSession(jid, { state: 'awaiting_reason', name });
      await send(sock, jid,
        `Hello ${name}! 👋\n\n` +
        `Welcome to the Airtime Giveaway! 🎁\n\n` +
        `We are giving away ₦${AIRTIME_AMOUNT} airtime to deserving people, ` +
        `but first you have to *earn* it.\n\n` +
        `✍️ Please write a short, compelling reason why YOU need this airtime. ` +
        `Be honest and genuine — our AI will score your reason out of 10, ` +
        `and you need at least 5 to qualify.\n\n` +
        `Go ahead, make your case! 📝`
      );
      return;
    }

    // ── STATE: awaiting_reason ────────────────────────────────────────────────
    if (session.state === 'awaiting_reason') {
      if (text.length < 15) {
        await send(sock, jid,
          `That's a bit short, ${name}. 😅 Please write a proper reason — ` +
          `at least a sentence or two. Tell us your real situation!`
        );
        return;
      }

      await send(sock, jid, `Hmm, let me evaluate your reason, ${name}... ⏳`);

      let result;
      try {
        result = await scoreAirtimeReason(text, name);
      } catch (err) {
        console.error('Scoring error:', err.message);
        await send(sock, jid,
          `Sorry ${name}, our AI scorer is temporarily unavailable. ` +
          `Please try again in a moment. 🙏`
        );
        return;
      }

      const { score, feedback } = result;

      if (score >= 5) {
        setSession(jid, { state: 'awaiting_number', name, score });
        await send(sock, jid,
          `✅ Great news, ${name}!\n\n` +
          `Your reason scored *${score}/10*. ${feedback}\n\n` +
          `You qualify for ₦${AIRTIME_AMOUNT} airtime! 🎉\n\n` +
          `📱 Please send the phone number you want the airtime sent to:`
        );
      } else {
        clearSession(jid);
        await send(sock, jid,
          `Sorry, ${name}. 😔\n\n` +
          `Your reason scored *${score}/10* — you needed at least 5 to qualify.\n\n` +
          `${feedback}\n\n` +
          `Better luck next time! You can try again by sending "hi".`
        );
      }
      return;
    }

    // ── STATE: awaiting_number ────────────────────────────────────────────────
    if (session.state === 'awaiting_number') {
      const detected = detectNetwork(text);

      if (!detected) {
        await send(sock, jid,
          `Hmm, that doesn't look like a valid Nigerian phone number. 🤔\n\n` +
          `Please send your number in this format: 08XXXXXXXXX or 234XXXXXXXXXX`
        );
        return;
      }

      const { phone, networkName, network } = detected;
      setSession(jid, { ...session, state: 'awaiting_confirmation', phone, network, networkName });

      await send(sock, jid,
        `📱 Number detected: *${phone}*\n` +
        `📶 Network: *${networkName}*\n\n` +
        `Is this correct? Reply *YES* to confirm and receive your airtime, ` +
        `or *NO* to enter a different number.`
      );
      return;
    }

    // ── STATE: awaiting_confirmation ─────────────────────────────────────────
    if (session.state === 'awaiting_confirmation') {
      if (lower === 'yes' || lower === 'y' || lower === 'correct' || lower === 'ok' || lower === 'yeah') {
        const { phone, network, networkName, name: sessionName } = session;
        const displayName = sessionName || name;

        await send(sock, jid, `Processing your airtime... ⏳ Please wait a moment.`);

        try {
          const result = await sendAirtime(phone, network, AIRTIME_AMOUNT);
          markWinner(jid, displayName, phone, networkName);
          clearSession(jid);

          await send(sock, jid,
            `🎉 Congratulations, ${displayName}!\n\n` +
            `₦${AIRTIME_AMOUNT} airtime has been sent to *${phone}* (${networkName})!\n\n` +
            `Reference: ${result.reference}\n\n` +
            `Thank you for participating. Enjoy! 📶🙏`
          );
        } catch (err) {
          console.error('Airtime send error:', err.message);
          await send(sock, jid,
            `Sorry ${displayName}, there was an issue processing your airtime. 😔\n\n` +
            `Please try again in a moment or contact support.\n\n` +
            `Error: ${err.message}`
          );
        }
        return;
      }

      if (lower === 'no' || lower === 'n' || lower === 'wrong' || lower === 'incorrect') {
        setSession(jid, { ...session, state: 'awaiting_number', phone: null, network: null, networkName: null });
        await send(sock, jid,
          `No problem! Please send the correct phone number: 📱`
        );
        return;
      }

      await send(sock, jid,
        `Please reply *YES* to confirm or *NO* to enter a different number.`
      );
      return;
    }

    // ── FALLBACK: unknown state ───────────────────────────────────────────────
    clearSession(jid);
    setSession(jid, { state: 'awaiting_reason', name });
    await send(sock, jid,
      `Hi ${name}! 👋 Let's start fresh.\n\n` +
      `Please write a compelling reason why you need ₦${AIRTIME_AMOUNT} airtime to qualify for our giveaway. ✍️`
    );
  });
}

module.exports = { handleAirtimeDM };
