import 'server-only'

export interface NotificationMessage {
  to: string
  subject: string
  text: string
}

export interface NotificationAdapter {
  send(message: NotificationMessage): Promise<{ id: string }>
}

const consoleNotificationAdapter: NotificationAdapter = {
  async send(message) {
    const id = `console-${crypto.randomUUID()}`
    console.info('[Sofra development notification]', {
      id,
      to: message.to,
      subject: message.subject,
    })
    return { id }
  },
}

export async function getNotificationAdapter(): Promise<NotificationAdapter> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return consoleNotificationAdapter

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  return {
    async send(message) {
      const result = await resend.emails.send({ from, ...message })
      if (result.error || !result.data)
        throw new Error(result.error?.message ?? 'Notification failed')
      return { id: result.data.id }
    },
  }
}
