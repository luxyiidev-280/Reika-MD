import { resolveMention, getTarget } from "../funcs/admin.js"
import { getGroupRecord, updateGroupRecord } from "../funcs/storage.js"

const actions = {
  tapa: [
    "deu um tapa gelado em",
    "acertou um tapa lendário em",
    "deu um tapa tão frio que congelou"
  ],
  chute: [
    "deu um chute cinematográfico em",
    "mandou um chute congelante em",
    "chutou sem piedade"
  ],
  abraco: [
    "deu um abraço confortável em",
    "abraçou com carinho",
    "deu um abraço anti-caos em"
  ],
  cafune: [
    "fez cafuné em",
    "deu um cafuné digno de descanso em",
    "acalmou com cafuné"
  ],
  beijo: [
    "mandou um beijo para",
    "deu um beijo estiloso em",
    "beijou dramaticamente"
  ]
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function isPlayModeOn(groupJid) {
  const group = getGroupRecord(groupJid)
  return Boolean(group.modobrincadeira)
}

export function setPlayMode(groupJid, value) {
  updateGroupRecord(groupJid, group => {
    group.modobrincadeira = Boolean(value)
  })

  return Boolean(value)
}

export function getPlayModeText(groupJid) {
  const on = isPlayModeOn(groupJid)

  return `🎮 *_Modo Brincadeira_*\n\nStatus: ${on ? "Ativado ✅" : "Desativado ❌"}`
}

export async function runPlayCommand(sock, ctx, args, command) {
  if (!ctx.isGroup) {
    return {
      ok: false,
      text: "❌ *_Use brincadeiras em grupos._*"
    }
  }

  if (!isPlayModeOn(ctx.jid)) {
    return {
      ok: false,
      text: `🎮 *_Modo brincadeira desligado._*\n\n_Use ${ctx.prefix}modobrincadeira 1 para ativar._`
    }
  }

  const key = command === "abraço" ? "abraco" : command
  const list = actions[key]

  if (!list) {
    return {
      ok: false,
      text: "❌ *_Brincadeira inexistente._*"
    }
  }

  const target = getTarget(ctx, args)

  if (!target || target === ctx.sender) {
    return {
      ok: false,
      text: `🎮 *_Marque alguém._*\n\nExemplo: ${ctx.prefix}${command} @pessoa`
    }
  }

  const author = await resolveMention(sock, ctx.jid, ctx.sender, ctx.pushName)
  const victim = await resolveMention(sock, ctx.jid, target, "usuário")

  return {
    ok: true,
    mentions: [...new Set([...author.mentions, ...victim.mentions])],
    text:
      `🎮 *_Brincadeira_*\n\n` +
      `${author.text} ${pick(list)} ${victim.text}.\n\n` +
      `_A maturidade passou longe, como esperado._`
  }
}
