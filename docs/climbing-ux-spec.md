# Climbing UX flow specification

## Decision
Climbing remains out of scope for the running/trail MVP and must use a separate future flow.

## Why it cannot share the running flow
- Running/trail posters depend on a route polyline that can be centered on a map preview.
- Climbing sessions are typically gym-based or crag-based, so the primary artifact is not a continuous route line.
- Running/trail posters emphasize distance, duration, and route geometry, while climbing needs climb type, grade, attempts, sends, and venue metadata.

## Future climbing flow
1. Select climbing activity from a climbing-only entry point.
2. Review activity summary data such as venue, discipline, grade range, and attempts.
3. Choose a climbing-specific poster layout that highlights session stats instead of map geometry.
4. Confirm the climbing poster in a dedicated confirmation step.

## Data model differences
- Running/trail: route coordinates, distance, duration, date.
- Climbing: venue, discipline, wall/crag context, grades, attempts, sends, partner/session notes.

## Interaction differences
- Running/trail preview centers a route on a map.
- Climbing preview should focus on structured session data and photography/venue context.
- No shared primary preview logic should exist between climbing and route posters.
