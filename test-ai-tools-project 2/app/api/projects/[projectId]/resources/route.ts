import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import { getTokenFromRequest } from '../../../../lib/auth'

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
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project || project.organizationId !== token.organizationId) {
    return NextResponse.json({ error: { code: 'forbidden', message: 'Project not found or access denied' } }, { status: 403 })
  }

  // Create resource within a transaction and write audit log
  const result = await prisma.$transaction(async (tx) => {
    const resource = await tx.resource.create({
      data: {
        projectId,
        organizationId: token.organizationId,
        type: parse.data.type,
        attributes: parse.data.attributes ?? {},
      },
    })

    await tx.auditLog.create({
      data: {
        organizationId: token.organizationId,
        resourceType: 'resource',
        resourceId: resource.id,
        action: 'create',
        actorId: token.userId,
        before: null,
        after: resource,
      },
    })

    return resource
  })

  return NextResponse.json({ data: result }, { status: 201 })
}

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: { code: 'unauthorized', message: 'Missing token' } }, { status: 401 })
  const projectId = params.projectId

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project || project.organizationId !== token.organizationId) {
    return NextResponse.json({ error: { code: 'forbidden', message: 'Project not found or access denied' } }, { status: 403 })
  }

  const resources = await prisma.resource.findMany({ where: { projectId, organizationId: token.organizationId, deletedAt: null } })
  return NextResponse.json({ data: resources })
}
