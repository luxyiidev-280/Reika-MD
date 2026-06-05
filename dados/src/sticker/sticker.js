import fs from "fs"
import path from "path"
import { tmpdir } from "os"
import { randomBytes } from "crypto"
import { execFile } from "child_process"
import webp from "node-webpmux"
import { downloadContentFromMessage } from "@whiskeysockets/baileys"

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

function randomName(ext = "") {
  return `reika_${Date.now()}_${randomBytes(4).toString("hex")}${ext}`
}

function runFfmpeg(args, timeout = 65000) {
  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, { timeout }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message || "FFmpeg falhou."))
        return
      }

      resolve({ stdout, stderr })
    })
  })
}

async function streamToBuffer(stream) {
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

function detectMedia(ctx = {}, allowSticker = false) {
  const current = unwrapMessage(ctx.message || {})
  const quoted = unwrapMessage(ctx.quoted || {})

  const candidates = [
    { msg: current, from: "current" },
    { msg: quoted, from: "quoted" }
  ]

  for (const item of candidates) {
    const msg = item.msg

    if (msg?.imageMessage) {
      return {
        type: "image",
        message: msg.imageMessage,
        ext: ".jpg",
        from: item.from
      }
    }

    if (msg?.videoMessage) {
      return {
        type: "video",
        message: msg.videoMessage,
        ext: ".mp4",
        from: item.from
      }
    }

    if (allowSticker && msg?.stickerMessage) {
      return {
        type: "sticker",
        message: msg.stickerMessage,
        ext: ".webp",
        from: item.from
      }
    }
  }

  return null
}

async function downloadMedia(media) {
  const stream = await downloadContentFromMessage(media.message, media.type)
  return streamToBuffer(stream)
}

function buildExif(packname = "Reika-MD", author = "Luxyii") {
  const data = {
    "sticker-pack-id": "reika-md-frost-blade-core",
    "sticker-pack-name": String(packname || "Reika-MD").slice(0, 80),
    "sticker-pack-publisher": String(author || "Luxyii").slice(0, 80),
    emojis: ["❄️"]
  }

  const json = Buffer.from(JSON.stringify(data), "utf8")

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00,
    0x00, 0x00
  ])

  const exif = Buffer.concat([exifAttr, json])
  exif.writeUIntLE(json.length, 14, 4)

  return exif
}

async function addExifToWebp(inputWebp, outputWebp, metadata = {}) {
  const img = new webp.Image()

  await img.load(inputWebp)

  img.exif = buildExif(
    metadata.packname || "Reika-MD",
    metadata.author || "Luxyii"
  )

  await img.save(outputWebp)

  return fs.readFileSync(outputWebp)
}

async function imageToSticker(input, output) {
  await runFfmpeg([
    "-y",
    "-i", input,
    "-vf", "scale=512:512:force_original_aspect_ratio=increase,crop=512:512",
    "-frames:v", "1",
    "-vcodec", "libwebp",
    "-lossless", "0",
    "-compression_level", "6",
    "-q:v", "82",
    "-preset", "picture",
    "-an",
    "-vsync", "0",
    output
  ])
}

async function videoToSticker(input, output) {
  await runFfmpeg([
    "-y",
    "-t", "6",
    "-i", input,
    "-vf", "fps=15,scale=512:512:force_original_aspect_ratio=increase,crop=512:512",
    "-vcodec", "libwebp",
    "-lossless", "0",
    "-compression_level", "6",
    "-q:v", "65",
    "-loop", "0",
    "-an",
    "-vsync", "0",
    output
  ], 90000)
}

export async function createSticker(ctx, metadata = {}) {
  const media = detectMedia(ctx, false)

  if (!media) {
    throw new Error("Marque ou envie uma imagem/vídeo com o comando.")
  }

  const dir = fs.mkdtempSync(path.join(tmpdir(), "reika-sticker-"))
  const input = path.join(dir, randomName(media.ext))
  const rawWebp = path.join(dir, randomName(".webp"))
  const finalWebp = path.join(dir, randomName(".webp"))

  try {
    const buffer = await downloadMedia(media)
    fs.writeFileSync(input, buffer)

    if (media.type === "image") {
      await imageToSticker(input, rawWebp)
    } else if (media.type === "video") {
      await videoToSticker(input, rawWebp)
    } else {
      throw new Error("Tipo de mídia não suportado para sticker.")
    }

    return await addExifToWebp(rawWebp, finalWebp, metadata)
  } finally {
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function renameSticker(ctx, metadata = {}) {
  const media = detectMedia(ctx, true)

  if (!media || media.type !== "sticker") {
    throw new Error("Responda uma figurinha com o comando rename.")
  }

  const dir = fs.mkdtempSync(path.join(tmpdir(), "reika-rename-"))
  const input = path.join(dir, randomName(".webp"))
  const output = path.join(dir, randomName(".webp"))

  try {
    const buffer = await downloadMedia(media)
    fs.writeFileSync(input, buffer)

    return await addExifToWebp(input, output, metadata)
  } finally {
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
