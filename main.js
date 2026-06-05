import fs from "fs"
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} from "@whiskeysockets/baileys"
import pino from "pino"
import qrcodeTerminal from "qrcode-terminal"
import QRCode from "qrcode"
import readline from "readline"
import { handleMessage } from "./index.js"
import { handleGroupParticipantsUpdate } from "./dados/src/sistemas/welcome.js"
import { logger } from "./dados/src/funcs/logger.js"
import { startAntiCrash, safeRun, notifyMessageFailure } from "./dados/src/sistemas/anticrash.js"
import { logReceivedMessage } from "./dados/src/funcs/terminalMessages.js"
import { startOperationScheduler } from "./dados/src/Operacao/horarios/index.js"
import { ensureDir, onlyNumber, readJSON, sleep } from "./dados/src/funcs/functions.js"
import { startOptimizer } from "./dados/src/sistemas/optimizer.js"

const config = readJSON("./dono/config.json", {})
const argsMode = String(process.argv[2] || "").toLowerCase()

let starting = false
let selectedMode = ["qr", "code"].includes(argsMode) ? argsMode : ""
let pairingRequested = false
let reconnectAttempt = 0
let currentSock = null

process.on("uncaughtException", err => {
  logger.error(`uncaughtException: ${err?.stack || err}`)
})

process.on("unhandledRejection", err => {
  logger.error(`unhandledRejection: ${err?.stack || err}`)
})

process.on("SIGINT", async () => {
  logger.warn("Encerrando Reika-MD...")
  try { currentSock?.end?.() } catch {}
  process.exit(0)
})

function banner() {
  console.clear()
  console.log(`
\x1b[36m╭────────────────────────────────────╮
│          𝐑𝐄𝐈𝐊𝐀-𝐌𝐃 ❄️             │
│        𝐅𝐫𝐨𝐬𝐭 𝐁𝐥𝐚𝐝𝐞 𝐂𝐨𝐫𝐞        │
╰────────────────────────────────────╯\x1b[0m
`)
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(String(answer || "").trim())
    })
  })
}

function prepareFolders() {
  for (const dir of [
    "./session",
    "./dados/logs",
    "./dados/database",
    "./dados/midias/menu",
    "./dados/midias/temp"
  ]) ensureDir(dir)
}

function hasSession() {
  return fs.existsSync("./session/creds.json")
}

function shouldReconnect(reason) {
  return reason !== DisconnectReason.loggedOut
}

async function chooseModeIfNeeded(isRegistered) {
  if (isRegistered || hasSession()) return "session"
  if (selectedMode) return selectedMode

  console.log("\x1b[36mEscolha o método de conexão:\x1b[0m\n")
  console.log("\x1b[37m[1]\x1b[0m QR Code pequeno + PNG")
  console.log("\x1b[37m[2]\x1b[0m Código de pareamento")
  console.log("\x1b[37m[0]\x1b[0m Sair\n")

  const option = await ask("Digite a opção: ")

  if (option === "1") return (selectedMode = "qr")
  if (option === "2") return (selectedMode = "code")
  if (option === "0") {
    logger.warn("Inicialização cancelada.")
    process.exit(0)
  }

  logger.warn("Opção inválida. Usando QR Code.")
  return (selectedMode = "qr")
}

async function saveQrPng(qr) {
  const qrPath = "./dados/midias/temp/qrcode.png"

  try {
    ensureDir("./dados/midias/temp")
    await QRCode.toFile(qrPath, qr, { type: "png", margin: 1, scale: 8 })
    logger.ok(`QR Code salvo em: ${qrPath}`)
  } catch (err) {
    logger.warn(`Não consegui salvar o QR em PNG: ${err?.message || err}`)
  }
}

async function requestSmartPairingCode(sock) {
  if (pairingRequested || sock.authState.creds.registered) return
  pairingRequested = true

  try {
    const input = await ask("Digite o número do bot com DDI, exemplo 5511999999999: ")
    const phone = onlyNumber(input)

    if (!phone || phone.length < 10) {
      logger.error("Número inválido. Use apenas números com DDI. Exemplo: 5511999999999")
      process.exit(1)
    }

    logger.info("Solicitando código pareado...")
    await sleep(1500)

    const code = await sock.requestPairingCode(phone)

    console.log(`\n\x1b[36mCódigo de pareamento:\x1b[0m \x1b[37m${code}\x1b[0m\n`)
    console.log("\x1b[33mNo WhatsApp:\x1b[0m")
    console.log("Aparelhos conectados > Conectar aparelho > Conectar com número de telefone")
    console.log("Digite o código acima.\n")
  } catch (err) {
    pairingRequested = false
    logger.error(`Falha ao gerar pairing code: ${err?.message || err}`)
  }
}

async function start() {
  if (starting) return
  starting = true
  pairingRequested = false

  prepareFolders()
  startOptimizer()
  banner()

  const { state, saveCreds } = await useMultiFileAuthState("./session")
  const mode = await chooseModeIfNeeded(state.creds.registered)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.macOS(config.NomeDoBot || "Reika-MD"),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
    },
    markOnlineOnConnect: true,
    syncFullHistory: false,
    emitOwnEvents: false,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    defaultQueryTimeoutMs: 60000,
    generateHighQualityLinkPreview: false,
    shouldSyncHistoryMessage: () => false,
    retryRequestDelayMs: 250
  })

  currentSock = sock
  sock.ev.on("creds.update", saveCreds)

  startOperationScheduler(sock)

  sock.ev.on("connection.update", async update => {
    const { connection, lastDisconnect, qr } = update

    if ((connection === "connecting" || qr) && mode === "code") {
      await requestSmartPairingCode(sock)
    }

    if (qr && mode === "qr") {
      await saveQrPng(qr)
      logger.info("Escaneie o QR abaixo:")
      qrcodeTerminal.generate(qr, { small: true })
    }

    if (connection === "open") {
      reconnectAttempt = 0
      logger.ok(`${config.NomeDoBot || "Reika-MD"} conectado com sucesso.`)
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode
      logger.warn(`Conexão fechada. Motivo: ${reason || "desconhecido"}`)

      try { sock.ev.removeAllListeners() } catch {}

      if (shouldReconnect(reason)) {
        reconnectAttempt += 1
        const delay = Math.min(30000, 3000 + reconnectAttempt * 2000)
        logger.info(`Reconectando em ${delay}ms...`)
        await sleep(delay)
        starting = false
        start().catch(err => logger.error(err?.stack || err?.message || String(err)))
      } else {
        logger.error("Sessão desconectada. Apague ./session e conecte novamente.")
        process.exit(1)
      }
    }
  })

    sock.ev.on("messages.upsert", async event => {
    if (event.type !== "notify") return

    for (const mek of event.messages || []) {
      logReceivedMessage(mek, event.type)

      safeRun(
        `handleMessage:${mek?.key?.id || "sem-id"}`,
        () => handleMessage(sock, mek),
        { timeoutMs: 90_000 }
      ).catch(err => {
        logger.error(err?.stack || err?.message || String(err))
        notifyMessageFailure(sock, mek, err, config).catch(() => {})
      })
    }
  })

  sock.ev.on("group-participants.update", async update => {
    handleGroupParticipantsUpdate(sock, update).catch(err => {
      logger.error(`group-participants.update: ${err?.stack || err?.message || err}`)
    })
  })
}

start().catch(err => logger.error(err?.stack || err?.message || String(err)))
