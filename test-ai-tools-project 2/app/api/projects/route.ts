import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTokenFromRequest } from '../../lib/auth'
import { createProject, listProjects } from '../../lib/dal'

const CreateProjectSchema = z.object({
  name: z.string(),
  metadata: z.any().optional(),
})

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: { code: 'unauthorized', message: 'Missing token' } }, { status: 401 })

  const projects = await listProjects(token.organizationId)
  return NextResponse.json({ data: projects })
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: { code: 'unauthorized', message: 'Missing token' } }, { status: 401 })

  const body = await req.json()
  const parse = CreateProjectSchema.safeParse(body)
  if (!parse.success) return NextResponse.json({ error: { code: 'invalid_input', message: 'Invalid body', details: parse.error.format() } }, { status: 400 })

  const project = await createProject(token.organizationId, { name: parse.data.name, metadata: parse.data.metadata }, token.userId)
  return NextResponse.json({ data: project }, { status: 201 })
}
