/**
 * In-memory store for Ranti bot state
 * Tracks: group JID, recent messages (context), reminders
 */

// Stores the group JID once detected
let groupJid = process.env.GROUP_JID || null;

// Recent group messages for context (last 10)
const recentMessages = [];
const MAX_CONTEXT = 10;

// Reminders: { id, message, cronTime, groupJid, createdBy }
const reminders = new Map();
let reminderCounter = 0;

// Track members Ranti has already welcomed (avoid double-welcoming)
const welcomedMembers = new Set();

// ── Group JID ─────────────────────────────────────────────────────────────────

function setGroupJid(jid) {
  if (!groupJid) {
    groupJid = jid;
    console.log(`📌 Group JID saved: ${jid}`);
  }
}

function getGroupJid() {
  return groupJid;
}

// ── Message Context ───────────────────────────────────────────────────────────

function addMessageToContext(sender, text) {
  recentMessages.push({ sender, text, time: new Date().toISOString() });
  if (recentMessages.length > MAX_CONTEXT) recentMessages.shift();
}

function getContext() {
  return recentMessages
    .map(m => `${m.sender}: ${m.text}`)
    .join('\n');
}

// ── Reminders ─────────────────────────────────────────────────────────────────

function addReminder(reminder) {
  const id = ++reminderCounter;
  reminders.set(id, { id, ...reminder });
  return id;
}

function getReminders() {
  return Array.from(reminders.values());
}

function removeReminder(id) {
  return reminders.delete(id);
}

// ── Welcome Tracking ──────────────────────────────────────────────────────────

function hasBeenWelcomed(jid) {
  return welcomedMembers.has(jid);
}

function markAsWelcomed(jid) {
  welcomedMembers.add(jid);
}

module.exports = {
  setGroupJid,
  getGroupJid,
  addMessageToContext,
  getContext,
  addReminder,
  getReminders,
  removeReminder,
  hasBeenWelcomed,
  markAsWelcomed
};
