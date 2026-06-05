import fs from "fs"
import crypto from "crypto"
import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto
} from "@whiskeysockets/baileys"
import { logger } from "./logger.js"

function safeJson(data) {
  return JSON.stringify(data || {})
}

function normalizeButtons(buttons = []) {
  return buttons
    .filter(Boolean)
    .map(btn => ({
      name: String(btn.name || "").trim(),
      buttonParamsJson:
        typeof btn.buttonParamsJson === "string"
          ? btn.buttonParamsJson
          : safeJson(btn.buttonParamsJson || {})
    }))
    .filter(btn => btn.name && btn.buttonParamsJson)
}

export function quickReply(displayText, id) {
  return {
    name: "quick_reply",
    buttonParamsJson: safeJson({
      display_text: String(displayText || "Abrir"),
      id: String(id || "")
    })
  }
}

export function urlButton(displayText, url) {
  const safeUrl = String(url || "https://wa.me/5511947396376")
  return {
    name: "cta_url",
    buttonParamsJson: safeJson({
      display_text: String(displayText || "Criador"),
      url: safeUrl,
      merchant_url: safeUrl
    })
  }
}

export function copyButton(displayText, copyCode) {
  return {
    name: "cta_copy",
    buttonParamsJson: safeJson({
      display_text: String(displayText || "Copiar"),
      copy_code: String(copyCode || "")
    })
  }
}

export function singleSelectButton(title, sections = []) {
  return {
    name: "single_select",
    buttonParamsJson: safeJson({
      title: String(title || "Abrir lista"),
      sections
    })
  }
}

function menuRows(prefix) {
  return [
    {
      header: "❄️ 𝐌𝐄𝐍𝐔 𝐆𝐄𝐑𝐀𝐋",
      title: "Comandos principais",
      description: "Abra o menu geral da Reika-MD",
      id: `${prefix}menu2`
    },
    {
      header: "👤 𝐌𝐄𝐌𝐁𝐑𝐎𝐒",
      title: "Comandos de membros",
      description: "Ping, perfil, dono e utilidades",
      id: `${prefix}menumemb`
    },
    {
      header: "🛡️ 𝐀𝐃𝐌𝐈𝐍𝐒",
      title: "Administração",
      description: "Comandos para grupos",
      id: `${prefix}menuadm`
    },
    {
      header: "🎧 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐒",
      title: "Baixar mídias",
      description: "Play, vídeo, TikTok e mais",
      id: `${prefix}menudown`
    },
    {
      header: "🎴 𝐅𝐈𝐆𝐔𝐑𝐈𝐍𝐇𝐀𝐒",
      title: "Stickers",
      description: "Criar e editar figurinhas",
      id: `${prefix}menufig`
    },
    {
      header: "🦊 𝐅𝐄𝐑𝐑𝐀𝐌𝐄𝐍𝐓𝐀𝐒",
      title: "Utilidades rápidas",
      description: "Status, ping, runtime e extras",
      id: `${prefix}ferramentas`
    },
    {
      header: "👑 𝐃𝐎𝐍𝐎",
      title: "Controle do criador",
      description: "Comandos privados do dono",
      id: `${prefix}menudono`
    }
  ]
}

export function buildMenuButtons(prefix, config = {}) {
  return [
    singleSelectButton("𝐀𝐁𝐑𝐈𝐑 𝐌𝐄𝐍𝐔𝐒 ❄️", [
      {
        title: "𝐑𝐄𝐈𝐊𝐀-𝐌𝐃 • 𝐌𝐄𝐍𝐔𝐒",
        rows: menuRows(prefix)
      }
    ]),
    quickReply("𝐏𝐈𝐍𝐆 🔎", `${prefix}ping`),
    urlButton("𝐂𝐑𝐈𝐀𝐃𝐎𝐑 🫦", config.criadorUrl || "https://wa.me/5511947396376")
  ]
}

async function prepareImage(sock, imagePath) {
  if (!imagePath || !fs.existsSync(imagePath)) return null

  try {
    const media = await prepareWAMessageMedia(
      { image: fs.readFileSync(imagePath) },
      { upload: sock.waUploadToServer }
    )

    return media?.imageMessage || null
  } catch (err) {
    logger.warn(`Falha ao preparar imagem do menu: ${err?.message || err}`)
    return null
  }
}

function buildDirectInteractive(text, footer, buttons, mentions, imageMessage) {
  const header = imageMessage
    ? proto.Message.InteractiveMessage.Header.create({
        title: "",
        subtitle: "",
        hasMediaAttachment: true,
        imageMessage
      })
    : proto.Message.InteractiveMessage.Header.create({
        title: "",
        subtitle: "",
        hasMediaAttachment: false
      })

  return proto.Message.InteractiveMessage.create({
    body: proto.Message.InteractiveMessage.Body.create({ text: String(text || " ") }),
    footer: proto.Message.InteractiveMessage.Footer.create({ text: String(footer || " ") }),
    header,
    contextInfo: { mentionedJid: mentions },
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
      buttons,
      messageParamsJson: safeJson({
        source: "reika-md",
        mode: "direct",
        templateId: crypto.randomUUID()
      }),
      messageVersion: 1
    })
  })
}

function buildCarouselInteractive(text, footer, buttons, mentions, imageMessage) {
  const header = imageMessage
    ? {
        title: "",
        hasMediaAttachment: true,
        imageMessage
      }
    : {
        title: "",
        hasMediaAttachment: false
      }

  return {
    contextInfo: { mentionedJid: mentions },
    body: { text: "❄️ 𝐑𝐄𝐈𝐊𝐀-𝐌𝐃" },
    footer: { text: String(footer || " ") },
    carouselMessage: {
      messageVersion: 1,
      cards: [
        {
          header,
          body: { text: String(text || " ") },
          footer: { text: String(footer || " ") },
          nativeFlowMessage: {
            buttons,
            messageParamsJson: safeJson({
              source: "reika-md",
              mode: "carousel",
              templateId: crypto.randomUUID()
            }),
            messageVersion: 1
          }
        }
      ]
    }
  }
}

async function relayInteractive(sock, jid, interactiveMessage, quoted) {
  const message = generateWAMessageFromContent(
    jid,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage
        }
      }
    },
    { quoted }
  )

  await sock.relayMessage(jid, message.message, { messageId: message.key.id })
  return message
}

export async function sendNativeFlow(sock, jid, options = {}) {
  const {
    text = "",
    footer = "",
    buttons = [],
    imagePath = "",
    quoted,
    mentions = []
  } = options

  const normalizedButtons = normalizeButtons(buttons)
  if (!normalizedButtons.length) throw new Error("Nenhum botão Native Flow válido foi informado.")

  const imageMessage = await prepareImage(sock, imagePath)
  const interactiveMessage = buildDirectInteractive(text, footer, normalizedButtons, mentions, imageMessage)
  return relayInteractive(sock, jid, interactiveMessage, quoted)
}

export async function sendCarouselNativeFlow(sock, jid, options = {}) {
  const {
    text = "",
    footer = "",
    buttons = [],
    imagePath = "",
    quoted,
    mentions = []
  } = options

  const normalizedButtons = normalizeButtons(buttons)
  if (!normalizedButtons.length) throw new Error("Nenhum botão Native Flow válido foi informado.")

  const imageMessage = await prepareImage(sock, imagePath)
  const interactiveMessage = buildCarouselInteractive(text, footer, normalizedButtons, mentions, imageMessage)
  return relayInteractive(sock, jid, interactiveMessage, quoted)
}

export async function sendNativeMenu(sock, jid, options = {}) {
  const hasImage = Boolean(options?.imagePath && fs.existsSync(options.imagePath))

  if (!hasImage) {
    logger.warn("Menu sem imagem detectado. Usando Native Flow direto para evitar card incompatível.")
    return sendNativeFlow(sock, jid, options)
  }

  try {
    return await sendCarouselNativeFlow(sock, jid, options)
  } catch (err) {
    logger.warn(`Carousel Native Flow falhou, tentando modo direto: ${err?.message || err}`)
    return sendNativeFlow(sock, jid, options)
  }
}
