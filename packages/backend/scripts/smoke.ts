import 'reflect-metadata'
import request from 'supertest'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'

async function run() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  await app.init() // do not listen/bind port; use in-memory express instance
  const server = (app as any).getHttpAdapter().getInstance()

  // 1) Health
  const h = await request(server).get('/api/health').expect(200)
  console.log('health:', h.body)

  // 2) Projects list (empty OK)
  const list0 = await request(server).get('/api/projects').expect(200)
  console.log('projects:', list0.body.length)

  // 3) Create project
  const created = await request(server)
    .post('/api/projects')
    .send({ name: '迁移验证项目', description: 'smoke' })
    .expect(201)
  console.log('created project id:', created.body.id)

  // 4) Read project by id
  await request(server).get(`/api/projects/${created.body.id}`).expect(200)

  // 5) Knowledge: create root folder and file
  const k1 = await request(server)
    .post(`/api/projects/${created.body.id}/knowledge/nodes`)
    .send({ name: 'docs', type: 'folder' })
    .expect(201)
  const k2 = await request(server)
    .post(`/api/projects/${created.body.id}/knowledge/nodes`)
    .send({ name: 'README.md', type: 'file', parentId: k1.body.id })
    .expect(201)
  console.log('knowledge created:', k1.body.id, k2.body.id)

  // 6) Versions: create draft, set main, publish, stable
  const v = await request(server)
    .post(`/api/projects/${created.body.id}/versions`)
    .send({ version: 'v1', notes: 'init' })
    .expect(201)
  await request(server)
    .put(`/api/projects/${created.body.id}/versions/${v.body.id}/knowledge/main`)
    .send({ content: '# Title' })
    .expect(200)
  await request(server)
    .put(`/api/projects/${created.body.id}/versions/${v.body.id}/knowledge/nodes/${k2.body.id}/content`)
    .send({ content: '<head/><extend/>' })
    .expect(200)
  await request(server)
    .post(`/api/projects/${created.body.id}/versions/${v.body.id}/publish`)
    .expect(201)
  await request(server)
    .post(`/api/projects/${created.body.id}/versions/${v.body.id}/stable`)
    .expect(200)

  // 7) Snapshot and stable reads
  const snap = await request(server)
    .get(`/api/projects/${created.body.id}/versions/${v.body.id}/snapshot`)
    .expect(200)
  console.log('snapshot keys:', Object.keys(snap.body))
  await request(server)
    .get(`/api/projects/${created.body.id}/versions/stable/knowledge/main`)
    .expect(200)

  await app.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
