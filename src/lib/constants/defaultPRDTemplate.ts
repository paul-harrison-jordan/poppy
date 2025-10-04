export const DEFAULT_ANNOTATED_PRD = `
### Background on the job of a product manager at Klaviyo.

Product Managers at Klaviyo are highly-skilled practitioners, who are directly responsible for driving significant business outcomes. Their main skill is turning a customer pain point into a product feature they use to solve that pain point. We do this through writing PRDs. 

PRDs (Product Requirement Documents) that outline a customer problem (Job to be Done, or JTBD) and our proposed approach to solving that JTBD problem. 

We are not attached to a specific feature, but are obsessed with making sure we have the right JTBD. Because we know that solving real problems for our customers will get us product adoption. 

We will interrogate a JTBD to ensure it solves a specific problem for a specific type of customer. For Service, we write PRDs that solve problems for: 

- A support agent trying to resolve a customer issue through a ticket  
- A solopreneur (one person company) looking to set things up quickly, when they don’t have an idea of how to set things up correctly  
- A marketer looking to use service data to make their marketing better. 

Not all PRDs require a JTBD for each of these personas, but it’s good context to understand who we’re trying to solve problems for over time. 

It’s important to take that JTBD and turn that into key in scope and out of scope areas of focus. While there are many ways we can extend functionality to solve more problems, only ideas and areas that directly solve the specific JTBD outlined should be considered in scope. If we sense that a PRD is getting too large, either in scope or in detail, we break them down into smaller, successive PRDs that solve the JTBD incrementally. 

Let’s use an example. Below is a real JTBD for our customers. 

### Example Job to be Done Statement

#### Support Agent 

**When** I start working on resolving customer issues, **I want to** assign tickets to myself and easily see which tickets are my responsibility to solve**,** **so that** I can take ownership of a particular issue and resolve it for the customer

**Today**, all ticket statuses are at the account level, and there is not transparency into who is currently working a ticket.

**This is suboptimal** because I am unable to see what I am responsible for solving. 

This is a good Job statement for three key reasons: 

1) It is clear what the agent is trying to accomplish (in this case, they want to easily see which tickets they are responsible for resolving)  
2) We quickly understand the current situation (there is no way to assign tickets)  
3) It’s clear how the current state of the product fails to solve their problem.

There are many ways to approach solving this JTBD. We could create basic ticket routing, give the user the ability to tag tickets so they could create assignment rules, or even think bigger by trying to create advanced logic around how and why a ticket gets assigned to a user. 

Many of these ideas are good, but we are at risk of failing to solve for the core JTBD if we stray too far from it. The Agent has a problem because they can’t see what work they need to do, only solutions that resolve that problem should be considered. Below is how you could break down ideas as in scope or out of scope.

A good out of scope section keeps the team focused on a feature that is specific, narrow, and impactful. Oftentimes, it’s more important whats in the out of scope section because you need to get many stakeholders involved who may not have context on the project. A clear out of scope section makes it easy to get feedback on the remaining PRD because people have a shared understanding of whats being considered. 

A good in scope section evolves the JTBD statement slightly, beginning to think through solutioning and ways we can address the JTBD. It does not propose full solutions, but does tease out core things we’ll need to do to resolve the problem. As an example, it would be a great in scope note to say “Give customers a way to assign tickets to themselves” because it is specific enough to give the reader a sense of what the feature could look like, but open ended enough where there could be many ways to implement that idea. Ultimately, in scope is about evolving your JTBD into a group of ideas and goals that will turn into your full feature table.

### Example in scope/out of scope ideas  In Scope:

- Create relationship between agent and ticket, rather than account and ticket (resolving a technical blocker to assigning tickets to a user)  
- Update filters to be user scoped (resolving a technical blocker to assigning tickets to a user)  
- Create method of ticket assignment at the list and detail levels (updating design to enable ticket assignment)  
- Create ability to transfer tickets between agents (solving for an edge case where a user is assigned a ticket incorrectly)  
- Enable support agent to filter their own tickets by status, as well as view tickets by assigned agent. (empower agents to view which of their assigned tickets are most important)  
- Support viewing all unassigned tickets (empower agents to assign tickets to themselves)

Out of Scope:

- Create multi agent assigned tickets (that’s not in the JTBD)  
- Create full report detailing ticket status (Open, Closed, promoter, detractor) by agent (this is useful, but not related to our core JTBD)  
- Building routing logic to specific agents (this is solving a different JTBD)  
- Agent configuration (not relevant)  
- Creating agent profile settings for photo (not relevant to tickets)  
- Filter based on segment (Advanced feature we may consider later)  
- Revamping our search functionality (the Job to be done does not mention search as an issue)  
- Buying a ticket assignment company.

### Example Feature Requirement Table

Once we have our in scope ideas, we break them down into feature requirements. These are specific features our solution must have to solve the JTBD. below is an example feature Requirement Table that is based on our example JTBD.

A feature table should be specific on things we need to build, and tie those back to sections of the JTBD. It’s important to have the full context of the area you’re building into, so your features are feasible and not at odds with the existing product. 

For this example Feature table, the main issue is that we don’t have a way to store tickets yet, so it was in scope to propose a migration to a ticket based storage system from our previous conversation based system. 

It’s okay for features to push or change existing technical architecture, but it needs to be outlined and proved that it will deliver meaningful customer value. 

| Requirement | Functionality | Notes |
| :---- | :---- | :---- |
| Update SMS conversations to be tickets.  | Changing the behavior of SMS conversations from “one long conversation" to individual conversations started when a customer reached out, and ended when the agent closed the ticket.  |  |
| Agent must be able to “assign ticket to any agent” | Select a ticket from the queue to be assigned to them, at which point the ticket will move from the queue view to the assigned view.  |  |
| Agent must be able to change owner of a ticket | An agent must be able to view a ticket, and change the assigned support agent from them to someone else, or from someone else to them.  | Where do we put the UI for this? Reinforce text box like for “assign” or reinforce ticket information area? Will not be storing changelog of assigned agent to start, may add if we get feedback from customers. |
| Agent must be able to set ticket to “unassigned” | Let an agent change a ticket from being assigned to an agent to being “unassigned” | Assigning a ticket to an agent means someone is working on it, want to give agents place to put tickets they’re planning on working on but not at the moment |
| Agent must be able to view currently assigned tickets | Agent must have single view showing all assigned tickets |  |
| Agent must be able to view unassigned tickets | Agent must have single view showing all unassigned tickets (tickets that are not assigned to any agent) |  |
| Filter assigned tickets  | Agent must be able to filter their assigned tickets to see open/closed/snoozed | Less than 1% of conversations visitors are using this feature |
| Create “Ticket Information” Section | Now that we have tickets, we need to show agents key information about them to reinforce them as the atomic unit of value they’re working on.  | Provide key information on the ticket:  Status Open Snoozed  Closed  Assignee List of agents, selectable Most recent message Ticket create Date Labels (editable) Notes |
| Migrate Existing Conversations to ticket model | All existing conversations will become a ticket | Not necessarily a data migration, change of behavior on closing of tickets, receiving a message.  |

### Key Questions:

Part of a great PRD is showing your thinking, and outlining key questions that led you to the requirements outlined in your feature requirements table. Additionally, key questions would also show your thinking about what could come next for the feature. There are tradeoffs to consider, and showing that you’ve thought through them is key to getting stakeholders bought in on your product feature. 

Below are examples of those key questions for the feature requirement table. 

#### What will be turned on for everyone vs be enabled via the feature flag?

Will be turned on for everyone.

#### Will we backfill data to support new features like audit trails, etc in the future?

No, we will begin storing data once the feature is released. 

#### What are the new inbox views? 

| View | Details |
| :---- | :---- |
| Unassigned | Queue of tickets “up for grabs”. In the future, we will build out routing features that reduce the importance/necessity of the unassigned queue, but for now it’s the hub of unassigned tickets.  |
| My tickets | The tickets assigned to the user logged into Klaviyo |
| Assigned to others | The tickets assigned to any other users. In the future, we may build out a more advanced view breaking down the agent names and ticket totals, but for now it will be a single view.  |

#### What do we change about the profile detail view to help the support agent?

Like the existing inbox view, the profile detail view is solely a view of the profile the agent is talking with. Some of this information is not helpful to resolving customer issues (Consent information only confuses reps, if a person reaches out you have consent to message them). 

Creating the concept of a ticket to be assigned means that we must include information about the ticket for the agent to use as part of their job. 

| Change | Thoughts/Details | Screenshot |
| :---- | :---- | :---- |
| Introduct Ticket Overview Section | Provide key information on the ticket:  Status Open Snoozed  Closed  Assignee List of agents, selectable Most recent message Ticket create Date Labels (editable) Notes (editable)  |  |
| Assign Ticket Action | When viewing an unassigned ticket,replying to the message will assign the ticket to the agent.  | Full options discussed [here](#how-do-we-reduce-ticket-assignment-fatigue-for-single-member-teams?) |

#### What changes do we make to conversations?

Conversations for inbox are a single thread of messages that opens or closes based on the customer reaching back out to the merchant. This means that If I reach out to a brand multiple times, it all appears in a single thread of conversation. 

This is at odds with our position that inbox will be a ticket based helpdesk. This is a fundamentally limiting behavior that will not scale as we compete more head to head with Gorgias. It limits our ability to report on the performance of agents, understand the nature of support requests through tags, and more.   
	  
How do we manage multi agent concurrency for a single ticket?  
In instances when multiple agents attempt to assign the same ticket to themselves, we’ll assign the ticket to whoever selected it first, and attempt a refresh of the state of the ticket on both views to show the second agent the ticket was assigned to the other rep. 

#### Do we migrate existing conversations to tickets?

	Does cannibalizing conversations into Inbox take away something from customers unintentionally? We need to make sure this is a thoughtful decision, and that we are okay with the tradeoff of ripping out a previous solution. 

- Check with Grant  
- Check Usage stats  
- Yes we’re okay with this, just need more details on impact/plan of action.

		

| Did we Choose this? | Option | Pros | Cons |
| :---- | :---- | :---- | :---- |
| Yes, we chose this option because it balanced a small scope of work and still migrated the conversations to become tickets.  | Migrate all conversations to Tickets, with no attempt to split up conversation to multiple tickets for reporting | \- Captures the value of past work \- Smaller scope, less interpretation for engineering to decide where a ticket would have started and ended |  |
| No, we did not chose this option because of the larger scope, and the position it put Klaviyo in to make judgement calls with imperfect information for customers | Migrate all conversations to Tickets, split up conversation to multiple tickets for reporting | \- Captures the value of past work \- would maximize the value of existing inbox users | \- Larger scope \- Puts klaviyo in a position to make judgement calls on things we can’t make with 100% confidence  |
| No, we did not choose this plan because it would not create an ideal state once released. Meaning more confusion for our customers.  | Do not migrate conversations to ticket, only begin creating tickets with new outreach | \- Smallest Scope | \- Creates weird mixed state for customers \- We would still effectively be “closing” past conversations by creating a ticket for the customer when they reach back out.  |

#### How will we determine when a customer outreach is a new ticket, or a continuation of a closed ticket?

		

| Did we Choose this? | Option | Pros | Cons |
| :---- | :---- | :---- | :---- |
| No, it was inflexible and inflated ticket volume which means there are more things for an agent to navigate through that don’t require their attention. | Once a ticket is closed, it cannot be re-opened and will always create a new ticket.  | \- Simple expected behavior \- Would imagine most e-com tickets are one-offs and less complex than B2B tickets | \- inflexible \- Will inflate ticket volume, creating more for agents to sift through |
| Yes, we picked this because it was the least likely solution to result in a false positive.  | If a customer responds within a set amount of time from when a ticket was closed, we will re-open an existing ticket. The default will be 3 days, if we get feedback about it being too restrictive we’ll change it to an account setting.  | \- Could make configurable for customer \- Less likely to have false positives, especially if setting time window to be generous (7 days for example) | \- Would need to create ability for agent to create new ticket from outreach mistakenly added to past closed ticket  |
| No, it was too hard and too risky. | Depending on the sentiment of the customer response, we will either create a new ticket or re-open a closed ticket.  | \- lets klaviyo handle the hard stuff | \- Klaviyo has to figure out how to handle the hard stuff \- Bad experience could kill trust \- brands may not like the lack of configurability.  |

#### How do we empower users to correct edge cases where we get ticket creation wrong?

	Despite our settings determining when to create a new ticket or re-open an old one, there will still be edge cases where an agent will want control to either:

- merge tickets together (correcting a mistaken duplicate ticket, or dealing with a customer who spams support on a single issue)   
- Split tickets (Correcting a mistaken re-opened ticket, or dealing with a customer who is asking multiple unrelated questions in a single thread)

For now, we will only support splitting tickets. If we see agents requesting the ability to merge tickets, we will revisit adding that support. 

| Did we pick this | Situation | Expected Behavior | Key Features |
| :---- | :---- | :---- | :---- |
| Yes, splitting tickets is a common task that we need to support | An agent wants to split a ticket into two tickets | An Agent Would be able to select “Split into new ticket” from point in the ticket from which to split it.  | \- Ability to split ticket into two tickets \- Ability to select from which point in time a ticket is split |
| No, there is an easy workaround (closing one of the tickets) that is available.  | An agent wants to merge two or more tickets into a single ticket | An agent would select multiple tickets from the overview column, and see a prompt to merge them.  | \- Merge tickets into single ticket \- Select which ticket to keep the conversation for |

#### 

#### What information do we add to past tickets?

#### 	While we will not support reporting on tickets with this scope of work, creating a standardized set of information for a ticket is in scope for this work.

#### How do we reduce ticket assignment fatigue for single member teams? {#how-do-we-reduce-ticket-assignment-fatigue-for-single-member-teams?}

	Ticket assignment helps merchants identify and resolve customer issues quickly. For merchants with a single support agent, having to manually assign tickets to themselves each time one comes in is a bad experience that slows down their work. We must support single member teams with the initial release of ticket assignment. 

| Did we choose this? | Option | Pros | Cons |
| :---- | :---- | :---- | :---- |
| Yes, closes pain gaps for small brands who may not have full teams. | Create inbox setting to “assign all tickets to X” | \- distinct from routing \- set and forget it \- still lets small brands benefit from ticket reporting down the line \- Education concerns can be mitigated during beta/support | \- Customer may not know to set that up \- We’ll need to educate/drive accounts to that page, but don’t have clarity on which accounts would benefit from this setting.  |
| no | Create setting to opt into ticket assignment feature, default is unassigned view | \- Less work for customers to do  | \- Feels like this would put us in design hell? |
| yes | Allow users to assign multiple tickets to themselves at once | \- Convenient for agents to manage a large backlog of tickets | \- doesn’t fully solve the single agent support experience, they’d have to keep doing this forever |
| No | For accounts with one agent, auto assign all tickets to the agent | \- customer wouldn’t need to enable a setting | \- we don’t track which users are support agents yet \- Building support agent role is farther reaching than just ticket assignment, would want that to be it’s own PRD. |
| yes | Build “Respond to assign” to replace the proposed “click to assign” section on the text box of the agent. Would only apply to tickets that are unassigned  | \- Removes tedious step that would be required for every unassigned ticket \- Helps agent get right to work |  |

 

As Markdown

Product Manager Point of view:

Background on the job of a product manager at Klaviyo.

Product Managers at Klaviyo are highly-skilled practitioners, who are directly responsible for driving significant business outcomes. Their main skill is turning a customer pain point into a product feature they use to solve that pain point. We do this through writing PRDs.

PRDs (Product Requirement Documents) that outline a customer problem (Job to be Done, or JTBD) and our proposed approach to solving that JTBD problem.

We are not attached to a specific feature, but are obsessed with making sure we have the right JTBD. Because we know that solving real problems for our customers will get us product adoption.

We will interrogate a JTBD to ensure it solves a specific problem for a specific type of customer. For Service, we write PRDs that solve problems for: A support agent trying to resolve a customer issue through a ticket A solopreneur (one person company) looking to set things up quickly, when they don’t have an idea of how to set things up correctly A marketer looking to use service data to make their marketing better.

Not all PRDs require a JTBD for each of these personas, but it’s good context to understand who we’re trying to solve problems for over time.

It’s important to take that JTBD and turn that into key in scope and out of scope areas of focus. While there are many ways we can extend functionality to solve more problems, only ideas and areas that directly solve the specific JTBD outlined should be considered in scope. If we sense that a PRD is getting too large, either in scope or in detail, we break them down into smaller, successive PRDs that solve the JTBD incrementally.

Let’s use an example. Below is a real JTBD for our customers.

Example Job to be Done Statement Support Agent When I start working on resolving customer issues, I want to assign tickets to myself and easily see which tickets are my responsibility to solve, so that I can take ownership of a particular issue and resolve it for the customer

Today, all ticket statuses are at the account level, and there is not transparency into who is currently working a ticket.

This is suboptimal because I am unable to see what I am responsible for solving.

This is a good Job statement for three key reasons: It is clear what the agent is trying to accomplish (in this case, they want to easily see which tickets they are responsible for resolving) We quickly understand the current situation (there is no way to assign tickets) It’s clear how the current state of the product fails to solve their problem.

There are many ways to approach solving this JTBD. We could create basic ticket routing, give the user the ability to tag tickets so they could create assignment rules, or even think bigger by trying to create advanced logic around how and why a ticket gets assigned to a user.

Many of these ideas are good, but we are at risk of failing to solve for the core JTBD if we stray too far from it. The Agent has a problem because they can’t see what work they need to do, only solutions that resolve that problem should be considered. Below is how you could break down ideas as in scope or out of scope.

A good out of scope section keeps the team focused on a feature that is specific, narrow, and impactful. Oftentimes, it’s more important whats in the out of scope section because you need to get many stakeholders involved who may not have context on the project. A clear out of scope section makes it easy to get feedback on the remaining PRD because people have a shared understanding of whats being considered.

A good in scope section evolves the JTBD statement slightly, beginning to think through solutioning and ways we can address the JTBD. It does not propose full solutions, but does tease out core things we’ll need to do to resolve the problem. As an example, it would be a great in scope note to say “Give customers a way to assign tickets to themselves” because it is specific enough to give the reader a sense of what the feature could look like, but open ended enough where there could be many ways to implement that idea. Ultimately, in scope is about evolving your JTBD into a group of ideas and goals that will turn into your full feature table. Example in scope/out of scope ideas

In Scope: Create relationship between agent and ticket, rather than account and ticket (resolving a technical blocker to assigning tickets to a user) Update filters to be user scoped (resolving a technical blocker to assigning tickets to a user) Create method of ticket assignment at the list and detail levels (updating design to enable ticket assignment) Create ability to transfer tickets between agents (solving for an edge case where a user is assigned a ticket incorrectly) Enable support agent to filter their own tickets by status, as well as view tickets by assigned agent. (empower agents to view which of their assigned tickets are most important) Support viewing all unassigned tickets (empower agents to assign tickets to themselves) Out of Scope: Create multi agent assigned tickets (that’s not in the JTBD) Create full report detailing ticket status (Open, Closed, promoter, detractor) by agent (this is useful, but not related to our core JTBD) Building routing logic to specific agents (this is solving a different JTBD) Agent configuration (not relevant) Creating agent profile settings for photo (not relevant to tickets) Filter based on segment (Advanced feature we may consider later) Revamping our search functionality (the Job to be done does not mention search as an issue) Buying a ticket assignment company.

Example Feature Requirement Table

Once we have our in scope ideas, we break them down into feature requirements. These are specific features our solution must have to solve the JTBD. below is an example feature Requirement Table that is based on our example JTBD.

A feature table should be specific on things we need to build, and tie those back to sections of the JTBD. It’s important to have the full context of the area you’re building into, so your features are feasible and not at odds with the existing product.

For this example Feature table, the main issue is that we don’t have a way to store tickets yet, so it was in scope to propose a migration to a ticket based storage system from our previous conversation based system.

It’s okay for features to push or change existing technical architecture, but it needs to be outlined and proved that it will deliver meaningful customer value.

Requirement Functionality Notes Update SMS conversations to be tickets. Changing the behavior of SMS conversations from “one long conversation" to individual conversations started when a customer reached out, and ended when the agent closed the ticket.

Agent must be able to “assign ticket to any agent” Select a ticket from the queue to be assigned to them, at which point the ticket will move from the queue view to the assigned view.

Agent must be able to change owner of a ticket An agent must be able to view a ticket, and change the assigned support agent from them to someone else, or from someone else to them. Where do we put the UI for this? Reinforce text box like for “assign” or reinforce ticket information area?

Will not be storing changelog of assigned agent to start, may add if we get feedback from customers. Agent must be able to set ticket to “unassigned” Let an agent change a ticket from being assigned to an agent to being “unassigned” Assigning a ticket to an agent means someone is working on it, want to give agents place to put tickets they’re planning on working on but not at the moment Agent must be able to view currently assigned tickets Agent must have single view showing all assigned tickets

Agent must be able to view unassigned tickets Agent must have single view showing all unassigned tickets (tickets that are not assigned to any agent)

Filter assigned tickets Agent must be able to filter their assigned tickets to see open/closed/snoozed Less than 1% of conversations visitors are using this feature Create “Ticket Information” Section Now that we have tickets, we need to show agents key information about them to reinforce them as the atomic unit of value they’re working on. Provide key information on the ticket: Status Open Snoozed Closed Assignee List of agents, selectable Most recent message Ticket create Date Labels (editable) Notes Migrate Existing Conversations to ticket model All existing conversations will become a ticket Not necessarily a data migration, change of behavior on closing of tickets, receiving a message.

Key Questions:

Part of a great PRD is showing your thinking, and outlining key questions that led you to the requirements outlined in your feature requirements table. Additionally, key questions would also show your thinking about what could come next for the feature. There are tradeoffs to consider, and showing that you’ve thought through them is key to getting stakeholders bought in on your product feature.

Below are examples of those key questions for the feature requirement table.

What will be turned on for everyone vs be enabled via the feature flag? Will be turned on for everyone. Will we backfill data to support new features like audit trails, etc in the future? No, we will begin storing data once the feature is released.

What are the new inbox views?

View Details Unassigned Queue of tickets “up for grabs”. In the future, we will build out routing features that reduce the importance/necessity of the unassigned queue, but for now it’s the hub of unassigned tickets. My tickets The tickets assigned to the user logged into Klaviyo Assigned to others The tickets assigned to any other users. In the future, we may build out a more advanced view breaking down the agent names and ticket totals, but for now it will be a single view.

What do we change about the profile detail view to help the support agent?

Like the existing inbox view, the profile detail view is solely a view of the profile the agent is talking with. Some of this information is not helpful to resolving customer issues (Consent information only confuses reps, if a person reaches out you have consent to message them).

Creating the concept of a ticket to be assigned means that we must include information about the ticket for the agent to use as part of their job.

Change Thoughts/Details Screenshot Introduct Ticket Overview Section Provide key information on the ticket: Status Open Snoozed Closed Assignee List of agents, selectable Most recent message Ticket create Date Labels (editable) Notes (editable)

Assign Ticket Action When viewing an unassigned ticket,replying to the message will assign the ticket to the agent. Full options discussed here

What changes do we make to conversations? Conversations for inbox are a single thread of messages that opens or closes based on the customer reaching back out to the merchant. This means that If I reach out to a brand multiple times, it all appears in a single thread of conversation.

This is at odds with our position that inbox will be a ticket based helpdesk. This is a fundamentally limiting behavior that will not scale as we compete more head to head with Gorgias. It limits our ability to report on the performance of agents, understand the nature of support requests through tags, and more.

How do we manage multi agent concurrency for a single ticket? In instances when multiple agents attempt to assign the same ticket to themselves, we’ll assign the ticket to whoever selected it first, and attempt a refresh of the state of the ticket on both views to show the second agent the ticket was assigned to the other rep. Do we migrate existing conversations to tickets? Does cannibalizing conversations into Inbox take away something from customers unintentionally? We need to make sure this is a thoughtful decision, and that we are okay with the tradeoff of ripping out a previous solution. Check with Grant Check Usage stats Yes we’re okay with this, just need more details on impact/plan of action.

Did we Choose this? Option Pros Cons Yes, we chose this option because it balanced a small scope of work and still migrated the conversations to become tickets. Migrate all conversations to Tickets, with no attempt to split up conversation to multiple tickets for reporting

- Captures the value of past work  
- Smaller scope, less interpretation for engineering to decide where a ticket would have started and ended

No, we did not chose this option because of the larger scope, and the position it put Klaviyo in to make judgement calls with imperfect information for customers Migrate all conversations to Tickets, split up conversation to multiple tickets for reporting

- Captures the value of past work  
- would maximize the value of existing inbox users  
- Larger scope  
- Puts klaviyo in a position to make judgement calls on things we can’t make with 100% confidence

No, we did not choose this plan because it would not create an ideal state once released. Meaning more confusion for our customers. Do not migrate conversations to ticket, only begin creating tickets with new outreach

- Smallest Scope  
- Creates weird mixed state for customers  
- We would still effectively be “closing” past conversations by creating a ticket for the customer when they reach back out.

How will we determine when a customer outreach is a new ticket, or a continuation of a closed ticket?

Did we Choose this? Option Pros Cons No, it was inflexible and inflated ticket volume which means there are more things for an agent to navigate through that don’t require their attention. Once a ticket is closed, it cannot be re-opened and will always create a new ticket.

- Simple expected behavior  
- Would imagine most e-com tickets are one-offs and less complex than B2B tickets  
- inflexible  
- Will inflate ticket volume, creating more for agents to sift through Yes, we picked this because it was the least likely solution to result in a false positive. If a customer responds within a set amount of time from when a ticket was closed, we will re-open an existing ticket. The default will be 3 days, if we get feedback about it being too restrictive we’ll change it to an account setting.  
- Could make configurable for customer  
- Less likely to have false positives, especially if setting time window to be generous (7 days for example)  
- Would need to create ability for agent to create new ticket from outreach mistakenly added to past closed ticket

No, it was too hard and too risky. Depending on the sentiment of the customer response, we will either create a new ticket or re-open a closed ticket.

- lets klaviyo handle the hard stuff  
- Klaviyo has to figure out how to handle the hard stuff  
- Bad experience could kill trust  
- brands may not like the lack of configurability.

How do we empower users to correct edge cases where we get ticket creation wrong? Despite our settings determining when to create a new ticket or re-open an old one, there will still be edge cases where an agent will want control to either: merge tickets together (correcting a mistaken duplicate ticket, or dealing with a customer who spams support on a single issue) Split tickets (Correcting a mistaken re-opened ticket, or dealing with a customer who is asking multiple unrelated questions in a single thread)

For now, we will only support splitting tickets. If we see agents requesting the ability to merge tickets, we will revisit adding that support.

Did we pick this Situation Expected Behavior Key Features Yes, splitting tickets is a common task that we need to support An agent wants to split a ticket into two tickets An Agent Would be able to select “Split into new ticket” from point in the ticket from which to split it.

- Ability to split ticket into two tickets  
- Ability to select from which point in time a ticket is split No, there is an easy workaround (closing one of the tickets) that is available. An agent wants to merge two or more tickets into a single ticket An agent would select multiple tickets from the overview column, and see a prompt to merge them.  
- Merge tickets into single ticket  
- Select which ticket to keep the conversation for

What information do we add to past tickets? While we will not support reporting on tickets with this scope of work, creating a standardized set of information for a ticket is in scope for this work.

How do we reduce ticket assignment fatigue for single member teams? Ticket assignment helps merchants identify and resolve customer issues quickly. For merchants with a single support agent, having to manually assign tickets to themselves each time one comes in is a bad experience that slows down their work. We must support single member teams with the initial release of ticket assignment.

Did we choose this? Option Pros Cons Yes, closes pain gaps for small brands who may not have full teams. Create inbox setting to “assign all tickets to X”

- distinct from routing  
    
- set and forget it  
    
- still lets small brands benefit from ticket reporting down the line  
    
- Education concerns can be mitigated during beta/support  
    
- Customer may not know to set that up  
    
- We’ll need to educate/drive accounts to that page, but don’t have clarity on which accounts would benefit from this setting. no Create setting to opt into ticket assignment feature, default is unassigned view  
    
- Less work for customers to do  
    
- Feels like this would put us in design hell? yes Allow users to assign multiple tickets to themselves at once  
    
- Convenient for agents to manage a large backlog of tickets  
    
- doesn’t fully solve the single agent support experience, they’d have to keep doing this forever No For accounts with one agent, auto assign all tickets to the agent  
    
- customer wouldn’t need to enable a setting  
    
- we don’t track which users are support agents yet  
    
- Building support agent role is farther reaching than just ticket assignment, would want that to be it’s own PRD. yes Build “Respond to assign” to replace the proposed “click to assign” section on the text box of the agent. Would only apply to tickets that are unassigned  
    
- Removes tedious step that would be required for every unassigned ticket  
    
- Helps agent get right to work
`;

export const DEFAULT_PRD_CONTEXT = {
  examplesOfHowYouThink: DEFAULT_ANNOTATED_PRD,
  isSystemDefault: true,
};