# UI primitives

These primitives carry the Semester Scheduler product language into Wage Predictor. They intentionally share control heights, typography, radii, semantic tokens, focus behavior, and neutral hierarchy.

They are source components rather than a separately versioned package so the desktop app remains self-contained and auditable.

Do not fork colors or dimensions inside product screens. Extend a primitive only when the behavior recurs and has clear product value.

`HourInput` is intentionally shared because hours are core data in both products. It supports quarter-hour arrow-key steps while still accepting precise decimal values.
