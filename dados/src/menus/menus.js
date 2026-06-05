import { dataBR, formatRuntime, horaBR } from "../funcs/functions.js"
import { mentionText } from "../funcs/admin.js"

export function menuHome(ctx) {
  return `❄️ 𝐑𝐄𝐈𝐊𝐀-𝐌𝐃

🕘 𝐇𝐨𝐫𝐚: ${horaBR()}
🗓️ 𝐃𝐚𝐭𝐚: ${dataBR()}
⚙️ 𝐔𝐩𝐭𝐢𝐦𝐞: ${formatRuntime(process.uptime())}
👤 𝐔𝐬𝐮𝐚́𝐫𝐢𝐨: ${mentionText(ctx.sender, ctx.pushName)}

✦ 𝐄𝐬𝐜𝐨𝐥𝐡𝐚 𝐪𝐮𝐚𝐥 𝐝𝐞𝐬𝐞𝐣𝐚 𝐮𝐬𝐚𝐫 ✦`
}

export function menuGeral(prefix) {
  return `❄️ 𝐑𝐄𝐈𝐊𝐀-𝐌𝐃
𝐅𝐫𝐨𝐬𝐭 𝐁𝐥𝐚𝐝𝐞 𝐂𝐨𝐫𝐞

🌙 𝐌𝐄𝐍𝐔 𝐆𝐄𝐑𝐀𝐋
• ${prefix}menu
• ${prefix}ping
• ${prefix}perfil
• ${prefix}dono
• ${prefix}runtime
• ${prefix}status
• ${prefix}info

🧊 𝐒𝐔𝐁𝐌𝐄𝐍𝐔𝐒
• ${prefix}menumemb
• ${prefix}menuadm
• ${prefix}menudono
• ${prefix}menudown
• ${prefix}menufig
• ${prefix}ferramentas`
}

export function menuMembros(prefix) {
  return `👤 𝐌𝐄𝐍𝐔 𝐌𝐄𝐌𝐁𝐑𝐎𝐒

• ${prefix}ping
• ${prefix}perfil
• ${prefix}dono
• ${prefix}runtime
• ${prefix}status
• ${prefix}id
• ${prefix}tapa @user
• ${prefix}chute @user
• ${prefix}abraço @user
• ${prefix}cafune @user
• ${prefix}beijo @user

🎲 𝐉𝐨𝐠𝐨𝐬
• ${prefix}jogodavelha @user
• ${prefix}jv 1-9
• ${prefix}jv status
• ${prefix}desistirvelha

❄️ 𝐑𝐞𝐢𝐤𝐚-𝐌𝐃 • 𝐅𝐫𝐨𝐬𝐭 𝐁𝐥𝐚𝐝𝐞`
}

export function menuAdm(prefix) {
  return `🛡️ 𝐌𝐄𝐍𝐔 𝐀𝐃𝐌𝐈𝐍

👥 𝐆𝐫𝐮𝐩𝐨
• ${prefix}abrir
• ${prefix}fechar
• ${prefix}ban @user
• ${prefix}promover @user
• ${prefix}rebaixar @user
• ${prefix}marcar

🧊 𝐏𝐫𝐨𝐭𝐞𝐜̧𝐨̃𝐞𝐬
• ${prefix}antilink (1/0/hard)
• ${prefix}antilinkgp (1/0)
• ${prefix}antipagamento (1/0)
• ${prefix}antistatus (1/0)
• ${prefix}antifake (1/0)
• ${prefix}bemvindo (1/0)
• ${prefix}bemvindo2 (1/0)
• ${prefix}legendabv texto/status/reset
• ${prefix}fotobv status/reset
• ${prefix}modobrincadeira (1/0)
• ${prefix}fechargp diario HH:MM
• ${prefix}abrirgp diario HH:MM
• ${prefix}horarios
• ${prefix}delhorario code
• ${prefix}modos
• ${prefix}info legendabv
• ${prefix}info horarios

❄️ 𝐑𝐞𝐢𝐤𝐚-𝐌𝐃 • 𝐅𝐫𝐨𝐬𝐭 𝐁𝐥𝐚𝐝𝐞`
}

export function menuDono(prefix) {
  return `👑 𝐌𝐄𝐍𝐔 𝐃𝐎𝐍𝐎

• ${prefix}setprefix
• ${prefix}get
• ${prefix}memoria
• ${prefix}reiniciar
• ${prefix}antipv3 (1/0/status)

🦊 𝐀́𝐫𝐞𝐚 𝐝𝐨 𝐜𝐫𝐢𝐚𝐝𝐨𝐫.`
}

export function menuDownloads(prefix) {
  return `🎧 𝐌𝐄𝐍𝐔 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐒

• ${prefix}play
• ${prefix}playvideo
• ${prefix}ytmp3
• ${prefix}ytmp4
• ${prefix}tiktok
• ${prefix}instagram

❄️ 𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝𝐬 𝐟𝐢𝐜𝐚𝐦 𝐩𝐫𝐚 𝐩𝐫𝐨́𝐱𝐢𝐦𝐚 𝐞𝐭𝐚𝐩𝐚.`
}

export function menuFig(prefix) {
  return `🎴 𝐌𝐄𝐍𝐔 𝐅𝐈𝐆𝐔𝐑𝐈𝐍𝐇𝐀𝐒

• ${prefix}s
• ${prefix}sticker
• ${prefix}rename
• ${prefix}rename pack | autor

🧊 𝐍𝐨𝐭𝐚
• ${prefix}s em imagem/vídeo cria sticker.
• ${prefix}rename respondendo sticker troca o nome.
• Imagens largas/altas são cortadas em quadrado limpo.

❄️ 𝐑𝐞𝐢𝐤𝐚-𝐌𝐃 • 𝐅𝐫𝐨𝐬𝐭 𝐁𝐥𝐚𝐝𝐞`
}

export function menuFerramentas(prefix) {
  return `🦊 𝐅𝐄𝐑𝐑𝐀𝐌𝐄𝐍𝐓𝐀𝐒

• ${prefix}ping
• ${prefix}runtime
• ${prefix}status
• ${prefix}id
• ${prefix}perfil

❄️ 𝐔𝐭𝐢𝐥𝐢𝐝𝐚𝐝𝐞𝐬 𝐫𝐚́𝐩𝐢𝐝𝐚𝐬.`
}
