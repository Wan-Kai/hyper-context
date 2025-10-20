/* Minimal JS seed for Hyper Context */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const now = new Date()
  const project = await prisma.project.upsert({
    where: { id: 'p-001' },
    update: {},
    create: {
      id: 'p-001',
      name: 'Hyper Docs',
      description: '示例项目，用于开发期验证数据库结构',
      mcpStatus: 'active'
    }
  })

  const folder = await prisma.knowledgeNode.upsert({
    where: { id: 'kn-root' },
    update: {},
    create: {
      id: 'kn-root',
      projectId: project.id,
      name: 'docs',
      type: 'folder',
      sortOrder: 0
    }
  })

  const file = await prisma.knowledgeNode.upsert({
    where: { id: 'kn-intro' },
    update: {},
    create: {
      id: 'kn-intro',
      projectId: project.id,
      name: '介绍.md',
      type: 'file',
      parentId: folder.id,
      sortOrder: 0
    }
  })

  const version = await prisma.version.upsert({
    where: { id: 'v-2.1.0' },
    update: {},
    create: {
      id: 'v-2.1.0',
      projectId: project.id,
      version: '2.1.0',
      status: 'published',
      isStable: true,
      notes: '初始化稳定发布',
      treeSnapshot: JSON.stringify([
        { id: folder.id, name: folder.name, type: folder.type, parentId: null, sortOrder: 0 },
        { id: file.id, name: file.name, type: file.type, parentId: folder.id, sortOrder: 0 }
      ]),
      createdAt: now
    }
  })

  await prisma.project.update({
    where: { id: project.id },
    data: { stableVersionId: version.id, updatedAt: new Date() }
  })

  await prisma.versionContent.upsert({
    where: { versionId: version.id },
    update: { main: '# Hyper Docs\n\n欢迎使用 Hyper Context！' },
    create: {
      id: 'vc-2.1.0',
      projectId: project.id,
      versionId: version.id,
      main: '# Hyper Docs\n\n欢迎使用 Hyper Context！'
    }
  })

  await prisma.nodeContent.upsert({
    where: { versionId_nodeId: { versionId: version.id, nodeId: file.id } },
    update: { content: `<head>\n  <name>${file.name}</name>\n  <level>core</level>\n  <description>项目介绍与结构说明</description>\n</head>\n<extend>\n  <block>\n    <name>术语表</name>\n    <level>extend</level>\n    <description>核心术语释义</description>\n    <content>术语 A、术语 B...</content>\n  </block>\n</extend>` },
    create: {
      versionId: version.id,
      nodeId: file.id,
      content: `<head>\n  <name>${file.name}</name>\n  <level>core</level>\n  <description>项目介绍与结构说明</description>\n</head>\n<extend>\n  <block>\n    <name>术语表</name>\n    <level>extend</level>\n    <description>核心术语释义</description>\n    <content>术语 A、术语 B...</content>\n  </block>\n</extend>`
    }
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
