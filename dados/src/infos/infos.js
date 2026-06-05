const infoMap = {
  menu: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐌𝐄𝐍𝐔",
    aliases: ["menus", "botao", "botões", "botoes"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐌𝐄𝐍𝐔

O menu principal usa botões Native Flow com imagem.

📌 Comando:
• ${prefix}menu

📌 Submenus:
• ${prefix}menu2
• ${prefix}menumemb
• ${prefix}menuadm
• ${prefix}menudono
• ${prefix}menudown
• ${prefix}menufig
• ${prefix}ferramentas

⚠️ Se os botões não aparecerem:
• Atualize o WhatsApp.
• Use WhatsApp oficial.
• Confirme se existe a imagem menu.jpg.

📁 Imagem usada:
dados/midias/menu/menu.jpg`
  },

  legendabv: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐋𝐄𝐆𝐄𝐍𝐃𝐀𝐁𝐕",
    aliases: ["legbv", "legendawelcome", "legenda"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐋𝐄𝐆𝐄𝐍𝐃𝐀𝐁𝐕

Define a legenda de bem-vindo individual por grupo.

📌 Usos:
• ${prefix}legendabv texto
• ${prefix}legendabv status
• ${prefix}legendabv reset

📌 Exemplo:
${prefix}legendabv ❄️ Bem-vindo(a), {user}

Você entrou em {grupo}.
Agora somos {membros} membros.

📌 Variáveis:
• $user / {user} / ${user} → marca o usuário
• $grupo / {grupo} / ${grupo} → nome do grupo
• $membros / {membros} / ${membros} → total de membros
• $bot / {bot} / ${bot} → nome do bot
• $footer / {footer} / ${footer} → rodapé
• $data / {data} / ${data} → data atual
• $hora / {hora} / ${hora} → hora atual
• $prefixo / {prefixo} / ${prefixo} → prefixo do bot

📌 Testar:
• ${prefix}testbemvindo`
  },

  bemvindo: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐁𝐄𝐌𝐕𝐈𝐍𝐃𝐎",
    aliases: ["welcome", "bv"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐁𝐄𝐌𝐕𝐈𝐍𝐃𝐎

Ativa ou desativa o envio automático quando alguém entra no grupo.

📌 Usos:
• ${prefix}bemvindo 1
• ${prefix}bemvindo 0

📌 Modo rápido sem imagem:
• ${prefix}bemvindo2 1
• ${prefix}bemvindo2 0

📌 Foto individual do grupo:
• ${prefix}fotobv
• ${prefix}fotobv status
• ${prefix}fotobv reset

📌 Testar manualmente:
• ${prefix}testbemvindo
• ${prefix}testbemvindo @user

📁 Imagem usada:
1. dados/midias/menu/bemvindo.jpg
2. dados/midias/menu/menu.jpg

⚠️ O bem-vindo depende do evento:
group-participants.update

Então o bot precisa estar conectado antes da pessoa entrar. WhatsApp sendo WhatsApp, essa beleza frágil.`
  },

  antifake: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐀𝐍𝐓𝐈𝐅𝐀𝐊𝐄",
    aliases: ["antiestrangeiro", "antiddi"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐀𝐍𝐓𝐈𝐅𝐀𝐊𝐄

Remove automaticamente membros que não tenham DDI +55.

📌 Usos:
• ${prefix}antifake 1
• ${prefix}antifake 0

📌 Regra:
• Número começando com 55 → permitido.
• Número fora de 55 → removido.
• LID sem número confirmado → pode ser removido no modo rígido.

⚠️ O bot precisa ser admin para remover.

📌 Ver status:
• ${prefix}modos`
  },

  antilink: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊",
    aliases: ["link", "antidivulgação", "antidivulgacao"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊

Detecta links normais e camuflados.

📌 Usos:
• ${prefix}antilink 1
• ${prefix}antilink 0
• ${prefix}antilink hard

📌 O modo hard é mais rígido:
• detecta links camuflados;
• detecta domínios comuns;
• apaga mensagem;
• remove membro comum se o bot for admin.

⚠️ Dono e admins são ignorados. Afinal, punir admin por link geralmente vira guerra civil no grupo.`
  },

  antipagamento: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐀𝐍𝐓𝐈𝐏𝐀𝐆𝐀𝐌𝐄𝐍𝐓𝐎",
    aliases: ["pagamento", "antipay", "payment"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐀𝐍𝐓𝐈𝐏𝐀𝐆𝐀𝐌𝐄𝐍𝐓𝐎

Detecta mensagens maliciosas usando payload de pagamento.

📌 Usos:
• ${prefix}antipagamento 1
• ${prefix}antipagamento 0

📌 Detecta estruturas como:
• requestPaymentMessage
• sendPaymentMessage
• currencyCodeIso4217
• amount1000
• payment escondido em quotedMessage

⚠️ Se o bot for admin, tenta apagar e remover o invasor.

Esse sistema existe porque spammer descobriu que mensagem de pagamento inválida é uma bela porcaria difícil de apagar. Parabéns aos envolvidos.`
  },

  antistatus: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐀𝐍𝐓𝐈𝐒𝐓𝐀𝐓𝐔𝐒",
    aliases: ["status", "antistatusgrupo"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐀𝐍𝐓𝐈𝐒𝐓𝐀𝐓𝐔𝐒

Detecta payloads de status/menção de status dentro do grupo.

📌 Usos:
• ${prefix}antistatus 1
• ${prefix}antistatus 0

📌 Detecta:
• groupStatusMentionMessage
• statusMentionMessage
• statusNotificationMessage
• variações profundas no JSON da mensagem

⚠️ Se o bot for admin:
• apaga;
• remove membro comum.

📌 Ver status:
• ${prefix}modos`
  },

  horarios: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐇𝐎𝐑Á𝐑𝐈𝐎𝐒",
    aliases: ["fechargp", "abrirgp", "operacao", "operação"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐇𝐎𝐑Á𝐑𝐈𝐎𝐒

Sistema de abrir/fechar grupo automaticamente por horário individual.

📌 Fechar diariamente:
• ${prefix}fechargp diario 00:00

📌 Abrir diariamente:
• ${prefix}abrirgp diario 06:00

📌 Listar horários:
• ${prefix}horarios

📌 Apagar horário pelo code:
• ${prefix}delhorario 28

📁 Salvamento:
dados/src/Operacao/horarios/grupos-fechados/
dados/src/Operacao/horarios/grupos-abertos/

Cada horário recebe um code de 2 dígitos para apagar depois, porque memória humana é um componente não confiável.`
  },

  sticker: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐒𝐓𝐈𝐂𝐊𝐄𝐑",
    aliases: ["s", "fig", "figurinha"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐒𝐓𝐈𝐂𝐊𝐄𝐑

Cria figurinha a partir de imagem ou vídeo.

📌 Usos:
• ${prefix}s
• ${prefix}sticker
• ${prefix}fig

📌 Como usar:
• responda uma imagem com ${prefix}s
• envie imagem com legenda ${prefix}s
• responda vídeo curto com ${prefix}s

📌 Tratamento:
• corta em quadrado 512x512;
• sem borda preta;
• usa corte central limpo;
• adiciona pack/author.

⚠️ Requer ffmpeg instalado no Termux.`
  },

  rename: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐑𝐄𝐍𝐀𝐌𝐄",
    aliases: ["renomear", "rgtake"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐑𝐄𝐍𝐀𝐌𝐄

Renomeia figurinha sem aquele ritual irritante de rgtake.

📌 Uso automático:
• ${prefix}rename

Responda uma figurinha. O bot usa:
• pack: nome do usuário
• author: nome do bot

📌 Uso personalizado:
• ${prefix}rename Meu Pack | Meu Author

📌 Exemplo:
• ${prefix}rename Luxyii Pack | Reika-MD`
  },

  modobrincadeira: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐌𝐎𝐃𝐎𝐁𝐑𝐈𝐍𝐂𝐀𝐃𝐄𝐈𝐑𝐀",
    aliases: ["brincadeiras", "games", "jogos"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐌𝐎𝐃𝐎𝐁𝐑𝐈𝐍𝐂𝐀𝐃𝐄𝐈𝐑𝐀

Ativa brincadeiras por grupo individual.

📌 Usos:
• ${prefix}modobrincadeira 1
• ${prefix}modobrincadeira 0
• ${prefix}modobrincadeira status

📌 Comandos:
• ${prefix}tapa @user
• ${prefix}chute @user
• ${prefix}abraço @user
• ${prefix}cafune @user
• ${prefix}beijo @user

📁 Dados:
dados/src/json/groups.json`
  },


  jogodavelha: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐉𝐎𝐆𝐎 𝐃𝐀 𝐕𝐄𝐋𝐇𝐀",
    aliases: ["velha", "ttt", "jv", "xo", "tictactoe"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐉𝐎𝐆𝐎 𝐃𝐀 𝐕𝐄𝐋𝐇𝐀

Jogo da velha por grupo individual.

📌 Antes de jogar:
• ${prefix}modobrincadeira 1

📌 Iniciar:
• ${prefix}jogodavelha @user
• ${prefix}velha @user
• ${prefix}ttt @user

📌 Jogar:
• ${prefix}jv 1
• ${prefix}jv 5
• ${prefix}jv 9

📌 Ver tabuleiro:
• ${prefix}jv status

📌 Desistir:
• ${prefix}desistirvelha

❌ Jogador 1
⭕ Jogador 2`
  },
  fakeverificado: {
    title: "❄️ 𝐈𝐍𝐅𝐎 • 𝐅𝐀𝐊𝐄 𝐕𝐄𝐑𝐈𝐅𝐈𝐂𝐀𝐃𝐎",
    aliases: ["verificado", "fakeverified"],
    text: prefix => `❄️ 𝐈𝐍𝐅𝐎 • 𝐅𝐀𝐊𝐄 𝐕𝐄𝐑𝐈𝐅𝐈𝐂𝐀𝐃𝐎

Cria um quote visual da própria bot.

📌 Uso:
• ${prefix}fakeverificado

⚠️ Não representa verificação oficial do WhatsApp.
É apenas estética da Reika-MD.

Não use para fingir ser Meta, WhatsApp, banco, suporte ou pessoa real. Isso é o tipo de ideia que parece esperta por 4 segundos e depois vira problema.`
  }
}

function normalizeKey(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function findInfoKey(query = "") {
  const q = normalizeKey(query)

  if (!q) return ""

  if (infoMap[q]) return q

  for (const [key, data] of Object.entries(infoMap)) {
    const aliases = data.aliases || []

    if (aliases.map(normalizeKey).includes(q)) {
      return key
    }
  }

  return ""
}

export function listInfos(prefix = "!") {
  const keys = Object.keys(infoMap).sort()

  return `❄️ 𝐈𝐍𝐅𝐎𝐒 𝐃𝐀 𝐑𝐄𝐈𝐊𝐀

Use:
• ${prefix}info nome

📌 Disponíveis:
${keys.map(key => `• ${prefix}info ${key}`).join("\n")}

Exemplo:
• ${prefix}info legendabv`
}

export function getInfo(query = "", prefix = "!") {
  const key = findInfoKey(query)

  if (!key) {
    return {
      found: false,
      text: listInfos(prefix)
    }
  }

  const data = infoMap[key]

  return {
    found: true,
    key,
    title: data.title,
    text: data.text(prefix)
  }
}
