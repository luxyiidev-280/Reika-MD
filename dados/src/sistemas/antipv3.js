import { getJson, setJson } from "../funcs/storage.js"
import { isOwner, normalizeJid, sameUser } from "../funcs/admin.js"
import { onlyNumber } from "../funcs/functions.js"

const SETTINGS_DB = "settings"
const PREMIUM_DB = "premium"

function normalizePremiumItem(item) {
  if (!item) return ""

  if (typeof item === "string") {
    if (item.includes("@")) return normalizeJid(item)

    const n = onlyNumber(item)
    return n ? `${n}@s.whatsapp.net` : ""
  }

  if (typeof item === "object") {
    const raw =
      item.jid ||
      item.id ||
      item.user ||
      item.numero ||
      item.number ||
      item.phone ||
      ""

    return normalizePremiumItem(raw)
  }

  return ""
}

export function getAntiPV3Status() {
  const settings = getJson(SETTINGS_DB, {})
  return Boolean(settings.antipv3)
}

export function setAntiPV3Status(value) {
  const settings = getJson(SETTINGS_DB, {})

  settings.antipv3 = Boolean(value)
  settings.updatedAt = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo"
  })

  setJson(SETTINGS_DB, settings, true)

  return settings.antipv3
}

export function isPremiumUser(jid) {
  const premium = getJson(PREMIUM_DB, [])

  if (!Array.isArray(premium)) return false

  const user = normalizeJid(jid)

  return premium
    .map(normalizePremiumItem)
    .filter(Boolean)
    .some(p => sameUser(p, user))
}

export function canUsePrivate(ctx, config = {}) {
  if (ctx.isGroup) return true
  if (isOwner(ctx.sender, config)) return true
  if (isPremiumUser(ctx.sender)) return true

  return false
}

/**
 * AntiPV3 global.
 * Retorna true quando a mensagem deve ser ignorada completamente.
 */
export function shouldIgnorePrivate(ctx, config = {}) {
  if (ctx.isGroup) return false
  if (!getAntiPV3Status()) return false
  if (canUsePrivate(ctx, config)) return false

  return true
}
