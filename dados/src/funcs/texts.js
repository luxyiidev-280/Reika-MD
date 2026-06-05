export const texts = {
  stickerWait: [
    "❄️ *_Criando figurinha..._*",
    "🧊 *_Cortando e congelando a mídia..._*",
    "🎴 *_Preparando sticker limpo..._*",
    "🗡️ *_Ajustando para 512x512..._*",
    "🦊 *_Transformando isso em figurinha..._*"
  ],

  renameWait: [
    "🎴 *_Renomeando figurinha..._*",
    "❄️ *_Atualizando pack da figurinha..._*",
    "🧊 *_Trocando assinatura do sticker..._*"
  ],

  heavyWait: [
    "⏳ *_Processando..._*",
    "❄️ *_Só um instante..._*",
    "🧊 *_Executando com cuidado..._*"
  ]
}

export function pickText(type = "heavyWait") {
  const list = texts[type] || texts.heavyWait
  return list[Math.floor(Math.random() * list.length)]
}
