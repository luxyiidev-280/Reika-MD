export function rawId(jid = "") {
  return String(jid || "")
    .split("@")[0]
    .split(":")[0]
    .trim()
}

export function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "")
}

export function isLid(jid = "") {
  return String(jid || "").endsWith("@lid")
}

export function isPn(jid = "") {
  return String(jid || "").endsWith("@s.whatsapp.net")
}

export function normalizeMentionJid(jid = "") {
  jid = String(jid || "").trim()

  if (!jid) return ""

  if (jid.includes("@g.us")) return jid.split(":")[0]
  if (jid.includes("@lid")) return `${rawId(jid)}@lid`
  if (jid.includes("@s.whatsapp.net")) return `${onlyDigits(rawId(jid))}@s.whatsapp.net`

  const n = onlyDigits(jid)
  if (n) return `${n}@s.whatsapp.net`

  return jid
}

export function mentionCandidates(target = "") {
  const jid = String(target || "").trim()
  const raw = rawId(jid)
  const n = onlyDigits(raw)

  const list = []

  if (!raw) return list

  if (jid.includes("@lid")) {
    list.push(`${raw}@lid`)
  } else if (jid.includes("@s.whatsapp.net")) {
    list.push(`${n}@s.whatsapp.net`)
  } else if (n.length >= 8) {
    list.push(`${n}@s.whatsapp.net`)
    list.push(`${n}@lid`)
  } else {
    list.push(jid)
  }

  return [...new Set(list.filter(Boolean))]
}

export function normalizeMentions(list = []) {
  const out = []

  for (const item of list.flat(Infinity)) {
    if (!item) continue

    const candidates = mentionCandidates(item)

    for (const jid of candidates) {
      if (jid && !out.includes(jid)) out.push(jid)
    }
  }

  return out
}

function cleanName(name = "usuario") {
  return String(name || "usuario")
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_@.-]/gu, "")
    .slice(0, 28) || "usuario"
}

/**
 * Menção global.
 *
 * strictRaw: true  -> mostra @157544450392085 quando for LID.
 * strictRaw: false -> mostra @Nome, mas mantém mentions com LID real.
 */
export function forceMention(target = "", fallbackName = "usuario", options = {}) {
  const raw = rawId(target)
  const n = onlyDigits(raw)
  const mentions = mentionCandidates(target)
  const strictRaw = Boolean(options.strictRaw)

  let text = ""

  if (strictRaw && raw) {
    text = `@${raw}`
  } else if (isPn(target) && n) {
    text = `@${n}`
  } else if (n && !isLid(target) && raw.length <= 15) {
    text = `@${n}`
  } else {
    text = `@${cleanName(fallbackName)}`
  }

  return {
    text,
    raw,
    jid: mentions[0] || normalizeMentionJid(target),
    mentions,
    isLid: mentions.some(x => x.endsWith("@lid")),
    isPn: mentions.some(x => x.endsWith("@s.whatsapp.net"))
  }
}

export function extractMentionCandidatesFromText(text = "") {
  const found = new Set()
  const value = String(text || "")

  const regex = /@([0-9]{8,30})/g

  let match

  while ((match = regex.exec(value))) {
    const raw = match[1]

    for (const jid of mentionCandidates(raw)) {
      found.add(jid)
    }
  }

  return [...found]
}

export function mergeMentionsFromText(text = "", mentions = []) {
  return normalizeMentions([
    ...(Array.isArray(mentions) ? mentions : []),
    ...extractMentionCandidatesFromText(text)
  ])
}
