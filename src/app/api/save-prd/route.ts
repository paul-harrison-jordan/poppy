import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceClient } from '@/utils/supabase/service';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, title, docType = 'prd' } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'Missing required field: url' }, { status: 400 });
    }

    // Use service client for database operations
    const supabase = createServiceClient();

    const documentData = {
      'drive-link': url,
      'user': session.user.email,
      'title': title || (docType === 'tech-doc' ? 'Untitled Tech Doc' : 'Untitled PRD'),
      'last_updated_by': session.user.email
    };

    // Add type-specific fields
    if (docType === 'tech-doc') {
      Object.assign(documentData, {
        'v0-link': '',
        'status': 'documentation',
        'description': 'Technical documentation',
        'priority_order': 999 // Put tech docs at end
      });
    } else {
      // Default PRD fields
      Object.assign(documentData, {
        'v0-link': '',
        'status': 'planned',
        'description': '',
        'priority_order': 0
      });
    }

    const { data, error } = await supabase
      .from('prds')
      .insert([documentData])
      .select();
    
    if (error) {
      console.error('Supabase error saving PRD:', error);
      return NextResponse.json({ 
        error: 'Failed to save PRD', 
        details: error.message 
      }, { status: 500 });
    }

    console.log('PRD saved to database successfully:', data);
    
    // Trigger automatic customer matching for new PRDs only (not tech docs)
    if (data && data[0] && docType === 'prd') {
      try {
        // Get PRD content from Google Drive to match customers
        const docId = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
        if (docId) {
          // Fetch document content
          const docResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/get-google-doc-content`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '' // Forward auth cookies
            },
            body: JSON.stringify({ docId }),
          });

          if (docResponse.ok) {
            const { content } = await docResponse.json();
            if (content) {
              // Start background customer matching - summarize then match
              console.log('Starting automatic customer matching for PRD:', data[0].id);
              
              // First summarize, then match (background process)
              fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/summarize-prd`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Cookie': request.headers.get('cookie') || ''
                },
                body: JSON.stringify({
                  prdContent: content,
                  title: title || 'Untitled PRD'
                }),
              }).then(async (summaryResponse) => {
                if (summaryResponse.ok) {
                  const { summary } = await summaryResponse.json();
                  
                  // Now match customers with the summary
                  return fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/match-customers-to-prd`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Cookie': request.headers.get('cookie') || ''
                    },
                    body: JSON.stringify({ prdSummary: summary }),
                  });
                }
              }).then(async (matchResponse) => {
                if (matchResponse?.ok) {
                  const matchData = await matchResponse.json();
                  console.log(`Background customer matching completed: ${matchData.matchCount} matches found`);
                }
              }).catch(error => {
                console.error('Background customer matching failed:', error);
                // Don't fail the PRD creation if matching fails
              });
            }
          }
        }
      } catch (error) {
        console.error('Error during automatic customer matching:', error);
        // Don't fail the PRD creation if matching fails
      }
    }

    return NextResponse.json({ success: true, data: data[0] });

  } catch (error) {
    console.error('Error in save-prd API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}