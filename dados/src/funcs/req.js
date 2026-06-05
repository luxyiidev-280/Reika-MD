import { readJSON } from "./functions.js"

const API_CONFIG_PATH = "./dono/apis.json"

function getApiConfig() {
  return readJSON(API_CONFIG_PATH, {
    enabled: false,
    baseUrl: "",
    apiKey: "",
    keyParam: "apikey",
    endpoints: {},
    params: {
      query: "q",
      url: "url"
    },
    timeoutMs: 30000
  })
}

function cleanBaseUrl(url = "") {
  return String(url || "").replace(/\/+$/, "")
}

function cleanPath(path = "") {
  path = String(path || "")
  if (!path.startsWith("/")) return `/${path}`
  return path
}

function assertApiReady(config) {
  if (!config.enabled) {
    throw new Error("API desativada. Configure dono/apis.json e coloque enabled como true.")
  }

  if (!config.baseUrl || config.baseUrl.includes("sua-api.com")) {
    throw new Error("baseUrl da API não configurado em dono/apis.json.")
  }

  if (!config.apiKey) {
    throw new Error("apiKey não configurada em dono/apis.json.")
  }
}

function buildUrl(endpointName, params = {}) {
  const config = getApiConfig()
  assertApiReady(config)

  const endpoint = config.endpoints?.[endpointName]

  if (!endpoint) {
    throw new Error(`Endpoint "${endpointName}" não existe em dono/apis.json.`)
  }

  const url = new URL(cleanBaseUrl(config.baseUrl) + cleanPath(endpoint))

  const keyParam = config.keyParam || "apikey"
  url.searchParams.set(keyParam, config.apiKey)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim()) {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

async function fetchJson(url, timeoutMs = 30000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "user-agent": "Reika-MD/Frost-Blade-Core",
        "accept": "application/json,text/plain,*/*"
      }
    })

    const contentType = res.headers.get("content-type") || ""
    const raw = await res.text()

    if (!res.ok) {
      throw new Error(`API respondeu HTTP ${res.status}: ${raw.slice(0, 300)}`)
    }

    if (contentType.includes("application/json")) {
      return JSON.parse(raw)
    }

    try {
      return JSON.parse(raw)
    } catch {
      return {
        status: true,
        raw
      }
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function apiRequest(endpointName, params = {}) {
  const config = getApiConfig()
  const url = buildUrl(endpointName, params)
  return fetchJson(url, config.timeoutMs || 30000)
}

export function apiMediaUrl(endpointName, params = {}) {
  return buildUrl(endpointName, params)
}

export async function ytSearch(query) {
  const config = getApiConfig()
  const queryParam = config.params?.query || "q"

  return apiRequest("ytSearch", {
    [queryParam]: query
  })
}

export function playAudioUrl(query) {
  const config = getApiConfig()
  const queryParam = config.params?.query || "q"

  return apiMediaUrl("playAudio", {
    [queryParam]: query
  })
}

export function playVideoUrl(query) {
  const config = getApiConfig()
  const queryParam = config.params?.query || "q"

  return apiMediaUrl("playVideo", {
    [queryParam]: query
  })
}

export async function tiktok(url) {
  const config = getApiConfig()
  const urlParam = config.params?.url || "url"

  return apiRequest("tiktok", {
    [urlParam]: url
  })
}

export async function instagram(url) {
  const config = getApiConfig()
  const urlParam = config.params?.url || "url"

  return apiRequest("instagram", {
    [urlParam]: url
  })
}

export function apiStatus() {
  const config = getApiConfig()

  return {
    enabled: Boolean(config.enabled),
    baseUrl: config.baseUrl || "",
    hasKey: Boolean(config.apiKey),
    keyParam: config.keyParam || "apikey",
    endpoints: Object.keys(config.endpoints || {})
  }
}
