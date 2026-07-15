# Chapman Calendar Seed for FY 2026–27

Status: researched seed requiring CPD confirmation
Fiscal year: June 1, 2026–May 31, 2027
Timezone: America/Los_Angeles

## Purpose

This document translates public Chapman sources into a suggested starting configuration. The app must never treat these dates as immutable code. CPD staff should review and edit the seed because office-specific operations, supervisor-approved early releases, and later University announcements can differ.

The semester calendar explicitly excludes the Doctor of Pharmacy, Doctor of Physical Therapy, Physician Assistant, Communication Sciences and Disorders, and Fowler School of Law programs. If CPD employs students following those calendars, their availability may need a separate calendar profile even though the CPD office-closure calendar remains shared.

## Source hierarchy

1. [Chapman 2026–27 Semester Academic Calendar](https://www.chapman.edu/Academics/_files/2026-27-semester-academic-current.pdf)
2. [Chapman 2025–26 Semester Academic Calendar](https://www.chapman.edu/academics/_files/2025-26-semester-academic-current.pdf) for Summer 2026, which falls at the beginning of FY 2026–27
3. [Chapman Staff Holiday Schedule](https://www.chapman.edu/faculty-staff/human-resources/employee-relations-and-services/services/holiday-schedule.aspx)
4. [Chapman early holiday release announcement](https://news.chapman.edu/2025/11/04/a-note-from-president-matt-parlow-early-holiday-releases/)
5. [Chapman Federal Work-Study guidance](https://www.chapman.edu/students/tuition-and-aid/financial-aid/undergraduate/federal-work-study.aspx)
6. [Chapman Summer Aid guidance](https://www.chapman.edu/students/tuition-and-aid/financial-aid/undergraduate/summer-aid.aspx)
7. [Chapman Payroll](https://www.chapman.edu/campus-services/campus-controller/financial-services/payroll/)
8. [Chapman Panther Analytics payroll reports](https://www.chapman.edu/campus-services/information-systems/software/panther-analytics/payroll-reports.aspx)

## Suggested operating periods

| Period | Suggested dates | Default schedule mode | Office interpretation |
| --- | --- | --- | --- |
| Summer 2026 | Jun 1–Aug 23, 2026 | Week-specific | Office open except closures; Federal Work-Study unavailable |
| Fall instruction | Aug 24–Dec 5, 2026 | Recurring | Normal recurring student schedules |
| Fall finals/transition | Dec 6–12, 2026 | Recurring with review | Finals begin Dec 7; Dec 6 is retained as an explicit transition day so the fiscal calendar has no gap |
| Winter transition | Dec 13, 2026–Jan 3, 2027 | Week-specific | Students may leave; office partly open before closure |
| Interterm | Jan 4–30, 2027 | Week-specific | Students work, but schedules vary rapidly |
| Interterm/Spring transition | Jan 31, 2027 | Week-specific | One-day boundary; likely no default hours on Sunday |
| Spring instruction | Feb 1–May 15, 2027 | Recurring | Normal recurring student schedules |
| Spring finals/transition | May 16–22, 2027 | Recurring with review | Finals begin May 17; May 16 is retained as an explicit transition day so the fiscal calendar has no gap |
| Post-Spring/FY close | May 23–31, 2027 | Week-specific | Reduced or Summer-transition staffing |

Why Summer 2026 comes from the 2025–26 academic calendar: Chapman's academic year and CPD's fiscal year use different boundaries. FY 2026–27 begins with the prior academic calendar's Summer 2026 sessions and ends immediately before Summer 2027 begins.

The transition-day labels above are app-modeling choices, not claims that instruction or examinations occur on those Sundays. The year editor should show them for CPD confirmation rather than leave any fiscal date unclassified.

## Academic breaks versus office closures

| Dates | Academic meaning | Office meaning | Suggested staffing setting |
| --- | --- | --- | --- |
| Nov 23–25, 2026 | Thanksgiving recess, students only | Office not identified as closed | Reduced, manually planned |
| Nov 26–27, 2026 | Thanksgiving recess | University closed | Closed |
| Mar 22–25 and Mar 27, 2027 | Spring Break, students only | Office not identified as closed | Reduced, manually planned |
| Mar 26, 2027 | Spring Break plus César Chávez observance | University closed | Closed |

This distinction is essential: a student-only recess should not automatically zero the entire office calendar.

## Known or derivable closure seed

| Date/range | Reason | Confidence | Notes |
| --- | --- | --- | --- |
| Jun 19, 2026 | Juneteenth | Published | University closure |
| Jul 3 and Jul 6, 2026 | Extended Independence Day | Published | Administrative closure dates listed by Chapman |
| Sep 7, 2026 | Labor Day | Published academic calendar | University closed |
| Nov 26–27, 2026 | Thanksgiving and Friday | Published academic calendar | University closed; Monday–Wednesday are student-only recess |
| Dec 24, 2026–Jan 3, 2027 | Winter holiday guideline | Derived; confirm | Chapman standing guideline for a Friday Christmas says administrative offices close Dec 24–Jan 3; record weekdays as closed and confirm the year's announcement |
| Jan 18, 2027 | Martin Luther King Jr. Day | Published academic calendar | University closed |
| Mar 26, 2027 | César Chávez Day observed | Published academic calendar | University closed |
| May 31, 2027 | Memorial Day | Published academic calendar | University closed and last day of FY |

Do not assume Independence Day 2026 itself is July 4 office time: it falls on Saturday, while Chapman publicly lists Friday July 3 and Monday July 6 as the extended closure.

## Published early releases inside the fiscal year

The November 2025 announcement lists supervisor-approved early releases through Labor Day 2026:

| Date | Release | Related holiday |
| --- | ---: | --- |
| Jun 18, 2026 | 3:00 p.m. | Juneteenth |
| Jul 2, 2026 | 3:00 p.m. | Independence Day period |
| Sep 4, 2026 | 3:00 p.m. | Labor Day |

These should be seeded as `Needs confirmation`, because the announcement says early releases require supervisor approval. Later FY 2026–27 early releases were not found in the public source reviewed and must be added when announced or confirmed by CPD.

## Work-study and payroll settings supported by sources

- Chapman says Federal Work-Study is not available during Summer.
- Chapman says Work-Study students may work up to 19 hours per week.
- Work-Study money is earned through paychecks and represents the amount the student is eligible to earn during the academic year.
- Chapman describes biweekly employee pay dates as every other Friday.
- Student employees are not eligible for staff holiday pay under the public staff holiday schedule.
- Chapman says Panther Analytics payroll reporting requires approved account/program/project access, while its `Payroll with FWS` report is restricted to Financial Aid, HR, and Financial Services. CPD should not assume it can directly import authoritative work-study allocation data.

These facts support configurable warnings and defaults. They do not answer CPD's departmental accounting split, exact award amount, outside-job timing, or the work dates included in each pay period.

## Dates still requiring CPD confirmation

- CPD's exact Summer operating start and end, independent of course sessions
- whether Fall/Spring finals use normal recurring schedules
- office operations between Fall finals and winter closure
- exact FY 2026–27 winter closure announcement
- any early releases after September 2026
- whether CPD closes or reduces hours for office-specific events
- whether Commencement changes student staffing
- whether the academic-year Work-Study eligibility boundary starts on Fall instruction, an HR-defined employment date, or a payroll-period boundary
- actual biweekly pay-period start/end dates and which imported files CPD can access
- whether CPD has approved Panther Analytics access and which payroll fields its role can see

## Import behavior recommendation

When a fiscal year is created, the app may offer this researched seed. Every imported item should show:

- source URL
- imported date
- confidence: Published, Derived, or User-entered
- confirmation status
- last editor and note

The user remains authoritative and can edit or replace every date.
