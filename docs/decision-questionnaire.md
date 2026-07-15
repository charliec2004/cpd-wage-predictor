# CPD Wage Predictor Decision Questionnaire

Status: awaiting CPD answers
Purpose: identify unclear policy, workflow, data, and forecasting assumptions before implementation

## How to answer

Questions are grouped by priority:

- `P0` — affects the core calculation or storage architecture; answer before the engine is finalized
- `P1` — affects major workflows; answer before the relevant screen is built
- `P2` — polish or future capability; can use a documented default initially

It is fine to answer `unknown` or `ask [office/person]`. Unknowns become explicit configurable assumptions rather than hidden guesses.

## A. Budget and accounting

1. **P0:** Is the annual budget intended to cover gross student wages only, or also employer payroll costs, taxes, benefits, or administrative burden?
2. **P0:** When you say work-study “goes toward” wages, does each $1 earned under the award reduce CPD's budget charge by $1?
3. **P0:** If not dollar-for-dollar, what percentage or accounting split applies to CPD?
4. **P0:** Can payroll provide the actual department-funded amount separately from gross wages?
5. **P0:** Is the budget compared against work dates, payroll posting dates, or general-ledger posting dates?
6. **P0:** If a pay period crosses May 31, which fiscal year receives the cost?
7. **P0:** Can CPD receive budget increases or reductions during the year?
8. **P1:** Should a budget revision be effective on a date, or simply change the whole-year authorized amount?
9. **P1:** Does unused money carry into the next fiscal year?
10. **P1:** Are there separate cost centers, accounts, grants, or sub-budgets within the student-worker budget?
11. **P1:** Should CPD reserve a contingency that is unavailable for ordinary staffing?
12. **P1:** Should the dashboard emphasize remaining budget, projected surplus/deficit, or safe additional hours?
13. **P1:** What level of projected remaining balance would CPD consider “too close” to zero?
14. **P2:** Should the app recommend how many additional hours could safely be scheduled?
15. **P2:** Should it compare current spending pace with prior fiscal years after adjusting for wages and headcount?

## B. Fiscal years and multi-year storage

16. **P0:** Should all years live in one CPD workspace file/database, or should the app maintain a local library of separate year files behind one browser?
17. **P0:** Will more than one CPD computer need to edit the same workspace?
18. **P0:** If several computers use it, will they take turns with a file on SharePoint/OneDrive/network storage, or is simultaneous editing expected?
19. **P0:** Who is allowed to close or reopen a fiscal year?
20. **P1:** Should closed years be completely read-only unless explicitly reopened?
21. **P1:** How long must historical years be retained?
22. **P1:** Should worker names persist across years to recognize returning students?
23. **P1:** When copying a year forward, which items should copy automatically: people, wages, schedules, calendar rules, import mappings, scenarios, or none?
24. **P1:** Should copied items require individual confirmation or one “reviewed” confirmation for the year?
25. **P1:** Can CPD start planning the next year before the current year closes?
26. **P1:** Should two future planning years be allowed at once?
27. **P2:** Should the app compare the same academic period across multiple years?
28. **P2:** Should archived years be excluded from global search and comparisons by default?

## C. Calendar and office operations

29. **P0:** Is Monday the correct first day of a CPD planning week?
30. **P0:** Should weekly reports use calendar Monday–Sunday, office Monday–Friday, or payroll-defined weeks?
31. **P0:** What are CPD's normal office hours for each weekday?
32. **P0:** Are student workers ever scheduled on weekends?
33. **P0:** Does a full office closure always mean zero student hours?
34. **P0:** Can a student work remotely or at an event when the office is closed?
35. **P0:** How should a partial closure behave when the schedule contains only total daily hours and no start/end time?
36. **P1:** Should academic calendar seeds be manually entered, imported from a maintained template, or fetched from Chapman when internet is available?
37. **P1:** Who confirms that a published calendar seed is correct for CPD?
38. **P1:** Should a student-only recess suggest reduced staffing without changing confirmed schedules?
39. **P1:** What default reduction, if any, is appropriate for Thanksgiving Monday–Wednesday?
40. **P1:** What default reduction, if any, is appropriate for Spring Break?
41. **P1:** Does Fall finals normally use the Fall recurring schedule or a week-specific schedule?
42. **P1:** Does Spring finals normally use the Spring recurring schedule or a week-specific schedule?
43. **P1:** When exactly does CPD consider Summer scheduling to end and Fall scheduling to begin?
44. **P1:** How does CPD operate between Fall finals and the winter University closure?
45. **P1:** Is Interterm best entered week-by-week, or do some workers have a recurring Interterm template?
46. **P1:** How does CPD operate between Interterm and the first day of Spring?
47. **P1:** Does Commencement increase, reduce, or not affect CPD student hours?
48. **P1:** Should early releases automatically clip shifts, or only after a CPD supervisor confirms that CPD observes them?
49. **P1:** Are there CPD-specific closure or training days not on the University calendar?
50. **P2:** Should calendar items support attachments or only links and notes?
51. **P2:** Should future years offer automatic holiday suggestions based on standing Chapman guidelines?

## D. Workers and employment

52. **P0:** What minimum worker identity is needed: display name only, Chapman employee ID, email, or another identifier?
53. **P0:** Can the app deliberately use pseudonyms if exported outside CPD?
54. **P0:** Do wage rates ever differ by role for the same student at CPD?
55. **P0:** Can a student have two simultaneous CPD roles or cost centers?
56. **P0:** Are wage changes effective on work date or payroll period start?
57. **P0:** Can students work after graduation during the same fiscal year?
58. **P1:** Which departure reasons matter for forecasting: graduation, resignation, termination, study abroad, schedule conflict, unknown?
59. **P1:** Should expected graduation automatically suggest an employment end date?
60. **P1:** Should inactive workers remain visible in the current-year schedule?
61. **P1:** Can workers pause for a semester and return in the same fiscal year?
62. **P1:** Should the app track job role, supervisor, location, or desk assignment?
63. **P1:** Do different worker types have different maximum-hour rules?
64. **P1:** Are international students subject to different hour/calendar rules the app needs to warn about?
65. **P2:** Should the app store worker contact details?
66. **P2:** Should it track hiring paperwork/onboarding completion, or only the date the person may begin work?

## E. Scheduling and overrides

67. **P0:** Do you need start/end times, total hours per day, or both?
68. **P0:** What is the smallest valid scheduling increment: 5, 10, 15, or another number of minutes?
69. **P0:** Can one student have multiple shifts in one day?
70. **P0:** Should unpaid breaks be represented?
71. **P0:** Does a week-level override replace the entire week's schedule or only changed days?
72. **P0:** If a recurring schedule changes midsemester, should the app create a new effective version or modify all future weeks?
73. **P0:** Should a worker be able to use recurring mode in a period whose default is week-specific, and vice versa?
74. **P1:** When copying a prior week, should actual/accrued hours be excluded automatically?
75. **P1:** Should “copy week” copy closures and events, or only worker plans?
76. **P1:** Do you need group operations such as reduce every student's Spring Break hours by 50%?
77. **P1:** Should illness be recorded as zero-hour actual, a schedule exception, or simply reflected by lower actuals?
78. **P1:** Should extra event hours be assigned to named students immediately or allowed as unassigned capacity?
79. **P1:** Can shifts extend outside normal office hours?
80. **P1:** Should the app warn about overlapping shifts for one student?
81. **P1:** Should the app warn when no one is scheduled during office hours, or is coverage outside scope?
82. **P1:** Do you need to compare staffing coverage by hour, or is cost-only scheduling sufficient?
83. **P2:** Should drag-and-drop schedule editing be supported, or are table inputs preferable?
84. **P2:** Should the app show the Semester Scheduler schedule alongside the wage schedule or import from it?

## F. Actual payroll data

85. **P0:** What actual data can CPD reliably access: timesheet hours, pay-period wages, department charges, work-study charges, or all of these?
86. **P0:** What file formats and columns are available today?
87. **P0:** Are actuals available by work date, by week, or only by pay period?
88. **P0:** How soon after work occurs does CPD receive reliable actual data?
89. **P0:** Can posted payroll values later be corrected?
90. **P0:** Is there a stable transaction or row ID for duplicate detection?
91. **P0:** If imported hours and imported wages disagree with wage × hours, which value is authoritative?
92. **P1:** Will staff enter accrued hours before payroll posts, or should the app estimate them from schedules?
93. **P1:** Can accrued hours be imported from a timekeeping export?
94. **P1:** Should importing Posted actuals automatically replace matching Accrued entries?
95. **P1:** Should an import batch be fully reversible?
96. **P1:** How should retroactive adjustments be assigned to workers and work dates?
97. **P1:** Do you need a formal month-end or pay-period reconciliation signoff?
98. **P1:** How much discrepancy should trigger a warning: any amount, a dollar threshold, or a percentage?
99. **P2:** Should the app remember several import mappings for different Chapman exports?
100. **P2:** Should original source files be embedded in the workspace or only referenced by name/checksum?

## G. Work-study

101. **P0:** Is $3,000 a default assumption or the exact standard award for nearly everyone?
102. **P0:** Can awards be values other than $3,000?
103. **P0:** Does CPD know whether an award is offered, accepted, and confirmed, or only whether the student reports having it?
104. **P0:** What exact dates make Fall/Spring earnings work-study eligible?
105. **P0:** Does Interterm consume the same academic-year work-study award?
106. **P0:** Does work-study eligibility end on the final day of Spring instruction, finals, the academic year, or another payroll boundary?
107. **P0:** Does each eligible wage dollar reduce the student's award by the gross dollar earned?
108. **P0:** What part of eligible wages is actually charged to CPD?
109. **P0:** When the award runs out, does the same student automatically continue as department-funded, require approval, or stop working?
110. **P0:** Can CPD obtain an authoritative remaining award balance during the year?
111. **P0:** How frequently is that balance updated?
112. **P0:** Can CPD obtain work-study usage attributable to its own department separately?
113. **P0:** How does another Chapman job's usage become visible to CPD, if at all?
114. **P0:** If only a remaining balance is known, should that replace rather than supplement the app's calculated usage?
115. **P1:** Should outside-job future use be entered as dollars, hours and wage, a weekly estimate, or one remaining-year total?
116. **P1:** Should the three scenarios use different outside-job usage assumptions?
117. **P1:** Should unconfirmed work-study be included in Expected, only in Plausible low, or excluded until confirmed?
118. **P1:** Should the app warn before an award is projected to exhaust, and how many weeks in advance?
119. **P1:** Does the 19-hour limit apply across all Chapman jobs combined?
120. **P1:** Can CPD know outside-job hours well enough to warn about the combined limit?
121. **P1:** Are non-Federal funding awards used for any student wages?
122. **P2:** Should the app produce a work-study verification checklist for supervisors?

## H. Forecasting and uncertainty

123. **P0:** Do `Plausible low`, `Expected`, and `Prudent high` match the language CPD would use?
124. **P0:** Should these scenarios be manually constructed, automatically suggested from ranges, or both?
125. **P0:** What makes a future hire “committed” versus “planned”?
126. **P0:** Should planned hires have one expected date or earliest/expected/latest dates?
127. **P0:** Should vacancy assumptions be represented as named placeholder workers or as pooled unassigned hours?
128. **P0:** When a worker may leave, do you prefer separate scenarios or one probability-weighted expected departure?
129. **P1:** Should a scenario be allowed to change existing workers' schedules, not just hires/departures?
130. **P1:** Should the expected scenario always be the official dashboard forecast?
131. **P1:** Can users promote individual scenario events into baseline without promoting the whole scenario?
132. **P1:** Should forecasts save automatic snapshots weekly, on every major edit, or only manually?
133. **P1:** Which prior forecasts should be retained for accuracy analysis?
134. **P1:** How should the app treat a current day that is only partially complete?
135. **P1:** Should the as-of date be freely editable or limited to auditing/preview mode?
136. **P1:** Should the app allow assumptions such as “all Spring schedules run 10% below plan,” or require worker-level changes?
137. **P2:** After enough history exists, would CPD want statistical ranges based on prior schedule-to-actual variance and turnover?
138. **P2:** Should the app recommend a scenario based on prior-year churn, or only show evidence?

## I. Reports and decisions

139. **P0:** What is the single most important number leadership wants to know?
140. **P0:** Which total should be official: Posted only, Posted + Accrued, or Expected year-end?
141. **P1:** Which reports are needed weekly, monthly, by pay period, by semester, and annually?
142. **P1:** Do reports need worker names, or can leadership views be aggregated?
143. **P1:** Should the app export the assumptions behind each scenario?
144. **P1:** Is Excel the required handoff format, or is PDF also necessary?
145. **P1:** Should exported workbooks include formulas or fixed values with an audit sheet?
146. **P1:** Should historical reports show what was forecast at the time versus what ultimately happened?
147. **P1:** Should the app highlight safe opportunities to add hours when a surplus is projected?
148. **P1:** Should it rank the largest sources of uncertainty?
149. **P2:** Do charts need print-friendly light-mode formatting?
150. **P2:** Should users create saved report presets?

## J. Privacy, backup, and handoff

151. **P0:** Are worker names and work-study awards considered sensitive enough to require encryption at rest?
152. **P0:** Will the app be used on shared CPD Windows computers with separate Windows user accounts?
153. **P0:** Is operating-system login protection sufficient, or should the app have its own password?
154. **P0:** Where may operational workspace files be stored: local drive, OneDrive, SharePoint sync, network drive, or approved removable storage?
155. **P0:** What backup location will remain Chapman-controlled after you leave?
156. **P1:** How often should automatic backups run?
157. **P1:** How many backup versions should be retained?
158. **P1:** Should the app warn when the workspace has not been backed up recently?
159. **P1:** Who should receive the source code, release installers, documentation, and recovery instructions?
160. **P1:** Should exports support anonymizing names while preserving worker-level rows?
161. **P1:** Is an audit trail of who made changes possible without app accounts, or is timestamp/action history sufficient?
162. **P2:** Should the workspace support a read-only password or separate viewer export?

## K. Usability and operations

163. **P0:** Who are the expected day-to-day users and how many are there?
164. **P0:** What is the least technical user comfortable doing in Excel today?
165. **P1:** Should the default landing screen open the active fiscal year or the year browser?
166. **P1:** How often will users update schedules, actuals, work-study balances, and scenarios?
167. **P1:** Which actions need undo?
168. **P1:** Which destructive actions need confirmation?
169. **P1:** Should settings changes auto-save or require `Save changes`?
170. **P1:** Should the app include sample data and a guided practice workspace?
171. **P1:** What terminology does CPD use for student workers, supervisors, work-study, budgets, and payroll actuals?
172. **P1:** Should `CPD` or `Career and Professional Development` appear in the product name?
173. **P1:** Which accessibility needs are known among current users?
174. **P2:** Should advanced modeling controls be hidden behind an `Advanced` section?
175. **P2:** Should the app include an in-app glossary and calculation guide?

## L. Integration and scope boundaries

176. **P0:** Should Wage Predictor import schedules directly from Semester Scheduler project JSON?
177. **P0:** If so, what is the stable link between a Semester Scheduler student and a Wage Predictor worker?
178. **P1:** Should schedule imports replace, merge, or preview against existing recurring schedules?
179. **P1:** Does CPD need imports from Outlook/Google calendars for events or closures?
180. **P1:** Is direct integration with Chapman systems prohibited, merely unavailable, or potentially desired later?
181. **P1:** Should the app check online for updated Chapman calendar suggestions, or remain completely offline after installation?
182. **P1:** Should the app support manual software updates, automatic update checks, or no updater initially?
183. **P2:** Should an exported fiscal year be importable into another workspace without its person directory?
184. **P2:** Should the engine eventually be reusable from Excel or a command-line audit tool?

## M. Calendar populations, payroll access, and wage edge cases

185. **P0:** Are all CPD student workers on Chapman's main-campus semester calendar, or can workers follow the trimester, Fowler School of Law, or another calendar?
186. **P0:** If multiple academic calendars occur, should each worker select a calendar profile so breaks and term dates differ?
187. **P0:** Does CPD currently have approved Panther Analytics payroll access, and which reports/fields can CPD actually view?
188. **P0:** Given that Chapman describes `Payroll with FWS` as restricted to Financial Aid, HR, and Financial Services, who can provide CPD an authoritative work-study balance or allocation?
189. **P0:** What payroll rounding rule should forecasts follow: round each shift, day, week, pay period, or only the final total?
190. **P0:** Can student wages ever include overtime, premiums, stipends, bonuses, corrections, or paid training that are not ordinary hours × wage rate?
191. **P1:** If a student works during an office closure, is the wage rate unchanged?
192. **P1:** Should the model support different weekly-hour limits for Federal Work-Study, non-work-study, international, Summer, and academic-year employment?
193. **P1:** If a worker's class-calendar profile differs from the office calendar, should reduced availability be suggested automatically or only entered manually?
194. **P0:** Can student workers use paid sick leave or another paid absence that creates wage cost without worked hours?
195. **P0:** If paid sick leave exists, can it consume Federal Work-Study, and how does it appear in CPD's payroll data?
196. **P1:** Are paid training, mandatory meetings, and onboarding time scheduled like ordinary shifts or entered as separate earning types?
197. **P1:** Do unpaid meal breaks need to be deducted from long shifts automatically or entered explicitly?

## N. Audit follow-ups and deterministic edge cases

198. **P0:** If CPD and another Chapman job consume the same student's remaining work-study award on the same day or pay period, which job is treated as consuming it first?
199. **P0:** When viewing an earlier as-of date, do you want today's corrected data recomputed at that seam, the exact facts CPD knew then, or an explicit choice between both?
200. **P0:** When payroll corrects a posted transaction, does the source provide a reversal, a replacement record, both, or only a changed total?
201. **P0:** Which payroll field or combination of fields is stable enough to identify the same transaction across repeat imports?
202. **P0:** If posted payroll department charge conflicts with an independently reported work-study allocation, which source is authoritative for CPD's official cost?
203. **P0:** Should a missing effective wage rate block the entire official forecast, block only the affected worker/date total, or use a clearly labeled temporary assumption?
204. **P0:** Should live workspace files and automatic backups be encrypted by default on CPD computers?
205. **P0:** If encryption is used, how should a replacement employee or replacement computer recover the workspace without depending on your personal account?
206. **P1:** May CPD workers ever have a shift crossing midnight, or can the first release reject that input?
207. **P1:** Can the office have split hours in one day, such as open in the morning, closed midday, and open again?
208. **P1:** When overlapping closure, special-opening, and early-release rules conflict, should explicit priority decide, or should the app force a user to resolve the overlap?
209. **P1:** If a fiscal date is not assigned to an academic period, should year confirmation be blocked or should the date remain in a visible Unclassified period?
210. **P1:** Can a worker belong to more than one academic-calendar profile at once, and if so which profile controls break-related staffing suggestions?
211. **P1:** Should combined weekly-hour compliance use the same week boundary as CPD reports, the payroll workweek, or a separately configured legal/compliance week?
212. **P1:** If actuals are available only by pay period, which daily allocation is acceptable: proportional to approved/accrued hours, proportional to planned schedule, manual only, or no daily allocation?
213. **P1:** Should unallocated pay-period dollars count in the fiscal-year total immediately even though no weekly placement is known?
214. **P1:** If a budget revision is approved retroactively, should historical dashboards show corrected budget truth, the budget known at that time, or a switch between both?
215. **P1:** Should forecast snapshots be created automatically before every material edit/import, on a schedule, only manually, or some combination?
216. **P1:** Which actions count as material enough to trigger a snapshot: schedule changes, hires/departures, wage changes, work-study updates, actual imports, budget revisions, or calendar edits?
217. **P1:** Should ordinary CSV/Excel/JSON exports be unencrypted with a warning, password-protected, or prohibited for named-worker data?
218. **P2:** How long should forecast snapshots and superseded payroll corrections be retained after a fiscal year is closed?
219. **P2:** Should the app compare “forecast error” against final gross wages, final CPD department charge, remaining budget, or all three?

## Recommended first response batch

Answer these first because they determine the engine architecture:

- 1–6: what cost and fiscal attribution mean
- 16–18: one workspace and multi-computer usage
- 29–35: week and closure behavior
- 67–73: schedule precision and overrides
- 85–94: actual data available
- 101–114: work-study accounting and balances
- 123–128: scenario construction
- 151–155: privacy and storage
- 176–178: relationship to Semester Scheduler
- 185–219: calendar populations, payroll access, security, actual corrections, and deterministic edge cases
