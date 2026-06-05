import fs from "fs"
import path from "path"
import { bytesToMB, ensureDir } from "../funcs/functions.js"
import { logger } from "../funcs/logger.js"

let started = false

function cleanTemp(dir = "./dados/midias/temp", maxAgeMs = 1000 * 60 * 60 * 2) {
  try {
    ensureDir(dir)
    const now = Date.now()
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file)
      if (file === "qrcode.png") continue
      const st = fs.statSync(full)
      if (st.isFile() && now - st.mtimeMs > maxAgeMs) fs.unlinkSync(full)
    }
  } catch {}
}

export function startOptimizer() {
  if (started) return
  started = true

  setInterval(() => {
    cleanTemp()

    const mem = process.memoryUsage()
    if (mem.rss > 700 * 1024 * 1024) {
      logger.warn(`RAM alta: rss=${bytesToMB(mem.rss)} heap=${bytesToMB(mem.heapUsed)}`)
      if (global.gc) {
        try { global.gc() } catch {}
      }
    }
  }, 1000 * 60 * 10).unref?.()

  let last = Date.now()
  setInterval(() => {
    const current = Date.now()
    const lag = current - last - 5000
    last = current
    if (lag > 1500) logger.warn(`Event loop lento: ${Math.round(lag)}ms`)
  }, 5000).unref?.()
}
