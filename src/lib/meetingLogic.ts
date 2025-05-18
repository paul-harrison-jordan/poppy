export interface CalendarEvent {
  summary: string
  start: string
  end: string
}

/**
 * Determine whether a meeting should be scheduled based on comment content.
 * Returns true if any comment contains meeting related keywords unless a
 * comment explicitly states that no meeting is needed.
 */
export function shouldScheduleMeeting(comments: string[]): boolean {
  const denyPhrases = ['no meeting', "don't schedule", 'no need to meet']
  const meetingKeywords = ['meet', 'meeting', 'call', 'schedule', 'zoom', 'hangout', 'sync']

  let foundKeyword = false

  for (const comment of comments) {
    const lower = comment.toLowerCase()
    if (denyPhrases.some(p => lower.includes(p))) {
      return false
    }
    if (meetingKeywords.some(k => lower.includes(k))) {
      foundKeyword = true
    }
  }

  return foundKeyword
}

import { google } from 'googleapis'

/**
 * Create a calendar event using the Google Calendar API.
 * Returns true if the event was successfully created, otherwise false.
 */
export async function createCalendarEvent(accessToken: string, event: CalendarEvent): Promise<boolean> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const calendar = google.calendar({ version: 'v3', auth })
  try {
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        start: { dateTime: event.start },
        end: { dateTime: event.end }
      }
    })
    return true
  } catch (err) {
    console.error('Error creating calendar event:', err)
    return false
  }
}
