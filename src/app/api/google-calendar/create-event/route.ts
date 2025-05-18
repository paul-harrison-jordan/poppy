import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { getCalendarClient } from '@/lib/calendar';

interface CreateEventRequest {
  title: string;
  attendees?: string[];
  start: string; // ISO date string
  end: string;   // ISO date string
}

export async function POST(request: Request) {
  try {
    const session = await getAuthServerSession();
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { title, attendees = [], start, end } = (await request.json()) as CreateEventRequest;

    if (!title || !start || !end) {
      return NextResponse.json({ error: 'Missing event details' }, { status: 400 });
    }

    const calendar = getCalendarClient(session.accessToken);
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: title,
        start: { dateTime: start },
        end: { dateTime: end },
        attendees: attendees.map(email => ({ email })),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

