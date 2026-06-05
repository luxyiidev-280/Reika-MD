import { jidNumber, onlyNumber } from "./functions.js"
import { forceMention, normalizeMentions } from "./global.js"
import { updateJson, updateGroupRecord } from "./storage.js"

const metaCache = new Map()
const META_TTL = 25_000

export function rawUser(jid = "") {
  return String(jid || "").split("@")[0].split(":")[0]
}

export function isLid(jid = "") {
  return String(jid || "").endsWith("@lid")
}

export function isPn(jid = "") {
  return String(jid || "").endsWith("@s.whatsapp.net")
}

export function normalizeJid(jid = "") {
  jid = String(jid || "").trim()

  if (!jid) return ""

  if (jid.includes("@g.us")) return jid.split(":")[0]
  if (jid.includes("@lid")) return `${rawUser(jid)}@lid`
  if (jid.includes("@s.whatsapp.net")) return `${onlyNumber(rawUser(jid))}@s.whatsapp.net`

  const n = onlyNumber(jid)
  if (n) return `${n}@s.whatsapp.net`

  return jid
}

export function sameUser(a = "", b = "") {
  const A = normalizeJid(a)
  const B = normalizeJid(b)

  if (!A || !B) return false
  if (A === B) return true

  const na = jidNumber(A)
  const nb = jidNumber(B)

  return Boolean(na && nb && na === nb)
}

export function getOwnerList(config = {}) {
  const nums = Array.isArray(config.NumeroDoDono)
    ? config.NumeroDoDono
    : [config.NumeroDoDono]

  const lids = Array.isArray(config.ownerLids)
    ? config.ownerLids
    : []

  return [
    ...nums.filter(Boolean).map(x => `${onlyNumber(x)}@s.whatsapp.net`),
    ...lids.filter(Boolean).map(normalizeJid)
  ]
}

export function isOwner(jid = "", config = {}) {
  const owners = getOwnerList(config)
  return owners.some(owner => sameUser(owner, jid))
}

export function getBotJid(sock) {
  const id = sock?.user?.id || sock?.user?.jid || ""
  return normalizeJid(id)
}

function extractNumber(value = "") {
  return String(value || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "")
}

function possibleParticipantIds(p = {}) {
  return [
    p.id,
    p.jid,
    p.lid,
    p.phoneNumber,
    p.phone,
    p.pn,
    p.participant
  ].filter(Boolean)
}

function saveContactsFromMetadata(groupJid, metadata) {
  const participants = Array.isArray(metadata?.participants)
    ? metadata.participants
    : []

  updateJson("contacts", {}, db => {
    for (const p of participants) {
      const ids = possibleParticipantIds(p)
      const jid = normalizeJid(p.id || p.jid || "")
      const lid = ids.find(x => String(x).endsWith("@lid")) || ""
      const phoneRaw = ids.find(x => {
        const n = extractNumber(x)
        return n && n.length >= 10 && !String(x).endsWith("@lid")
      }) || ""

      const phone = extractNumber(phoneRaw)
      const pn = phone ? `${phone}@s.whatsapp.net` : ""

      for (const id of ids) {
        const key = normalizeJid(id)
        if (!key) continue

        db[key] = {
          jid: key,
          id: jid || key,
          lid: normalizeJid(lid),
          pn,
          number: phone,
          admin: p.admin || null,
          groupJid,
          updatedAt: Date.now()
        }
      }
    }

    return db
  })

  updateGroupRecord(groupJid, group => {
    group.meta = {
      subject: metadata.subject || group.meta?.subject || "",
      size: participants.length,
      owner: metadata.owner || "",
      updatedAt: Date.now()
    }

    group.members = {}
    group.admins = []

    for (const p of participants) {
      const ids = possibleParticipantIds(p)
      const main = normalizeJid(p.id || p.jid || p.lid || ids[0] || "")
      if (!main) continue

      const lid = ids.find(x => String(x).endsWith("@lid")) || ""
      const phoneRaw = ids.find(x => {
        const n = extractNumber(x)
        return n && n.length >= 10 && !String(x).endsWith("@lid")
      }) || ""

      const phone = extractNumber(phoneRaw)
      const pn = phone ? `${phone}@s.whatsapp.net` : ""

      group.members[main] = {
        jid: main,
        lid: normalizeJid(lid),
        pn,
        number: phone,
        admin: p.admin || null
      }

      if (p.admin === "admin" || p.admin === "superadmin") {
        group.admins.push(main)
        if (pn) group.admins.push(pn)
        if (lid) group.admins.push(normalizeJid(lid))
      }
    }

    group.admins = [...new Set(group.admins.filter(Boolean))]
    group.updatedAt = Date.now()
  })
}

export async function getGroupMetadata(sock, jid) {
  const now = Date.now()
  const cached = metaCache.get(jid)

  if (cached && now - cached.time < META_TTL) {
    return cached.data
  }

  const data = await sock.groupMetadata(jid)

  metaCache.set(jid, {
    time: now,
    data
  })

  saveContactsFromMetadata(jid, data)

  return data
}

export function clearGroupCache(jid) {
  if (jid) metaCache.delete(jid)
  else metaCache.clear()
}

export async function getParticipants(sock, jid) {
  try {
    const meta = await getGroupMetadata(sock, jid)
    return Array.isArray(meta.participants) ? meta.participants : []
  } catch {
    return []
  }
}

export async function getGroupAdmins(sock, jid) {
  const participants = await getParticipants(sock, jid)

  return participants
    .filter(p => p.admin === "admin" || p.admin === "superadmin")
    .flatMap(p => possibleParticipantIds(p))
    .map(normalizeJid)
    .filter(Boolean)
}

export async function isAdmin(sock, jid, sender) {
  if (!jid?.endsWith("@g.us")) return false

  const admins = await getGroupAdmins(sock, jid)
  return admins.some(admin => sameUser(admin, sender))
}

export async function isBotAdmin(sock, jid) {
  if (!jid?.endsWith("@g.us")) return false

  const bot = getBotJid(sock)
  const admins = await getGroupAdmins(sock, jid)

  return admins.some(admin => sameUser(admin, bot))
}

function loadContact(jid = "") {
  jid = normalizeJid(jid)
  let found = null

  updateJson("contacts", {}, db => {
    found = db[jid] || null
    return db
  })

  return found
}

async function findParticipant(sock, groupJid, target) {
  target = normalizeJid(target)

  if (!groupJid?.endsWith("@g.us")) return null

  try {
    const metadata = await getGroupMetadata(sock, groupJid)
    const participants = Array.isArray(metadata.participants) ? metadata.participants : []
    const targetNum = extractNumber(target)

    return participants.find(p => {
      const ids = possibleParticipantIds(p)

      return ids.some(id => {
        const jid = normalizeJid(id)
        const num = extractNumber(id)

        return (
          jid === target ||
          sameUser(jid, target) ||
          Boolean(targetNum && num && targetNum === num)
        )
      })
    }) || null
  } catch {
    return null
  }
}

export async function resolveMention(sock, groupJid, target, fallbackName = "usuário") {
  target = normalizeJid(target)

  let finalTarget = target

  // Tenta achar o participante real no grupo antes.
  try {
    if (groupJid?.endsWith("@g.us")) {
      const metadata = await getGroupMetadata(sock, groupJid)
      const participants = Array.isArray(metadata.participants) ? metadata.participants : []
      const targetRaw = rawUser(target)
      const targetNum = jidNumber(target)

      const found = participants.find(p => {
        const ids = [
          p.id,
          p.jid,
          p.lid,
          p.phoneNumber,
          p.phone,
          p.pn,
          p.participant
        ].filter(Boolean)

        return ids.some(id => {
          const norm = normalizeJid(id)
          const raw = rawUser(norm)
          const num = jidNumber(norm)

          return (
            norm === target ||
            raw === targetRaw ||
            Boolean(targetNum && num && targetNum === num)
          )
        })
      })

      if (found) {
        const ids = [
          found.id,
          found.jid,
          found.phoneNumber,
          found.phone,
          found.pn,
          found.lid,
          found.participant
        ].filter(Boolean)

        const phone = ids.find(x => String(x).includes("@s.whatsapp.net") || jidNumber(x))
        const lid = ids.find(x => String(x).includes("@lid"))

        finalTarget = phone || lid || ids[0] || target
      }
    }
  } catch {}

  const mention = forceMention(finalTarget, fallbackName)

  return {
    jid: mention.jid,
    mentionJid: mention.jid,
    mentions: mention.mentions,
    number: jidNumber(mention.jid) || "",
    text: mention.text,
    isRealPhone: mention.isPn,
    isLidOnly: mention.isLid && !mention.isPn
  }
}

export function mentionText(jid = "", pushName = "usuário") {
  return forceMention(jid, pushName, { strictRaw: false }).text
}

export function getMentioned(ctx = {}) {
  return Array.isArray(ctx.mentionedJid) ? ctx.mentionedJid.map(normalizeJid) : []
}

export function getQuotedParticipant(ctx = {}) {
  return normalizeJid(ctx.quotedParticipant || "")
}

export function getTarget(ctx = {}, args = []) {
  const mentioned = getMentioned(ctx)
  if (mentioned.length) return mentioned[0]

  const quoted = getQuotedParticipant(ctx)
  if (quoted) return quoted

  const joined = Array.isArray(args) ? args.join(" ") : String(args || "")
  const n = onlyNumber(joined)

  if (n.length >= 8) return `${n}@s.whatsapp.net`

  return normalizeJid(ctx.sender)
}

export async function requireGroup(sock, ctx, sendText) {
  if (!ctx.isGroup) {
    await sendText(sock, ctx.jid, "❌ *_Use este comando em grupos._*", ctx.raw)
    return false
  }

  return true
}

export async function requireAdmin(sock, ctx, config, sendText) {
  if (!ctx.isGroup) {
    await sendText(sock, ctx.jid, "❌ *_Use este comando em grupos._*", ctx.raw)
    return false
  }

  const owner = isOwner(ctx.sender, config)
  const admin = await isAdmin(sock, ctx.jid, ctx.sender)

  if (!owner && !admin) {
    await sendText(sock, ctx.jid, "❌ *_Permissão negada._*\n\n_Apenas administradores podem usar isso._", ctx.raw)
    return false
  }

  return true
}

export async function requireBotAdmin(sock, ctx, sendText) {
  const botAdmin = await isBotAdmin(sock, ctx.jid)

  if (!botAdmin) {
    await sendText(sock, ctx.jid, "❌ *_Eu preciso ser administrador._*", ctx.raw)
    return false
  }

  return true
}
