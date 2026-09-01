import 'server-only'

import type { IyzicoConfig } from './config'
import { signRequest } from './signing'

/**
 * A provider call that came back with `status: "failure"`, an unexpected
 * shape, or a transport-level error. The message carries iyzico's error code
 * and text — which are safe to log — and never the request body, which can
 * contain payee KYC data.
 */
export class IyzicoApiError extends Error {
  constructor(
    readonly path: string,
    readonly errorCode: string | null,
    message: string,
  ) {
    super(`iyzico ${path} failed (${errorCode ?? 'no code'}): ${message}`)
    this.name = 'IyzicoApiError'
  }
}

interface IyzicoEnvelope {
  status?: string
  errorCode?: string
  errorMessage?: string
  [key: string]: unknown
}

export type FetchLike = (
  url: string,
  init: {
    method: string
    headers: Record<string, string>
    body: string
  },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>

/**
 * Minimal REST client for the endpoints the decided flow uses — the official
 * SDK is callback-based and untyped, and the surface needed here is six
 * routes with one auth scheme. Endpoint paths are concentrated below; each
 * awaits sandbox step-0 confirmation before production traffic.
 */
export class IyzicoClient {
  constructor(
    private readonly config: IyzicoConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async send(
    method: 'POST' | 'PUT',
    path: string,
    payload: Record<string, unknown>,
  ): Promise<IyzicoEnvelope> {
    const body = JSON.stringify(payload)
    const headers = {
      ...signRequest(this.config.apiKey, this.config.secretKey, path, body),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    let responseText: string
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
        method,
        headers,
        body,
      })
      responseText = await response.text()
      if (!response.ok && !responseText) {
        throw new IyzicoApiError(
          path,
          String(response.status),
          'empty response',
        )
      }
    } catch (error) {
      if (error instanceof IyzicoApiError) throw error
      throw new IyzicoApiError(
        path,
        null,
        error instanceof Error ? error.message : String(error),
      )
    }

    let parsed: IyzicoEnvelope
    try {
      parsed = JSON.parse(responseText) as IyzicoEnvelope
    } catch {
      throw new IyzicoApiError(path, null, 'response was not JSON')
    }

    if (parsed.status !== 'success') {
      throw new IyzicoApiError(
        path,
        parsed.errorCode ?? null,
        parsed.errorMessage ?? `status was ${String(parsed.status)}`,
      )
    }
    return parsed
  }
}

/** The endpoints of the decided flow, in one place. */
export const IYZICO_PATHS = {
  checkoutInitialize: '/payment/iyzipos/checkoutform/initialize/auth/ecom',
  checkoutRetrieve: '/payment/iyzipos/checkoutform/auth/ecom/detail',
  refund: '/payment/refund',
  itemApprove: '/payment/iyzipos/item/approve',
  itemDisapprove: '/payment/iyzipos/item/disapprove',
  subMerchantCreate: '/onboarding/submerchant',
  /** Hakediş güncelleme; whether it works post-approval is a step-0 question. */
  paymentItemUpdate: '/payment/item',
} as const
