import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { getCalendarClient } from '@/lib/calendar';

interface FindAvailabilityRequest {
  attendees: string[];
  duration: number; // in minutes
  startTime?: string; // ISO date string, defaults to now
  endTime?: string; // ISO date string, defaults to 7 days from now
}

// Helper function to check if a date is during working hours (9 AM - 5 PM, Mon-Fri)
function isWorkingHours(date: Date): boolean {
  const day = date.getDay();
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  // Check if it's a weekday (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) return false;
  
  // Check if it's between 9 AM and 5 PM
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 9 * 60 && totalMinutes < 17 * 60;
}

// Helper function to get the next working hour start time
function getNextWorkingHourStart(date: Date): Date {
  const next = new Date(date);
  
  // If it's after 5 PM, move to 9 AM next day
  if (date.getHours() >= 17) {
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
  }
  // If it's before 9 AM, move to 9 AM same day
  else if (date.getHours() < 9) {
    next.setHours(9, 0, 0, 0);
  }
  
  // If it's a weekend, move to Monday 9 AM
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
  }
  
  return next;
}

export async function POST(request: Request) {
  try {
    const session = await getAuthServerSession();
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { attendees, duration, startTime, endTime } = (await request.json()) as FindAvailabilityRequest;

    if (!attendees?.length || !duration) {
      return NextResponse.json({ error: 'Attendees and duration are required' }, { status: 400 });
    }

    // Filter out invalid email addresses
    const validAttendees = attendees.filter(email => 
      email && email !== 'unknown' && email.includes('@')
    );

    if (validAttendees.length === 0) {
      return NextResponse.json({ 
        error: 'No valid attendee email addresses provided',
        availableSlots: [],
        invalidAttendees: attendees
      }, { status: 400 });
    }

    const calendar = getCalendarClient(session.accessToken);
    
    // Default to next 7 days if not specified
    const start = startTime ? new Date(startTime) : new Date();
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Adjust start time to next working hour if needed
    const adjustedStart = getNextWorkingHourStart(start);

    try {
      // Get free/busy information for all attendees
      const freeBusyResponse = await calendar.freebusy.query({
        requestBody: {
          timeMin: adjustedStart.toISOString(),
          timeMax: end.toISOString(),
          items: validAttendees.map(email => ({ id: email })),
        },
      });

      // Find available time slots
      const busySlots = freeBusyResponse.data.calendars || {};
      const availableSlots: { start: string; end: string }[] = [];

      // Check for any errors in the response
      const errors = Object.entries(busySlots)
        .filter(([, calendar]) => calendar.errors)
        .map(([email, calendar]) => ({
          email,
          error: calendar.errors?.[0]?.reason || 'Unknown error'
        }));

      if (errors.length > 0) {
        const errorMessages = errors.map(e => 
          `${e.email}: ${e.error === 'notFound' ? 'Calendar not found' : 
            e.error === 'forbidden' ? 'No access to calendar' : 
            e.error}`
        ).join(', ');

        return NextResponse.json({
          error: 'Some attendees\' calendars could not be accessed',
          availableSlots: [],
          calendarErrors: errors,
          errorDetails: errorMessages,
          invalidAttendees: attendees.filter(email => !validAttendees.includes(email))
        }, { status: 400 });
      }

      // Convert busy slots to a more manageable format
      const allBusySlots = Object.values(busySlots).flatMap(calendar => 
        (calendar.busy || []).map(slot => ({
          start: new Date(slot.start || ''),
          end: new Date(slot.end || '')
        }))
      );

      // Sort busy slots by start time
      allBusySlots.sort((a, b) => a.start.getTime() - b.start.getTime());

      // Find gaps between busy slots
      let currentTime = adjustedStart;
      for (const busySlot of allBusySlots) {
        // Skip if we're not in working hours
        if (!isWorkingHours(currentTime)) {
          currentTime = getNextWorkingHourStart(currentTime);
          continue;
        }

        if (currentTime < busySlot.start) {
          const gapDuration = (busySlot.start.getTime() - currentTime.getTime()) / (60 * 1000);
          if (gapDuration >= duration) {
            // Check if the meeting would end after working hours
            const meetingEnd = new Date(currentTime.getTime() + duration * 60 * 1000);
            if (isWorkingHours(meetingEnd)) {
              availableSlots.push({
                start: currentTime.toISOString(),
                end: meetingEnd.toISOString()
              });
            }
          }
        }
        currentTime = new Date(Math.max(currentTime.getTime(), busySlot.end.getTime()));
      }

      // Check if there's time available after the last busy slot
      if (currentTime < end) {
        // Skip if we're not in working hours
        if (!isWorkingHours(currentTime)) {
          currentTime = getNextWorkingHourStart(currentTime);
        }

        if (currentTime < end) {
          const remainingDuration = (end.getTime() - currentTime.getTime()) / (60 * 1000);
          if (remainingDuration >= duration) {
            // Check if the meeting would end after working hours
            const meetingEnd = new Date(currentTime.getTime() + duration * 60 * 1000);
            if (isWorkingHours(meetingEnd)) {
              availableSlots.push({
                start: currentTime.toISOString(),
                end: meetingEnd.toISOString()
              });
            }
          }
        }
      }

      return NextResponse.json({ 
        availableSlots,
        invalidAttendees: attendees.filter(email => !validAttendees.includes(email))
      });
    } catch (calendarError) {
      console.error('Calendar API error:', calendarError);
      return NextResponse.json({ 
        error: 'Failed to access calendar information',
        availableSlots: [],
        invalidAttendees: attendees.filter(email => !validAttendees.includes(email))
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error finding availability:', error);
    return NextResponse.json(
      { 
        error: 'Failed to find availability',
        availableSlots: []
      },
      { status: 500 }
    );
  }
} 

