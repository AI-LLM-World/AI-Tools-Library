import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTokenFromRequest } from '../../../../lib/auth'
import { getProject, updateProject, deleteProject } from '../../../../lib/dal'

const UpdateProjectSchema = z.object({
  name: z.string().optional(),
  metadata: z.any().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const token = getTokenFromRequest(_req)
  if (!token) return NextResponse.json({ error: { code: 'unauthorized', message: 'Missing token' } }, { status: 401 })

  const project = await getProject(params.projectId)
  if (!project || project.organizationId !== token.organizationId) return NextResponse.json({ error: { code: 'forbidden', message: 'Project not found or access denied' } }, { status: 403 })

  return NextResponse.json({ data: project })
}

export async function PATCH(req: NextRequest, { params }: { params: { projectId: string } }) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: { code: 'unauthorized', message: 'Missing token' } }, { status: 401 })

  const body = await req.json()
  const parse = UpdateProjectSchema.safeParse(body)
  if (!parse.success) return NextResponse.json({ error: { code: 'invalid_input', message: 'Invalid body', details: parse.error.format() } }, { status: 400 })

  const project = await updateProject(params.projectId, token.organizationId, { name: parse.data.name, metadata: parse.data.metadata }, token.userId)
  if (!project) return NextResponse.json({ error: { code: 'not_found', message: 'Project not found or access denied' } }, { status: 404 })
  return NextResponse.json({ data: project })
}

export async function DELETE(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const token = getTokenFromRequest(_req)
  if (!token) return NextResponse.json({ error: { code: 'unauthorized', message: 'Missing token' } }, { status: 401 })

  const project = await deleteProject(params.projectId, token.organizationId, token.userId)
  if (!project) return NextResponse.json({ error: { code: 'not_found', message: 'Project not found or access denied' } }, { status: 404 })
  return NextResponse.json({ data: project })
}
