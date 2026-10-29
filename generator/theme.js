// Look of the generated plan: the CSS and the shared <defs> (gradients, the
// bulb and the two cover icons). Both take the name table (names.js), so the
// selectors always match what the generator writes.
//
// Colour rules: yellow / amber belong to lights that are on; nothing else
// uses warm colours, or it would read as a light. Presence is green, the A/C
// cyan (cooling) / coral (heating), cameras violet, alerts red.

export function style(N) {
  return `  <style>
    /* Doors drawn as openings only: the class hides leaves and swings, the
       geometry stays in the file - removing the class brings them back. */
    .${N.noSymbol} line,
    .${N.noSymbol} path { display: none; }
    /* Door lock: locked (cool grey), amber while held, open (red). */
    .${N.lock} { fill: #8ea1ba; stroke: #8ea1ba; stroke-width: 1.4; cursor: pointer; }
    .${N.lock} path { fill: none; stroke-linecap: round; }
    .${N.lock} .${N.lockHit} { fill: transparent; stroke: none; }
    .${N.lock} .${N.lockKeyhole} { fill: #131a24; stroke: none; }
    .${N.lock} .${N.lockOpen} { display: none; }
    .${N.lock}.${N.isOpen} .${N.lockClosed} { display: none; }
    .${N.lock}.${N.isOpen} .${N.lockOpen} { display: inline; }
    .${N.lock}.${N.isOpen} { fill: #e57373; stroke: #e57373; }
    .${N.lock}.${N.isArmed} { fill: #ffab40; stroke: #ffab40; }
    .light.on { fill: #ffc300; stroke: #ffc300; }
    .light.on .glow { opacity: 1; }
    .light.on .glow-dim { opacity: 0.55; }
    .light.on .bulb { filter: url(#bulb-glow); }
    .light.on ~ .bulb-shared { fill: #ffc300; stroke: #ffc300; filter: url(#bulb-glow); }
    .light[data-kind="night"].on { fill: #ffab40; stroke: #ffab40; }
    /* room names are hidden; a class on the layer shows them */
    #room-labels.${N.isShown} { display: inline; }
    .glow { pointer-events: none; }

    /* Climate readings are clickable: bounding-box, or only the glyphs
       themselves would take the click. */
    #room-climate text { pointer-events: bounding-box; cursor: pointer; }

    /* Appliances: class "on" while running; the labels are filled by the
       card and emptied when there is nothing to say. */
    .${N.applianceGlow} { opacity: 0; transition: opacity 0.6s ease; }
    .${N.appliance}.on .${N.applianceGlow} { opacity: 1; }
    .${N.snowflake} { fill: none; stroke: #6f8fb0; stroke-width: 1.2;
                    stroke-linecap: round; transition: stroke 0.4s ease; }
    .${N.appliance}.on .${N.snowflake} { stroke: #e57373; }
    /* A label sits on the drawing of the machine: an outline in the
       background colour (paint-order: stroke) keeps the digits readable. */
    .${N.deviceLabel} { fill: #c3cfdf; font-size: 10px; font-weight: 500;
                  font-variant-numeric: tabular-nums; cursor: pointer;
                  paint-order: stroke; stroke: #1b2433; stroke-width: 3px;
                  stroke-linejoin: round; }
    .${N.deviceLabel}.${N.isDone} { fill: #7ddba0; }

    .${N.sensorBody} { fill: #5b6a80; stroke: #5b6a80; stroke-width: 0.8; }
    .${N.presence}.${N.isDetected} .${N.sensorBody} { fill: #7ddba0; stroke: #7ddba0; }
    .${N.presence}.${N.isUnknown} .${N.sensorBody}    { opacity: 0.35; }

    /* Presence shows as spreading rings, not just a colour - movement is
       seen from the corner of the eye. transform-box: fill-box scales each
       ring around itself; without it the origin is the corner of the plan. */
    .${N.wave} {
      fill: none; stroke: #7ddba0; stroke-width: 1.1; opacity: 0;
      transform-box: fill-box; transform-origin: center;
    }
    .${N.presence}.${N.isDetected} .${N.wave} { animation: ${N.waveKeyframes} 2.6s ease-out infinite; }
    .${N.presence}.${N.isDetected} .${N.wave}.f2 { animation-delay: 0.87s; }
    .${N.presence}.${N.isDetected} .${N.wave}.f3 { animation-delay: 1.74s; }
    /* movement pulses faster than still presence */
    .${N.presence}.${N.isDetected}.${N.isMoving} .${N.wave} { animation-duration: 1.5s; }
    .${N.presence}.${N.isDetected}.${N.isMoving} .${N.wave}.f2 { animation-delay: 0.5s; }
    .${N.presence}.${N.isDetected}.${N.isMoving} .${N.wave}.f3 { animation-delay: 1.0s; }

    @keyframes ${N.waveKeyframes} {
      0%   { transform: scale(0.26); opacity: 0.7; }
      70%  { opacity: 0.22; }
      100% { transform: scale(1); opacity: 0; }
    }

    /* reduced motion: one still ring instead of the animation */
    @media (prefers-reduced-motion: reduce) {
      .${N.presence}.${N.isDetected} .${N.wave} { animation: none; opacity: 0.35; }
      .${N.presence}.${N.isDetected} .${N.wave}.f2, .${N.presence}.${N.isDetected} .${N.wave}.f3 { opacity: 0; }
    }

    .${N.hitArea} { fill: transparent; stroke: none; cursor: pointer; }
    /* Cameras: the fan is see-through so walls and outdoor lights show
       through it, and it takes no clicks (it covers the plan margin) - only
       the marker does. */
    #cameras { pointer-events: none; }
    .${N.cameraHit} { fill: transparent; stroke: none; pointer-events: all; cursor: pointer; }
    /* the fan's fill is its own gradient (fading with distance); only a faint edge */
    .${N.cameraFan} { fill: #a99be0; fill-opacity: 1; stroke: #a99be0;
                   stroke-opacity: 0.25; stroke-width: 0.6; stroke-linejoin: round; }
    .${N.cameraMark} { fill: #a99be0; stroke: #131a24; stroke-width: 1.2; }
    .camera-icon { fill: #131a24; }
    .${N.camera}[data-off-plan] .${N.cameraFan} { stroke-dasharray: 3 2; }

    .${N.acGlow} { opacity: 0; transition: opacity 0.8s ease; }
    .${N.ac}.${N.isCooling} .${N.acCool} { opacity: 1; }
    .${N.ac}.${N.isHeating}  .${N.acHeat} { opacity: 1; }

    .tv-glow { opacity: 0; transition: opacity 0.6s ease; }
    .tv.on .tv-glow { opacity: 1; }

    .cover-hit { stroke: transparent; stroke-width: 16; fill: none; cursor: pointer; }

    /* A cover is a slatted band along the WHOLE window that gets THINNER as
       it opens: the card sets scale(1 u) on the band, u = the covered part
       (a cover hides the full width on part of the height, so shortening the
       band along the window would lie). The band is centred on the opening,
       so it scales around its own (0,0) - set as an ATTRIBUTE, because in
       CSS transform-box: view-box would put the origin at the plan's corner. */
    .${N.coverBand} { pointer-events: none; }
    .${N.coverBandScale} { transition: transform 0.4s ease; }
    .${N.coverFabric} { fill: #8fa3bd; stroke: none; }
    .${N.coverSlat} { stroke: #131a24; stroke-width: 0.8; }

    .${N.coverIcon} { fill: #5b6a80; stroke: #5b6a80; stroke-width: 0.7;
                   cursor: pointer; }
    .${N.coverIconClosed} { display: none; }
    .cover.${N.isCovered} .${N.coverIconClosed} { display: inline; fill: #8fa3bd; stroke: #8fa3bd; }
    .cover.${N.isCovered} .${N.coverIconOpen} { display: none; }
    .cover.${N.isUnknown} .${N.coverIcon} { opacity: 0.3; }
    /* amber while held: the hold gesture was recognised */
    .cover.${N.isArmed} .${N.coverIcon} { fill: #ffab40; stroke: #ffab40; }

    /* A roof window: glass seen from above; its cover darkens it as it closes (the card sets --sky). */
    .skylight .sky-glass { fill: none; stroke: #6fc9ef; stroke-width: 1.2; cursor: pointer; }
    .skylight .sky-bar { stroke: #6fc9ef; stroke-width: 0.7; stroke-opacity: 0.6; pointer-events: none; }
    .skylight .sky-cover { fill: #8fa3bd; fill-opacity: 0; transition: fill-opacity 0.4s; }
    .skylight.${N.isCovered} .sky-cover { fill-opacity: var(--sky, 0.55); }
    .skylight.${N.isOpen} .sky-glass { stroke: #e57373; }

    /* Window / door contacts: an open (or tilted) sash or door turns red. */
    .${N.paneTick} { stroke: #6fc9ef; stroke-width: 0.8; }
    .${N.isOpen} > .${N.pane}, .${N.isOpen} > line, .${N.pane}.${N.isOpen} { stroke: #e57373; }
    .${N.isTilted} > .${N.pane}, .${N.pane}.${N.isTilted} { stroke: #e57373; stroke-dasharray: 2 1.5; }

    /* Rooms coloured by an entity: classes for on/off states; continuous
       values (temperature, CO2) get their fill from the card. */
    #rooms polygon.${N.isHeating} { fill: #33282b; }
    #rooms polygon.${N.isOccupied} { fill: #22302a; }

    /* Detection range of a motion / presence sensor. */
    .climate-icon.alt { display: none; }
    .tv-mount { fill: #2a3547; stroke: #5b6a80; stroke-width: 0.4; }
    .tv-body { fill: #1b2433; stroke: #8ea1ba; stroke-width: 0.6; }
    .tv-screen { stroke: #6fc9ef; stroke-width: 1.2; stroke-linecap: round; opacity: 0.55; }
    .tv.on .tv-screen { opacity: 1; }
    .ac-body { fill: #1b2433; stroke: #8ea1ba; stroke-width: 0.6; }
    .ac-louvre { stroke: #5b6a80; stroke-width: 0.5; }
    .ac-led { fill: #5b6a80; }
    .unit-body { fill: #1b2433; stroke: #8ea1ba; stroke-width: 0.6; }
    .unit-line, .unit-rack { stroke: #5b6a80; stroke-width: 0.5; fill: none; }
    .unit-rack { stroke-dasharray: 1.2 0.8; }
    .unit-door { fill: none; stroke: #8ea1ba; stroke-width: 0.6; }
    .unit-glass { fill: #24324a; stroke: #5b6a80; stroke-width: 0.4; }
    .unit-knob, .unit-duct { fill: none; stroke: #8ea1ba; stroke-width: 0.5; }
    .unit-handle { stroke: #8ea1ba; stroke-width: 1; stroke-linecap: round; }
    .unit-arrow { stroke-width: 0.8; }
    .unit-heat { stroke: #e57373; stroke-width: 0.5; }
    .rack-unit { fill: #24324a; stroke: #8ea1ba; stroke-width: 0.4; }
    .rack-empty { fill: none; stroke: #5b6a80; stroke-width: 0.4; stroke-dasharray: 1 0.8; }
    .rack-led { fill: #5b6a80; }
    .${N.appliance}.on .rack-led { fill: #7ccf8a; }
    .unit-cold { stroke: #6fc9ef; stroke-width: 0.6; stroke-linecap: round; }
    .unit-zone { fill: none; stroke: #8ea1ba; stroke-width: 0.5; }
    .${N.appliance}.on .unit-zone { stroke: #e57373; }
    .unit-above { fill: none; stroke-dasharray: 2 1.4; }
    .unit-cup { fill: #8ea1ba; stroke: none; }
    .unit-led { fill: #5b6a80; stroke: none; }
    .${N.appliance}.on .unit-led { fill: #6fc9ef; }
    .unit-throw { fill: #c3cfdf; fill-opacity: 0; stroke: none; transition: fill-opacity 0.6s ease; }
    .${N.appliance}.on .unit-throw { fill-opacity: 0.12; }
    /* a washer-dryer stack: each half lit while its own machine runs */
    .unit-half { fill: #ffab40; fill-opacity: 0; stroke: none; transition: fill-opacity 0.6s ease; }
    .${N.appliance}.on > .dev-shape .unit-half, .${N.appliance}.on > g > .unit-half { fill-opacity: 0.22; }
    .${N.sensorFan} { fill: #7ddba0; fill-opacity: 0.05; stroke: #7ddba0; stroke-opacity: 0.35;
                      stroke-width: 0.6; stroke-linejoin: round; pointer-events: none; }
    .${N.presence}.${N.isDetected} .${N.sensorFan} { fill-opacity: 0.16; }
    .${N.motion} .${N.sensorFan} { fill: #e57373; stroke: #e57373; }
    .${N.motion}.on .${N.sensorFan} { fill-opacity: 0.22; }
    .${N.motion}.on .${N.sensorBody} { fill: #e57373; stroke: #e57373; }

    /* Devices drawn as an icon in a badge. */
    .ia-red { fill: #e57373; } .ia-yellow { fill: #ffc300; } .ia-blue { fill: #6fc9ef; stroke: #6fc9ef; } .ia-green { fill: #7ddba0; }
    .ia-blue[fill="none"], .ia-red[fill="none"] { fill: none; }
    .${N.iconBadge} { fill: #1b2433; stroke: #5b6a80; stroke-width: 0.8; cursor: pointer; }
    .${N.iconGlyph} { fill: none; stroke: #8ea1ba; stroke-width: 0.9; stroke-linejoin: round;
                      stroke-linecap: round; color: #8ea1ba; pointer-events: none; }
    .${N.deviceGlow} { opacity: 0; transition: opacity 0.6s ease; }
    .${N.iconDevice}.on .${N.deviceGlow}, .${N.iconDevice}.${N.isAlarm} .${N.deviceGlow} { opacity: 1; }
    .${N.iconDevice}.on .${N.iconGlyph} { stroke: #ffab40; color: #ffab40; }
    .${N.iconDevice}.${N.isAlarm} .${N.iconBadge} { stroke: #e57373; animation: ${N.waveKeyframes}-alarm 1s ease-in-out infinite; }
    .${N.iconDevice}.${N.isAlarm} .${N.iconGlyph} { stroke: #e57373; color: #e57373; }
    @keyframes ${N.waveKeyframes}-alarm { 50% { stroke-width: 2.2; } }
    /* a fan turns while on; the card sets --fp-spin from its speed */
    .${N.iconDevice}[data-kind="fan"].on .${N.iconGlyph} { transform-box: fill-box; transform-origin: center;
      animation: ${N.waveKeyframes}-spin var(--fp-spin, 1.6s) linear infinite; }
    @keyframes ${N.waveKeyframes}-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .${N.iconDevice}[data-kind="fan"].on .${N.iconGlyph} { animation: none; } }
    /* a thermostat / TRV / A/C drawn as an icon: coral while heating, cyan while cooling */
    .${N.iconDevice}.${N.isHeating} .${N.iconGlyph} { stroke: #ff9166; color: #ff9166; }
    .${N.iconDevice}.${N.isCooling} .${N.iconGlyph} { stroke: #5fd6e8; color: #5fd6e8; }
    .${N.iconDevice}.${N.isHeating} .${N.deviceGlow} { opacity: 1; fill: url(#${N.acHeatPool}); }
    .${N.iconDevice}.${N.isCooling} .${N.deviceGlow} { opacity: 1; fill: url(#${N.acCoolPool}); }
    .${N.deviceValue} { fill: #c3cfdf; font-size: 8px; font-family: system-ui, sans-serif; text-anchor: middle;
                        dominant-baseline: middle; paint-order: stroke; stroke: #1b2433; stroke-width: 2.5px;
                        stroke-linejoin: round; pointer-events: none; }
  </style>`;
}

export function defs(N) {
  return `    <radialGradient id="${N.appliancePool}" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#ffab40" stop-opacity="0.22"/>
      <stop offset="45%"  stop-color="#ffab40" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#ffab40" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="alarm-pool" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#e57373" stop-opacity="0.32"/>
      <stop offset="45%"  stop-color="#e57373" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#e57373" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${N.acCoolPool}" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#5fd6e8" stop-opacity="0.30"/>
      <stop offset="40%"  stop-color="#5fd6e8" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#5fd6e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${N.acHeatPool}" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#ff9166" stop-opacity="0.30"/>
      <stop offset="40%"  stop-color="#ff9166" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#ff9166" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="tv-pool" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#8fd3ff" stop-opacity="0.30"/>
      <stop offset="35%"  stop-color="#8fd3ff" stop-opacity="0.17"/>
      <stop offset="70%"  stop-color="#8fd3ff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#8fd3ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="light-pool" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#ffc300" stop-opacity="0.34"/>
      <stop offset="35%"  stop-color="#ffc300" stop-opacity="0.20"/>
      <stop offset="70%"  stop-color="#ffc300" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffc300" stop-opacity="0"/>
    </radialGradient>
    <!-- night lights near the floor: warmer and much weaker -->
    <radialGradient id="night-pool" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#ffab40" stop-opacity="0.26"/>
      <stop offset="40%"  stop-color="#ffab40" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="#ffab40" stop-opacity="0"/>
    </radialGradient>
    <filter id="bulb-glow" x="-400%" y="-400%" width="900%" height="900%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <g id="bulb">
      <circle cx="0" cy="-1.8" r="3.2" stroke="none"/>
      <path d="M-1.9 0.5C-1.5 1.4 -1.35 1.7 -1.35 2.5L1.35 2.5C1.35 1.7 1.5 1.4 1.9 0.5" stroke="none"/>
      <g fill="none" stroke-width="0.75" stroke-linecap="round">
        <line x1="0" y1="-6.6" x2="0" y2="-5.2"/>
        <line x1="-5.1" y1="-4.7" x2="-4" y2="-3.7"/>
        <line x1="5.1" y1="-4.7" x2="4" y2="-3.7"/>
        <line x1="-5.5" y1="-0.8" x2="-4.2" y2="-0.8"/>
        <line x1="5.5" y1="-0.8" x2="4.2" y2="-0.8"/>
        <line x1="-1.3" y1="3.2" x2="1.3" y2="3.2"/>
        <line x1="-1" y1="3.9" x2="1" y2="3.9"/>
      </g>
      <circle r="12" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- Cover state icons (as mdi:window-shutter / -shutter-open): a box with
         three slats = down, with one = rolled up. They must live in <defs>:
         as plain groups they would also draw themselves at (0,0). -->
    <g id="${N.coverClosedIcon}">
      <rect x="-6" y="-5.6" width="12" height="3.2" rx="1.1"/>
      <line x1="-4.6" y1="-1.1" x2="4.6" y2="-1.1"/>
      <line x1="-4.6" y1="1.3" x2="4.6" y2="1.3"/>
      <line x1="-4.6" y1="3.7" x2="4.6" y2="3.7"/>
    </g>
    <g id="${N.coverOpenIcon}">
      <rect x="-6" y="-5.6" width="12" height="3.2" rx="1.1"/>
      <line x1="-4.6" y1="-1.1" x2="4.6" y2="-1.1"/>
    </g>
`;
}
