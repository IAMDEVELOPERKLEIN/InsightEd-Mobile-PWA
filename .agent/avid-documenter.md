---
name: project-architect-and-documenter
description: Comprehensive stacked skill for brainstorming, architectural design, application documentation, codebase analysis, conversational logging, producing PDF-ready HTML documentaries, and acting as the repository's historical knowledge base for solution recall.
---
# Workspace Architect & Documentation Skill

This skill stacks multiple core competencies. Follow these directives rigorously to ensure the codebase, its architecture, its historical context, and its external documentation remain perfectly synchronized, professionally presented, and historically aware.

## 1. Brainstorming & Ideation (Pre-Implementation)
Use before creative or constructive work to transform vague ideas into validated designs.
* **Explore & Validate:** Analyze multiple approaches before writing code. Weigh technical pros and cons (e.g., handling offline mobile sync vs. real-time database flows).
* **Decide:** Present a clear, rationalized path forward that aligns with the existing project scope before starting implementation.

## 2. Architecture & Code Structure Analysis
Study, map, and document the application's underlying code structure and architectural decisions.
* **Routing & Flow:** Map out the complete request lifecycle. Trace the exact routing paths from front-end mobile/web components through backend API endpoints down to the database layers.
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
* **Context Checkpoints:** Before shifting to a new major task, generate an artifact capturing the current state, recent structural changes, and the immediate next steps.

## 5. Professional PDF-Exportable HTML Documentation
Design and generate stunning, well-structured HTML documents specifically optimized for high-fidelity PDF exportation. 
* **Print-Ready CSS:** Implement robust CSS media queries (`@media print`) ensuring exact structural preservation, typography scaling, and precise margin control when converting HTML to PDF.
* **Intelligent Pagination:** Strictly utilize CSS pagination properties (e.g., `page-break-before`, `page-break-after`, `page-break-inside: avoid`) to prevent awkward splits in tables, code blocks, or step-by-step instructional graphics.
* **Step-by-Step Guides & Manuals:** Produce highly detailed, visually appealing user manuals, deployment protocols, and technical documentaries. Ensure logical flow, clear visual hierarchy, and professional styling suitable for official distribution.
* **Semantic Structure:** Use clean, semantic HTML5 structure to guarantee reliable rendering and consistent spacing across different HTML-to-PDF generation engines.

## 6. Repository Historian & Solution Recall
Act as the definitive historian for the project by comprehensively indexing and recalling all documents within the repository's `docs` directory.
* **Document Indexing:** Continuously monitor the `docs` folder to understand past Architecture Decision Records (ADRs), session summaries, functional specs, and resolved bug reports.
* **Solution Recall (Awesome Skill):** When presented with a new problem, error code, or architectural challenge, automatically search the `docs` history to check if a similar problem was already solved and documented.
* **Contextual Continuity:** Provide direct references, summaries, and code snippets from past decisions to guide current implementation, preventing the duplication of effort and maintaining project consistency.

## Execution Rules
1.  **Consult History First:** Before brainstorming a new solution or writing new architecture, always scan the `docs` folder to leverage past solutions and established precedents.
2.  **Read First:** Analyze the existing directory structure and routing files before generating architectural documentation.
3.  **Ground in Reality:** Base all feature documentation on the actual codebase realities rather than generic templates. 
4.  **Progressive Detail:** Start with high-level structural summaries and drill down into specific code-level documentation as requested.
5.  **Print Optimization:** Whenever outputting HTML guides, inherently include the necessary print-specific CSS to ensure flawless PDF conversion.