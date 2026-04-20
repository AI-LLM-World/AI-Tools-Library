import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '../../lib/auth'
import { listProjects } from '../../lib/dal'

// List organizations - restricted to platform admins. For now, we don't have a platform admin list in DB,
// so this endpoint will return 403 unless token.role === 'admin'. In future, expand RBAC checks.
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: { code: 'unauthorized', message: 'Missing token' } }, { status: 401 })
  if (token.role !== 'admin') return NextResponse.json({ error: { code: 'forbidden', message: 'Admin access required' } }, { status: 403 })

  // TODO: implement listOrganizations DAL. For now, return empty list to avoid exposing data.
  return NextResponse.json({ data: [] })
}
