import fs from "fs"
import path from "path"

const BASE = "./dados/src/json"
const cache = new Map()
const timers = new Map()

function filePath(name) {
  const clean = String(name || "")
    .replace(/\.json$/i, "")
    .replace(/[^\w.-]/g, "")

  return path.join(BASE, `${clean}.json`)
}

function ensureBase() {
  fs.mkdirSync(BASE, { recursive: true })
}

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

export function getJson(name, fallback = {}) {
  ensureBase()

  if (cache.has(name)) {
    return cache.get(name)
  }

  const file = filePath(name)

  try {
    if (!fs.existsSync(file)) {
      cache.set(name, clone(fallback))
      flushJson(name)
      return cache.get(name)
    }

    const data = JSON.parse(fs.readFileSync(file, "utf8"))
    cache.set(name, data)
    return data
  } catch {
    cache.set(name, clone(fallback))
    return cache.get(name)
  }
}

export function setJson(name, data, instant = false) {
  cache.set(name, data)

  if (instant) {
    flushJson(name)
    return data
  }

  scheduleFlush(name)
  return data
}

export function updateJson(name, fallback, updater, instant = false) {
  const data = getJson(name, fallback)
  const result = updater(data) || data
  return setJson(name, result, instant)
}

export function flushJson(name) {
  ensureBase()

  if (!cache.has(name)) return false

  const file = filePath(name)
  fs.writeFileSync(file, JSON.stringify(cache.get(name), null, 2), "utf8")
  return true
}

export function flushAllJson() {
  for (const name of cache.keys()) {
    flushJson(name)
  }
}

function scheduleFlush(name) {
  if (timers.has(name)) clearTimeout(timers.get(name))

  const timer = setTimeout(() => {
    flushJson(name)
    timers.delete(name)
  }, 700)

  timer.unref?.()
  timers.set(name, timer)
}

export function getGroupRecord(jid) {
  return updateJson("groups", {}, db => {
    if (!db[jid]) {
      db[jid] = {
        antilink: false,
        antilinkHard: false,
        antipagamento: false,
        antistatus: false,
        antifake: false,
        bemvindo: false,
        modobrincadeira: false,
        meta: {},
        members: {},
        admins: [],
        updatedAt: 0
      }
    }

    return db
  })[jid]
}

export function updateGroupRecord(jid, updater) {
  return updateJson("groups", {}, db => {
    if (!db[jid]) {
      db[jid] = {
        antilink: false,
        antilinkHard: false,
        antipagamento: false,
        antistatus: false,
        antifake: false,
        bemvindo: false,
        modobrincadeira: false,
        meta: {},
        members: {},
        admins: [],
        updatedAt: 0
      }
    }

    updater(db[jid], db)
    return db
  })
}

process.on("exit", () => {
  try {
    flushAllJson()
  } catch {}
})
