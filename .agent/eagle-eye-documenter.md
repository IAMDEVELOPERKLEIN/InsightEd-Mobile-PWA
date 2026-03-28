---
name: project-architect-and-documenter
description: Comprehensive stacked skill for brainstorming, architectural design, application documentation, codebase analysis (routing/structure), and logging Antigravity conversations. Use this to initiate features, map complex apps, or preserve session context.
---
# Workspace Architect & Documentation Skill

This skill stacks multiple core competencies. Follow these directives rigorously to ensure the codebase, its architecture, and its historical context remain perfectly synchronized.

## 1. Brainstorming & Ideation (Pre-Implementation)
Use before creative or constructive work to transform vague ideas into validated designs.
* **Explore & Validate:** Analyze multiple approaches before writing code. Weigh technical pros and cons (e.g., handling offline mobile sync vs. real-time database flows).
* **Decide:** Present a clear, rationalized path forward that aligns with the existing project scope before starting implementation.

## 2. Architecture & Code Structure Analysis
Study, map, and document the application's underlying code structure and architectural decisions.
* **Routing & Flow:** Map out the complete request lifecycle. Trace the exact routing paths from front-end mobile/web components through backend API endpoints down to the database layers (e.g., tracing from a React component through Node.js down to PostgreSQL/Firebase).
* **Structural Mapping:** When requested, break the system down using C4 component models to clarify dependencies across the application.
* **Deployment Architecture:** Track the structural requirements for building, testing, and deploying progressive web apps or mobile packages to production environments.

## 3. Application Feature & Function Documentation
Generate detailed, accessible, and highly accurate documentation for all application capabilities.
* **Functional Specifications:** Detail the inputs, expected behaviors, and edge cases for core modules, such as administrative dashboards, pilot-testing feedback forms, and data visualization tools.
* **Technical Specifications:** Map functional requirements directly to their specific implementation details and directories within the codebase.
* **User Journeys:** Document how end-users step through the application's primary workflows.

## 4. Antigravity Conversation & Context Logging
Actively document the context of our Antigravity sessions to preserve knowledge and track the evolution of the application.
* **Session Summaries:** Create structured summaries of complex debugging, planning, or deployment conversations.
* **Architecture Decision Records (ADRs):** When a significant technical or structural choice is made during our chat, format it as an ADR to be saved in the project's documentation folder.
* **Context Checkpoints:** Before shifting to a new major task (e.g., moving from phase II testing to store deployment), generate an artifact capturing the current state, recent structural changes, and the immediate next steps.

## Execution Rules
1.  **Read First:** Always analyze the existing directory structure and routing files before generating architectural documentation.
2.  **Ground in Reality:** Base all feature documentation on the actual codebase realities rather than generic templates. 
3.  **Progressive Detail:** Start with high-level structural summaries and drill down into specific code-level documentation as requested.