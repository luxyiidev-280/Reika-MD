import fs from "fs"
import { fakeVerifiedQuote } from "../funcs/fakeVerified.js"

const CRASH_LOG = "./dados/logs/anticrash.log"
const COMMAND_TIMEOUT = 90_000

let started = false

function ensureLogs() {
  fs.mkdirSync("./dados/logs", { recursive: true })
}

function toText(err) {
  if (!err) return "Erro desconhecido"
  if (err?.stack) return err.stack
  if (err?.message) return err.message
  return String(err)
}

export function logCrash(type, err) {
  ensureLogs()

  const text =
    `\n[${new Date().toLocaleString("pt-BR")}] [${type}]\n` +
    `${toText(err)}\n` +
    "─".repeat(60) +
    "\n"

  try {
    fs.appendFileSync(CRASH_LOG, text, "utf8")
  } catch {}

  console.log(`\x1b[31m[ANTICRASH]\x1b[0m ${type}: ${err?.message || err}`)
}

export function startAntiCrash() {
  if (started) return
  started = true

  ensureLogs()

  process.on("uncaughtException", err => {
    logCrash("uncaughtException", err)
  })

  process.on("unhandledRejection", err => {
    logCrash("unhandledRejection", err)
  })

  process.on("warning", warning => {
    logCrash("warning", warning)
  })

  process.on("multipleResolves", (type, promise, reason) => {
    logCrash("multipleResolves", `${type}: ${reason?.message || reason || ""}`)
  })

  let last = Date.now()

  setInterval(() => {
    const now = Date.now()
    const lag = now - last - 5000
    last = now

    if (lag > 2500) {
      logCrash("eventLoopLag", `Event loop lento: ${lag}ms`)
    }
  }, 5000).unref?.()

  console.log("\x1b[32m[ANTICRASH]\x1b[0m Proteção global iniciada.")
}

export async function safeRun(label, task, options = {}) {
  const timeoutMs = options.timeoutMs || COMMAND_TIMEOUT

  let timer = null

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Timeout em ${label} após ${timeoutMs}ms`)
      err.code = "REIKA_TIMEOUT"
      reject(err)
    }, timeoutMs)

    timer.unref?.()
  })

  try {
    return await Promise.race([
      Promise.resolve().then(task),
      timeout
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function extractBody(message = {}) {
  const msg =
    message?.ephemeralMessage?.message ||
    message?.viewOnceMessage?.message ||
    message?.viewOnceMessageV2?.message ||
    message?.documentWithCaptionMessage?.message ||
    message

  if (!msg) return ""

  try {
    const nativeRaw = msg?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
    if (nativeRaw) {
      const json = JSON.parse(nativeRaw)
      return json?.id || json?.selectedId || json?.selectedRowId || ""
    }
  } catch {}

  return (
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    msg?.videoMessage?.caption ||
    msg?.documentMessage?.caption ||
    msg?.buttonsResponseMessage?.selectedButtonId ||
    msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg?.templateButtonReplyMessage?.selectedId ||
    ""
  )
}

export async function notifyMessageFailure(sock, mek, err, config = {}) {
  try {
    if (!mek?.message) return
    if (mek.key?.fromMe) return
    if (mek.key?.remoteJid === "status@broadcast") return

    const jid = mek.key?.remoteJid
    const body = String(extractBody(mek.message) || "").trim()
    const prefix = config.prefixo || "!"

    if (!jid || !body.startsWith(prefix)) return

    const isTimeout = err?.code === "REIKA_TIMEOUT"

    const text = isTimeout
      ? `⚠️ *_Comando demorou demais._*\n\n_Eu isolei essa execução para o bot continuar respondendo._`
      : `⚠️ *_Erro isolado._*\n\n_O bot continuou funcionando normalmente._`

    await sock.sendMessage(
      jid,
      { text },
      { quoted: fakeVerifiedQuote() }
    )
  } catch (sendErr) {
    logCrash("notifyMessageFailure", sendErr)
  }
}
