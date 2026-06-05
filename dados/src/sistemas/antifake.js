import fs from "fs"
import { isBotAdmin, isOwner, mentionText, normalizeJid } from "../funcs/admin.js"
import { jidNumber, readJSON } from "../funcs/functions.js"
import { logger } from "../funcs/logger.js"

const config = readJSON("./dono/config.json", {})

function logAntiFake(text) {
  try {
    fs.mkdirSync("./dados/logs", { recursive: true })
    fs.appendFileSync(
      "./dados/logs/antifake.log",
      `[${new Date().toLocaleString("pt-BR")}] ${text}\n`,
      "utf8"
    )
  } catch {}
}

function extractNumber(value = "") {
  return String(value || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "")
}

function findParticipantData(metadata, participant) {
  const target = normalizeJid(participant)
  const targetNum = extractNumber(participant)

  const list = Array.isArray(metadata?.participants)
    ? metadata.participants
    : []

  return list.find(p => {
    const possible = [
      p.id,
      p.jid,
      p.lid,
      p.phoneNumber,
      p.phone,
      p.pn,
      p.participant
    ].filter(Boolean)

    return possible.some(x => {
      const jid = normalizeJid(x)
      const num = extractNumber(x)

      return (
        jid === target ||
        Boolean(targetNum && num && targetNum === num)
      )
    })
  }) || null
}

async function resolveRealNumber(sock, groupJid, participant) {
  const direct = extractNumber(participant)

  if (direct && direct.length >= 10 && !String(participant).includes("@lid")) {
    return direct
  }

  try {
    const metadata = await sock.groupMetadata(groupJid)
    const data = findParticipantData(metadata, participant)

    if (!data) return ""

    const possible = [
      data.id,
      data.jid,
      data.phoneNumber,
      data.phone,
      data.pn,
      data.participant
    ].filter(Boolean)

    for (const value of possible) {
      const num = extractNumber(value)

      if (num && num.length >= 10 && num.startsWith("55")) {
        return num
      }

      if (num && num.length >= 10 && !String(value).includes("@lid")) {
        return num
      }
    }
  } catch {}

  return ""
}

export async function isBrazilianParticipant(sock, groupJid, participant) {
  const number = await resolveRealNumber(sock, groupJid, participant)

  if (!number) {
    return {
      allowed: false,
      reason: "Número real não identificado",
      number: ""
    }
  }

  if (!number.startsWith("55")) {
    return {
      allowed: false,
      reason: `Número estrangeiro detectado: +${number}`,
      number
    }
  }

  return {
    allowed: true,
    reason: "Número brasileiro permitido",
    number
  }
}

export async function handleAntiFakeJoin(sock, groupJid, participant) {
  participant = normalizeJid(participant)

  if (!groupJid?.endsWith("@g.us")) return false
  if (!participant) return false
  if (isOwner(participant, config)) return false

  const check = await isBrazilianParticipant(sock, groupJid, participant)

  if (check.allowed) {
    logAntiFake(`PERMITIDO ${participant} | +${check.number}`)
    return false
  }

  const botAdmin = await isBotAdmin(sock, groupJid)

  if (!botAdmin) {
    logAntiFake(`BLOQUEADO MAS SEM ADMIN ${participant} | ${check.reason}`)

    await sock.sendMessage(groupJid, {
      text:
        `⚠️ *_AntiFake detectou entrada proibida._*\n\n` +
        `👤 Usuário: ${mentionText(participant)}\n` +
        `📌 Motivo: _${check.reason}_\n\n` +
        `_Eu preciso ser administrador para remover._`,
      mentions: [participant]
    }).catch(() => {})

    return true
  }

  try {
    await sock.groupParticipantsUpdate(groupJid, [participant], "remove")

    logAntiFake(`REMOVIDO ${participant} | ${check.reason}`)

    await sock.sendMessage(groupJid, {
      text:
        `🧊 *_AntiFake executado._*\n\n` +
        `👤 Usuário: ${mentionText(participant)}\n` +
        `📌 Motivo: _${check.reason}_\n\n` +
        `_Apenas números com DDI +55 são permitidos._`,
      mentions: [participant]
    }).catch(() => {})

    return true
  } catch (err) {
    logAntiFake(`FALHA AO REMOVER ${participant} | ${err?.message || err}`)
    logger.warn(`AntiFake falhou: ${err?.message || err}`)
    return true
  }
}
