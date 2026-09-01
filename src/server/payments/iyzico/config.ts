import 'server-only'

export interface IyzicoConfig {
  apiKey: string
  secretKey: string
  /** https://sandbox-api.iyzipay.com until a production account exists. */
  baseUrl: string
}

const SANDBOX_BASE_URL = 'https://sandbox-api.iyzipay.com'
const PRODUCTION_BASE_URL = 'https://api.iyzipay.com'

/**
 * Returns null unless credentials are configured, so every caller falls back
 * through the provider factory instead of half-working. The base URL defaults
 * to the sandbox: production must be selected deliberately, never reached by
 * omitting a variable.
 */
export function getIyzicoConfig(): IyzicoConfig | null {
  const apiKey = process.env.IYZICO_API_KEY?.trim()
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim()
  if (!apiKey || !secretKey) return null

  const baseUrl =
    process.env.IYZICO_BASE_URL?.trim().replace(/\/$/, '') || SANDBOX_BASE_URL
  if (baseUrl !== SANDBOX_BASE_URL && baseUrl !== PRODUCTION_BASE_URL) {
    throw new Error(
      `IYZICO_BASE_URL must be ${SANDBOX_BASE_URL} or ${PRODUCTION_BASE_URL}`,
    )
  }
  return { apiKey, secretKey, baseUrl }
}
