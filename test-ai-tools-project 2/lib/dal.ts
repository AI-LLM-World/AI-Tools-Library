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

export async function getResource(resourceId: string) {
  return prisma.resource.findUnique({ where: { id: resourceId } })
}

export async function updateResource(resourceId: string, organizationId: string, updates: { type?: string; attributes?: any }, actorId?: string, expectedVersion?: number) {
  // Optimistic locking: read current row, ensure org matches, then update using the observed version
  return prisma.$transaction(async (tx) => {
    const before = await tx.resource.findUnique({ where: { id: resourceId } })
    if (!before) return null
    if (before.organizationId !== organizationId) return null

    const requiredVersion = expectedVersion ?? before.version

    // Attempt to apply update only if version matches (optimistic lock)
    const newVersion = before.version + 1

    const data: any = {}
    if (updates.type !== undefined) data.type = updates.type
    if (updates.attributes !== undefined) data.attributes = updates.attributes
    data.version = newVersion

    const result = await tx.resource.updateMany({
      where: { id: resourceId, organizationId, version: requiredVersion, deletedAt: null },
      data,
    })

    if (result.count === 0) {
      const err: any = new Error('conflict')
      err.code = 'conflict'
      throw err
    }

    const after = await tx.resource.findUnique({ where: { id: resourceId } })

    await tx.auditLog.create({ data: { organizationId, resourceType: 'resource', resourceId, action: 'update', actorId: actorId ?? null, before, after } })

    return after
  })
}

export async function deleteResource(resourceId: string, organizationId: string, actorId?: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.resource.findUnique({ where: { id: resourceId } })
    if (!before) return null
    if (before.organizationId !== organizationId) return null

    const after = await tx.resource.update({ where: { id: resourceId }, data: { deletedAt: new Date() } })

    await tx.auditLog.create({ data: { organizationId, resourceType: 'resource', resourceId, action: 'delete', actorId: actorId ?? null, before, after } })

    return after
  })
}

export async function listAuditLogs(resourceId: string, organizationId: string) {
  return prisma.auditLog.findMany({ where: { resourceId, organizationId }, orderBy: { createdAt: 'desc' } })
}
