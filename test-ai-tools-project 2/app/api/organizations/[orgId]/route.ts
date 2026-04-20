import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTokenFromRequest } from '../../../../lib/auth'
import { getOrganization, updateOrganization } from '../../../../lib/dal'

const UpdateOrgSchema = z.object({ name: z.string().optional() })

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const token = getTokenFromRequest(_req)
  if (!token) return NextResponse.json({ error: { code: 'unauthorized', message: 'Missing token' } }, { status: 401 })

  const org = await getOrganization(params.orgId)
  if (!org) return NextResponse.json({ error: { code: 'not_found', message: 'Organization not found' } }, { status: 404 })

  // Org-level visibility: allow org members
  if (org.id !== token.organizationId && token.role !== 'admin') return NextResponse.json({ error: { code: 'forbidden', message: 'Access denied' } }, { status: 403 })

  return NextResponse.json({ data: org })
}

export async function PATCH(req: NextRequest, { params }: { params: { orgId: string } }) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: { code: 'unauthorized', message: 'Missing token' } }, { status: 401 })

  // Only org admins can modify org metadata. For now, enforce token.role === 'admin'.
  if (token.role !== 'admin') return NextResponse.json({ error: { code: 'forbidden', message: 'Admin access required' } }, { status: 403 })

  const body = await req.json()
  const parse = UpdateOrgSchema.safeParse(body)
  if (!parse.success) return NextResponse.json({ error: { code: 'invalid_input', message: 'Invalid body', details: parse.error.format() } }, { status: 400 })

  const org = await updateOrganization(params.orgId, { name: parse.data.name }, token.userId)
  if (!org) return NextResponse.json({ error: { code: 'not_found', message: 'Organization not found' } }, { status: 404 })
  return NextResponse.json({ data: org })
}
