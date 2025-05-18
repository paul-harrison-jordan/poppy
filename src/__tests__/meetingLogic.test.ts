import { describe, it, expect, vi } from 'vitest'
import { shouldScheduleMeeting, createCalendarEvent, CalendarEvent } from '@/lib/meetingLogic'

// Mock googleapis calendar API
const insertMock = vi.fn()
class OAuth2 {
  setCredentials = vi.fn()
}
vi.mock('googleapis', () => {
  return {
    google: {
      auth: { OAuth2 },
      calendar: vi.fn(() => ({ events: { insert: insertMock } }))
    }
  }
})

describe('shouldScheduleMeeting', () => {
  it('returns true when a comment includes meeting keywords', () => {
    const comments = [
      'Let\'s schedule a meeting to discuss this further.',
      'I have some questions.'
    ]
    expect(shouldScheduleMeeting(comments)).toBe(true)
  })

  it('returns false when a comment explicitly states no meeting is needed', () => {
    const comments = [
      'We resolved the issue. No meeting necessary.'
    ]
    expect(shouldScheduleMeeting(comments)).toBe(false)
  })

  it('returns false when comments do not mention meetings', () => {
    const comments = [
      'Looks good to me',
      'Ship it!'
    ]
    expect(shouldScheduleMeeting(comments)).toBe(false)
  })

  it('prefers negative phrases over meeting keywords', () => {
    const comments = [
      'Let\'s meet soon',
      'Actually, don\'t schedule anything yet'
    ]
    expect(shouldScheduleMeeting(comments)).toBe(false)
  })
})

describe('createCalendarEvent', () => {
  const token = 'token'
  const event: CalendarEvent = { summary: 'sync', start: '2024-01-01T10:00:00Z', end: '2024-01-01T10:30:00Z' }

  it('returns true when event creation succeeds', async () => {
    insertMock.mockResolvedValue({ data: { id: '1' } })
    const result = await createCalendarEvent(token, event)
    expect(result).toBe(true)
    expect(insertMock).toHaveBeenCalled()
  })

  it('returns false when event creation fails', async () => {
    insertMock.mockRejectedValue(new Error('fail'))
    const result = await createCalendarEvent(token, event)
    expect(result).toBe(false)
    expect(insertMock).toHaveBeenCalled()
  })
})
