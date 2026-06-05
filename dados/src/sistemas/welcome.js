import fs from "fs"
import { isOwner, normalizeJid } from "../funcs/admin.js"
import { forceMention, normalizeMentions } from "../funcs/global.js"
import { dataBR, horaBR, readJSON } from "../funcs/functions.js"
import { getGroupConfig } from "./moderation.js"
import { handleAntiFakeJoin } from "./antifake.js"
import { logger } from "../funcs/logger.js"
import {
  DEFAULT_LEGENDA_BV,
  getLegendabv,
  getLegendabvStatus,
  renderLegendabv,
  resetLegendabv,
  setLegendabv
} from "./legendabv.js"
import { getGroupWelcomeImage } from "./fotobv.js"

const config = readJSON("./dono/config.json", {})
const welcomeCooldown = new Map()

export {
  getLegendabvStatus as getWelcomeCaptionStatus,
  resetLegendabv as resetWelcomeCaption,
  setLegendabv as setWelcomeCaption
}

function logWelcome(text) {
  try {
    fs.mkdirSync("./dados/logs", { recursive: true })
    fs.appendFileSync(
      "./dados/logs/welcome.log",
      `[${new Date().toLocaleString("pt-BR")}] ${text}\n`,
      "utf8"
    )
  } catch {}
}

function cooldownKey(groupJid, participant, action) {
  return `${groupJid}:${participant}:${action}`
}

function inCooldown(groupJid, participant, action, ms = 9000) {
  const key = cooldownKey(groupJid, participant, action)
  const now = Date.now()
  const last = welcomeCooldown.get(key) || 0

  if (now - last < ms) return true

  welcomeCooldown.set(key, now)

  setTimeout(() => {
    welcomeCooldown.delete(key)
  }, ms + 1000).unref?.()

  return false
}

async function getGroupInfo(sock, groupJid) {
  try {
    const meta = await sock.groupMetadata(groupJid)

    const participants = Array.isArray(meta.participants) ? meta.participants : []

    return {
      subject: meta.subject || "Grupo",
      size: participants.length,
      participants
    }
  } catch {
    return {
      subject: "Grupo",
      size: 0,
      participants: []
    }
  }
}


function rawUserId(jid = "") {
  return String(jid || "")
    .split("@")[0]
    .split(":")[0]
}

function findParticipantName(group = {}, participant = "") {
  const raw = rawUserId(participant)
  const list = Array.isArray(group.participants) ? group.participants : []

  const found = list.find(p => {
    const ids = [
      p.id,
      p.jid,
      p.lid,
      p.phoneNumber,
      p.phone,
      p.pn,
      p.participant
    ].filter(Boolean)

    return ids.some(id => rawUserId(id) === raw || String(id) === String(participant))
  })

  return (
    found?.notify ||
    found?.name ||
    found?.verifiedName ||
    found?.pushName ||
    "usuario"
  )
}

function buildWelcomeCaption(groupJid, participant, group) {
  const customLegend = getLegendabv(groupJid)
  const template = customLegend || DEFAULT_LEGENDA_BV
  const displayName = findParticipantName(group, participant)
  const mention = forceMention(participant, displayName, { strictRaw: false })

  const caption = renderLegendabv(template, {
    user: mention.text,
    group: group.subject || "Grupo",
    members: group.size || "?",
    bot: config.NomeDoBot || "Reika-MD",
    footer: config.footer || "Reika-MD • Frost Blade Core",
    date: dataBR(),
    time: horaBR(),
    prefix: config.prefixo || "!"
  })

  return {
    caption,
    mentions: normalizeMentions([participant, ...mention.mentions])
  }
}

export async function sendWelcome(sock, groupJid, participant, group = null, options = {}) {
  group = group || await getGroupInfo(sock, groupJid)

  const { caption, mentions } = buildWelcomeCaption(groupJid, participant, group)
  const textOnly = Boolean(options.textOnly)

  try {
    if (textOnly) {
      await sock.sendMessage(groupJid, {
        text: caption,
        mentions
      })

      return true
    }

    const img = getGroupWelcomeImage(groupJid, config)

    if (img && fs.existsSync(img)) {
      await sock.sendMessage(groupJid, {
        image: fs.readFileSync(img),
        caption,
        mentions
      })

      return true
    }

    await sock.sendMessage(groupJid, {
      text: caption,
      mentions
    })

    return true
  } catch (err) {
    logger.warn(`Bem-vindo falhou: ${err?.message || err}`)
    logWelcome(`ERRO SEND_BV ${groupJid} ${participant}: ${err?.message || err}`)
    return false
  }
}

export async function sendGoodbye(sock, groupJid, participant, group = null) {
  group = group || await getGroupInfo(sock, groupJid)

  const displayName = findParticipantName(group, participant)
  const mention = forceMention(participant, displayName, { strictRaw: false })

  const text =
    `🌙 *_Usuário saiu do grupo._*\n\n` +
    `👤 Usuário: ${mention.text}\n` +
    `👥 Grupo: ${group.subject}\n\n` +
    `_Menos uma alma no caos._`

  try {
    await sock.sendMessage(groupJid, {
      text,
      mentions: normalizeMentions([participant, ...mention.mentions])
    })

    return true
  } catch (err) {
    logger.warn(`Saída falhou: ${err?.message || err}`)
    logWelcome(`ERRO SEND_EXIT ${groupJid} ${participant}: ${err?.message || err}`)
    return false
  }
}

/**
 * Bem-vindo é EVENTO.
 * Não vem de messages.upsert.
 * Não é comando.
 * Não é objeto mágico jogado no router.
 */
export async function handleGroupParticipantsUpdate(sock, update = {}) {
  const groupJid = update.id
  const action = update.action
  const participants = Array.isArray(update.participants) ? update.participants : []

  logWelcome(`EVENTO: ${JSON.stringify(update)}`)
  logger.info(`Evento grupo: ${groupJid} | ${action} | ${participants.join(", ")}`)

  if (!groupJid || !groupJid.endsWith("@g.us")) return
  if (!participants.length) return

  if (!["add", "remove"].includes(action)) {
    logWelcome(`IGNORADO action=${action}`)
    return
  }

  const flags = getGroupConfig(groupJid)
  const group = await getGroupInfo(sock, groupJid)

  for (const raw of participants) {
    const participant = normalizeJid(raw)

    if (!participant) continue
    if (inCooldown(groupJid, participant, action)) continue

    if (action === "add") {
      if (flags.antifake && !isOwner(participant, config)) {
        const blocked = await handleAntiFakeJoin(sock, groupJid, participant)

        if (blocked) {
          logWelcome(`ANTIFAKE BLOQUEOU ${participant}`)
          continue
        }
      }

      if (flags.bemvindo2) {
        logWelcome(`BV2 TEXTO ENVIANDO ${participant}`)
        await sendWelcome(sock, groupJid, participant, group, { textOnly: true })
        continue
      }

      if (flags.bemvindo) {
        logWelcome(`BV IMAGEM ENVIANDO ${participant}`)
        await sendWelcome(sock, groupJid, participant, group, { textOnly: false })
        continue
      }

      logWelcome(`BV OFF ${groupJid}`)
      continue
    }

    if (action === "remove") {
      if (flags.bemvindo || flags.bemvindo2) {
        logWelcome(`SAIDA ENVIANDO ${participant}`)
        await sendGoodbye(sock, groupJid, participant, group)
      }

      continue
    }
  }
}
