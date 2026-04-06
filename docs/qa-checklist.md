# QA Checklist

## Core Flows
- Create a project from each input type: youtube, blog, transcript, idea, video.
- Open Studio Magic and confirm caption timeline interactions (drag, resize, snap, reset, restore all).
- Queue an MP4 export job and verify status lifecycle queued -> processing -> completed.

## Access and Plan Controls
- Free user cannot queue export jobs.
- Pro user can queue export jobs.
- Account deletion and grace/hold states match entitlement UI notices.

## Platform Matrix
- Desktop: Chrome, Edge, Firefox, Safari latest.
- Mobile: iOS Safari and Android Chrome latest.

## Visual and Usability
- Verify layout and controls in 9:16 and 16:9 previews.
- Validate footer nav and sticky controls do not overlap actionable UI.
- Confirm invisible scrollbar behavior still preserves scrollability.

## Error Paths
- Invalid auth token returns 401 on protected APIs.
- Missing media and invalid upload kind return correct 4xx responses.
- Stripe webhook invalid signature returns 400 and does not mutate subscription state.

## Release Gates
- npm run lint passes.
- npm run test passes.
- npm run test:e2e passes.
- npm run build passes.
