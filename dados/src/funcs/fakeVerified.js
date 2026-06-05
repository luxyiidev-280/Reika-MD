import fs from "fs"
import { readJSON } from "./functions.js"

let cachedQuote = null
let cachedAt = 0

function loadConfig() {
  return readJSON("./dono/config.json", {})
}

export function fakeVerifiedQuote(force = false) {
  const now = Date.now()

  if (!force && cachedQuote && now - cachedAt < 30_000) {
    return cachedQuote
  }

  const config = loadConfig()

  const botName = config.NomeDoBot || "Reika-MD"
  const owner = config.NickDono || "Luxyii"

  cachedQuote = {
    key: {
      fromMe: false,
      participant: "0@s.whatsapp.net",
      remoteJid: "status@broadcast",
      id: "REIKA_FAKE_VERIFIED"
    },
    message: {
      contactMessage: {
        displayName: `${botName} ✓`,
        vcard:
          "BEGIN:VCARD\n" +
          "VERSION:3.0\n" +
          `FN:${botName}\n` +
          `ORG:${botName} • ${owner};\n` +
          "TEL;type=CELL;type=VOICE;waid=0:0\n" +
          "END:VCARD"
      }
    }
  }

  cachedAt = now
  return cachedQuote
}

export function clearFakeVerifiedCache() {
  cachedQuote = null
  cachedAt = 0
}

export async function sendVerifiedText(sock, jid, text, options = {}) {
  const mentions = options.mentions || []

  return sock.sendMessage(
    jid,
    {
      text,
      mentions
    },
    {
      quoted: options.noQuote ? undefined : fakeVerifiedQuote()
    }
  )
}

export async function sendVerifiedImage(sock, jid, imagePath, caption, options = {}) {
  const mentions = options.mentions || []

  if (!imagePath || !fs.existsSync(imagePath)) {
    return sendVerifiedText(sock, jid, caption, { mentions })
  }

  return sock.sendMessage(
    jid,
    {
      image: fs.readFileSync(imagePath),
      caption,
      mentions
    },
    {
      quoted: options.noQuote ? undefined : fakeVerifiedQuote()
    }
  )
}
