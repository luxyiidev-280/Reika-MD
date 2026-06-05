import fs from "fs"
import {
  getBotJid,
  isAdmin,
  isBotAdmin,
  isOwner,
  mentionText,
  sameUser
} from "../funcs/admin.js"
import { getJson, setJson } from "../funcs/storage.js"

const DB_GROUPS = "groups"

const INVISIBLES = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g

const PAYMENT_KEYS = new Set([
  "requestPaymentMessage",
  "sendPaymentMessage",
  "cancelPaymentRequestMessage",
  "declinePaymentRequestMessage",
  "paymentInviteMessage"
])

const STATUS_KEYS = new Set([
  "groupStatusMentionMessage",
  "statusMentionMessage",
  "statusNotificationMessage",
  "statusAddYours",
  "statusMention"
])

const TLD_LIST = [
  "com", "net", "org", "br", "gg", "io", "app", "store", "xyz", "club",
  "site", "online", "dev", "me", "link", "info", "biz", "top", "live",
  "vip", "cc", "tv", "to", "co", "shop", "cloud", "tech", "fun", "click"
]

const moderationCooldown = new Map()

function logModeration(text) {
  try {
    fs.mkdirSync("./dados/logs", { recursive: true })
    fs.appendFileSync(
      "./dados/logs/moderation.log",
      `[${new Date().toLocaleString("pt-BR")}] ${text}\n`,
      "utf8"
    )
  } catch {}
}

function cooldown(key, ms = 8000) {
  const now = Date.now()
  const last = moderationCooldown.get(key) || 0

  if (now - last < ms) return true

  moderationCooldown.set(key, now)

  setTimeout(() => {
    moderationCooldown.delete(key)
  }, ms + 1000).unref?.()

  return false
}

function defaultGroupConfig() {
  return {
    antilink: false,
    antilinkHard: false,
    antilinkgp: false,
    antipagamento: false,
    antistatus: false,
    antifake: false,
    bemvindo: false,
    bemvindo2: false,
    modobrincadeira: false,
    legendabv: "",
    welcomeCaption: ""
  }
}

function getGroups() {
  return getJson(DB_GROUPS, {})
}

function saveGroups(data) {
  setJson(DB_GROUPS, data)
}

export function getGroupConfig(jid) {
  const db = getGroups()

  if (!db[jid]) {
    db[jid] = defaultGroupConfig()
    saveGroups(db)
  }

  db[jid] = {
    ...defaultGroupConfig(),
    ...db[jid]
  }

  return db[jid]
}

export function setGroupFlag(jid, flag, value) {
  const db = getGroups()

  if (!db[jid]) db[jid] = defaultGroupConfig()

  db[jid][flag] = Boolean(value)
  saveGroups(db)

  return db[jid]
}

export function toggleGroupFlag(jid, flag, value) {
  if (typeof value === "boolean") return setGroupFlag(jid, flag, value)

  const current = getGroupConfig(jid)
  return setGroupFlag(jid, flag, !current[flag])
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
  if (!obj || depth > 9 || out.length > 80) return out

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
  if (!obj || typeof obj !== "object" || depth > 10) return false

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
  if (!obj || typeof obj !== "object" || depth > 10) return false

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

function hasNormalLink(text = "") {
  const clean = normalizeText(text)

  const protocol =
    /(https?:\/\/|ftp:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com\/|whatsapp\.com\/channel\/|t\.me\/|telegram\.me\/|discord\.gg\/|discord\.com\/invite\/)/i

  if (protocol.test(clean)) return true

  const tlds = TLD_LIST.join("|")

  const domainRegex = new RegExp(
    `(?:^|[^a-z0-9@])(?:[a-z0-9-]{2,}\\.)+(?:${tlds})(?:\\/[^\\s]*)?(?:$|[^a-z0-9])`,
    "i"
  )

  return domainRegex.test(clean)
}

function hasCompactLink(text = "") {
  const compact = compactText(text)

  if (!compact || compact.length < 8) return false

  const directBad = [
    "chatwhatsappcom",
    "whatsappcomchannel",
    "discordgg",
    "discordcominvite",
    "telegramme",
    "instagramcom",
    "facebookcom",
    "youtubecom",
    "tiktokcom",
    "twittercom"
  ]

  if (directBad.some(x => compact.includes(x))) return true

  // wa.me sem ponto vira wame, mas só pega se tiver número/código perto
  if (/wame[0-9]{5,}/i.test(compact)) return true

  const tlds = TLD_LIST.join("|")
  const compactDomain = new RegExp(`(?:[a-z0-9]{4,})(?:${tlds})(?:[a-z0-9]{2,})`, "i")

  return compactDomain.test(compact)
}

function hasSpacedDomain(text = "") {
  const clean = normalizeText(text)
    .replace(/([a-z0-9])\s+(?=[a-z0-9])/g, "$1")
    .replace(/\s*\.\s*/g, ".")

  return hasNormalLink(clean) || hasCompactLink(clean)
}

export function hasPaymentPayload(message = {}) {
  if (deepHasKey(message, PAYMENT_KEYS)) return true
  if (deepHasKeyIncludes(message, ["payment"])) return true

  const values = collectValues(message).join("\n")
  const clean = normalizeText(values)

  return (
    clean.includes("requestpaymentmessage") ||
    clean.includes("sendpaymentmessage") ||
    clean.includes("currencycodeiso4217") ||
    clean.includes("amount1000")
  )
}

export function hasStatusPayload(message = {}) {
  if (deepHasKey(message, STATUS_KEYS)) return true

  const suspiciousKey = deepHasKeyIncludes(message, [
    "groupstatus",
    "statusmention",
    "statusnotification"
  ])

  if (suspiciousKey) return true

  const values = collectValues(message).join("\n")
  const clean = normalizeText(values)

  return (
    clean.includes("groupstatusmentionmessage") ||
    clean.includes("statusmentionmessage")
  )
}

export function hasLinkPayload(message = {}) {
  const values = collectValues(message)
    .join("\n")
    .normalize("NFKC")
    .replace(INVISIBLES, "")
    .toLowerCase()

  if (!values.trim()) return false

  // AntiLink simples e seguro:
  // ignora qualquer coisa que não tenha ".com" ou convite oficial do WhatsApp.
  if (values.includes("chat.whatsapp.com")) return true
  if (values.includes("whatsapp.com/channel")) return true
  if (values.includes(".com")) return true

  // Detecta versão com espaços: chat . whatsapp . com / algo . com
  const compact = values
    .replace(/\s+/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")

  if (compact.includes("chat.whatsapp.com")) return true
  if (compact.includes("whatsapp.com/channel")) return true
  if (compact.includes(".com")) return true

  return false
}

function getDeleteKey(ctx = {}) {
  const key = ctx.raw?.key || {}

  return {
    remoteJid: key.remoteJid || ctx.jid,
    fromMe: false,
    id: key.id,
    participant: key.participant || ctx.sender
  }
}

async function safeDelete(sock, ctx) {
  try {
    const key = getDeleteKey(ctx)

    if (!key.remoteJid || !key.id) return false

    await sock.sendMessage(ctx.jid, { delete: key })
    return true
  } catch (err) {
    logModeration(`DELETE_FAIL ${ctx.jid} | ${ctx.sender} | ${err?.message || err}`)
    return false
  }
}

async function safeBan(sock, ctx, target) {
  try {
    await sock.groupParticipantsUpdate(ctx.jid, [target], "remove")
    return true
  } catch (err) {
    logModeration(`BAN_FAIL ${ctx.jid} | ${target} | ${err?.message || err}`)
    return false
  }
}

async function closeGroup(sock, jid) {
  try {
    await sock.groupSettingUpdate(jid, "announcement")
    return true
  } catch (err) {
    logModeration(`CLOSE_FAIL ${jid} | ${err?.message || err}`)
    return false
  }
}

async function openGroup(sock, jid) {
  try {
    await sock.groupSettingUpdate(jid, "not_announce")
    return true
  } catch (err) {
    logModeration(`OPEN_FAIL ${jid} | ${err?.message || err}`)
    return false
  }
}

async function shouldIgnoreUser(sock, ctx, config) {
  const botJid = getBotJid(sock)

  if (sameUser(ctx.sender, botJid)) return true
  if (isOwner(ctx.sender, config)) return true

  const admin = await isAdmin(sock, ctx.jid, ctx.sender)
  if (admin) return true

  return false
}

async function warnNoBotAdmin(sock, ctx, reason) {
  const key = `noadmin:${ctx.jid}:${reason}`

  if (cooldown(key, 60_000)) return

  try {
    await sock.sendMessage(ctx.jid, {
      text:
        `⚠️ *_${reason} detectado._*\n\n` +
        `_Eu preciso ser administrador para apagar/remover._`
    })
  } catch {}
}

async function punishNormal(sock, ctx, config, reason) {
  if (await shouldIgnoreUser(sock, ctx, config)) return false

  const botAdmin = await isBotAdmin(sock, ctx.jid)

  if (!botAdmin) {
    await warnNoBotAdmin(sock, ctx, reason)
    return true
  }

  await safeDelete(sock, ctx)
  await safeBan(sock, ctx, ctx.sender)

  try {
    await sock.sendMessage(ctx.jid, {
      text:
        `🧊 *_${reason} executado._*\n\n` +
        `👤 Usuário: ${mentionText(ctx.sender, ctx.pushName)}\n` +
        `_Mensagem apagada e usuário removido._`,
      mentions: [ctx.sender]
    })
  } catch {}

  logModeration(`PUNISH_NORMAL ${reason} | ${ctx.jid} | ${ctx.sender}`)

  return true
}

async function punishHard(sock, ctx, config, reason) {
  if (await shouldIgnoreUser(sock, ctx, config)) return false

  const botAdmin = await isBotAdmin(sock, ctx.jid)

  if (!botAdmin) {
    await warnNoBotAdmin(sock, ctx, `${reason} Hard`)
    return true
  }

  let closed = false

  try {
    closed = await closeGroup(sock, ctx.jid)

    await safeDelete(sock, ctx)
    await new Promise(resolve => setTimeout(resolve, 350))

    await safeBan(sock, ctx, ctx.sender)
    await new Promise(resolve => setTimeout(resolve, 350))

    await safeDelete(sock, ctx)

    try {
      await sock.sendMessage(ctx.jid, {
        text:
          `🧊 *_${reason} Hard executado._*\n\n` +
          `👤 Usuário: ${mentionText(ctx.sender, ctx.pushName)}\n` +
          `_Grupo protegido, mensagem apagada e invasor removido._`,
        mentions: [ctx.sender]
      })
    } catch {}

    logModeration(`PUNISH_HARD ${reason} | ${ctx.jid} | ${ctx.sender}`)

    return true
  } finally {
    if (closed) {
      await new Promise(resolve => setTimeout(resolve, 650))
      await openGroup(sock, ctx.jid)
    }
  }
}

export async function handleModeration(sock, ctx, config, sendText) {
  if (!ctx?.isGroup) return false

  const flags = getGroupConfig(ctx.jid)
  const message = ctx.raw?.message || ctx.message || {}

  if ((flags.antipagamento || flags.antilinkHard) && hasPaymentPayload(message)) {
    return punishHard(sock, ctx, config, "AntiPagamento")
  }

  if (flags.antistatus && hasStatusPayload(message)) {
    return punishHard(sock, ctx, config, "AntiStatus")
  }

  if ((flags.antilink || flags.antilinkHard) && hasLinkPayload(message)) {
    if (flags.antilinkHard) {
      return punishHard(sock, ctx, config, "AntiLink")
    }

    return punishNormal(sock, ctx, config, "AntiLink")
  }

  return false
}

export function formatFlags(jid) {
  const f = getGroupConfig(jid)

  return `🛡️ 𝐌𝐎𝐃𝐎𝐒 𝐃𝐎 𝐆𝐑𝐔𝐏𝐎

• AntiLink: ${f.antilink ? "ON ✅" : "OFF ❌"}
• AntiLink Hard: ${f.antilinkHard ? "ON ✅" : "OFF ❌"}
• AntiLinkGP: ${f.antilinkgp ? "ON ✅" : "OFF ❌"}
• AntiPagamento: ${f.antipagamento ? "ON ✅" : "OFF ❌"}
• AntiStatus: ${f.antistatus ? "ON ✅" : "OFF ❌"}
• AntiFake: ${f.antifake ? "ON ✅" : "OFF ❌"}
• Bem-vindo: ${f.bemvindo ? "ON ✅" : "OFF ❌"}
• Bem-vindo2: ${f.bemvindo2 ? "ON ✅" : "OFF ❌"}
• Modo Brincadeira: ${f.modobrincadeira ? "ON ✅" : "OFF ❌"}`
}
