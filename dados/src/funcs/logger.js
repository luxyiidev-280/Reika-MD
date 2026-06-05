import { appendLog, safePreview } from "./functions.js"

const color = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m"
}

function now() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

function print(type, msg, c = color.white, file = "./dados/logs/reika.log") {
  const line = `[${now()}] [${type}] ${safePreview(msg, 600)}`
  console.log(`${color.dim}[${now()}]${color.reset} ${c}${type}${color.reset} ${msg}`)
  appendLog(file, line)
}

export const logger = {
  info: msg => print("INFO", msg, color.cyan),
  ok: msg => print("OK", msg, color.green),
  warn: msg => print("WARN", msg, color.yellow, "./dados/logs/warn.log"),
  error: msg => print("ERROR", msg, color.red, "./dados/logs/erros.log"),
  cmd: msg => print("CMD", msg, color.magenta, "./dados/logs/comandos.log"),
  read: msg => print("READ", msg, color.blue, "./dados/logs/mensagens.log")
}
