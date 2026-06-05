import { getJson, setJson } from "../funcs/storage.js"

const DB = "legendabv"

export const DEFAULT_LEGENDA_BV =
  `❄️ *_Bem-vindo(a) ao $grupo_*\n\n` +
  `👤 Usuário: $user\n` +
  `👥 Membros: $membros\n\n` +
  `_Leia as regras e evite virar estatística._\n\n` +
  `$footer`

function safeValue(value = "") {
  if (value === null || value === undefined) return ""

  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text
    if (typeof value.jid === "string") return `@${value.jid.split("@")[0]}`
    if (typeof value.raw === "string") return `@${value.raw}`
    return ""
  }

  return String(value)
}

export function getLegendabv(groupJid) {
  const db = getJson(DB, {})
  const data = db[groupJid]

  return String(data?.caption || "").trim()
}

export function getLegendabvData(groupJid) {
  const db = getJson(DB, {})
  return db[groupJid] || null
}

export function setLegendabv(groupJid, caption, updatedBy = "") {
  const db = getJson(DB, {})

  db[groupJid] = {
    groupJid,
    caption: String(caption || "").trim(),
    updatedBy,
    updatedAt: new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    })
  }

  setJson(DB, db, true)
  return db[groupJid]
}

export function resetLegendabv(groupJid) {
  const db = getJson(DB, {})
  delete db[groupJid]
  setJson(DB, db, true)
  return true
}

export function getLegendabvStatus(groupJid) {
  const data = getLegendabvData(groupJid)

  if (!data?.caption) {
    return {
      custom: false,
      caption: DEFAULT_LEGENDA_BV,
      updatedBy: "",
      updatedAt: ""
    }
  }

  return {
    custom: true,
    caption: data.caption,
    updatedBy: data.updatedBy || "",
    updatedAt: data.updatedAt || ""
  }
}

function replaceVar(text, key, value) {
  value = safeValue(value)

  return String(text)
    .replaceAll(`$${key}`, value)
    .replaceAll(`{${key}}`, value)
    .replaceAll(`\${${key}}`, value)
}

export function renderLegendabv(template, data = {}) {
  let text = String(template || DEFAULT_LEGENDA_BV)

  const vars = {
    user: data.user,
    usuario: data.user,
    grupo: data.group,
    group: data.group,
    membros: data.members,
    members: data.members,
    bot: data.bot,
    footer: data.footer,
    data: data.date,
    date: data.date,
    hora: data.time,
    time: data.time,
    prefixo: data.prefix,
    prefix: data.prefix
  }

  for (const [key, value] of Object.entries(vars)) {
    text = replaceVar(text, key, value)
  }

  return text
}
