import fs from "fs"
import path from "path"
import { logger } from "../../funcs/logger.js"

const BASE = "./dados/src/Operacao/horarios"
const CLOSE_DIR = path.join(BASE, "grupos-fechados")
const OPEN_DIR = path.join(BASE, "grupos-abertos")

let schedulerStarted = false
let schedulerTimer = null

function ensureDirs() {
  fs.mkdirSync(CLOSE_DIR, { recursive: true })
  fs.mkdirSync(OPEN_DIR, { recursive: true })
}

function safeGroupFileName(jid = "") {
  return String(jid || "")
    .replace(/@/g, "_")
    .replace(/\./g, "-")
    .replace(/[^\w-]/g, "")
}

function getDir(type) {
  return type === "close" ? CLOSE_DIR : OPEN_DIR
}

function getTypeLabel(type) {
  return type === "close" ? "fechamento" : "abertura"
}

function getFile(type, groupJid) {
  ensureDirs()
  return path.join(getDir(type), `${safeGroupFileName(groupJid)}.json`)
}

function nowBR() {
  return new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo"
  })
}

function todayBR() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo"
  })
}

function currentHHMM() {
  return new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return fallback
  }
}

function saveJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8")
}

function baseData(groupJid, type) {
  return {
    groupJid,
    type,
    typeLabel: getTypeLabel(type),
    schedules: []
  }
}

function loadGroup(type, groupJid) {
  const file = getFile(type, groupJid)
  const data = readJSON(file, baseData(groupJid, type))

  if (!Array.isArray(data.schedules)) data.schedules = []
  data.groupJid = groupJid
  data.type = type
  data.typeLabel = getTypeLabel(type)

  return data
}

function saveGroup(type, groupJid, data) {
  const file = getFile(type, groupJid)
  saveJSON(file, data)
}

export function normalizeTime(value = "") {
  value = String(value || "").trim()

  const match = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (!match) return ""

  const h = String(match[1]).padStart(2, "0")
  const m = String(match[2]).padStart(2, "0")

  return `${h}:${m}`
}

function normalizeMode(value = "") {
  value = String(value || "").toLowerCase().trim()

  if (["diario", "diário", "daily", "todo-dia", "todos-os-dias"].includes(value)) {
    return "diario"
  }

  return ""
}

function collectUsedCodes(groupJid) {
  const close = loadGroup("close", groupJid).schedules.map(x => x.code)
  const open = loadGroup("open", groupJid).schedules.map(x => x.code)

  return new Set([...close, ...open].filter(Boolean))
}

function generateCode(groupJid) {
  const used = collectUsedCodes(groupJid)

  for (let i = 0; i < 120; i++) {
    const code = String(Math.floor(Math.random() * 100)).padStart(2, "0")
    if (!used.has(code)) return code
  }

  for (let i = 0; i <= 99; i++) {
    const code = String(i).padStart(2, "0")
    if (!used.has(code)) return code
  }

  throw new Error("Limite de 100 horários neste grupo atingido.")
}

export function addSchedule({ groupJid, type, mode, time, createdBy }) {
  ensureDirs()

  if (!["close", "open"].includes(type)) {
    throw new Error("Tipo inválido de operação.")
  }

  mode = normalizeMode(mode)
  time = normalizeTime(time)

  if (!mode) {
    throw new Error("Modo inválido. Use: diario")
  }

  if (!time) {
    throw new Error("Horário inválido. Use formato HH:MM, exemplo 00:00")
  }

  const data = loadGroup(type, groupJid)
  const code = generateCode(groupJid)

  const item = {
    code,
    mode,
    time,
    enabled: true,
    createdBy,
    createdAt: nowBR(),
    lastRunDate: "",
    lastRunAt: ""
  }

  data.schedules.push(item)
  saveGroup(type, groupJid, data)

  return {
    ...item,
    type,
    typeLabel: getTypeLabel(type)
  }
}

export function deleteSchedule(groupJid, code) {
  ensureDirs()

  code = String(code || "").padStart(2, "0")

  let deleted = null

  for (const type of ["close", "open"]) {
    const data = loadGroup(type, groupJid)
    const before = data.schedules.length

    data.schedules = data.schedules.filter(item => {
      if (String(item.code) === code) {
        deleted = {
          ...item,
          type,
          typeLabel: getTypeLabel(type)
        }
        return false
      }

      return true
    })

    if (data.schedules.length !== before) {
      saveGroup(type, groupJid, data)
      break
    }
  }

  return deleted
}

export function listSchedules(groupJid) {
  const close = loadGroup("close", groupJid).schedules.map(x => ({
    ...x,
    type: "close",
    typeLabel: "fechamento"
  }))

  const open = loadGroup("open", groupJid).schedules.map(x => ({
    ...x,
    type: "open",
    typeLabel: "abertura"
  }))

  return [...close, ...open].sort((a, b) => {
    if (a.time === b.time) return a.code.localeCompare(b.code)
    return a.time.localeCompare(b.time)
  })
}

function allScheduleFiles(type) {
  const dir = getDir(type)

  if (!fs.existsSync(dir)) return []

  return fs.readdirSync(dir)
    .filter(file => file.endsWith(".json"))
    .map(file => path.join(dir, file))
}

async function runSchedule(sock, type, file, currentTime, currentDate) {
  const data = readJSON(file, null)

  if (!data?.groupJid || !Array.isArray(data.schedules)) return

  let changed = false

  for (const item of data.schedules) {
    if (!item.enabled) continue
    if (item.mode !== "diario") continue
    if (item.time !== currentTime) continue
    if (item.lastRunDate === currentDate) continue

    try {
      if (type === "close") {
        await sock.groupSettingUpdate(data.groupJid, "announcement")

        await sock.sendMessage(data.groupJid, {
          text:
            `🌙 *_Grupo fechado automaticamente._*\n\n` +
            `🕘 Horário: ${item.time}\n` +
            `🧾 Code: ${item.code}`
        })
      }

      if (type === "open") {
        await sock.groupSettingUpdate(data.groupJid, "not_announce")

        await sock.sendMessage(data.groupJid, {
          text:
            `❄️ *_Grupo aberto automaticamente._*\n\n` +
            `🕘 Horário: ${item.time}\n` +
            `🧾 Code: ${item.code}`
        })
      }

      item.lastRunDate = currentDate
      item.lastRunAt = nowBR()
      changed = true

      logger.ok(`Operacao ${type} executada em ${data.groupJid} | ${item.time} | ${item.code}`)
    } catch (err) {
      logger.warn(`Falha na Operacao ${type} em ${data.groupJid}: ${err?.message || err}`)
    }
  }

  if (changed) {
    saveJSON(file, data)
  }
}

export async function checkOperationSchedules(sock) {
  ensureDirs()

  const time = currentHHMM()
  const date = todayBR()

  for (const file of allScheduleFiles("close")) {
    await runSchedule(sock, "close", file, time, date)
  }

  for (const file of allScheduleFiles("open")) {
    await runSchedule(sock, "open", file, time, date)
  }
}

export function startOperationScheduler(sock) {
  if (schedulerStarted) return

  schedulerStarted = true
  ensureDirs()

  logger.ok("Operacao Scheduler iniciado.")

  schedulerTimer = setInterval(() => {
    checkOperationSchedules(sock).catch(err => {
      logger.warn(`Operacao Scheduler erro: ${err?.message || err}`)
    })
  }, 30_000)

  schedulerTimer.unref?.()
}

export function stopOperationScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer)

  schedulerStarted = false
  schedulerTimer = null
}
