import { HttpResponse, http } from 'msw'
import { newsletterInput } from '@/api/contracts'
import { db, nowIso, persist } from '../db'
import { fail, parseBody } from '../http-utils'

export const newsletterHandlers = [
  http.post('*/api/newsletter', async ({ request }) => {
    const { email } = await parseBody(request, newsletterInput)
    const normalized = email.toLowerCase()
    if (db.newsletter.includes(normalized)) {
      return fail(409, 'CONFLICT', 'Este e-mail já está inscrito.', { fields: { email: 'Este e-mail já está inscrito.' } })
    }
    db.newsletter.push(normalized)
    persist()
    return HttpResponse.json({ email: normalized, subscribedAt: nowIso() }, { status: 201 })
  }),
]
