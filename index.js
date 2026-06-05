import fs from "fs"
import { readMessage } from "./dados/src/funcs/reader.js"
import { sendText, react } from "./dados/src/funcs/reply.js"
import { buildMenuButtons, sendNativeMenu } from "./dados/src/funcs/buttons.js"
import {
  getParticipants,
  getTarget,
  isAdmin,
  isOwner,
  mentionText,
  requireAdmin,
  requireBotAdmin,
  requireGroup,
  resolveMention
} from "./dados/src/funcs/admin.js"
import { formatRuntime, jidNumber, readJSON, saveJSON } from "./dados/src/funcs/functions.js"
import { logger } from "./dados/src/funcs/logger.js"
import { handleAntiLinkGp } from "./dados/src/sistemas/antilinkgp.js"
import { saveGroupFotoBv, resetGroupFotoBv, getGroupFotoBvStatus } from "./dados/src/sistemas/fotobv.js"
import { getAntiPV3Status, setAntiPV3Status, shouldIgnorePrivate } from "./dados/src/sistemas/antipv3.js"
import { startTicTacToe, playTicTacToe, cancelTicTacToe, showTicTacToe } from "./dados/src/tictactoe/index.js"
import { logReadMessage } from "./dados/src/funcs/terminalMessages.js"
import { fakeVerifiedQuote } from "./dados/src/funcs/fakeVerified.js"
import { getInfo, listInfos } from "./dados/src/infos/infos.js"
import { addSchedule, deleteSchedule, listSchedules } from "./dados/src/Operacao/horarios/index.js"
import { pickText } from "./dados/src/funcs/texts.js"
import { createSticker, renameSticker } from "./dados/src/sticker/sticker.js"
import {
  formatFlags,
  handleModeration,
  setGroupFlag
} from "./dados/src/sistemas/moderation.js"
import { sendWelcome, setWelcomeCaption, resetWelcomeCaption, getWelcomeCaptionStatus } from "./dados/src/sistemas/welcome.js"
import {
  runPlayCommand,
  setPlayMode,
  getPlayModeText
} from "./dados/src/games/brincadeiras.js"
import { sendVerifiedText } from "./dados/src/funcs/fakeVerified.js"

import {
  menuAdm,
  menuDono,
  menuDownloads,
  menuFerramentas,
  menuFig,
  menuGeral,
  menuHome,
  menuMembros
} from "./dados/src/menus/menus.js"

const config = readJSON("./dono/config.json", {})
const necessary = readJSON("./dono/necessary.json", {})

const commandList = [
  "menu", "menu2", "menumemb", "menuadm", "menudono", "menudown", "menufig", "info",
  "ferramentas", "ping", "runtime", "status", "perfil", "dono", "id",
  "abrir", "fechar", "ban", "promover", "rebaixar", "marcar",
  "antilink", "antilinkgp", "antipagamento", "antistatus", "antifake", "bemvindo", "bemvindo2", "fotobv", "legendabv", "modos",
  "setprefix", "get", "memoria", "reiniciar", "antipv3",
  "modobrincadeira", "tapa", "chute", "abraço", "abraco", "cafune", "beijo",
  "jogodavelha", "velha", "ttt", "jv", "desistirvelha",
  "s", "sticker", "fig", "rename", "renomear",
  "fechargp", "abrirgp", "delhorario", "delhoriario", "horarios",
  "fakeverificado", "testbemvindo"
]

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => [])
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }

  return dp[a.length][b.length]
}

function getSuggestions(command) {
  return commandList
    .map(cmd => ({ cmd, score: levenshtein(command, cmd) }))
    .filter(x => x.score <= 3)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(x => x.cmd)
}

async function sendUnavailable(sock, ctx, command) {
  const list = getSuggestions(command)

  const text = list.length
    ? `❌ *_Comando inexistente_*\n\n❔ _Talvez você quis dizer:_\n${list.map(x => `• ${ctx.prefix}${x}`).join("\n")}`
    : `❌ *_Comando inexistente_*\n\n❔ _Nenhuma sugestão encontrada._`

  await sendText(sock, ctx.jid, text, ctx.raw)
}

async function sendImageOrText(sock, ctx, caption, imagePath = config.menuImage) {
  try {
    if (imagePath && fs.existsSync(imagePath)) {
      await sock.sendMessage(
        ctx.jid,
        {
          image: fs.readFileSync(imagePath),
          caption,
          mentions: [ctx.sender]
        },
        { quoted: fakeVerifiedQuote() }
      )
      return
    }
  } catch {}

  await sendText(sock, ctx.jid, caption, ctx.raw, { mentions: [ctx.sender] })
}

async function sendMenuFallback(sock, ctx, menuText) {
  const prefix = ctx.prefix

  await sendText(
    sock,
    ctx.jid,
    `${menuText}\n\n⚠️ _Se os botões não aparecerem, use:_\n• ${prefix}menu2\n• ${prefix}menumemb\n• ${prefix}menuadm\n• ${prefix}menudown\n• ${prefix}menufig\n• ${prefix}ferramentas\n• ${prefix}menudono`,
    ctx.raw,
    { mentions: [ctx.sender] }
  )
}

async function sendProfile(sock, ctx, args) {
  const target = getTarget(ctx, args)
  const resolved = await resolveMention(sock, ctx.jid, target, ctx.pushName)

  const number = resolved.number || jidNumber(target) || "LID/oculto"

  const caption = `👤 𝐏𝐄𝐑𝐅𝐈𝐋

• Usuário: ${resolved.text}
• Número: ${number}
• JID real: ${resolved.jid}
• Grupo: ${ctx.isGroup ? "Sim ✅" : "Não ❌"}

❄️ ${config.footer}`

  let sent = false

  try {
    const url = await sock.profilePictureUrl(resolved.jid, "image")

    await sock.sendMessage(
      ctx.jid,
      {
        image: { url },
        caption,
        mentions: resolved.mentions
      },
      { quoted: fakeVerifiedQuote() }
    )

    sent = true
  } catch {}

  if (!sent) {
    try {
      if (config.noProfileImage && fs.existsSync(config.noProfileImage)) {
        await sock.sendMessage(
          ctx.jid,
          {
            image: fs.readFileSync(config.noProfileImage),
            caption,
            mentions: resolved.mentions
          },
          { quoted: fakeVerifiedQuote() }
        )

        sent = true
      }
    } catch {}
  }

  if (!sent) {
    await sendText(sock, ctx.jid, caption, ctx.raw, {
      mentions: resolved.mentions
    })
  }
}

async function requireOwner(sock, ctx) {
  if (!isOwner(ctx.sender, config)) {
    await sendText(sock, ctx.jid, "❌ *_Permissão negada._*\n\n_Apenas meu criador pode usar isso._", ctx.raw)
    return false
  }

  return true
}

function modeValue(arg = "") {
  arg = String(arg || "").toLowerCase()

  if (["1", "on", "ativar", "ligar", "true"].includes(arg)) return true
  if (["0", "off", "desativar", "desligar", "false"].includes(arg)) return false

  return null
}

async function toggleProtection(sock, ctx, args, flag, label, needBotAdmin = true) {
  if (!(await requireAdmin(sock, ctx, config, sendText))) return

  const value = modeValue(args[0])

  if (needBotAdmin && value === true) {
    if (!(await requireBotAdmin(sock, ctx, sendText))) return
  }

  if (value === null) {
    await sendText(sock, ctx.jid, `🛡️ *_Uso:_*\n\n• ${ctx.prefix}${label} 1\n• ${ctx.prefix}${label} 0`, ctx.raw)
    return
  }

  setGroupFlag(ctx.jid, flag, value)

  await sendText(
    sock,
    ctx.jid,
    `🧊 *_${label} ${value ? "ativado ✅" : "desativado ❌"}_*`,
    ctx.raw
  )
}

export async function handleMessage(sock, mek) {
  if (!mek?.message) return
  if (mek.key?.remoteJid === "status@broadcast") return
  if (mek.key?.fromMe) return

  const ctx = readMessage(mek)
  ctx.raw = mek
  ctx.config = config
  ctx.prefix = config.prefixo || "!"

  if (!ctx.jid || !ctx.body) return

  // AntiPV3 global: ignora PV completamente se não for dono/premium.
  if (shouldIgnorePrivate(ctx, config)) return

  if (necessary.autoread !== false) {
    sock.readMessages([mek.key])
      .then(() => logReadMessage(ctx))
      .catch(() => {})
  }

  const blockedByAntiLinkGp = await handleAntiLinkGp(sock, ctx, config)
  if (blockedByAntiLinkGp) return

  const blockedByModeration = await handleModeration(sock, ctx, config, sendText)
  if (blockedByModeration) return

  const body = ctx.body.trim()
  const prefix = ctx.prefix

  if (!body.startsWith(prefix)) return
  if (body === prefix) return

  const args = body.slice(prefix.length).trim().split(/\s+/)
  const command = String(args.shift() || "").toLowerCase()
  const text = args.join(" ")

  logger.cmd(`${command} | ${ctx.pushName} | ${ctx.jid}${ctx.isButton ? " | BUTTON" : ""}`)

  try {
    switch (command) {
      case "info":
      case "infos":
      case "infobot": {
        const query = args.join(" ").trim()

        if (!query) {
          await sendText(sock, ctx.jid, listInfos(prefix), ctx.raw)
          break
        }

        const result = getInfo(query, prefix)
        await sendText(sock, ctx.jid, result.text, ctx.raw)

        break
      }

      case "menu":
      case "help":
      case "comandos": {
        await react(sock, ctx.jid, mek.key, "❄️")

        const buttons = buildMenuButtons(prefix, config)
        const menuText = menuHome(ctx)

        try {
          await sendNativeMenu(sock, ctx.jid, {
            text: menuText,
            footer: config.footer,
            imagePath: config.menuImage,
            buttons,
            quoted: mek,
            mentions: [ctx.sender]
          })
        } catch (err) {
          logger.warn(`Falha ao enviar botões: ${err?.message || err}`)
          await sendMenuFallback(sock, ctx, menuText)
        }

        break
      }

      case "menu2":
      case "menuprincipal": {
        await sendImageOrText(sock, ctx, menuGeral(prefix))
        break
      }

      case "menumemb":
      case "menumembros": {
        await sendImageOrText(sock, ctx, menuMembros(prefix))
        break
      }

      case "menuadm": {
        await sendImageOrText(sock, ctx, menuAdm(prefix))
        break
      }

      case "menudono": {
        if (!(await requireOwner(sock, ctx))) return
        await sendImageOrText(sock, ctx, menuDono(prefix))
        break
      }

      case "menudown":
      case "menudownloads": {
        await sendImageOrText(sock, ctx, menuDownloads(prefix))
        break
      }

      case "menufig":
      case "menufigurinhas": {
        await sendImageOrText(sock, ctx, menuFig(prefix))
        break
      }

      case "ferramentas":
      case "menuferramentas": {
        await sendImageOrText(sock, ctx, menuFerramentas(prefix))
        break
      }

      case "ping": {
        const start = Date.now()
        const sent = await sendText(sock, ctx.jid, "🔎 *_Ping..._*", ctx.raw)
        const latency = Date.now() - start

        await sendText(
          sock,
          ctx.jid,
          `🔎 *_Pong!_*\n\n⚡ Latência: ${latency}ms\n⚙️ Uptime: ${formatRuntime(process.uptime())}\n👤 Usuário: ${mentionText(ctx.sender, ctx.pushName)}`,
          sent,
          { mentions: [ctx.sender] }
        )
        break
      }

      case "runtime": {
        await sendText(sock, ctx.jid, `⚙️ *_Uptime:_* ${formatRuntime(process.uptime())}`, ctx.raw)
        break
      }

      case "status": {
        const mem = process.memoryUsage()
        await sendText(
          sock,
          ctx.jid,
          `❄️ *_Status da Reika-MD_*\n\n• Uptime: ${formatRuntime(process.uptime())}\n• RAM: ${(mem.rss / 1024 / 1024).toFixed(1)} MB\n• Prefixo: ${prefix}\n• Core: ${config.Core}`,
          ctx.raw
        )
        break
      }

      case "perfil": {
        await sendProfile(sock, ctx, args)
        break
      }

      case "id": {
        await sendText(
          sock,
          ctx.jid,
          `🧊 *_IDs_*\n\n• Chat: ${ctx.jid}\n• Sender: ${ctx.sender}\n• Botão: ${ctx.isButton ? "Sim ✅" : "Não ❌"}`,
          ctx.raw
        )
        break
      }

      case "dono":
      case "criador": {
        await sendText(
          sock,
          ctx.jid,
          `👑 *_Criador:_* ${config.NickDono}\n🦊 *_Bot:_* ${config.NomeDoBot}\n❄️ *_Core:_* ${config.Core}\n\n${config.criadorUrl}`,
          ctx.raw
        )
        break
      }

      case "fechargp": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return
        if (!(await requireBotAdmin(sock, ctx, sendText))) return

        const mode = args[0]
        const time = args[1]

        try {
          const item = addSchedule({
            groupJid: ctx.jid,
            type: "close",
            mode,
            time,
            createdBy: ctx.sender
          })

          await sendText(
            sock,
            ctx.jid,
            `🌙 *_Fechamento automático definido._*\n\n` +
            `🕘 Horário: ${item.time}\n` +
            `🔁 Modo: ${item.mode}\n` +
            `🧾 Code: *${item.code}*\n\n` +
            `_Para apagar: ${prefix}delhorario ${item.code}_`,
            ctx.raw
          )
        } catch (err) {
          await sendText(
            sock,
            ctx.jid,
            `❌ *_Não consegui definir o fechamento._*\n\n_${err?.message || err}_\n\n` +
            `Use: ${prefix}fechargp diario 00:00`,
            ctx.raw
          )
        }

        break
      }

      case "abrirgp": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return
        if (!(await requireBotAdmin(sock, ctx, sendText))) return

        const mode = args[0]
        const time = args[1]

        try {
          const item = addSchedule({
            groupJid: ctx.jid,
            type: "open",
            mode,
            time,
            createdBy: ctx.sender
          })

          await sendText(
            sock,
            ctx.jid,
            `❄️ *_Abertura automática definida._*\n\n` +
            `🕘 Horário: ${item.time}\n` +
            `🔁 Modo: ${item.mode}\n` +
            `🧾 Code: *${item.code}*\n\n` +
            `_Para apagar: ${prefix}delhorario ${item.code}_`,
            ctx.raw
          )
        } catch (err) {
          await sendText(
            sock,
            ctx.jid,
            `❌ *_Não consegui definir a abertura._*\n\n_${err?.message || err}_\n\n` +
            `Use: ${prefix}abrirgp diario 06:00`,
            ctx.raw
          )
        }

        break
      }

      case "delhorario":
      case "delhoriario": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return

        const code = args[0]

        if (!code) {
          await sendText(sock, ctx.jid, `❌ *_Use:_* ${prefix}delhorario 28`, ctx.raw)
          return
        }

        const deleted = deleteSchedule(ctx.jid, code)

        if (!deleted) {
          await sendText(sock, ctx.jid, `❌ *_Nenhum horário encontrado com code:_* ${code}`, ctx.raw)
          return
        }

        await sendText(
          sock,
          ctx.jid,
          `🧊 *_Horário apagado._*\n\n` +
          `Tipo: ${deleted.typeLabel}\n` +
          `Horário: ${deleted.time}\n` +
          `Code: ${deleted.code}`,
          ctx.raw
        )

        break
      }

      case "horarios":
      case "listahorarios": {
        if (!(await requireGroup(sock, ctx, sendText))) return

        const items = listSchedules(ctx.jid)

        if (!items.length) {
          await sendText(sock, ctx.jid, "🕘 *_Nenhum horário automático definido neste grupo._*", ctx.raw)
          return
        }

        const list = items.map(item => {
          const icon = item.type === "close" ? "🌙" : "❄️"
          return `${icon} Code: *${item.code}* | ${item.typeLabel} | ${item.mode} ${item.time}`
        }).join("\n")

        await sendText(
          sock,
          ctx.jid,
          `🕘 *_Horários automáticos deste grupo_*\n\n${list}\n\n_Para apagar: ${prefix}delhorario code_`,
          ctx.raw
        )

        break
      }

      case "abrir": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return
        if (!(await requireBotAdmin(sock, ctx, sendText))) return

        await sock.groupSettingUpdate(ctx.jid, "not_announce")
        await sendText(sock, ctx.jid, "🧊 *_Grupo aberto._*", ctx.raw)
        break
      }

      case "fechar": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return
        if (!(await requireBotAdmin(sock, ctx, sendText))) return

        await sock.groupSettingUpdate(ctx.jid, "announcement")
        await sendText(sock, ctx.jid, "🧊 *_Grupo fechado._*", ctx.raw)
        break
      }

      case "ban":
      case "remover": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return
        if (!(await requireBotAdmin(sock, ctx, sendText))) return

        const target = getTarget(ctx, args)

        if (isOwner(target, config)) {
          await sendText(sock, ctx.jid, "❌ *_Não vou remover meu criador._*", ctx.raw)
          return
        }

        if (await isAdmin(sock, ctx.jid, target)) {
          await sendText(sock, ctx.jid, "❌ *_Não vou remover administrador._*", ctx.raw)
          return
        }

        await sock.groupParticipantsUpdate(ctx.jid, [target], "remove")
        await sendText(sock, ctx.jid, `🧊 *_Usuário removido:_* ${mentionText(target)}`, ctx.raw, { mentions: [target] })
        break
      }

      case "promover": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return
        if (!(await requireBotAdmin(sock, ctx, sendText))) return

        const target = getTarget(ctx, args)
        await sock.groupParticipantsUpdate(ctx.jid, [target], "promote")
        await sendText(sock, ctx.jid, `🛡️ *_Promovido:_* ${mentionText(target)}`, ctx.raw, { mentions: [target] })
        break
      }

      case "rebaixar": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return
        if (!(await requireBotAdmin(sock, ctx, sendText))) return

        const target = getTarget(ctx, args)

        if (isOwner(target, config)) {
          await sendText(sock, ctx.jid, "❌ *_Não vou rebaixar meu criador._*", ctx.raw)
          return
        }

        await sock.groupParticipantsUpdate(ctx.jid, [target], "demote")
        await sendText(sock, ctx.jid, `🧊 *_Rebaixado:_* ${mentionText(target)}`, ctx.raw, { mentions: [target] })
        break
      }

      case "marcar":
      case "tagall": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return

        const participants = await getParticipants(sock, ctx.jid)
        const resolved = []

        for (const p of participants) {
          const jid = p.id || p.jid || p.lid
          if (!jid) continue

          const r = await resolveMention(sock, ctx.jid, jid, "usuário")
          resolved.push(r)
        }

        const mentions = [...new Set(resolved.flatMap(r => r.mentions))]
        const list = resolved
          .map((r, i) => `${i + 1}. ${r.text}`)
          .join("\n")

        await sendText(
          sock,
          ctx.jid,
          `❄️ *_Marcação geral_*\n\n${list}`,
          ctx.raw,
          { mentions }
        )
        break
      }

      case "antilink": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return

        const arg = String(args[0] || "").toLowerCase()
        const sub = String(args[1] || "").toLowerCase()

        if (arg === "hard") {
          if (sub === "0" || sub === "off" || sub === "desligar") {
            setGroupFlag(ctx.jid, "antilink", false)
            setGroupFlag(ctx.jid, "antilinkHard", false)
            await sendText(sock, ctx.jid, "🧊 *_AntiLink Hard desativado ❌_*", ctx.raw)
            return
          }

          if (!(await requireBotAdmin(sock, ctx, sendText))) return

          setGroupFlag(ctx.jid, "antilink", true)
          setGroupFlag(ctx.jid, "antilinkHard", true)
          await sendText(sock, ctx.jid, "🧊 *_AntiLink Hard ativado ✅_*", ctx.raw)
          return
        }

        const value = modeValue(arg)

        if (value === null) {
          await sendText(
            sock,
            ctx.jid,
            `🛡️ *_Uso:_*\n\n• ${prefix}antilink 1\n• ${prefix}antilink 0\n• ${prefix}antilink hard\n• ${prefix}antilink hard 0`,
            ctx.raw
          )
          return
        }

        if (value === true && !(await requireBotAdmin(sock, ctx, sendText))) return

        setGroupFlag(ctx.jid, "antilink", value)
        setGroupFlag(ctx.jid, "antilinkHard", false)

        await sendText(sock, ctx.jid, `🧊 *_AntiLink ${value ? "ativado ✅" : "desativado ❌"}_*`, ctx.raw)
        break
      }

      case "antilinkgp": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return

        const arg = String(args[0] || "").toLowerCase()
        const value = modeValue(arg)

        if (value === null) {
          await sendText(
            sock,
            ctx.jid,
            `🛡️ *_Uso:_*\n\n• ${prefix}antilinkgp 1\n• ${prefix}antilinkgp 0\n\n` +
            `_Detecta chat.whatsapp.com, whatsapp.com/channel e pagamento inválido com divulgação._`,
            ctx.raw
          )
          return
        }

        if (value === true && !(await requireBotAdmin(sock, ctx, sendText))) return

        setGroupFlag(ctx.jid, "antilinkgp", value)

        await sendText(
          sock,
          ctx.jid,
          `🧊 *_AntiLinkGP ${value ? "ativado ✅" : "desativado ❌"}_*`,
          ctx.raw
        )

        break
      }

      case "antipagamento": {
        await toggleProtection(sock, ctx, args, "antipagamento", "antipagamento")
        break
      }

      case "antistatus": {
        await toggleProtection(sock, ctx, args, "antistatus", "antistatus")
        break
      }

      case "antifake": {
        await toggleProtection(sock, ctx, args, "antifake", "antifake")
        break
      }

      case "bemvindo":
      case "welcome": {
        await toggleProtection(sock, ctx, args, "bemvindo", "bemvindo", false)
        break
      }

      case "bemvindo2":
      case "welcome2": {
        await toggleProtection(sock, ctx, args, "bemvindo2", "bemvindo2", false)
        break
      }

      case "fotobv":
      case "fotowelcome": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return

        const sub = String(args[0] || "").toLowerCase()

        if (sub === "status" || sub === "ver") {
          const status = getGroupFotoBvStatus(ctx.jid)

          await sendText(
            sock,
            ctx.jid,
            status.exists
              ? `🖼️ *_Foto BV deste grupo_*\n\nStatus: Salva ✅\nTamanho: ${(status.size / 1024).toFixed(1)} KB\nAtualizada: ${status.updatedAt}\nCaminho: ${status.path}`
              : `🖼️ *_Foto BV deste grupo_*\n\nStatus: Não definida ❌\n\n_Use ${prefix}fotobv respondendo uma imagem._`,
            ctx.raw
          )
          return
        }

        if (sub === "reset" || sub === "limpar" || sub === "del") {
          const ok = resetGroupFotoBv(ctx.jid)

          await sendText(
            sock,
            ctx.jid,
            ok
              ? "🧊 *_Foto BV deste grupo apagada._*"
              : "❌ *_Este grupo não tinha foto BV salva._*",
            ctx.raw
          )
          return
        }

        try {
          const saved = await saveGroupFotoBv(ctx)

          await sendText(
            sock,
            ctx.jid,
            `✅ *_Foto BV salva para este grupo._*\n\nTamanho: ${(saved.size / 1024).toFixed(1)} KB\nCaminho: ${saved.path}\n\n_Use ${prefix}testbemvindo para testar._`,
            ctx.raw
          )
        } catch (err) {
          await sendText(
            sock,
            ctx.jid,
            `❌ *_Não consegui salvar a foto BV._*\n\n_${err?.message || err}_\n\n_Envie ou responda uma imagem com ${prefix}fotobv._`,
            ctx.raw
          )
        }

        break
      }

      case "legendabv":
      case "legbv":
      case "legendawelcome": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return

        const sub = String(args[0] || "").toLowerCase()

        if (sub === "status" || sub === "ver") {
          const status = getWelcomeCaptionStatus(ctx.jid)

          await sendText(
            sock,
            ctx.jid,
            `❄️ *_Legenda BV deste grupo_*\n\n` +
            `Tipo: ${status.custom ? "Personalizada ✅" : "Padrão ❄️"}\n` +
            `${status.updatedAt ? `Atualizada em: ${status.updatedAt}\n` : ""}\n` +
            `${status.caption}\n\n` +
            `_Essa legenda é individual deste grupo._`,
            ctx.raw
          )
          return
        }

        if (sub === "reset" || sub === "limpar" || sub === "padrao" || sub === "padrão") {
          resetWelcomeCaption(ctx.jid)

          await sendText(
            sock,
            ctx.jid,
            "🧊 *_Legenda de bem-vindo resetada neste grupo._*",
            ctx.raw
          )
          return
        }

        let caption = body
          .slice(prefix.length + command.length)
          .trim()

        if (!caption && ctx.quoted) {
          caption =
            ctx.quoted?.conversation ||
            ctx.quoted?.extendedTextMessage?.text ||
            ctx.quoted?.imageMessage?.caption ||
            ctx.quoted?.videoMessage?.caption ||
            ""
        }

        if (!caption) {
          await sendText(
            sock,
            ctx.jid,
            `❌ *_Use:_*\n\n` +
            `${prefix}legendabv sua legenda\n` +
            `${prefix}legendabv status\n` +
            `${prefix}legendabv reset\n\n` +
            `🧊 *_Variáveis:_*\n` +
            `{user} {grupo} {membros} {bot} {footer} {data} {hora} {prefixo}`,
            ctx.raw
          )
          return
        }

        if (caption.length > 1500) {
          await sendText(sock, ctx.jid, "❌ *_Legenda muito grande._* Limite: 1500 caracteres.", ctx.raw)
          return
        }

        setWelcomeCaption(ctx.jid, caption, ctx.sender)

        await sendText(
          sock,
          ctx.jid,
          `✅ *_Legenda BV salva neste grupo._*\n\n${caption}\n\n_Use ${prefix}testbemvindo para testar._`,
          ctx.raw
        )

        break
      }

      case "modos": {
        if (!(await requireGroup(sock, ctx, sendText))) return
        await sendText(sock, ctx.jid, formatFlags(ctx.jid), ctx.raw)
        break
      }

      case "testbemvindo":
      case "testwelcome": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return

        const target = getTarget(ctx, args)
        await sendWelcome(sock, ctx.jid, target)

        break
      }

      case "s":
      case "sticker":
      case "fig":
      case "figurinha": {
        await react(sock, ctx.jid, ctx.raw.key, "🎴")

        const wait = await sendText(sock, ctx.jid, pickText("stickerWait"), ctx.raw)

        try {
          const sticker = await createSticker(ctx, {
            packname: config.NomeDoBot || "Reika-MD",
            author: ctx.pushName || config.NickDono || "Luxyii"
          })

          await sock.sendMessage(
            ctx.jid,
            { sticker },
            { quoted: fakeVerifiedQuote() }
          )
        } catch (err) {
          await sendText(
            sock,
            ctx.jid,
            `❌ *_Falha ao criar figurinha._*\n\n_${err?.message || err}_\n\n_Use ${prefix}s marcando uma imagem/vídeo._`,
            wait
          )
        }

        break
      }

      case "rename":
      case "renomear": {
        await react(sock, ctx.jid, ctx.raw.key, "🧊")

        const wait = await sendText(sock, ctx.jid, pickText("renameWait"), ctx.raw)

        try {
          const packArg = text.includes("|") ? text.split("|")[0].trim() : ""
          const authorArg = text.includes("|") ? text.split("|").slice(1).join("|").trim() : ""

          const sticker = await renameSticker(ctx, {
            packname: packArg || ctx.pushName || config.NickDono || "Usuário",
            author: authorArg || config.NomeDoBot || "Reika-MD"
          })

          await sock.sendMessage(
            ctx.jid,
            { sticker },
            { quoted: fakeVerifiedQuote() }
          )
        } catch (err) {
          await sendText(
            sock,
            ctx.jid,
            `❌ *_Falha ao renomear figurinha._*\n\n_${err?.message || err}_\n\n_Responda uma figurinha com ${prefix}rename._`,
            wait
          )
        }

        break
      }

      case "jogodavelha":
      case "velha":
      case "ttt": {
        const game = await startTicTacToe(sock, ctx, args)

        await sendText(sock, ctx.jid, game.text, ctx.raw, {
          mentions: game.mentions || []
        })

        break
      }

      case "jv":
      case "xo": {
        const first = String(args[0] || "").toLowerCase()

        let game

        if (first === "status" || first === "tabuleiro") {
          game = await showTicTacToe(sock, ctx)
        } else {
          game = await playTicTacToe(sock, ctx, args)
        }

        await sendText(sock, ctx.jid, game.text, ctx.raw, {
          mentions: game.mentions || []
        })

        break
      }

      case "desistirvelha":
      case "cancelarvelha": {
        const game = await cancelTicTacToe(sock, ctx)

        await sendText(sock, ctx.jid, game.text, ctx.raw, {
          mentions: game.mentions || []
        })

        break
      }

      case "modobrincadeira": {
        if (!(await requireAdmin(sock, ctx, config, sendText))) return

        const arg = String(args[0] || "").toLowerCase()

        if (["1", "on", "ativar", "ligar"].includes(arg)) {
          setPlayMode(ctx.jid, true)
          await sendText(sock, ctx.jid, "🎮 *_Modo brincadeira ativado ✅_*", ctx.raw)
          break
        }

        if (["0", "off", "desativar", "desligar"].includes(arg)) {
          setPlayMode(ctx.jid, false)
          await sendText(sock, ctx.jid, "🎮 *_Modo brincadeira desativado ❌_*", ctx.raw)
          break
        }

        await sendText(sock, ctx.jid, getPlayModeText(ctx.jid), ctx.raw)
        break
      }

      case "tapa":
      case "chute":
      case "abraço":
      case "abraco":
      case "cafune":
      case "beijo": {
        const play = await runPlayCommand(sock, ctx, args, command)

        await sendText(sock, ctx.jid, play.text, ctx.raw, {
          mentions: play.mentions || []
        })

        break
      }

      case "fakeverificado":
      case "verificado": {
        if (!(await requireOwner(sock, ctx))) return

        await sendText(
          sock,
          ctx.jid,
          `❄️ *_${config.NomeDoBot}_*\n\n_Fake verified global ativo._\n_As respostas da bot agora usam o quote visual da própria Reika._\n\n_Não representa verificação oficial do WhatsApp._`,
          ctx.raw,
          {
            mentions: [ctx.sender]
          }
        )
        break
      }

      case "antipv3": {
        if (!(await requireOwner(sock, ctx))) return

        const arg = String(args[0] || "").toLowerCase()

        if (["status", "ver", "info"].includes(arg) || !arg) {
          await sendText(
            sock,
            ctx.jid,
            `🧊 *_AntiPV3 Global_*\n\nStatus: ${getAntiPV3Status() ? "ON ✅" : "OFF ❌"}\n\n` +
            `_Quando ligado, usuários comuns são ignorados no privado._\n` +
            `_Dono e premium continuam liberados._`,
            ctx.raw
          )
          return
        }

        if (["1", "on", "ligar", "ativar", "true"].includes(arg)) {
          setAntiPV3Status(true)

          await sendText(
            sock,
            ctx.jid,
            "🧊 *_AntiPV3 global ativado ✅_*\n\n_PV agora só responde dono e premium._",
            ctx.raw
          )
          return
        }

        if (["0", "off", "desligar", "desativar", "false"].includes(arg)) {
          setAntiPV3Status(false)

          await sendText(
            sock,
            ctx.jid,
            "🧊 *_AntiPV3 global desativado ❌_*",
            ctx.raw
          )
          return
        }

        await sendText(
          sock,
          ctx.jid,
          `❌ *_Use:_*\n\n• ${prefix}antipv3 1\n• ${prefix}antipv3 0\n• ${prefix}antipv3 status`,
          ctx.raw
        )

        break
      }

      case "setprefix": {
        if (!(await requireOwner(sock, ctx))) return

        const novo = args[0]

        if (!novo || novo.length > 3) {
          await sendText(sock, ctx.jid, `❌ *_Use:_* ${prefix}setprefix !`, ctx.raw)
          return
        }

        const cfg = readJSON("./dono/config.json", {})
        cfg.prefixo = novo
        saveJSON("./dono/config.json", cfg)

        await sendText(sock, ctx.jid, `✅ *_Prefixo alterado para:_* ${novo}\n\n_Reinicie o bot para aplicar em tudo._`, ctx.raw)
        break
      }

      case "get": {
        if (!(await requireOwner(sock, ctx))) return

        const data = ctx.quoted || ctx.message || ctx.raw
        const json = JSON.stringify(data, null, 2)

        await sendText(
          sock,
          ctx.jid,
          json.length > 3500
            ? `\`\`\`${json.slice(0, 3500)}\n...cortado\`\`\``
            : `\`\`\`${json}\`\`\``,
          ctx.raw
        )
        break
      }

      case "memoria": {
        if (!(await requireOwner(sock, ctx))) return

        const mem = process.memoryUsage()
        await sendText(
          sock,
          ctx.jid,
          `🧠 *_Memória_*\n\n• RSS: ${(mem.rss / 1024 / 1024).toFixed(1)} MB\n• Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB\n• External: ${(mem.external / 1024 / 1024).toFixed(1)} MB`,
          ctx.raw
        )
        break
      }

      case "reiniciar": {
        if (!(await requireOwner(sock, ctx))) return

        await sendText(sock, ctx.jid, "♻️ *_Reiniciando..._*", ctx.raw)
        setTimeout(() => process.exit(0), 1200)
        break
      }

      default:
        await sendUnavailable(sock, ctx, command)
        break
    }
  } catch (err) {
    logger.error(err?.stack || err?.message || String(err))

    try {
      fs.appendFileSync(
        "./dados/logs/erros.log",
        `[${new Date().toISOString()}] ${command}\n${err?.stack || err?.message || String(err)}\n\n`
      )
    } catch {}

    await sendText(
      sock,
      ctx.jid,
      `⚠️ *_O comando ${prefix}${command} falhou._*\n\n_O erro foi isolado e o bot continua funcionando._`,
      ctx.raw
    )
  }
}
