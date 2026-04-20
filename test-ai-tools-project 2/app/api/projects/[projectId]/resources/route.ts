import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTokenFromRequest } from '../../../../lib/auth'
import { getProject, createResource, listResources } from '../../../../lib/dal'

const CreateResourceSchema = z.object({
  type: z.string(),
  attributes: z.record(z.any()).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: { code: 'unauthorized', message: 'Missing token' } }, { status: 401 })

  const projectId = params.projectId
  const body = await req.json()
  const parse = CreateResourceSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: { code: 'invalid_input', message: 'Invalid body', details: parse.error.format() } }, { status: 400 })
  }

  // Verify project belongs to token.organizationId
  const project = await getProject(projectId)
  if (!project || project.organizationId !== token.organizationId) {
    return NextResponse.json({ error: { code: 'forbidden', message: 'Project not found or access denied' } }, { status: 403 })
  }

  const result = await createResource(projectId, token.organizationId, { type: parse.data.type, attributes: parse.data.attributes }, token.userId)

  return NextResponse.json({ data: result }, { status: 201 })
}

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: { code: 'unauthorized', message: 'Missing token' } }, { status: 401 })
  const projectId = params.projectId

  const project = await getProject(projectId)
  if (!project || project.organizationId !== token.organizationId) {
    return NextResponse.json({ error: { code: 'forbidden', message: 'Project not found or access denied' } }, { status: 403 })
  }

  const resources = await listResources(projectId, token.organizationId)
  return NextResponse.json({ data: resources })
}
