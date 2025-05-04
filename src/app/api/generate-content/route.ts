/* /app/api/generate-content/route.ts */
import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';       // (Vercel quirk)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ContentType = 'prd' | 'brand';
interface GenerateContentRequest {
  type: ContentType;
  title: string;
  query: string;
  questions: string[];
  storedContext?: string;
  additionalContext: string;
  teamTerms: Record<string, string>;
}

const terms = {
  "Profile": "A person record that stores identifiers, custom properties, consent status, and a full activity timeline.",
  "Active profile": "Any profile that is not suppressed and can legally receive messages.",
  "Suppressed profile": "A profile blocked from messaging because of unsubscribe, hard bounce, spam complaint, or manual suppression.",
  "Activity feed": "Chronological list of every event attached to a profile for quick context.",
  "List": "Static collection of contacts that changes only when explicitly added or removed.",
  "Segment": "Dynamic audience that auto updates whenever its rule set becomes true or false for a profile.",
  "Segment condition": "Logical statements and time windows that define segment membership.",
  "Exclusion segment": "Segment referenced in send settings or flow filters to keep certain profiles from receiving messages.",
  "Default lists and segments": "Starter audiences that every new Klaviyo account receives out of the box.",
  "Consent status": "Stored opt-in state for email, SMS, or push that Klaviyo checks before each send.",
  "Double opt-in": "Flow where new subscribers confirm via a follow-up message before becoming subscribed.",
  "Re-engagement segment": "Dynamic group built around inactivity rules to win back lapsing subscribers.",
  "Predictive analytics fields": "Auto generated profile values such as lifetime value and churn risk once data thresholds are met.",
  "Customer Lifetime Value": "Historic revenue plus Klaviyo's forecast of future spend for that customer.",
  "Churn risk prediction": "Probability score estimating how likely a customer is to stop purchasing.",
  "Flow": "Automated series of actions triggered by an event, date, or audience change.",
  "Flow trigger": "Specific event, schedule, or list or segment join that drops a profile into a flow.",
  "Flow filter": "Gate checked at entry or each step that removes profiles no longer meeting criteria.",
  "Time delay": "Wait step that pauses a flow for a defined period or until a set time.",
  "Conditional split": "Yes or no branch in a flow based on profile data or event attributes.",
  "Trigger split": "Branch that keys off attributes of the triggering event itself such as cart value.",
  "Smart Sending window": "Safety interval that skips contacts who already got a message via that channel in a set timeframe.",
  "Smart Send Time": "Machine learning feature that picks the optimal send time for each subscriber.",
  "Needs Review queue": "List of flow emails awaiting manual approval before sending.",
  "Flows Performance Report": "Dashboard summarizing sends, opens, clicks, revenue, and conversions for all flows.",
  "Campaign": "One-time email or SMS sent to a chosen audience or test group.",
  "A/B test": "Controlled experiment that splits an audience and declares a variant winner based on engagement.",
  "UTM tracking": "Auto-appended Google Analytics parameters enabling revenue attribution to messages.",
  "Sunset flow": "Automation that suppresses chronically unengaged profiles after a re-permission attempt.",
  "Browse abandonment flow": "Series that triggers when someone views a product but does not start checkout.",
  "Cart abandonment flow": "High-revenue series triggered by cart or checkout events nudging completion.",
  "Post-purchase flow": "Follow-up automation after an order for cross-sell, education, or review requests.",
  "Win-back flow": "Automation targeting customers overdue for their next order based on predictive data.",
  "Universal content block": "Saved module that auto updates across every template referencing it.",
  "Dynamic content": "Template blocks that show or hide based on conditional logic at render time.",
  "Event variables": "Key-value pairs on an event that enable granular personalization in templates.",
  "Product block": "Drag and drop element that inserts products dynamically from the catalog.",
  "SMS marketing": "Native channel for promotional or conversational text messages inside Klaviyo.",
  "A2P messaging": "Application-to-Person SMS traffic subject to carrier vetting and regulations.",
  "SMS keyword": "Reserved word such as STOP or HELP that triggers automatic compliance responses.",
  "Quiet hours": "Account-level windows preventing SMS from sending during restricted local times.",
  "Toll-free verification": "Carrier registration process that unlocks higher SMS throughput on toll-free numbers.",
  "Short code": "Five or six digit number provisioned for high-volume SMS with faster delivery.",
  "TCPA compliance": "US regulations that require logged consent and opt-out handling for SMS marketing.",
  "Email template": "Reusable layout built in the drag and drop or HTML editor.",
  "Template editor": "No-code builder with sections, blocks, and mobile previews for email content.",
  "Brand library": "Central store of brand colors, fonts, and logos used across templates and forms.",
  "Signup form": "On-site or embedded form for collecting subscriber data and consent.",
  "Flyout form": "Slide-in variant of a popup anchored to a screen corner for quieter capture.",
  "Embedded form": "Static inline form that lives within the page layout such as a footer field.",
  "Form submit rate": "Percentage of form views that result in a successful subscription.",
  "Coupon codes": "Unique or static discounts tracked per profile and merge-tagged into messages.",
  "Metric": "Event stream such as Placed Order or Viewed Product logged with properties and timestamps.",
  "Event": "Single occurrence of a metric tied to a profile with payload data.",
  "Catalog": "Product feed containing items, prices, images, and URLs powering recommendations.",
  "Data feed": "Automated file or API job that refreshes catalog or inventory data.",
  "Deliverability hub": "Account dashboard grading sender reputation and surfacing engagement health metrics.",
  "Deliverability tab": "Message-level view showing open, click, bounce, spam, and unsubscribe performance.",
  "Bounce rate": "Share of attempted deliveries that returned bounces affecting future inbox placement.",
  "Open rate": "Percentage of delivered messages registering at least one open.",
  "Click rate": "Percentage of delivered messages with at least one unique link click.",
  "Unsubscribe rate": "Percentage of recipients who opted out relative to deliveries.",
  "Spam complaint rate": "Percentage of recipients who reported the message as spam.",
  "Revenue per recipient": "Total message revenue divided by delivered recipients.",
  "Benchmarks dashboard": "Analytics view comparing key metrics to peer merchants of similar size and vertical.",
  "Cohort report": "Retention chart showing repeat purchase behavior for customers acquired in the same period.",
  "Business Review dashboard": "Customizable board visualizing revenue and engagement for leadership meetings.",
  "Reports library": "Collection of saved or pre-built queries exportable as CSV or to BI tools.",
  "Deliverability score": "Composite 0-100 rating reflecting recent engagement and bounce metrics.",
  "Sender reputation": "How mailbox providers perceive a domain and IP health based on past metrics.",
  "CAN-SPAM compliance": "US law requiring a postal address, functional unsubscribe link, and truthful headers.",
  "GDPR settings": "EU data rules; Klaviyo logs consent timestamp and IP for compliance.",
  "Suppression list": "Master list of suppressed emails preventing accidental remailing.",
  "Deliverability dashboard in campaigns": "In-campaign panel flagging problematic recipient domains before damage occurs.",
  "API key private": "Secret token for authenticating server-side API calls with configurable scopes.",
  "API key public": "Six character site identifier for client-side Track and Identify calls.",
  "Profiles API": "Endpoints to create, update, and query profiles in bulk.",
  "Segments API": "Endpoints for programmatic creation, editing, or deletion of segments.",
  "Flows API": "Endpoints to fetch or create flows programmatically for templated automation.",
  "Track API": "Client-side endpoint for logging custom events in real time.",
  "Identify API": "Client-side endpoint for setting profile properties from browser or mobile app.",
  "Events endpoint": "Server-side route for high-volume secure ingestion of transactional events.",
  "Rate limits": "Default cap of 75 API requests per second per account returning 429 when exceeded.",
  "OAuth apps": "Third-party integrations that use OAuth for scoped token exchange instead of static keys.",
  "Integration": "Continuous connection syncing data between Klaviyo and an external platform.",
  "Shopify integration": "Connector importing orders, carts, products, and enabling on-store signup forms.",
  "Magento integration": "Connector that syncs customers, orders, and catalog from Adobe Commerce.",
  "Multi-store setup": "Single Klaviyo account ingesting multiple ecommerce stores identified by store ID.",
  "Data Warehouse Export": "Hourly drops of raw Klaviyo tables to S3 or Snowflake for advanced BI.",
  "Webhooks": "Real-time callbacks pushing event data to external systems like Slack or a custom CRM.",
  "Partner Marketplace": "Directory of vetted apps and agencies integrating with Klaviyo.",
  "Klaviyo AI subject line assistant": "Machine learning tool that proposes high-engagement subject lines.",
  "Product recommendations block": "Algorithmic element that inserts best products for each recipient.",
  "Predictive search": "Autocomplete widget ranking onsite search results with behavioral data.",
  "Customer Hub": "Service console that surfaces profile data, order history, and engagements for support.",
  "Reviews": "Native review request flow and dashboard feeding user content back into segmentation.",
  "Helpdesk ticket sync": "Apps like Zendesk push ticket events into Klaviyo for automated follow up.",
  "Benchmarks tab in Customer Hub": "Compares a brand's support metrics to industry peers once connected.",
  "Deliverability Health alerts": "Automated warnings that flag rising spam or bounces and recommend fixes"
}

export async function POST(request: Request) {
  try {
    /* 1. Auth */
    const session = await getAuthServerSession();
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    /* 2. Parse body */
    const {
      type, title, query, questions,
      storedContext, additionalContext, teamTerms,
    } = (await request.json()) as GenerateContentRequest;

    /* 3A. PRD – streamed */
    if (type === 'prd') {
      if (!storedContext) {
        return NextResponse.json(
          { error: 'Stored context required for PRD generation' },
          { status: 400 },
        );
      }
      const ctx = JSON.parse(storedContext);

      const prdStream = await openai.chat.completions.create({
        model: 'o3',
        stream: true,
        messages: [
          {
            role: 'user',
            content:`I have  included a list of key terms that you may need to use to generate your response. Use this as background information to help you understand the rest of the prompt. ${Object.keys(terms).join(', ')}

            I've also included a list of key terms that my team has defined for our product. Use this as background information to help you understand the rest of the prompt. ${Object.keys(teamTerms).join(', ')}
                    
            I've included instructions for how to think and write PRDs like a product manager with" ${ctx.examplesOfHowYouThink} "I've also included background on how to think like the K:Service team" ${ctx.pillarGoalsKeyTermsBackground} "I've included a doc that starts with Building a Product That Grows With Its Users to demonstrate my personal philosophy on how we should approach building a product to cross sell to existing users" ${ctx.howYouThinkAboutProduct} "I've included a doc that outlines the strategic goals of the Unified Inbox product for the rest of the year" ${ctx.teamStrategy} 
            
            
            
            "I've included example text from work that my team has already done that I want for you to use as additional context for relevant features and terms" ${additionalContext} "I've asked you to write a PRD for the following question" ${query} "I've also included a list of questions and answers about the PRD to provide additional clarity around how we should approach the PRD." ${questions} "When I ask you to write a doc, I want you to evaluate the Job to be Done statement I provide from each perspective (Product Manager, K:Service Team, and Building a product that grows with its users) before beginning to write the PRD. Once done with that step, I want you to write the document with a focus on narrow scope, highly detailed breakdowns of which feature will support which part of the JTBD, and an open questions section that interrogates the JTBD from each of your perspectives (K:service, Product, my philosophy) our edits should be returned in markdown format`,
          },
        ],
      });

      return streamTextResponse(prdStream);
    }

    /* 3B. Brand-messaging – streamed */
    const brandStream = await openai.chat.completions.create({
      model: 'o3',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are a brand-messaging expert …`,
        },
        {
          role: 'user',
          content:
`Create a comprehensive brand-messaging doc in markdown.

Title: ${title}
Background query: ${query}
Q&A: ${questions.join('\n')}`,
        },
      ],
    });

    return streamTextResponse(brandStream);

  } catch (err) {
    console.error('generate-content error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate content' },
      { status: 500 },
    );
  }
}

/* Helper: turns AsyncIterable<Chunk> → NextResponse(stream) */
function streamTextResponse(iterable: AsyncIterable<OpenAI.ChatCompletionChunk>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async pull(controller) {
      for await (const chunk of iterable) {
        controller.enqueue(encoder.encode(chunk.choices[0]?.delta?.content ?? ''));
      }
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}