import { prisma } from './prisma'

export async function getProject(projectId: string) {
  return prisma.project.findUnique({ where: { id: projectId } })
}

export async function createResource(projectId: string, organizationId: string, data: { type: string; attributes?: any }, actorId?: string) {
  return prisma.$transaction(async (tx) => {
    const resource = await tx.resource.create({ data: { projectId, organizationId, type: data.type, attributes: data.attributes ?? {} } })
    await tx.auditLog.create({ data: { organizationId, resourceType: 'resource', resourceId: resource.id, action: 'create', actorId: actorId ?? null, before: null, after: resource } })
    return resource
  })
}

export async function listResources(projectId: string, organizationId: string) {
  return prisma.resource.findMany({ where: { projectId, organizationId, deletedAt: null } })
}
