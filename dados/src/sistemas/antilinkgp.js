import fs from "fs"
import {
  getBotJid,
  isAdmin,
  isBotAdmin,
  isOwner,
  mentionText,
  normalizeJid,
  sameUser
} from "../funcs/admin.js"
import { getGroupConfig } from "./moderation.js"

const INVISIBLES = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g

const PAYMENT_KEYS = new Set([
  "requestPaymentMessage",
  "sendPaymentMessage",
  "cancelPaymentRequestMessage",
  "declinePaymentRequestMessage",
  "paymentInviteMessage"
])

const cd = new Map()

function log(text) {
  try {
    fs.mkdirSync("./dados/logs", { recursive: true })
    fs.appendFileSync(
      "./dados/logs/antilinkgp.log",
      `[${new Date().toLocaleString("pt-BR")}] ${text}\n`,
      "utf8"
    )
  } catch {}
}

function cooldown(key, ms = 8000) {
  const now = Date.now()
  const last = cd.get(key) || 0

  if (now - last < ms) return true

  cd.set(key, now)
  setTimeout(() => cd.delete(key), ms + 1000).unref?.()

  return false
}

function normalizeText(text = "") {
  return String(text || "")
    .normalize("NFKC")
    .replace(INVISIBLES, "")
    .toLowerCase()
}

function compactText(text = "") {
  return normalizeText(text)
    .replace(/[\s\n\r\t|\\/_\-–—~`´'"*()[\]{}<>:;,+]+/g, "")
}

function collectValues(obj, depth = 0, out = []) {
  if (!obj || depth > 12 || out.length > 180) return out

  if (typeof obj === "string") {
    if (obj.trim()) out.push(obj)
    return out
  }

  if (Array.isArray(obj)) {
    for (const item of obj) collectValues(item, depth + 1, out)
    return out
  }

  if (typeof obj === "object") {
    for (const value of Object.values(obj)) {
      collectValues(value, depth + 1, out)
    }
  }

  return out
}

function deepHasKey(obj, keySet, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 12) return false

  if (Array.isArray(obj)) {
    return obj.some(item => deepHasKey(item, keySet, depth + 1))
  }

  for (const [key, value] of Object.entries(obj)) {
    if (keySet.has(key)) return true
    if (deepHasKey(value, keySet, depth + 1)) return true
  }

  return false
}

function deepHasKeyIncludes(obj, words = [], depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 12) return false

  if (Array.isArray(obj)) {
    return obj.some(item => deepHasKeyIncludes(item, words, depth + 1))
  }

  for (const [key, value] of Object.entries(obj)) {
    const k = String(key || "").toLowerCase()

    if (words.some(w => k.includes(w))) return true
    if (deepHasKeyIncludes(value, words, depth + 1)) return true
  }

  return false
}

function collectContextInfos(obj, depth = 0, out = []) {
  if (!obj || typeof obj !== "object" || depth > 12) return out

  if (obj.contextInfo && typeof obj.contextInfo === "object") {
    out.push(obj.contextInfo)
  }

  if (Array.isArray(obj)) {
    for (const item of obj) collectContextInfos(item, depth + 1, out)
    return out
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      collectContextInfos(value, depth + 1, out)
    }
  }

  return out
}

export function hasGroupLinkPayload(message = {}) {
  const joined = collectValues(message).join("\n")
  const clean = normalizeText(joined)
  const compact = compactText(joined)

  if (!clean.trim()) return false

  return (
    clean.includes("chat.whatsapp.com") ||
    clean.includes("whatsapp.com/channel") ||
    compact.includes("chatwhatsappcom") ||
    compact.includes("whatsappcomchannel")
  )
}

export function hasPaymentTrapPayload(message = {}) {
  if (deepHasKey(message, PAYMENT_KEYS)) return true
  if (deepHasKeyIncludes(message, ["requestpayment", "paymentinvite"])) return true

  const joined = collectValues(message).join("\n")
  const clean = normalizeText(joined)
  const compact = compactText(joined)

  return (
    clean.includes("requestpaymentmessage") ||
    clean.includes("currencycodeiso4217") ||
    clean.includes("amount1000") ||
    compact.includes("requestpaymentmessage") ||
    compact.includes("currencycodeiso4217") ||
    compact.includes("amount1000")
  )
}

function uniqueDeleteKeys(keys = []) {
  const seen = new Set()
  const out = []

  for (const key of keys) {
    if (!key?.remoteJid || !key?.id) continue

    const id = `${key.remoteJid}:${key.id}:${key.participant || ""}`

    if (seen.has(id)) continue

    seen.add(id)
    out.push(key)
  }

  return out
}

function getDeleteKeys(ctx = {}) {
  const rawKey = ctx.raw?.key || {}
  const message = ctx.raw?.message || ctx.message || {}
  const keys = []

  if (rawKey.id) {
    keys.push({
      remoteJid: rawKey.remoteJid || ctx.jid,
      fromMe: false,
      id: rawKey.id,
      participant: rawKey.participant || ctx.sender
    })
  }

  const infos = collectContextInfos(message)

  if (ctx.contextInfo) infos.push(ctx.contextInfo)

  for (const info of infos) {
    if (!info?.stanzaId) continue

    keys.push({
      remoteJid: ctx.jid,
      fromMe: false,
      id: info.stanzaId,
      participant: info.participant || ctx.quotedParticipant || ctx.sender
    })
  }

  if (ctx.stanzaId) {
    keys.push({
      remoteJid: ctx.jid,
      fromMe: false,
      id: ctx.stanzaId,
      participant: ctx.quotedParticipant || ctx.sender
    })
  }

  return uniqueDeleteKeys(keys)
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function deleteAll(sock, ctx, label = "") {
  const keys = getDeleteKeys(ctx)
  let ok = 0

  for (const key of keys) {
    try {
      await sock.sendMessage(ctx.jid, { delete: key })
      ok++
      await delay(250)
    } catch (err) {
      log(`DELETE_FAIL ${label} | ${JSON.stringify(key)} | ${err?.message || err}`)
    }
  }

  return ok
}

async function closeGroup(sock, jid) {
  try {
    await sock.groupSettingUpdate(jid, "announcement")
    return true
  } catch (err) {
    log(`CLOSE_FAIL ${jid} | ${err?.message || err}`)
    return false
  }
}

async function openGroup(sock, jid) {
  try {
    await sock.groupSettingUpdate(jid, "not_announce")
    return true
  } catch (err) {
    log(`OPEN_FAIL ${jid} | ${err?.message || err}`)
    return false
  }
}

async function shouldIgnore(sock, ctx, config) {
  const bot = getBotJid(sock)

  if (sameUser(ctx.sender, bot)) return true
  if (isOwner(ctx.sender, config)) return true
  if (await isAdmin(sock, ctx.jid, ctx.sender)) return true

  return false
}

async function warnNoAdmin(sock, ctx) {
  const key = `noadmin:${ctx.jid}`

  if (cooldown(key, 60_000)) return

  try {
    await sock.sendMessage(ctx.jid, {
      text:
        `⚠️ *_AntiLinkGP detectou ameaça._*\n\n` +
        `_Eu preciso ser administrador para apagar e remover._`
    })
  } catch {}
}

export async function handleAntiLinkGp(sock, ctx, config = {}) {
  if (!ctx?.isGroup) return false

  const flags = getGroupConfig(ctx.jid)

  if (!flags.antilinkgp) return false

  const message = ctx.raw?.message || ctx.message || {}
  const groupLink = hasGroupLinkPayload(message)
  const paymentTrap = hasPaymentTrapPayload(message)

  if (!groupLink && !paymentTrap) return false

  if (await shouldIgnore(sock, ctx, config)) {
    return false
  }

  const botAdmin = await isBotAdmin(sock, ctx.jid)

  if (!botAdmin) {
    await warnNoAdmin(sock, ctx)
    return true
  }

  const target = normalizeJid(ctx.sender)
  const reason = paymentTrap ? "Pagamento inválido com divulgação" : "Link de grupo/canal"

  let closed = false

  try {
    closed = await closeGroup(sock, ctx.jid)

    await deleteAll(sock, ctx, "first")

    await delay(500)

    try {
      await sock.groupParticipantsUpdate(ctx.jid, [target], "remove")
      log(`BAN_OK ${ctx.jid} | ${target} | ${reason}`)
    } catch (err) {
      log(`BAN_FAIL ${ctx.jid} | ${target} | ${err?.message || err}`)
    }

    await delay(500)

    await deleteAll(sock, ctx, "second")

    try {
      await sock.sendMessage(ctx.jid, {
        text:
          `🧊 *_AntiLinkGP executado._*\n\n` +
          `👤 Usuário: ${mentionText(target)}\n` +
          `📌 Motivo: _${reason}_\n\n` +
          `_Mensagem removida e usuário banido._`,
        mentions: [target]
      })
    } catch {}

    return true
  } finally {
    if (closed) {
      await delay(700)
      await openGroup(sock, ctx.jid)
    }
  }
}
