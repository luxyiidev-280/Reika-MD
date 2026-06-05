import { fakeVerifiedQuote } from "./fakeVerified.js"
import { mergeMentionsFromText } from "./global.js"

export async function sendText(sock, jid, text, quoted, options = {}) {
  const mentions = mergeMentionsFromText(text, options.mentions || [])

  const quotedMessage = options.noQuote
    ? undefined
    : options.realQuote
      ? quoted
      : fakeVerifiedQuote()

  return sock.sendMessage(
    jid,
    {
      text,
      mentions
    },
    {
      quoted: quotedMessage
    }
  )
}

export async function sendRawText(sock, jid, text, quoted, options = {}) {
  const mentions = mergeMentionsFromText(text, options.mentions || [])

  return sock.sendMessage(
    jid,
    {
      text,
      mentions
    },
    {
      quoted
    }
  )
}

export async function sendCleanText(sock, jid, text, options = {}) {
  const mentions = mergeMentionsFromText(text, options.mentions || [])

  return sock.sendMessage(
    jid,
    {
      text,
      mentions
    }
  )
}

export async function react(sock, jid, key, emoji) {
  try {
    await sock.sendMessage(jid, {
      react: {
        text: emoji,
        key
      }
    })
  } catch {}
}
