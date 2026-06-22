// simulation.js - Operations Console Engine with Leaflet Geospatial Map

document.addEventListener('DOMContentLoaded', () => {
    initLeafletMap();
    setupCustomDropdowns();
    initCollapsibleSidebar();
});

// Map coordinates profiles for corridors and their adjacent junctions in Bangalore
const corridorImpactProfiles = {
    'Silk Board Junction': {
        primary: [12.9172, 77.6228], // Silk Board Junction
        adjacent: [
            [12.9116, 77.6388], // HSR Layout Junction
            [12.9382, 77.6044]  // Dairy Circle Junction
        ]
    },
    'Outer Ring Road': {
        primary: [12.9568, 77.6976], // Marathahalli Junction
        adjacent: [
            [12.9374, 77.6912], // Kadubeesanahalli Junction
            [12.9279, 77.6791]  // Bellandur Junction
        ]
    },
    'Tumkur Road': {
        primary: [13.0285, 77.5401], // Yeswanthpur Junction
        adjacent: [
            [13.0298, 77.5348], // Goraguntepalya Junction
            [13.0329, 77.5255]  // Peenya Junction
        ]
    },
    'Bannerghata Road': {
        primary: [12.9067, 77.5996], // J.P. Nagar Junction
        adjacent: [
            [12.9382, 77.6044], // Dairy Circle Junction
            [12.9172, 77.6228]  // Silk Board Junction
        ]
    },
    'Bellary Road 1': {
        primary: [13.0354, 77.5978], // Hebbal Flyover Junction
        adjacent: [
            [13.0145, 77.5898], // Mekhri Circle Junction
            [13.0441, 77.6242]  // Nagawara Junction
        ]
    }
};

let map;
let currentAnomalyMarkers = [];
let criticalIcon, moderateIcon, minorIcon;

function initLeafletMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    // Initial map view set to Bangalore City Center
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([12.9716, 77.5946], 12);
    
    // Add CartoDB Dark Matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
    }).addTo(map);
    
    // Custom pulsing marker icons for anomaly overlays
    criticalIcon = L.divIcon({
        className: '',
        html: '<div class="glowing-anomaly pulsing-critical"></div>',
        iconSize: [160, 160],
        iconAnchor: [80, 80]
    });

    moderateIcon = L.divIcon({
        className: '',
        html: '<div class="glowing-anomaly pulsing-moderate"></div>',
        iconSize: [120, 120],
        iconAnchor: [60, 60]
    });

    minorIcon = L.divIcon({
        className: '',
        html: '<div class="glowing-anomaly pulsing-minor"></div>',
        iconSize: [80, 80],
        iconAnchor: [40, 40]
    });
    
    // Handle map container resizing dynamically (ResizeObserver)
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });
        resizeObserver.observe(mapContainer.parentNode);
    } else {
        window.addEventListener('resize', () => {
            map.invalidateSize();
        });
    }

    // Add interactive click markers representing corridors
    Object.keys(corridorImpactProfiles).forEach(corridorName => {
        const coords = corridorImpactProfiles[corridorName].primary;
        // Create subtle indicator circles for each corridor
        const marker = L.circleMarker(coords, {
            radius: 7,
            fillColor: '#6366f1',
            fillOpacity: 0.4,
            color: '#8b5cf6',
            weight: 1.5,
            className: 'interactive-corridor-node'
        }).addTo(map);

        // Bind a custom tooltip showing corridor name
        marker.bindTooltip(corridorName, {
            permanent: false,
            direction: 'top',
            offset: [0, -8],
            className: 'custom-map-tooltip'
        });

        // Hover styles for map nodes
        marker.on('mouseover', function () {
            this.setStyle({
                radius: 10,
                fillColor: '#8b5cf6',
                fillOpacity: 0.8,
                color: '#ffffff',
                weight: 2
            });
        });
        
        marker.on('mouseout', function () {
            this.setStyle({
                radius: 7,
                fillColor: '#6366f1',
                fillOpacity: 0.4,
                color: '#8b5cf6',
                weight: 1.5
            });
        });

        marker.on('click', () => {
            const select = document.getElementById('corridor');
            if (select) {
                select.value = corridorName;
                select.dispatchEvent(new Event('change'));
            }
            window.runSimulation();
        });
    });
}

// Draw cascading heatmap overlays across affected road junctions
window.drawHeatmapCascade = function(selectedCorridor, eventCause, severityTier) {
    if (!map) return;
    
    // Clear all existing anomaly markers
    currentAnomalyMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    currentAnomalyMarkers = [];

    const coordsProfile = corridorImpactProfiles[selectedCorridor];
    if (!coordsProfile) return;

    const primaryCoords = coordsProfile.primary;
    const adjacentCoords = coordsProfile.adjacent;

    // Determine severity classifications
    const mainSev = (severityTier || 'MODERATE').toUpperCase();
    const isCritical = (mainSev === 'CRITICAL' || eventCause === 'accident' || eventCause === 'water_logging');

    // 1. Draw Primary Anomaly Marker at incident site
    const primaryIcon = isCritical ? criticalIcon : moderateIcon;
    const primaryMarker = L.marker(primaryCoords, { icon: primaryIcon }).addTo(map);
    currentAnomalyMarkers.push(primaryMarker);

    // 2. Draw Cascaded Secondary Heatmap Overlays (Adjacent Junctions)
    if (isCritical) {
        // High impact cascade - spreads further and more intensely
        if (adjacentCoords[0]) {
            const marker1 = L.marker(adjacentCoords[0], { icon: moderateIcon }).addTo(map);
            currentAnomalyMarkers.push(marker1);
        }
        if (adjacentCoords[1]) {
            const marker2 = L.marker(adjacentCoords[1], { icon: minorIcon }).addTo(map);
            currentAnomalyMarkers.push(marker2);
        }
    } else {
        // Moderate impact cascade - smaller spreading radius
        if (adjacentCoords[0]) {
            const marker1 = L.marker(adjacentCoords[0], { icon: minorIcon }).addTo(map);
            currentAnomalyMarkers.push(marker1);
        }
    }
};

// Plot precise map anomaly at exact coordinates
window.drawAnomaly = function(lat, lng, severity) {
    if (!map) return;
    
    // Clear all existing anomaly markers to prevent piling up
    currentAnomalyMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    currentAnomalyMarkers = [];
    
    // Determine custom pulsing marker icon based on severity
    const sev = (severity || 'moderate').toLowerCase();
    let icon = moderateIcon;
    if (sev === 'critical') {
        icon = criticalIcon;
    } else if (sev === 'minor') {
        icon = minorIcon;
    }
    
    // Draw the single precise anomaly marker and save it to layer tracker
    const marker = L.marker([lat, lng], { icon: icon }).addTo(map);
    currentAnomalyMarkers.push(marker);
};
window.setSimIncident = function(roadId, severity) {};

// -------------------------------------------------------------
// Mock Data Definition for Fallback Simulation Output
// -------------------------------------------------------------
const mockData = {
    accident: {
        clearance: "75 min",
        jurisdiction: "Metro Traffic Control",
        status: "Critical",
        statusClass: "critical",
        barricading: "Deploy heavy concrete barriers at upstream junctions and close left lanes.",
        manpower: "Dispatch traffic personnel and patrol units to direct vehicle diversions.",
        diversion: "Reroute incoming vehicles via Outer Bypass and adjust signal timers at adjacent junctions (+20s green).",
        timeline: "T+05 Cordon lane, T+15 Set signs, T+45 Clear debris, T+60 Normalize flow."
    },
    vehicle_breakdown: {
        clearance: "30 min",
        jurisdiction: "BTP West Command",
        status: "Moderate",
        statusClass: "moderate",
        barricading: "Close left shoulder lane and set up warning cones 100 meters upstream on main road corridor.",
        manpower: "Dispatch rapid-response motorcycle officers to coordinate towing vehicle arrival.",
        diversion: "Monitor corridor queue buildup and trigger signal offsets at adjacent intersections (+12s green phase).",
        timeline: "T+02 Dispatched, T+10 Tow truck arrival, T+25 Clear vehicle."
    },
    water_logging: {
        clearance: "120 min",
        jurisdiction: "BBMP Emergency Cell",
        status: "Critical",
        statusClass: "critical",
        barricading: "Deploy flood barriers and close the lower underpass segment of the corridor.",
        manpower: "Deploy BBMP pumping crew with high-capacity sewage pumps.",
        diversion: "Broadcast mobile app diversions; reroute general traffic via CBD Link.",
        timeline: "T+10 Pump activation, T+30 Route diversion, T+90 Flood recedes, T+120 Reopen underpass."
    },
    tree_fall: {
        clearance: "45 min",
        jurisdiction: "Forest Dept Rescue",
        status: "Moderate",
        statusClass: "moderate",
        barricading: "Close affected left lanes and set up reflective warning barriers at segment entrance.",
        manpower: "Dispatch chainsaw team and support vehicle to clear trunks.",
        diversion: "Open emergency shoulder lane for light vehicles, divert buses to alternate corridors.",
        timeline: "T+08 Saw team arrival, T+25 Trunk clearance, T+40 Debris sweeping, T+45 Full reopen."
    },
    construction: {
        clearance: "180 min",
        jurisdiction: "BMRCL Operations",
        status: "Moderate",
        statusClass: "moderate",
        barricading: "Set up permanent construction barriers and reflective barricades on affected segment.",
        manpower: "Assign marshals per shift to manage merge lanes at adjacent junctions.",
        diversion: "Reduce speed limit to 30 km/h, activate adaptive merge signals.",
        timeline: "T+00 Setup barriers, T+10 Verify signage, T+180 Complete concrete curing."
    }
};

// -------------------------------------------------------------
// Core Simulation Execution
// -------------------------------------------------------------

// Helper to determine vulnerable junctions for corridors
function getVulnerableJunctions(corridor) {
    const junctions = {
        'Silk Board Junction': ["HSR Layout Junction", "Dairy Circle Junction", "Agara Flyover"],
        'Outer Ring Road': ["Kadubeesanahalli Junction", "Bellandur Junction", "Marathahalli Bridge"],
        'Tumkur Road': ["Goraguntepalya Junction", "Peenya Junction", "Jalahalli Cross"],
        'Bannerghata Road': ["Dairy Circle Junction", "Silk Board Junction", "Jayadeva Flyover"],
        'Bellary Road 1': ["Mekhri Circle Junction", "Nagawara Junction", "Hebbal Circle"]
    };
    return junctions[corridor] || ["Adjacent Intersection A", "Adjacent Intersection B"];
}

// Generate values matching app.py calculations for offline fallback
function getOfflineFallbackIntelligence(eventCause, corridor) {
    const causeLabels = {
        accident: "Major Accident",
        vehicle_breakdown: "Vehicle Breakdown",
        water_logging: "Water Logging",
        tree_fall: "Tree Fall",
        construction: "Construction Zone"
    };
    
    const p50Map = {
        accident: 75,
        vehicle_breakdown: 30,
        water_logging: 120,
        tree_fall: 45,
        construction: 180
    };
    
    const p50 = p50Map[eventCause] || 35;
    const p10 = Math.max(5, Math.round(p50 * 0.45));
    const p90 = Math.round(p50 * 1.6);
    
    const riskScores = {
        accident: { corridor: 60, cascade: 75, delay: 65, diversion: 80 },
        vehicle_breakdown: { corridor: 40, cascade: 30, delay: 25, diversion: 15 },
        water_logging: { corridor: 85, cascade: 90, delay: 85, diversion: 95 },
        tree_fall: { corridor: 45, cascade: 40, delay: 35, diversion: 30 },
        construction: { corridor: 70, cascade: 55, delay: 60, diversion: 50 }
    };
    
    const rs = riskScores[eventCause] || riskScores.vehicle_breakdown;
    const junctions = getVulnerableJunctions(corridor);
    
    const u_score = Math.min(100, Math.round(p50 * 0.5 + rs.corridor * 0.3 + rs.cascade * 0.2));
    const u_tier = u_score > 70 ? "CRITICAL" : u_score > 40 ? "HIGH" : "MEDIUM";
    
    return {
        "predictions": { "p10": p10, "p50": p50, "p90": p90 },
        "classification": { 
            "severity": p50 > 90 ? "Critical" : p50 > 45 ? "Medium → High" : "Short → Medium", 
            "confidence": p50 > 90 ? "Low" : p50 > 45 ? "Moderate" : "High"
        },
        "urgency": { "score": u_score, "tier": u_tier },
        "event_cause": eventCause,
        "corridor": corridor,
        "requires_road_closure": true,
        "vulnerable_junctions": junctions,
        "intelligence": {
            "priority": u_tier === "CRITICAL" ? "Critical" : u_tier === "HIGH" ? "High" : "Medium",
            "micro_zone": `Zone ${(corridor.length * 7) % 20 + 1}`,
            "timestamp": new Date().toISOString().replace('T', ' ').substring(0, 19),
            "similar_count": 87, // static offline count
            "decision_drivers": [
                `Incident cause is registered as ${causeLabels[eventCause] || eventCause}.`,
                `Corridor ${corridor} shows normal load with localized queue points.`,
                `Expected merge interference at secondary junction bottlenecks.`,
                `Incident severity classified as ${p50 > 45 ? 'Heavy' : 'Moderate'} obstruction.`
            ],
            "confidence_drivers": [
                `Clearance bounds display variance due to local route topology.`,
                `High historical recovery clustering between ${p10} and ${p90} minutes.`,
                `Peak congestion offsets may widen the expected timeline range.`
            ],
            "cascade_spread_window": `${Math.round(p50 * 0.3)}–${Math.round(p50 * 0.6)} minutes`,
            "risk_radar": {
                "corridor_risk": rs.corridor,
                "cascade_risk": rs.cascade,
                "delay_risk": rs.delay,
                "diversion_need": rs.diversion
            },
            "risk_radar_explanations": [
                `Corridor risk calculated at ${rs.corridor}% based on normal structural capacity.`,
                `Cascade risk of ${rs.cascade}% due to potential queue spillover.`,
                `Delay risk of ${rs.delay}% linked to forecast clearance window.`,
                `Diversion need of ${rs.diversion}% depends on lanes blocked.`
            ],
            "playbook": {
                "barricading": `Deploy cones 100m upstream. Close left lane at incident zone.`,
                "manpower": `Assign traffic officers at the main bottleneck point and downstream merge.`,
                "diversion": `Adjust green time (+15s) at adjacent junctions. Set VMS boards.`,
                "timeline": `T+00 Dispatch, T+10 Cordon Lane, T+25 Clear, T+${p50} Open Road.`,
                "escalation": `If recovery exceeds upper bound of ${p90} minutes, alert Supervisor.`
            },
            "future_readiness": {
                "strategic_insight": `Anomalies on ${corridor} tend to cause rapid backup on connecting arterial segments.`,
                "preparedness_recommendations": [
                    `Pre-position a response unit at the main intersection approach.`,
                    `Sync signal offsets along the diversion corridor before peak hours.`
                ],
                "historical_context": `Historically, ${causeLabels[eventCause] || eventCause} on ${corridor} returns to baseline in ${p50} min.`,
                "resilience_opportunities": [
                    `Install automated camera loop detection for quicker anomaly capture.`,
                    `Enhance side-arterial merge lanes to buffer localized overflow.`
                ]
            }
        }
    };
}

// Animate Circular Progress Rings
function animateProgressRing(circleId, textId, percent) {
    const circle = document.getElementById(circleId);
    const text = document.getElementById(textId);
    if (!circle) return;
    
    const circumference = 175.9; // 2 * PI * 28 radius
    
    // Set initial dasharray
    circle.style.strokeDasharray = `${circumference}`;
    
    // Calculate final offset
    const offset = circumference - (percent / 100) * circumference;
    
    // Transition stroke-dashoffset smoothly
    circle.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)';
    circle.style.strokeDashoffset = offset;
    
    // Dynamic color coding based on risk percentage
    let color = 'var(--accent-emerald)'; // <35%: green
    if (percent > 70) {
        color = 'var(--accent-red)';     // >70%: red
    } else if (percent >= 35) {
        color = 'var(--accent-amber)';   // 35%-70%: yellow/orange
    }
    circle.style.stroke = color;
    circle.style.filter = `drop-shadow(0 0 4px ${color})`;
    
    // Text count-up animation
    let current = 0;
    const duration = 1200; // ms
    const stepTime = Math.max(Math.floor(duration / percent), 15);
    const timer = setInterval(() => {
        current += 1;
        if (current >= percent) {
            current = percent;
            clearInterval(timer);
        }
        if (text) {
            text.innerText = `${current}%`;
            text.style.color = color;
        }
    }, stepTime);
}

// Generate premium SVG Network Graph
function drawCascadeNetwork(corridor, vulnerableJunctions) {
    const svg = document.getElementById('cascade-network-svg');
    if (!svg) return;
    
    // Clear previous SVG content
    svg.innerHTML = '';
    
    // Set viewbox for responsiveness
    svg.setAttribute('viewBox', '0 0 680 320');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    // Define defs for glows and gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <filter id="svg-glow-purple" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <filter id="svg-glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <linearGradient id="line-grad-purple-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#ef4444" stop-opacity="0.8" />
        </linearGradient>
        <style>
            @keyframes svgFlow {
                to { stroke-dashoffset: -24; }
            }
            .svg-flow-path {
                stroke-dasharray: 6 6;
                animation: svgFlow 1.5s linear infinite;
            }
        </style>
    `;
    svg.appendChild(defs);
    
    const nodes = [];
    // Primary incident node
    nodes.push({
        id: 'primary',
        name: corridor,
        label: 'Incident Location',
        x: 100,
        y: 160,
        isPrimary: true
    });
    
    // Position vulnerable nodes based on count
    const count = vulnerableJunctions.length;
    vulnerableJunctions.forEach((juncName, index) => {
        let x, y;
        if (count === 1) {
            x = 450;
            y = 160;
        } else if (count === 2) {
            x = 420;
            y = index === 0 ? 80 : 240;
        } else {
            if (index === 0) {
                x = 380; y = 70;
            } else if (index === 1) {
                x = 380; y = 250;
            } else {
                x = 580; y = 160;
            }
        }
        nodes.push({
            id: `vunc-${index}`,
            name: juncName,
            label: `Vulnerable Junction ${index + 1}`,
            x: x,
            y: y,
            isPrimary: false
        });
    });
    
    // Draw connecting paths
    for (let i = 1; i < nodes.length; i++) {
        const link = nodes[i];
        
        // Prevent perfectly horizontal/vertical bounding boxes from failing gradient rendering (bbox size > 0)
        let x2Val = link.x;
        let y2Val = link.y;
        if (x2Val === nodes[0].x) x2Val += 1;
        if (y2Val === nodes[0].y) y2Val += 1;
        
        // Background line
        const bgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        bgLine.setAttribute('x1', nodes[0].x);
        bgLine.setAttribute('y1', nodes[0].y);
        bgLine.setAttribute('x2', x2Val);
        bgLine.setAttribute('y2', y2Val);
        bgLine.setAttribute('stroke', 'rgba(255,255,255,0.06)');
        bgLine.setAttribute('stroke-width', '4');
        bgLine.setAttribute('stroke-linecap', 'round');
        svg.appendChild(bgLine);
        
        // Flowing active connection line
        const activeLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        activeLine.setAttribute('x1', nodes[0].x);
        activeLine.setAttribute('y1', nodes[0].y);
        activeLine.setAttribute('x2', x2Val);
        activeLine.setAttribute('y2', y2Val);
        activeLine.setAttribute('stroke', 'url(#line-grad-purple-red)');
        activeLine.setAttribute('stroke-width', '2.5');
        activeLine.setAttribute('class', 'svg-flow-path');
        activeLine.setAttribute('stroke-linecap', 'round');
        svg.appendChild(activeLine);
    }
    
    // Draw node elements
    nodes.forEach(node => {
        // Pulse glow
        const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        outerCircle.setAttribute('cx', node.x);
        outerCircle.setAttribute('cy', node.y);
        outerCircle.setAttribute('r', node.isPrimary ? 16 : 12);
        outerCircle.setAttribute('fill', node.isPrimary ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)');
        outerCircle.setAttribute('stroke', node.isPrimary ? '#ef4444' : '#f59e0b');
        outerCircle.setAttribute('stroke-width', '1.5');
        
        const animR = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animR.setAttribute('attributeName', 'r');
        animR.setAttribute('values', node.isPrimary ? '14;24;14' : '10;18;10');
        animR.setAttribute('dur', '2s');
        animR.setAttribute('repeatCount', 'indefinite');
        outerCircle.appendChild(animR);
        
        const animOp = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animOp.setAttribute('attributeName', 'opacity');
        animOp.setAttribute('values', '0.7;0.1;0.7');
        animOp.setAttribute('dur', '2s');
        animOp.setAttribute('repeatCount', 'indefinite');
        outerCircle.appendChild(animOp);
        
        svg.appendChild(outerCircle);
        
        // Solid core
        const coreCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        coreCircle.setAttribute('cx', node.x);
        coreCircle.setAttribute('cy', node.y);
        coreCircle.setAttribute('r', node.isPrimary ? 8 : 6);
        coreCircle.setAttribute('fill', node.isPrimary ? '#ef4444' : '#f59e0b');
        coreCircle.setAttribute('filter', node.isPrimary ? 'url(#svg-glow-red)' : 'url(#svg-glow-purple)');
        svg.appendChild(coreCircle);
        
        // Text labels card
        const nameGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        const textBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        textBg.setAttribute('x', node.x - 75);
        textBg.setAttribute('y', node.isPrimary ? node.y + 24 : node.y - 42);
        textBg.setAttribute('width', 150);
        textBg.setAttribute('height', 34);
        textBg.setAttribute('rx', 6);
        textBg.setAttribute('fill', 'rgba(5, 7, 15, 0.85)');
        textBg.setAttribute('stroke', 'rgba(255, 255, 255, 0.08)');
        textBg.setAttribute('stroke-width', '1');
        nameGroup.appendChild(textBg);
        
        const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleText.setAttribute('x', node.x);
        titleText.setAttribute('y', node.isPrimary ? node.y + 37 : node.y - 29);
        titleText.setAttribute('fill', 'white');
        titleText.setAttribute('font-size', '10px');
        titleText.setAttribute('font-weight', '700');
        titleText.setAttribute('text-anchor', 'middle');
        titleText.setAttribute('font-family', 'var(--font-sans)');
        titleText.textContent = node.name.length > 20 ? node.name.substring(0, 18) + '...' : node.name;
        nameGroup.appendChild(titleText);
        
        const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        subText.setAttribute('x', node.x);
        subText.setAttribute('y', node.isPrimary ? node.y + 49 : node.y - 17);
        subText.setAttribute('fill', node.isPrimary ? '#f87171' : '#f59e0b');
        subText.setAttribute('font-size', '8px');
        subText.setAttribute('font-weight', '600');
        subText.setAttribute('font-family', 'var(--font-mono)');
        subText.setAttribute('text-anchor', 'middle');
        subText.textContent = node.label.toUpperCase();
        nameGroup.appendChild(subText);
        
        svg.appendChild(nameGroup);
    });
}

// Populate the briefing deck sections
function hydrateBriefingDeck(data) {
    const causeLabels = {
        accident: "Major Accident",
        vehicle_breakdown: "Vehicle Breakdown",
        water_logging: "Water Logging",
        tree_fall: "Tree Fall",
        construction: "Construction Zone"
    };

    const corridorLabels = {
        'Silk Board Junction': "Metro Core Spine",
        'Outer Ring Road': "Outer Ring Road (ORR)",
        'Tumkur Road': "Tumkur Road",
        'Bannerghata Road': "Bannerghata Road",
        'Bellary Road 1': "Bellary Road"
    };

    const eventLabel = causeLabels[data.event_cause] || data.event_cause;
    const corridorLabel = corridorLabels[data.corridor] || data.corridor;

    // SECTION 1
    document.getElementById('sec1-event-cause').innerText = eventLabel;
    document.getElementById('sec1-corridor').innerText = corridorLabel;
    document.getElementById('sec1-incident-location').innerText = `${data.corridor} segment`;
    document.getElementById('sec1-priority').innerText = data.intelligence.priority;
    document.getElementById('sec1-road-closure').innerText = data.requires_road_closure ? "Required" : "Not Required";
    
    // Sync timestamp dynamically with time_slider input
    const timeSliderInput = document.getElementById('time_slider');
    const minutesTotal = timeSliderInput ? parseInt(timeSliderInput.value) : 1080;
    const hours = Math.floor(minutesTotal / 60);
    const mins = minutesTotal % 60;
    const d = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const formattedTimestamp = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(hours)}:${pad(mins)}`;
    document.getElementById('sec1-timestamp').innerText = formattedTimestamp;

    // SECTION 2
    const p10 = data.predictions.p10;
    const p50 = data.predictions.p50;
    const p90 = data.predictions.p90;

    document.getElementById('sec2-clearance').innerText = `${p50} Min`;
    document.getElementById('sec2-range').innerText = `${p10}–${p90} Min`;
    document.getElementById('sec2-severity').innerText = data.classification.severity;
    document.getElementById('sec2-urgency').innerText = `${data.urgency.score}/100`;

    const confDriversContainer = document.getElementById('sec2-confidence-drivers');
    confDriversContainer.innerHTML = '';
    data.intelligence.confidence_drivers.forEach(driver => {
        const li = document.createElement('li');
        li.textContent = driver;
        confDriversContainer.appendChild(li);
    });

    // SECTION 3
    const driversContainer = document.getElementById('sec3-drivers-container');
    driversContainer.innerHTML = '';
    data.intelligence.decision_drivers.forEach((driver, idx) => {
        const card = document.createElement('div');
        card.className = 'briefing-tag-card';
        card.innerHTML = `
            <span style="font-size: 0.65rem; text-transform: uppercase; color: var(--accent-indigo); font-family: var(--font-mono); font-weight: 700;">Driver 0${idx+1}</span>
            <span style="font-size: 0.88rem; font-weight: 600; color: white; margin-top: 0.25rem; line-height: 1.4;">${driver}</span>
        `;
        driversContainer.appendChild(card);
    });

    // SECTION 4
    document.getElementById('sec4-primary-zone').innerText = corridorLabel;
    document.getElementById('sec4-spread-window').innerText = data.intelligence.cascade_spread_window;
    document.getElementById('sec4-cascade-risk').innerText = `${data.intelligence.risk_radar.cascade_risk}%`;

    const junctionsContainer = document.getElementById('sec4-vulnerable-junctions');
    junctionsContainer.innerHTML = '';
    data.vulnerable_junctions.forEach(junc => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '0.5rem';
        item.innerHTML = `
            <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-amber);"></span>
            <span style="font-size: 0.86rem; font-weight: 600; color: white;">${junc}</span>
        `;
        junctionsContainer.appendChild(item);
    });

    drawCascadeNetwork(data.corridor, data.vulnerable_junctions);

    // SECTION 5
    document.getElementById('sec5-corridor-risk-desc').innerText = data.intelligence.risk_radar_explanations[0] || "-";
    document.getElementById('sec5-cascade-risk-desc').innerText = data.intelligence.risk_radar_explanations[1] || "-";
    document.getElementById('sec5-delay-risk-desc').innerText = data.intelligence.risk_radar_explanations[2] || "-";
    document.getElementById('sec5-diversion-need-desc').innerText = data.intelligence.risk_radar_explanations[3] || "-";

    animateProgressRing('sec5-circle-corridor', 'sec5-corridor-risk-val', data.intelligence.risk_radar.corridor_risk);
    animateProgressRing('sec5-circle-cascade', 'sec5-cascade-risk-val', data.intelligence.risk_radar.cascade_risk);
    animateProgressRing('sec5-circle-delay', 'sec5-delay-risk-val', data.intelligence.risk_radar.delay_risk);
    animateProgressRing('sec5-circle-diversion', 'sec5-diversion-need-val', data.intelligence.risk_radar.diversion_need);

    // SECTION 6 (RESTORED PLAYBOOK)
    if (data.intelligence && data.intelligence.playbook) {
        document.getElementById('sec6-barricading').innerText = data.intelligence.playbook.barricading || '-';
        document.getElementById('sec6-manpower').innerText = data.intelligence.playbook.manpower || '-';
        document.getElementById('sec6-diversion').innerText = data.intelligence.playbook.diversion || '-';
        document.getElementById('sec6-escalation').innerText = data.intelligence.playbook.escalation || '-';
    }

    // SECTION 7
    document.getElementById('sec7-historical-count').innerText = `${data.intelligence.similar_count} Matches`;
    document.getElementById('sec7-predicted-duration').innerText = `${p50} Min (P50)`;
    document.getElementById('sec7-risk-profile').innerText = `${data.intelligence.risk_radar.cascade_risk}% (Cascade)`;
    document.getElementById('sec7-affected-junctions').innerText = `${data.vulnerable_junctions.length} Nodes`;

    // SECTION 8
    document.getElementById('sec8-strategic-insight').innerText = data.intelligence.future_readiness.strategic_insight;
    document.getElementById('sec8-historical-context').innerText = data.intelligence.future_readiness.historical_context;

    const preparednessContainer = document.getElementById('sec8-preparedness-recommendations');
    preparednessContainer.innerHTML = '';
    data.intelligence.future_readiness.preparedness_recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        preparednessContainer.appendChild(li);
    });

    const resilienceContainer = document.getElementById('sec8-resilience-opportunities');
    resilienceContainer.innerHTML = '';
    data.intelligence.future_readiness.resilience_opportunities.forEach(opp => {
        const li = document.createElement('li');
        li.textContent = opp;
        resilienceContainer.appendChild(li);
    });
}

window.runSimulation = async function() {
    const eventCause = document.getElementById('event_cause').value;
    const corridor = document.getElementById('corridor').value;
    
    // UI elements
    const btn = document.getElementById('generateBtn');
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    // Reset layout states before generation runs
    const bottomRow = document.getElementById('bottom-row-container');
    const consoleGrid = document.querySelector('.console-grid');
    const mapOverlay = document.getElementById('liveMapOverlay');
    if (bottomRow) {
        bottomRow.classList.remove('visible');
        bottomRow.style.display = 'none';
    }
    if (consoleGrid) {
        consoleGrid.classList.remove('show-playbook');
    }
    if (mapOverlay) {
        mapOverlay.style.display = 'none';
    }
    
    btn.disabled = true;
    overlay.style.display = 'flex';
    
    // Loading pipeline animations
    loadingText.innerText = "INGESTING SENSOR TELEMETRY...";
    
    setTimeout(() => {
        loadingText.innerText = "RUNNING LIGHTGBM FORECAST...";
    }, 450);

    setTimeout(() => {
        loadingText.innerText = "SIMULATING CASCADE PATTERNS...";
    }, 900);

    setTimeout(() => {
        loadingText.innerText = "GENERATING LLM PLAYBOOK...";
    }, 1350);

    // Get selected corridor's coordinate
    const profile = corridorImpactProfiles[corridor];
    const lat = profile ? profile.primary[0] : 12.9716;
    const lng = profile ? profile.primary[1] : 77.5946;

    let payloadData = null;
    let severityTier = 'MODERATE';

    // Calculate start datetime aligned with the time slider
    const timeSliderInput = document.getElementById('time_slider');
    const minutesTotal = timeSliderInput ? parseInt(timeSliderInput.value) : 1080;
    const hours = Math.floor(minutesTotal / 60);
    const mins = minutesTotal % 60;
    const d = new Date();
    d.setHours(hours, mins, 0, 0);
    const startDatetimeStr = d.toISOString();

    try {
        // Send payload to Python Flask server
        const payload = {
            event_cause: eventCause,
            corridor: corridor,
            requires_road_closure: 1,
            start_datetime: startDatetimeStr
        };
        
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            payloadData = await response.json();
            severityTier = payloadData.urgency.tier;
        } else {
            throw new Error("HTTP prediction request failed");
        }
    } catch (e) {
        console.warn("Backend API not reachable or errored. Falling back to offline simulation results.", e);
        payloadData = getOfflineFallbackIntelligence(eventCause, corridor);
        severityTier = payloadData.urgency.tier;
    }

    // Hydrate the briefing deck with response values
    if (payloadData) {
        hydrateBriefingDeck(payloadData);
    }

    // Call drawHeatmapCascade and map.flyTo exactly after the API returns or fallback completes
    if (window.drawHeatmapCascade) {
        window.drawHeatmapCascade(corridor, eventCause, severityTier);
    }
    if (map) {
        map.flyTo([lat, lng], 14);
    }

    // Finalize loading phase after 1.8s
    setTimeout(() => {
        overlay.style.display = 'none';
        btn.disabled = false;
        
        // Show bottom row container (which contains both metrics and playbook) and transition layout
        if (bottomRow) {
            bottomRow.style.display = 'flex'; // Column layout flexbox
            bottomRow.offsetHeight; // Force reflow to trigger transition
            bottomRow.classList.add('visible');
        }
        if (consoleGrid) {
            consoleGrid.classList.add('show-playbook');
        }
        
        // Update Map corridor focus header
        const mapOverlay = document.getElementById('liveMapOverlay');
        if (mapOverlay) {
            mapOverlay.innerText = `Corridor Focus: ${corridor}`;
            mapOverlay.style.display = 'inline-block';
        }

        // Smoothly scroll the page down to bring the newly generated playbook fully into view
        if (bottomRow) {
            setTimeout(() => {
                bottomRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, 1800);
};

// ─── AUTO-HYDRATED CUSTOM DROPDOWN SELECTS ───
function setupCustomDropdowns() {
    const selects = document.querySelectorAll('.control-input-group select');
    
    selects.forEach(select => {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select); // Move native select into wrapper
        select.style.display = 'none'; // Hide native select
        
        // Create trigger
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.setAttribute('tabindex', '0'); // Accessibility: Keyboard focus
        
        trigger.innerHTML = `
            <span class="custom-select-value">${select.options[select.selectedIndex]?.text || ''}</span>
            <svg class="custom-select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        `;
        
        const triggerText = trigger.querySelector('.custom-select-value');
        wrapper.appendChild(trigger);
        
        // Create options container
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options-container';
        
        // Populate options
        Array.from(select.options).forEach(option => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-option';
            customOption.textContent = option.text;
            customOption.setAttribute('data-value', option.value);
            
            if (option.selected) {
                customOption.classList.add('selected');
            }
            
            customOption.addEventListener('click', (e) => {
                e.stopPropagation();
                select.value = option.value;
                select.dispatchEvent(new Event('change'));
                closeAllDropdowns();
            });
            
            optionsContainer.appendChild(customOption);
        });
        
        wrapper.appendChild(optionsContainer);
        
        // Keyboard interactions state
        let highlightedIndex = select.selectedIndex;
        
        const updateHighlight = (idx) => {
            const customOpts = optionsContainer.querySelectorAll('.custom-option');
            customOpts.forEach((opt, oIdx) => {
                if (oIdx === idx) {
                    opt.classList.add('highlighted');
                    opt.scrollIntoView({ block: 'nearest' });
                } else {
                    opt.classList.remove('highlighted');
                }
            });
        };
        
        // Toggle trigger active on click
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = wrapper.classList.contains('active');
            closeAllDropdowns();
            if (!isActive) {
                wrapper.classList.add('active');
                highlightedIndex = select.selectedIndex;
                updateHighlight(highlightedIndex);
            }
        });
        
        // Keyboard navigation for trigger dropdown
        trigger.addEventListener('keydown', (e) => {
            const isActive = wrapper.classList.contains('active');
            const customOpts = optionsContainer.querySelectorAll('.custom-option');
            
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!isActive) {
                    closeAllDropdowns();
                    wrapper.classList.add('active');
                    highlightedIndex = select.selectedIndex;
                    updateHighlight(highlightedIndex);
                } else {
                    const activeOpt = customOpts[highlightedIndex];
                    if (activeOpt) {
                        select.value = activeOpt.getAttribute('data-value');
                        select.dispatchEvent(new Event('change'));
                    }
                    closeAllDropdowns();
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!isActive) {
                    closeAllDropdowns();
                    wrapper.classList.add('active');
                    highlightedIndex = select.selectedIndex;
                } else {
                    highlightedIndex = (highlightedIndex + 1) % customOpts.length;
                }
                updateHighlight(highlightedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!isActive) {
                    closeAllDropdowns();
                    wrapper.classList.add('active');
                    highlightedIndex = select.selectedIndex;
                } else {
                    highlightedIndex = (highlightedIndex - 1 + customOpts.length) % customOpts.length;
                }
                updateHighlight(highlightedIndex);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeAllDropdowns();
                trigger.focus();
            } else if (e.key === 'Tab') {
                closeAllDropdowns();
            }
        });
        
        // Listen for programmatical changes on native select
        select.addEventListener('change', () => {
            // Update trigger text
            triggerText.textContent = select.options[select.selectedIndex]?.text || '';
            
            // Update selected class in custom option list
            const customOpts = optionsContainer.querySelectorAll('.custom-option');
            customOpts.forEach(opt => {
                if (opt.getAttribute('data-value') === select.value) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        closeAllDropdowns();
    });
    
    function closeAllDropdowns() {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            w.classList.remove('active');
            w.querySelectorAll('.custom-option').forEach(o => o.classList.remove('highlighted'));
        });
    }
}

// Collapsible sidebar functionality with map resize synchronization
function initCollapsibleSidebar() {
    const toggleBtn = document.getElementById('toggleConfigBtn');
    const topRowGrid = document.querySelector('.top-row-grid');
    if (toggleBtn && topRowGrid) {
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = topRowGrid.classList.toggle('config-collapsed');
            if (isCollapsed) {
                toggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="toggle-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
                toggleBtn.title = "Expand Panel";
            } else {
                toggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="toggle-icon"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
                toggleBtn.title = "Collapse Panel";
            }
            
            // Incrementally invalidate Leaflet map size during the 400ms CSS transition
            let ticks = 0;
            const resizeInterval = setInterval(() => {
                if (map) map.invalidateSize();
                ticks++;
                if (ticks >= 20) clearInterval(resizeInterval); // 20 * 20ms = 400ms
            }, 20);
        });
    }
}

// Copy playbook card description text to clipboard with feedback
window.copyCardText = function(btn, textId) {
    const textEl = document.getElementById(textId);
    if (!textEl) return;
    const textToCopy = textEl.innerText;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        btn.classList.add('copied');
        const origSVG = btn.innerHTML;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = origSVG;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
};
