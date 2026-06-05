import { jidNumber, readJSON, saveJSON } from "./functions.js"

const USERS = "./dados/database/usuarios.json"
const GROUPS = "./dados/database/grupos.json"
const COUNTER = "./dados/database/contador.json"

export function getUser(jid, name = "Usuário") {
  const db = readJSON(USERS, {})
  const id = jidNumber(jid) || jid
  if (!db[id]) {
    db[id] = {
      jid,
      name,
      mensagens: 0,
      comandos: 0,
      xp: 0,
      level: 1,
      lastSeen: Date.now()
    }
  }
  db[id].jid = jid
  db[id].name = name || db[id].name
  db[id].lastSeen = Date.now()
  saveJSON(USERS, db)
  return db[id]
}

export function addUserCount(jid, name, isCommand = false) {
  const db = readJSON(USERS, {})
  const id = jidNumber(jid) || jid
  if (!db[id]) db[id] = { jid, name, mensagens: 0, comandos: 0, xp: 0, level: 1, lastSeen: Date.now() }
  db[id].mensagens += 1
  if (isCommand) db[id].comandos += 1
  db[id].xp += isCommand ? 5 : 1
  db[id].lastSeen = Date.now()
  if (name) db[id].name = name
  saveJSON(USERS, db)
  return db[id]
}

export function getGroup(jid) {
  const db = readJSON(GROUPS, {})
  if (!db[jid]) db[jid] = { jid, createdAt: Date.now(), flags: {} }
  saveJSON(GROUPS, db)
  return db[jid]
}

export function setFlag(jid, flag, value) {
  const db = readJSON(GROUPS, {})
  if (!db[jid]) db[jid] = { jid, createdAt: Date.now(), flags: {} }
  db[jid].flags[flag] = Boolean(value)
  saveJSON(GROUPS, db)
  return db[jid].flags[flag]
}

export function getFlag(jid, flag, fallback = false) {
  const db = readJSON(GROUPS, {})
  return db?.[jid]?.flags?.[flag] ?? fallback
}

export function addCommandCounter(command) {
  const db = readJSON(COUNTER, {})
  db[command] = (db[command] || 0) + 1
  saveJSON(COUNTER, db)
  return db[command]
}
