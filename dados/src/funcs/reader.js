function unwrapMessage(message = {}) {
  let msg = message || {}

  const wrappers = [
    "ephemeralMessage",
    "viewOnceMessage",
    "viewOnceMessageV2",
    "viewOnceMessageV2Extension",
    "documentWithCaptionMessage",
    "futureProofMessage",
    "editedMessage"
  ]

  for (let i = 0; i < 12; i++) {
    let changed = false

    for (const key of wrappers) {
      if (msg?.[key]?.message) {
        msg = msg[key].message
        changed = true
        break
      }
    }

    if (msg?.deviceSentMessage?.message) {
      msg = msg.deviceSentMessage.message
      changed = true
    }

    if (!changed) break
  }

  return msg
}

function safeParseJSON(value) {
  try {
    if (!value || typeof value !== "string") return null
    return JSON.parse(value)
  } catch {
    return null
  }
}

function deepFind(obj, keys = [], depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 8) return ""

  for (const key of keys) {
    const value = obj[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }

  for (const value of Object.values(obj)) {
    if (typeof value === "string") {
      const parsed = safeParseJSON(value)
      if (parsed) {
        const found = deepFind(parsed, keys, depth + 1)
        if (found) return found
      }
    }

    if (value && typeof value === "object") {
      const found = deepFind(value, keys, depth + 1)
      if (found) return found
    }
  }

  return ""
}

function parseNativeFlowResponse(msg = {}) {
  const raw =
    msg?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
    msg?.nativeFlowResponseMessage?.paramsJson ||
    ""

  const parsed = safeParseJSON(raw)
  if (!parsed) return ""

  return deepFind(parsed, [
    "id",
    "selectedId",
    "selectedRowId",
    "rowId",
    "buttonId",
    "button_id",
    "responseId",
    "payload",
    "command",
    "value"
  ])
}

function getContextInfo(message = {}) {
  return (
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    message?.documentMessage?.contextInfo ||
    message?.audioMessage?.contextInfo ||
    message?.stickerMessage?.contextInfo ||
    message?.buttonsResponseMessage?.contextInfo ||
    message?.listResponseMessage?.contextInfo ||
    message?.templateButtonReplyMessage?.contextInfo ||
    message?.interactiveResponseMessage?.contextInfo ||
    {}
  )
}

function getBody(message = {}) {
  const nativeId = parseNativeFlowResponse(message)
  if (nativeId) return nativeId

  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    message?.documentMessage?.caption ||
    message?.audioMessage?.caption ||
    message?.buttonsResponseMessage?.selectedButtonId ||
    message?.buttonsResponseMessage?.selectedDisplayText ||
    message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    message?.listResponseMessage?.title ||
    message?.templateButtonReplyMessage?.selectedId ||
    message?.templateButtonReplyMessage?.selectedDisplayText ||
    ""
  )
}

function getMessageType(message = {}) {
  return Object.keys(message || {})[0] || "unknown"
}

function getSender(mek = {}, jid = "") {
  const isGroup = jid.endsWith("@g.us")

  if (isGroup) {
    return mek.key?.participant || mek.participant || mek.key?.participantAlt || ""
  }

  return mek.key?.remoteJid || mek.key?.remoteJidAlt || mek.key?.participant || ""
}

function detectButton(message = {}) {
  return Boolean(
    message?.buttonsResponseMessage ||
    message?.listResponseMessage ||
    message?.templateButtonReplyMessage ||
    message?.interactiveResponseMessage ||
    parseNativeFlowResponse(message)
  )
}

export function readMessage(mek = {}) {
  const msg = unwrapMessage(mek.message || {})
  const jid = mek.key?.remoteJid || mek.key?.remoteJidAlt || ""
  const sender = getSender(mek, jid)
  const isGroup = jid.endsWith("@g.us")
  const body = String(getBody(msg) || "").trim()
  const type = getMessageType(msg)
  const contextInfo = getContextInfo(msg)
  const quotedMessage = contextInfo?.quotedMessage ? unwrapMessage(contextInfo.quotedMessage) : null
  const isButton = detectButton(msg)

  return {
    jid,
    sender,
    isGroup,
    body,
    type,
    isButton,
    buttonId: isButton ? body : "",
    pushName: mek.pushName || mek.verifiedBizName || "Usuário",
    mentionedJid: contextInfo?.mentionedJid || [],
    quoted: quotedMessage,
    quotedParticipant: contextInfo?.participant || "",
    stanzaId: contextInfo?.stanzaId || "",
    contextInfo,
    message: msg,
    raw: mek
  }
}
