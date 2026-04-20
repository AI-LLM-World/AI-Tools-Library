import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

// Token payload used across the app
export type Token = {
  userId: string
  organizationId: string
  role?: string
}

// Extract token from request. If JWT_SECRET env var is set, validate JWT.
// Otherwise fall back to the scaffold token format: "user:<userId>:org:<orgId>"
export function getTokenFromRequest(req: NextRequest): Token | null {
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const token = auth.slice('Bearer '.length)

  const secret = process.env.JWT_SECRET
  if (secret) {
    try {
      const decoded = jwt.verify(token, secret) as any
      if (decoded && decoded.userId && decoded.organizationId) {
        return { userId: String(decoded.userId), organizationId: String(decoded.organizationId), role: decoded.role }
      }
      return null
    } catch (err) {
      return null
    }
  }

  // Fallback: accept a token of form "user:<userId>:org:<orgId>"
  const parts = token.split(':')
  if (parts.length === 4 && parts[0] === 'user' && parts[2] === 'org') {
    return { userId: parts[1], organizationId: parts[3], role: 'member' }
  }
  return null
}
