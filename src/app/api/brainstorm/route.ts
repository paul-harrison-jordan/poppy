/* /app/api/generate-content/route.ts */
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export const dynamic = 'force-dynamic';       // (Vercel quirk)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}


export async function POST(request: Request) {
  try {
    // 2. Parse and validate request body
    const { messages, additionalContext, teamTerms, storedContext, startPrd } = await request.json();

    if (!Array.isArray(messages) || !additionalContext || !storedContext) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // 3. Construct system prompt with all context
    const formattedTeamTerms = Object.entries(teamTerms)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');
      const ctx = JSON.parse(storedContext);
    let systemPrompt = ''
    if (startPrd) {
      systemPrompt = `You are an expert product manager. Review and analyze the conversation between the user and the assistant. Summarize the conversation so that it can be used to draft a PRD. When reviewing, make sure to evaluate it from each of the users perspectives.
      
      Here is the user's personal context:
      ${ctx.personalContext}

      Here is the user's team context:
      ${ctx.teamContext}

      Here is how the user wants you think about writing the PRD:
      ${ctx.prdInstructions}

      Here is a list of key terms about core features of our company:
      ${terms}

      Your summary should be a few paragraphs that capture the key questions and information the user was working with, and the decisions they made during the conversation. Your Summary must include the best Job to be done statement that the user is trying to achieve.

      you must also add a title to the PRD that captures the key idea of the PRD.

      your summary must be returned in JSON format as follows: 

      {
        "title": "<title of the PRD>",
        "summary": "<summary of the PRD>"
      }
      `;
    } else {
      systemPrompt = `
      You are a tool being used by a product manager to brainstorm. You may get messages that are about an idea, a problem they're trying to solve, or a feature they're trying to build. Your mission is to expertly coax great ideas out of the user with short, pointed questions and comments that help them think through their idea. Over time, the user should be able to summarize the conversation and use it to draft a PRD.

      PMs are trusting you to help them think through their ideas, and have shared some context from PRDs and features you have access to from ${additionalContext}

      // Here are the team's key terms:
      // ${formattedTeamTerms}

      // Here is the user's personal context:
      // ${storedContext.personalContext}

      // Here is the user's team context:
      // ${storedContext.teamContext}
      
      Answer the user's question using the above context and terms. If the context is not enough, say so. You are meant to be a representation of the users work, so you should know the answers to the questions.

      Your responses should be concise and to the point, and must be no more than 200 words. You should strive to be helpful, insightful, and concise. You must propose a single question or comment at a time.
    `;
    }

    // 4. Call OpenAI with all context and message history
    const chatMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: ChatMessage) => ({ 
        role: m.role, 
        content: m.content 
      } as ChatCompletionMessageParam)),
    ];

    const stream = await openai.chat.completions.create({
      model: 'o3',
      messages: chatMessages,
      stream: true,
    });

    // 5. Return streaming response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error in brainstorm API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}