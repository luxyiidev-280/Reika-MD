import { isOwner } from "../funcs/admin.js"
import { safePreview } from "../funcs/functions.js"
import { logger } from "../funcs/logger.js"
import { sendText } from "../funcs/reply.js"

const userCooldown = new Map()
const commandLock = new Map()

function now() {
  return Date.now()
}

export function isDangerousMessage(ctx) {
  const text = String(ctx.body || "")
  const raw = JSON.stringify(ctx.message || {})

  if (text.length > 12000) return { blocked: true, reason: "texto longo demais" }
  if (raw.length > 65000) return { blocked: true, reason: "payload grande demais" }

  const invisible = (text.match(/[\u200b\u200c\u200d\u2060\ufeff]/g) || []).length
  if (invisible > 250) return { blocked: true, reason: "excesso de caracteres invisíveis" }

  const repeated = /(.)\1{700,}/.test(text)
  if (repeated) return { blocked: true, reason: "repetição anormal" }

  return { blocked: false, reason: "" }
}

export function checkCooldown(ctx, config = {}) {
  if (isOwner(ctx.sender, config)) return { ok: true }

  const key = `${ctx.jid}:${ctx.sender}`
  const current = now()
  const last = userCooldown.get(key) || 0
  const diff = current - last

  if (diff < 1200) {
    return { ok: false, wait: Math.ceil((1200 - diff) / 1000) }
  }

  userCooldown.set(key, current)
  return { ok: true }
}

export async function runWithTimeout(fn, ms = 45000) {
  let timer
  return Promise.race([
    Promise.resolve().then(fn),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`tempo limite excedido (${ms}ms)`)), ms)
    })
  ]).finally(() => clearTimeout(timer))
}

export function lockCommand(ctx, command) {
  const key = `${ctx.jid}:${ctx.sender}:${command}`
  if (commandLock.has(key)) return false
  commandLock.set(key, now())
  setTimeout(() => commandLock.delete(key), 30000).unref?.()
  return true
}

export function unlockCommand(ctx, command) {
  commandLock.delete(`${ctx.jid}:${ctx.sender}:${command}`)
}

export async function blockDangerIfNeeded(sock, ctx, necessary = {}) {
  if (!necessary.antitrava) return false
  const result = isDangerousMessage(ctx)
  if (!result.blocked) return false

  logger.warn(`Mensagem bloqueada: ${result.reason} | ${ctx.sender} | ${safePreview(ctx.body, 80)}`)

  try {
    await sendText(sock, ctx.jid, `⚠️ *_Mensagem suspeita bloqueada_*\n\n_Motivo: ${result.reason}_`, ctx.raw)
  } catch {}

  return true
}
