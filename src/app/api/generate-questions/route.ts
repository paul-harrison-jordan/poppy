import { NextResponse } from 'next/server';
import { getUserIndex, createUserIndex } from '@/lib/pinecone';
import { getAuthServerSession } from '@/lib/auth';
import { OpenAI } from 'openai';
import { embedChunks } from '@/app/embed';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  "Benchmarks tab in Customer Hub": "Compares a brand’s support metrics to industry peers once connected.",
  "Deliverability Health alerts": "Automated warnings that flag rising spam or bounces and recommend fixes"
}

export interface Question {
  /** Unique identifier (can be reused as display text if desired) */
  id?: string;
  /** The full question presented to the user or team */
  text: string;
  /** Explanation of why the question matters */
  reasoning: string;
}

/** API or function response containing an ordered list of questions */
export interface QuestionsResponse {
  questions: Question[];
}
export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

      // Format username to comply with Pinecone naming requirements
      const formattedUsername = authSession.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-') // Replace multiple consecutive hyphens with a single one
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    const indexName = `prd-${formattedUsername}`;
    
    const index = getUserIndex(indexName);
    const { title, query } = await request.json();

    // Get embedding for the combined title and query
    const embeddings = await embedChunks([`${title}\n${query}`]);
    const embedding = embeddings[0]['embedding']; // Take the first embedding from the array

    // Ensure embedding is an array of numbers
    if (!Array.isArray(embedding) || !embedding.every(n => typeof n === 'number')) {
      console.error('Invalid embedding format:', embedding);
      throw new Error('Invalid embedding format');
    }

    console.log('Embedding length:', embedding.length);
    console.log('First few values:', embedding.slice(0, 5));

    // Query Pinecone
    const queryResponse = await index.namespace('ns1').query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
    });

    // Extract relevant context from Pinecone results
    const relevantContext = queryResponse.matches
      ?.map(match => match.metadata?.text || '')
      .join('\n\n') || '';

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a product manager helping to write a PRD. Please generate 3 specific questions in JSON format that would help you write a more impactful PRD based on the title and initial query. Make the questions focused on understanding the user's needs, goals, and constraints.

          Be a clarity creator. Your job is to create clarity about the problems we are solving, the solutions we are building, and the steps we are taking to deliver value to customers. It is your job to reduce ambiguity, ensure visibility and alignment of your projects.

          Know the system. You need to be able to break down technical systems and problems such that you can support engineers in making good engineering decisions. Learn our systems so that you can talk about how everything fits together.

          Be opinionated. You have your own point of view / opinion of how the product should work (Relying entirely on customers to tell you what to build is lazy). But, you listen and adapt as you learn new information. Think: Strong opinions, loosely held.

          Be detail oriented. You care deeply about the details, but know that nothing will be perfect. You pay thorough attention to details while you guide towards making decisions and making progress. Think: Perfection is the enemy of done.

          Push the envelope. You think beyond what already exists and what people are talking about today. You imagine what can exist tomorrow based on the trajectories that you are observing today. You embrace innovation, high-risk/high-reward, and failure as a way to learn.

          Here is some relevant context from similar PRDs:
          ${relevantContext}
          I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a product manager would ask.
          ${Object.keys(terms).join(', ')}
          
          Please respond with a JSON object containing an array of questions, where each question has an 'id' and 'text' property. the JSON object shuld also have a reasoning property, where you outline why you asked the question. Include a 'background' property after the questions array that contains a list of key terms that you may need to use to generate questions. For example:
          {
            "questions": [
              {
                "id": "q1",
                "text": "What specific problem are you trying to solve?",
                "reasoning": "This question helps the product manager understand the problem they are trying to solve."
              },
              {
                "id": "q2",
                "text": "Who are the primary users of this feature?",
                "reasoning": "This question helps the product manager understand the users of the feature."
              },
              {
                "id": "q3",
                "text": "What are the key success metrics?",
                "reasoning": "This question helps the product manager understand the success metrics for the feature."  
              }
            ],
            "background": [
              "Profile",
              "Active profile",
              "Suppressed profile",
              "Activity feed",
            ]
          }`
        },
        {
          role: "user",
          content: `Our goal is to return 3 questions that a product manager would ask to help them write a PRD. Use the following as background for the types of answers your questions should elicit. I want you to think like your an experienced and accomplished product manager: I've included some themes of what PRDs should embody (problem-oriented, clear success criteria, just enough direction, urgency, and short and sweet).
          Problem-oriented: They crystallize the problem being solved in a few strong sentences—ideally near the top of the document—to focus the brainpower of every teammate in the same direction.

          Clear success criteria: They super-specifically define what success looks like when the product or feature ships, at first to make sure it’s even worth doing, and later to help everyone make tradeoff decisions throughout the project.

          Just enough direction: They give the reader (e.g. engineers, designers, managers) just enough an idea of what the project will entail—including requirements and constraints—without eliminating the opportunity for (your super-smart) teammates to come up with even better solutions.

          Urgency: There’s a clear (proposed) timeline by which to review, align on, build and ship the project, to keep the project moving forward (and from exploding in scope).
          
          Short and sweet: In the end, if you want this document to be used, it needs to be readable. Put additional context into an appendix at the end
          Title: ${title}\nQuery: ${query}`
        }
      ],
      model: "o4-mini",
      response_format: { type: "json_object" },
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Ensure we have exactly 3 questions
    const questions = Array.isArray(response.questions) 
      ? response.questions.slice(0, 3).map((q: Question) => ({
          id: q.text, // Use the actual question text as the ID
          text: q.text,
          reasoning: q.reasoning,
        }))
      : [];

    return NextResponse.json({ questions: questions as QuestionsResponse });
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
} 
