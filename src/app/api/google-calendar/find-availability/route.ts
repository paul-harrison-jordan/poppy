import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { getCalendarClient } from '@/lib/calendar';
import { Session } from 'next-auth';

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

// Helper function to find common free slots between busy periods
function findCommonFreeSlots(
  busyPeriods: Array<Array<{ start?: string | null; end?: string | null }>>,
  startTime: Date,
  endTime: Date,
  duration: number
): Array<{ start: string; end: string }> {
  // Filter out any busy periods with null/undefined start/end times
  const validBusyPeriods = busyPeriods.map(periods => 
    periods.filter(period => period.start && period.end)
  );

  // If no busy periods, return the entire time range
  if (validBusyPeriods.every(periods => periods.length === 0)) {
    return [{
      start: startTime.toISOString(),
      end: endTime.toISOString()
    }];
  }

  // Merge all busy periods into a single timeline
  const allBusyPeriods = validBusyPeriods.flat().sort((a, b) => 
    new Date(a.start!).getTime() - new Date(b.start!).getTime()
  );

  // Find free slots
  const freeSlots: Array<{ start: string; end: string }> = [];
  let currentTime = new Date(startTime);

  for (const busy of allBusyPeriods) {
    const busyStart = new Date(busy.start!);
    const busyEnd = new Date(busy.end!);

    // If there's a gap between current time and busy start
    if (currentTime < busyStart) {
      const slotEnd = new Date(Math.min(busyStart.getTime(), endTime.getTime()));
      const slotDuration = (slotEnd.getTime() - currentTime.getTime()) / (1000 * 60); // in minutes

      // Only add slot if it's long enough and during working hours
      if (slotDuration >= duration && isWorkingHours(currentTime)) {
        freeSlots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString()
        });
      }
    }

    // Move current time to the end of this busy period
    currentTime = new Date(Math.max(currentTime.getTime(), busyEnd.getTime()));
  }

  // Check for remaining time after last busy period
  if (currentTime < endTime) {
    const slotDuration = (endTime.getTime() - currentTime.getTime()) / (1000 * 60); // in minutes
    if (slotDuration >= duration && isWorkingHours(currentTime)) {
      freeSlots.push({
        start: currentTime.toISOString(),
        end: endTime.toISOString()
      });
    }
  }

  // Split slots into chunks of the requested duration
  const durationMs = duration * 60 * 1000;
  const finalSlots: Array<{ start: string; end: string }> = [];

  for (const slot of freeSlots) {
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);
    let currentSlotStart = slotStart;

    while (currentSlotStart.getTime() + durationMs <= slotEnd.getTime()) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMs);
      if (isWorkingHours(currentSlotStart)) {
        finalSlots.push({
          start: currentSlotStart.toISOString(),
          end: currentSlotEnd.toISOString()
        });
      }
      currentSlotStart = new Date(currentSlotStart.getTime() + 30 * 60 * 1000); // Move forward by 30 minutes
    }
  }

  return finalSlots;
}

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    if (!session.accessToken) {
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
    const adjustedEnd = end;

    // Get busy periods for all attendees
    const busyPeriods = await Promise.all(
      validAttendees.map(async (email) => {
        const response = await calendar.freebusy.query({
          requestBody: {
            timeMin: adjustedStart.toISOString(),
            timeMax: adjustedEnd.toISOString(),
            items: [{ id: email }],
          },
        });
        return response.data.calendars?.[email]?.busy || [];
      })
    );

    // Find common free slots
    const availableSlots = findCommonFreeSlots(
      busyPeriods,
      adjustedStart,
      adjustedEnd,
      duration
    );

    return NextResponse.json({ availableSlots });
  } catch (error) {
    console.error('Error finding availability:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to find availability' },
      { status: 500 }
    );
  }
}); 

