# Amòfin ⚖️
### Olaoluwa Age Group — Constitutional Advisor WhatsApp Bot
*Created by the IT Unit of Olaoluwa Age Group*

---

**Amòfin** (Yoruba: *"Someone who is versed in law"*) is the official WhatsApp constitutional advisor for the Olaoluwa Age Group, Owalusin, Iwaro-Oka Akoko, Ondo State. Tag it in your group and ask any question about the group's constitution — it answers intelligently, cites the relevant Article, and greets you in Yoruba based on the time of day in Nigeria.

---

## Features

- **Constitutional Q&A** — Deep knowledge of all 16 Articles; cites exact provisions
- **Time-based Yoruba greetings** — E káàárọ̀ / E káàsán / E káàlé / O daro based on Nigerian time (WAT)
- **Triple AI fallback** — Gemini → Groq → Nvidia; never goes offline
- **Quick facts engine** — Common constitutional questions answered instantly without burning AI tokens
- **Meeting announcements** — Admins can post formatted announcements via a command
- **Reminders** — Set timed reminders for the group
- **New member welcome** — Auto-welcomes new group members with personality
- **Happy New Month** — Automatic message on the 1st of every month at 7 AM WAT
- **DM support** — Members can chat with Amòfin privately too

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure secrets
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Required:
- `WHATSAPP_NUMBER` — Your number in international format (no `+`): e.g. `2348012345678`
- At least ONE of: `GEMINI_API_KEY`, `GROQ_API_KEY`, `NVIDIA_API_KEY`

### 3. Run
```bash
npm start
```

On first run, a **pairing code** will appear in the console:
```
==============================
  AMÒFIN PAIRING CODE: XXXX-XXXX
==============================
```
Go to WhatsApp → Linked Devices → Link a Device → Link with phone number → Enter the code.

---

## How to Use in the Group

| Action | Command |
|--------|---------|
| Constitutional question | `@Amòfin what is the fine for fighting?` |
| Introduction | `@Amòfin introduce yourself` |
| Set reminder (admin) | `@Amòfin remind everyone about meeting in 1 hour` |
| Post announcement (admin) | `@Amòfin announce: Meeting on Saturday 4PM, Upare` |
| Test new month message (admin) | `@Amòfin test new month` |

---

## AI Provider Keys

| Provider | Model Used | Get Key |
|----------|-----------|---------|
| Google Gemini (Primary) | `gemini-2.0-flash` | https://aistudio.google.com/app/apikey |
| Groq (Fallback 1) | `llama-3.3-70b-versatile` | https://console.groq.com/keys |
| Nvidia NIM (Fallback 2) | `meta/llama-3.3-70b-instruct` | https://build.nvidia.com/ |

---

## Yoruba Greetings Schedule (WAT = UTC+1)

| Time | Greeting | Meaning |
|------|---------|---------|
| 5:00 AM – 11:59 AM | E káàárọ̀ | Good morning |
| 12:00 PM – 3:59 PM | E káàsán | Good afternoon |
| 4:00 PM – 7:59 PM | E káàlé | Good evening |
| 8:00 PM – 4:59 AM | O daro | Good night |

---

*"The law is always on your side when you know it." — Amòfin ⚖️*
