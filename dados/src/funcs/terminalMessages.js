import { jidNumber } from "./functions.js"

function color(code, text) {
  return `\x1b[${code}m${text}\x1b[0m`
}

function now() {
  return new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
}

function unwrap(message = {}) {
  let msg = message || {}

  const wrappers = [
    "ephemeralMessage",
    "viewOnceMessage",
    "viewOnceMessageV2",
    "viewOnceMessageV2Extension",
    "documentWithCaptionMessage"
  ]

  let changed = true

  while (changed) {
    changed = false

    for (const key of wrappers) {
      if (msg?.[key]?.message) {
        msg = msg[key].message
        changed = true
      }
    }
  }

  return msg
}

function getType(msg = {}) {
  const keys = Object.keys(msg || {})
  return keys[0] || "unknown"
}

function nativeButton(msg = {}) {
  try {
    const raw = msg?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
    if (!raw) return ""

    const json = JSON.parse(raw)
    return json?.id || json?.selectedId || json?.selectedRowId || json?.buttonId || ""
  } catch {
    return ""
  }
}

function getPreview(msg = {}) {
  const native = nativeButton(msg)
  if (native) return native

  const text =
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    msg?.videoMessage?.caption ||
    msg?.documentMessage?.caption ||
    msg?.buttonsResponseMessage?.selectedButtonId ||
    msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg?.templateButtonReplyMessage?.selectedId ||
    msg?.stickerMessage ? "[sticker]" :
    msg?.audioMessage ? "[audio]" :
    msg?.imageMessage ? "[imagem]" :
    msg?.videoMessage ? "[vídeo]" :
    msg?.documentMessage ? "[documento]" :
    ""

  return String(text || "")
    .replace(/\s+/g, " ")
    .slice(0, 160)
}

function senderTag(jid = "") {
  const n = jidNumber(jid)
  return n ? `@${n}` : String(jid || "desconhecido")
}

export function logReceivedMessage(mek = {}, eventType = "notify") {
  try {
    if (!mek?.message) return

    const jid = mek.key?.remoteJid || ""
    const isGroup = jid.endsWith("@g.us")
    const sender = isGroup ? mek.key?.participant || "" : jid
    const name = mek.pushName || "Sem nome"
    const msg = unwrap(mek.message)
    const type = getType(msg)
    const preview = getPreview(msg)

    const label = color("36", "RECEBIDA")
    const where = isGroup ? color("35", "GRUPO") : color("34", "PV")

    console.log(
      `${color("2", `[${now()}]`)} [${label}] [${where}] ` +
      `${color("37", name)} ${color("33", senderTag(sender))} ` +
      `${color("90", type)} ${color("32", eventType)} ` +
      `${color("0", preview)}`
    )
  } catch (err) {
    console.log(color("31", `[TERMINAL-LOG-ERROR] ${err?.message || err}`))
  }
}

export function logReadMessage(ctx = {}) {
  try {
    const where = ctx.isGroup ? color("35", "GRUPO") : color("34", "PV")
    const label = color("32", "LIDA")
    const preview = String(ctx.body || "").replace(/\s+/g, " ").slice(0, 160)

    console.log(
      `${color("2", `[${now()}]`)} [${label}] [${where}] ` +
      `${color("37", ctx.pushName || "Sem nome")} ` +
      `${color("33", senderTag(ctx.sender))} ` +
      `${color("0", preview)}`
    )
  } catch {}
}
