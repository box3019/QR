# Checklist rules (per part)

The checklist is built at analysis time from the drawing text (notes, title block, parts list, routing chart, OCR when needed) and shown in the part card, the Summary table, the PDF report and the summary CSV. Nothing here uses prices.

## States
* **Yes**: found. Shows WHAT exactly (spec, quantity, size, colour) and WHERE (sheet when the drawing has several, zone, note number / routing step / parts list).
* **No**: explicitly excluded on the drawing ("NO PAINT", "DO NOT HEAT TREAT"), or the drawing text was read well (at least 60 characters, OCR confidence 65 or better, or a text layer) and the item is not called out.
* **Not found**: the drawing could not be read well enough to say, or there is no material. Never guessed.

## Rows, in route-card order
1. Material: raw material. Aluminium and the plastics we machine (Delrin / POM / acetal, Teflon / PTFE) are "ours".
2. Machining: heat treatment, engraving, laser marking, engraving paint fill + colour (red / black / white ...). Sub-block: special threads (UNJ, MJ ...) and special gauges. Gauges are "derived" when they come from a special thread or a precision hole.
3. Inspection & precision: tight / unusual dimensions (below).
4. Coating: coating / plating (which), paint (which), BR127 primer.
5. Assembly: Keensert, Helicoil, inserts, pins, screws with size, quantity and zone.
6. Final: 100% inspection, clean-room cleaning.

When a part has its own routing chart, the groups follow that part's routing steps; otherwise the order above is used. Customer-internal specs, certificates, reports, FAI, traceability, CoC, packing and RoHS are NOT in the checklist: they live in the collapsed "For route card" section.

## Tight / unusual dimensions (Settings > Precision, defaults)
| Kind | Flagged when | Default |
|---|---|---|
| Tolerance | half-range of a +/- or limit pair is at or below | 0.01 mm / 0.0005 in |
| ISO fit | IT grade at or below (hole = capital letter, shaft = small letter; M, D, E, R, S need a diameter sign) | IT7 |
| GD&T | tolerance value at or below | 0.02 mm / 0.001 in |
| Surface | Ra at or below | 0.8 um |
| Decimals | unusual number of decimal places (not already flagged) | 3 mm / 4 in |

The drawing unit is read from the notes ("IN MILLIMETERS" / "IN INCHES"). When the unit is unknown only the inch limits are used, so nothing is flagged on a guess. Thresholds apply live: changing them in Settings re-evaluates the stored candidates without re-analysis.

## Zones
Each tight item (and each checklist hit) carries its drawing zone (for example B4) and the sheet number when the drawing has more than one sheet. The grid is read from the border labels (letters along one side, numbers along the other), as printed (ISO 5457 / ASME Y14.1 styles). When the labels cannot be read the sheet is divided into equal zones by sheet size (columns 1.. from the left, rows A.. from the top) and the zone is marked "estimated". Clicking an item in the part card opens the drawing and highlights that spot.

## Precision level
* **Very tight**: any tight feature at half of the threshold or finer, any fit IT6 or finer, Ra at half the limit, GD&T at half the limit, or 8 or more tight features (excluding "unusual decimals").
* **Tight**: at least one tight feature.
* **Standard**: none, and the drawing was read well. **Unknown** when it was not.
Each shows the count, the tightest feature with its zone, and a one-line why.

## Complexity
Points: routing steps (max 12) + 2 per coating / paint / BR127 + 1 per assembly kind + 2 per special thread (max 3) + 1 for each of heat treatment, engraving, laser, paint fill + 1 per 2 tight features (max 5) + 1 each for clean room, 100% inspection, special gauges. **Simple** below 6, **Moderate** 6 to 11, **Complex** 12 or more. The counts are shown as the one-line why.
