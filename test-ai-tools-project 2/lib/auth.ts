import { NextRequest } from 'next/server'

// Minimal auth helper: parses Authorization header and returns a mocked token payload.
// In production replace with JWT validation.

export type Token = {
  userId: string
  organizationId: string
  role?: string
}

export function getTokenFromRequest(req: NextRequest): Token | null {
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const token = auth.slice('Bearer '.length)
  // For the scaffold, accept a token of form "user:<userId>:org:<orgId>"
  const parts = token.split(':')
  if (parts.length === 4 && parts[0] === 'user' && parts[2] === 'org') {
    return { userId: parts[1], organizationId: parts[3], role: 'member' }
  }
  return null
}
