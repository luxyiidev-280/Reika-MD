import { getJson, setJson, getGroupRecord } from "../funcs/storage.js"
import { getTarget, resolveMention, sameUser } from "../funcs/admin.js"

const DB_NAME = "tictactoe"

const winLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
]

function now() {
  return Date.now()
}

function getDb() {
  return getJson(DB_NAME, {})
}

function saveDb(db) {
  setJson(DB_NAME, db)
}

function cleanOldGames(db) {
  const limit = 1000 * 60 * 30

  for (const [jid, game] of Object.entries(db)) {
    if (!game?.startedAt || now() - game.startedAt > limit) {
      delete db[jid]
    }
  }

  return db
}

function markCell(value, index) {
  if (value === "x") return "❌"
  if (value === "o") return "⭕"

  return ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"][index]
}

function renderBoard(board) {
  return (
    `${markCell(board[0], 0)} ${markCell(board[1], 1)} ${markCell(board[2], 2)}\n` +
    `${markCell(board[3], 3)} ${markCell(board[4], 4)} ${markCell(board[5], 5)}\n` +
    `${markCell(board[6], 6)} ${markCell(board[7], 7)} ${markCell(board[8], 8)}`
  )
}

function winnerOf(board) {
  for (const [a, b, c] of winLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }

  if (board.every(Boolean)) return "draw"

  return ""
}

function getCurrentPlayer(game) {
  return game.turn === "x" ? game.players.x : game.players.o
}

function getSymbolByPlayer(game, jid) {
  if (sameUser(game.players.x, jid)) return "x"
  if (sameUser(game.players.o, jid)) return "o"
  return ""
}

function isPlayModeOn(groupJid) {
  const group = getGroupRecord(groupJid)
  return Boolean(group.modobrincadeira)
}

async function playerText(sock, groupJid, jid, fallback) {
  const r = await resolveMention(sock, groupJid, jid, fallback)
  return r
}

export async function startTicTacToe(sock, ctx, args = []) {
  if (!ctx.isGroup) {
    return {
      ok: false,
      text: "❌ *_Jogo da velha só funciona em grupos._*"
    }
  }

  if (!isPlayModeOn(ctx.jid)) {
    return {
      ok: false,
      text: `🎮 *_Modo brincadeira desligado._*\n\n_Use ${ctx.prefix}modobrincadeira 1 para ativar._`
    }
  }

  const target = getTarget(ctx, args)

  if (!target || sameUser(target, ctx.sender)) {
    return {
      ok: false,
      text: `❌ *_Marque alguém para jogar._*\n\nExemplo: ${ctx.prefix}jogodavelha @user`
    }
  }

  const db = cleanOldGames(getDb())

  if (db[ctx.jid]) {
    const game = db[ctx.jid]
    const px = await playerText(sock, ctx.jid, game.players.x, "jogador")
    const po = await playerText(sock, ctx.jid, game.players.o, "jogador")

    return {
      ok: false,
      mentions: [...px.mentions, ...po.mentions],
      text:
        `🎮 *_Já existe uma partida em andamento._*\n\n` +
        `${px.text} ❌ vs ${po.text} ⭕\n\n` +
        `${renderBoard(game.board)}\n\n` +
        `_Use ${ctx.prefix}jv número para jogar._`
    }
  }

  const p1 = await playerText(sock, ctx.jid, ctx.sender, ctx.pushName)
  const p2 = await playerText(sock, ctx.jid, target, "jogador")

  const game = {
    groupJid: ctx.jid,
    players: {
      x: p1.jid,
      o: p2.jid
    },
    names: {
      x: p1.text,
      o: p2.text
    },
    board: ["", "", "", "", "", "", "", "", ""],
    turn: "x",
    startedAt: now(),
    lastMoveAt: now()
  }

  db[ctx.jid] = game
  saveDb(db)

  return {
    ok: true,
    mentions: [...new Set([...p1.mentions, ...p2.mentions])],
    text:
      `🎮 *_Jogo da velha iniciado._*\n\n` +
      `${p1.text} ❌ vs ${p2.text} ⭕\n\n` +
      `${renderBoard(game.board)}\n\n` +
      `Vez de: ${p1.text} ❌\n` +
      `_Use ${ctx.prefix}jv 1-9 para jogar._`
  }
}

export async function playTicTacToe(sock, ctx, args = []) {
  if (!ctx.isGroup) {
    return {
      ok: false,
      text: "❌ *_Use este comando em grupos._*"
    }
  }

  const db = cleanOldGames(getDb())
  const game = db[ctx.jid]

  if (!game) {
    return {
      ok: false,
      text: `❌ *_Nenhuma partida em andamento._*\n\n_Use ${ctx.prefix}jogodavelha @user para começar._`
    }
  }

  const pos = Number(args[0])

  if (!Number.isInteger(pos) || pos < 1 || pos > 9) {
    return {
      ok: false,
      text: `❌ *_Jogada inválida._*\n\n_Use ${ctx.prefix}jv 1-9._`
    }
  }

  const symbol = getSymbolByPlayer(game, ctx.sender)

  if (!symbol) {
    return {
      ok: false,
      text: "❌ *_Você não está nessa partida._*"
    }
  }

  if (symbol !== game.turn) {
    const current = await playerText(sock, ctx.jid, getCurrentPlayer(game), "jogador")

    return {
      ok: false,
      mentions: current.mentions,
      text: `⏳ *_Não é sua vez._*\n\nVez de: ${current.text}`
    }
  }

  const index = pos - 1

  if (game.board[index]) {
    return {
      ok: false,
      text: "❌ *_Essa posição já foi escolhida._*"
    }
  }

  game.board[index] = symbol
  game.lastMoveAt = now()

  const result = winnerOf(game.board)

  const px = await playerText(sock, ctx.jid, game.players.x, "jogador")
  const po = await playerText(sock, ctx.jid, game.players.o, "jogador")
  const mentions = [...new Set([...px.mentions, ...po.mentions])]

  if (result === "draw") {
    delete db[ctx.jid]
    saveDb(db)

    return {
      ok: true,
      mentions,
      text:
        `🎮 *_Jogo da velha finalizado._*\n\n` +
        `${renderBoard(game.board)}\n\n` +
        `🤝 *_Empate._*\n\n` +
        `${px.text} ❌ vs ${po.text} ⭕`
    }
  }

  if (result === "x" || result === "o") {
    const winner = result === "x" ? px : po

    delete db[ctx.jid]
    saveDb(db)

    return {
      ok: true,
      mentions,
      text:
        `🎮 *_Jogo da velha finalizado._*\n\n` +
        `${renderBoard(game.board)}\n\n` +
        `🏆 Vencedor(a): ${winner.text}`
    }
  }

  game.turn = game.turn === "x" ? "o" : "x"
  db[ctx.jid] = game
  saveDb(db)

  const next = await playerText(sock, ctx.jid, getCurrentPlayer(game), "jogador")

  return {
    ok: true,
    mentions: [...new Set([...mentions, ...next.mentions])],
    text:
      `🎮 *_Jogo da velha._*\n\n` +
      `${renderBoard(game.board)}\n\n` +
      `Vez de: ${next.text} ${game.turn === "x" ? "❌" : "⭕"}`
  }
}

export async function cancelTicTacToe(sock, ctx) {
  const db = getDb()
  const game = db[ctx.jid]

  if (!game) {
    return {
      ok: false,
      text: "❌ *_Nenhuma partida em andamento._*"
    }
  }

  const symbol = getSymbolByPlayer(game, ctx.sender)

  if (!symbol) {
    return {
      ok: false,
      text: "❌ *_Só quem está jogando pode desistir._*"
    }
  }

  delete db[ctx.jid]
  saveDb(db)

  const player = await playerText(sock, ctx.jid, ctx.sender, ctx.pushName)

  return {
    ok: true,
    mentions: player.mentions,
    text: `🏳️ *_Partida cancelada._*\n\n${player.text} desistiu. Trágico, mas eficiente.`
  }
}

export async function showTicTacToe(sock, ctx) {
  const db = cleanOldGames(getDb())
  const game = db[ctx.jid]

  if (!game) {
    return {
      ok: false,
      text: `❌ *_Nenhuma partida ativa._*\n\n_Use ${ctx.prefix}jogodavelha @user._`
    }
  }

  const px = await playerText(sock, ctx.jid, game.players.x, "jogador")
  const po = await playerText(sock, ctx.jid, game.players.o, "jogador")
  const current = await playerText(sock, ctx.jid, getCurrentPlayer(game), "jogador")

  return {
    ok: true,
    mentions: [...new Set([...px.mentions, ...po.mentions, ...current.mentions])],
    text:
      `🎮 *_Jogo da velha em andamento._*\n\n` +
      `${px.text} ❌ vs ${po.text} ⭕\n\n` +
      `${renderBoard(game.board)}\n\n` +
      `Vez de: ${current.text}`
  }
}
