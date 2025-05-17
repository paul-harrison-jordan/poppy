import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../resync/route'

vi.mock('@/lib/auth', () => ({
  getAuthServerSession: vi.fn().mockResolvedValue({ user: { name: 'Test User' } })
}))

const list = vi.fn()
const deleteMany = vi.fn()
const upsert = vi.fn()
const namespace = vi.fn(() => ({ list, deleteMany, upsert }))
vi.mock('@/lib/pinecone', () => ({
  getUserIndex: vi.fn(() => ({ namespace }))
}))

function createRequest(body: any) {
  return { json: async () => body } as unknown as Request
}

describe('resync route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists vectors, deletes them and upserts new ones', async () => {
    list.mockResolvedValue({ vectors: [{ id: 'abc1' }] })
    deleteMany.mockResolvedValue(undefined)
    upsert.mockResolvedValue(undefined)

    const req = createRequest({ prefix: 'abc', vectors: [{ id: 'abc1', values: [] }] })
    const res = await POST(req)

    expect(list).toHaveBeenCalledWith({ prefix: 'abc' })
    expect(deleteMany).toHaveBeenCalledWith(['abc1'])
    expect(upsert).toHaveBeenCalledWith([{ id: 'abc1', values: [] }])
    expect(res.status).toBe(200)
  })

  it('returns 500 when deletion fails', async () => {
    list.mockResolvedValue({ vectors: [{ id: 'fail1' }] })
    deleteMany.mockRejectedValue(new Error('failed'))

    const req = createRequest({ prefix: 'fail', vectors: [] })
    const res = await POST(req)

    expect(res.status).toBe(500)
  })
})

