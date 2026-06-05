import fs from "fs"
import path from "path"
import { downloadContentFromMessage } from "@whiskeysockets/baileys"

const BASE_DIR = "./dados/src/Welcome/fotobv"

function safeGroupName(groupJid = "") {
  return String(groupJid || "")
    .replace(/@/g, "_")
    .replace(/\./g, "-")
    .replace(/[^\w-]/g, "")
}

function unwrapMessage(message = {}) {
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

async function streamToBuffer(stream) {
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

function findImageMessage(ctx = {}) {
  const current = unwrapMessage(ctx.message || {})
  const quoted = unwrapMessage(ctx.quoted || {})

  if (current?.imageMessage) return current.imageMessage
  if (quoted?.imageMessage) return quoted.imageMessage

  return null
}

export function getGroupFotoBvDir(groupJid) {
  return path.join(BASE_DIR, safeGroupName(groupJid))
}

export function getGroupFotoBvPath(groupJid) {
  return path.join(getGroupFotoBvDir(groupJid), "welcome.jpg")
}

export function hasGroupFotoBv(groupJid) {
  return fs.existsSync(getGroupFotoBvPath(groupJid))
}

export function getGroupWelcomeImage(groupJid, config = {}) {
  const groupImage = getGroupFotoBvPath(groupJid)
  const defaultWelcome = "./dados/midias/menu/bemvindo.jpg"
  const menuImage = config.menuImage || "./dados/midias/menu/menu.jpg"

  if (fs.existsSync(groupImage)) return groupImage
  if (fs.existsSync(defaultWelcome)) return defaultWelcome
  if (fs.existsSync(menuImage)) return menuImage

  return ""
}

export function getGroupFotoBvStatus(groupJid) {
  const file = getGroupFotoBvPath(groupJid)

  if (!fs.existsSync(file)) {
    return {
      exists: false,
      path: file,
      size: 0
    }
  }

  const stat = fs.statSync(file)

  return {
    exists: true,
    path: file,
    size: stat.size,
    updatedAt: stat.mtime.toLocaleString("pt-BR")
  }
}

export function resetGroupFotoBv(groupJid) {
  const file = getGroupFotoBvPath(groupJid)

  if (fs.existsSync(file)) {
    fs.unlinkSync(file)
    return true
  }

  return false
}

export async function saveGroupFotoBv(ctx = {}) {
  const imageMessage = findImageMessage(ctx)

  if (!imageMessage) {
    throw new Error("Envie ou responda uma imagem com o comando.")
  }

  const dir = getGroupFotoBvDir(ctx.jid)
  const file = getGroupFotoBvPath(ctx.jid)

  fs.mkdirSync(dir, { recursive: true })

  const stream = await downloadContentFromMessage(imageMessage, "image")
  const buffer = await streamToBuffer(stream)

  if (!buffer?.length) {
    throw new Error("Não consegui baixar a imagem.")
  }

  fs.writeFileSync(file, buffer)

  return {
    path: file,
    size: buffer.length
  }
}
