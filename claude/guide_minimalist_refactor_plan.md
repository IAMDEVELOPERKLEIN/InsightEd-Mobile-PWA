# Implementation Plan: Minimalist Guide Refactor

The goal is to simplify the layout of the School Head Quick Start guide (`public/schoolheadquickstart.html`) by replacing multiple instructional boxes and lists with a single, concise summary box for each unit. This will create a cleaner, more minimalist look while maintaining essential information.

## Proposed Changes

### Content Refactoring

#### [MODIFY] [schoolheadquickstart.html](file:///e:/InsightEd-Mobile-PWA/public/schoolheadquickstart.html)
For Units 1, 2, 3, 4, 6, 7, and 8, replace the diverse sets of cards/alerts with a uniform summary box.

**Summaries to be implemented (All < 50 words):**
- **Unit 1**: Confirm your school’s identity, official name, and establishment dates. Upload required ownership documentation and link any mother or annex schools to ensure a complete profile.
- **Unit 2**: Log enrollment by grade level and gender. The system validates that male and female counts match the total. Use the combination tool to accurately group multigrade classes.
- **Unit 3**: Organize class sections and assign instructional shifts. Categorize each section by density—Less Than, Within, or Above Standard—to monitor and maintain optimal learner-teacher ratios across your campus.
- **Unit 4**: Record specialized data for learner communities like IP and ALS. Monitor critical health metrics and performance indicators, such as dropouts and repeaters, to provide targeted support for at-risk students.
- **Unit 6**: Inventory furniture and ICT assets like laptops and eCarts. Log the status of power, internet, and WASH facilities to provide a clear view of your school's operational resources.
- **Unit 7**: Audit all school buildings and rooms to assess conditions. Map buildable spaces for future development and use the damage slider to report specific repair needs for prioritized maintenance.
- **Unit 8**: Profile environmental hazards and terrain risks. Document your school’s proximity to support facilities and its capacity to serve as an evacuation center during emergencies or natural calamities.

## Verification Plan

### Automated Verification
None (Content change).

### Manual Verification
1.  Open the **Guide** in the app.
2.  Verify that each unit now has exactly one summary box next to its GIF.
3.  Check that the word counts for the new summaries are under 50 words each.
4.  Ensure the layout remains responsive and aesthetically pleasing on mobile.
