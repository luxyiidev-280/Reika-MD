import fs from "fs"
import path from "path"

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export function ensureDir(dir) {
  if (!dir) return
  fs.mkdirSync(dir, { recursive: true })
}

export function ensureFile(file, fallback = "{}") {
  ensureDir(path.dirname(file))
  if (!fs.existsSync(file)) fs.writeFileSync(file, fallback)
}

export function readJSON(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) return fallback
    const raw = fs.readFileSync(file, "utf8").trim()
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function saveJSON(file, data) {
  ensureDir(path.dirname(file))
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, file)
}

export function appendLog(file, text) {
  try {
    ensureDir(path.dirname(file))
    fs.appendFileSync(file, `${text}\n`, "utf8")
  } catch {}
}

export function onlyNumber(value = "") {
  return String(value).replace(/\D/g, "")
}

export function jidNumber(jid = "") {
  return onlyNumber(String(jid).split("@")[0].split(":")[0])
}

export function normalizeJid(jid = "") {
  const raw = String(jid || "")
  if (!raw) return ""
  if (raw.endsWith("@g.us")) return raw
  const n = jidNumber(raw)
  return n ? `${n}@s.whatsapp.net` : raw
}

export function tagFromJid(jid = "") {
  const n = jidNumber(jid)
  return n ? `@${n}` : "@usuario"
}

export function formatRuntime(seconds = 0) {
  seconds = Math.max(0, Math.floor(seconds))
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  const parts = []
  if (d) parts.push(`${d}d`)
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(" ")
}

export function horaBR() {
  return new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
}

export function dataBR() {
  return new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
}

export function pickRandom(arr = []) {
  if (!Array.isArray(arr) || !arr.length) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

export function bytesToMB(bytes = 0) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function safePreview(value = "", limit = 180) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .slice(0, limit)
}
