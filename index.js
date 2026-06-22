// index.js - Landing Page Interactive Animations & Canvas Simulations

document.addEventListener('DOMContentLoaded', () => {
    initScrollRevels();
    initNavbarHighlight();
    initStatsAnimation();
    
    // Initialize Canvas Visualizations
    const rippleCanvas = document.getElementById('rippleCanvas');
    const neuralCanvas = document.getElementById('neuralCanvas');
    const pipelineCanvas = document.getElementById('pipelineCanvas');
    const confidenceCanvas = document.getElementById('confidenceCanvas');
    const learningCanvas = document.getElementById('learningCanvas');

    if (rippleCanvas) initRippleVisualization(rippleCanvas);
    if (neuralCanvas) initNeuralVisualization(neuralCanvas);
    if (pipelineCanvas) initPipelineVisualization(pipelineCanvas);
    if (confidenceCanvas) initConfidenceVisualization(confidenceCanvas);
    if (learningCanvas) initLearningVisualization(learningCanvas);

    // Smooth scroll logo click handler
    const logoLink = document.getElementById('nav-logo-link');
    const navLinks = document.querySelectorAll('.nav-link');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            navLinks.forEach(l => l.classList.remove('active'));
            const overviewLink = document.getElementById('lnk-overview');
            if (overviewLink) {
                overviewLink.classList.add('active');
                // trigger update of sliding pill indicator
                const navLinksContainer = document.querySelector('.nav-links');
                const indicator = navLinksContainer ? navLinksContainer.querySelector('.nav-indicator-pill') : null;
                if (indicator && navLinksContainer) {
                    const rect = overviewLink.getBoundingClientRect();
                    const containerRect = navLinksContainer.getBoundingClientRect();
                    indicator.style.left = `${rect.left - containerRect.left}px`;
                    indicator.style.width = `${rect.width}px`;
                    indicator.style.height = `${rect.height}px`;
                    indicator.style.opacity = '1';
                }
            }
        });
    }
});

// Helper: Setup canvas size with device pixel ratio scaling to ensure crisp rendering on high-DPI displays
function setupCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    return { ctx, width: rect.width, height: rect.height };
}

// Reusable observer to pause rendering loops when canvas is off-screen
function observeVisibility(canvas, animateCallback) {
    let isVisible = true;
    let animId = null;

    const loop = () => {
        animateCallback();
        animId = requestAnimationFrame(loop);
    };

    if (window.IntersectionObserver) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (isVisible) {
                    if (!animId) loop();
                } else {
                    if (animId) {
                        cancelAnimationFrame(animId);
                        animId = null;
                    }
                }
            });
        }, { threshold: 0.01 });
        observer.observe(canvas);
    } else {
        loop();
    }
}

// -------------------------------------------------------------
// Scroll Reveal Animations
// -------------------------------------------------------------
function initScrollRevels() {
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealOnScroll = () => {
        const triggerBottom = window.innerHeight * 0.85;
        
        revealElements.forEach(el => {
            const elTop = el.getBoundingClientRect().top;
            if (elTop < triggerBottom) {
                el.classList.add('active');
            }
        });
    };
    
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Initial check
}

// -------------------------------------------------------------
// Stat Cards Scroll Counting Animation
// -------------------------------------------------------------
function initStatsAnimation() {
    const statNums = document.querySelectorAll('.stat-num');
    let animated = false;
    
    const triggerStatsAnim = () => {
        if (animated) return;
        
        const firstStat = statNums[0];
        if (!firstStat) return;
        
        const rect = firstStat.getBoundingClientRect();
        const triggerBottom = window.innerHeight * 0.9;
        
        if (rect.top < triggerBottom) {
            animated = true;
            statNums.forEach(numEl => {
                const target = parseFloat(numEl.getAttribute('data-target'));
                const suffix = numEl.getAttribute('data-suffix') || '';
                const stepAttr = numEl.getAttribute('data-step');
                const isFloat = !!stepAttr;
                
                let current = 0;
                const duration = 1200; // Total length of animation in ms
                const intervalTime = 16; // Frequency (~60fps)
                const stepsCount = duration / intervalTime;
                const increment = target / stepsCount;
                
                const counter = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(counter);
                    }
                    
                    if (isFloat) {
                        numEl.innerText = `${current.toFixed(1)}${suffix}`;
                    } else {
                        numEl.innerText = `${Math.floor(current)}${suffix}`;
                    }
                }, intervalTime);
            });
        }
    };
    
    window.addEventListener('scroll', triggerStatsAnim);
    triggerStatsAnim(); // check initially
}

// -------------------------------------------------------------
// Navbar Link Active State Tracking
// -------------------------------------------------------------
function initNavbarHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    const navLinksContainer = document.querySelector('.nav-links');
    
    if (!navLinksContainer) return;
    
    // Create indicator element dynamically
    const indicator = document.createElement('div');
    indicator.className = 'nav-indicator-pill';
    navLinksContainer.appendChild(indicator);
    navLinksContainer.classList.add('has-indicator');
    
    const updateIndicator = () => {
        const activeLink = navLinksContainer.querySelector('.nav-link.active');
        if (activeLink) {
            const rect = activeLink.getBoundingClientRect();
            const containerRect = navLinksContainer.getBoundingClientRect();
            
            indicator.style.left = `${rect.left - containerRect.left}px`;
            indicator.style.width = `${rect.width}px`;
            indicator.style.height = `${rect.height}px`;
            indicator.style.opacity = '1';
        } else {
            indicator.style.opacity = '0';
        }
    };
    
    // Map section IDs to their corresponding navigation link hrefs
    const sectionToLinkMap = {
        'overview': '#overview',
        'problem': '#overview',
        'intelligence': '#intelligence',
        'architecture': '#intelligence',
        'capabilities': '#capabilities',
        'trust': '#capabilities',
        'learning': '#capabilities'
    };
    
    let isScrollingFromClick = false;
    let clickScrollTimeout = null;
    
    const highlightNav = () => {
        if (isScrollingFromClick) return;
        
        let scrollY = window.pageYOffset;
        let activeChanged = false;
        
        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 250;
            const sectionId = current.getAttribute('id');
            
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                const targetHref = sectionToLinkMap[sectionId] || `#${sectionId}`;
                navLinks.forEach(link => {
                    if (link.getAttribute('href') === targetHref) {
                        if (!link.classList.contains('active')) {
                            navLinks.forEach(l => l.classList.remove('active'));
                            link.classList.add('active');
                            activeChanged = true;
                        }
                    }
                });
            }
        });
        
        if (activeChanged) {
            updateIndicator();
        }
    };
    
    // Immediate sliding on link clicks with scroll spy temporary lockout
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            isScrollingFromClick = true;
            if (clickScrollTimeout) {
                clearTimeout(clickScrollTimeout);
            }
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            updateIndicator();
            
            // Fallback timeout to re-enable scroll spy if scrollend event is unsupported
            clickScrollTimeout = setTimeout(() => {
                isScrollingFromClick = false;
            }, 800);
        });
    });
    
    // Handle modern native scrollend event for immediate restoration
    window.addEventListener('scrollend', () => {
        if (isScrollingFromClick) {
            isScrollingFromClick = false;
            if (clickScrollTimeout) {
                clearTimeout(clickScrollTimeout);
            }
            highlightNav();
        }
    });
    
    // Resolve hash fragment upon initial page load
    const checkHashOnLoad = () => {
        const hash = window.location.hash;
        if (hash) {
            const targetId = hash.substring(1);
            const targetHref = sectionToLinkMap[targetId] || hash;
            navLinks.forEach(link => {
                if (link.getAttribute('href') === targetHref) {
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        } else {
            highlightNav();
        }
        updateIndicator();
    };

    // Immediate check on load
    checkHashOnLoad();

    // Initial update after DOM settling and font render
    setTimeout(() => {
        checkHashOnLoad();
    }, 200);
    
    window.addEventListener('scroll', highlightNav);
    window.addEventListener('resize', updateIndicator);
}

// -------------------------------------------------------------
// 1. Hero: Congestion Ripple Visualization
// -------------------------------------------------------------
function initRippleVisualization(canvas) {
    const { ctx, width, height } = setupCanvas(canvas);
    let ripples = [];
    let frame = 0;
    
    // Resize handler
    window.addEventListener('resize', () => {
        if (!canvas.isConnected) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * (window.devicePixelRatio || 1);
        canvas.height = rect.height * (window.devicePixelRatio || 1);
        canvas.getContext('2d').scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    });

    // Click/Touch handler to manually generate additional ripples
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        const generateRipple = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const mx = clientX - rect.left;
            const my = clientY - rect.top;
            const w = rect.width;
            const h = rect.height;
            
            ripples.push({
                x: mx,
                y: my,
                radius: 5,
                maxRadius: Math.max(w, h) * 0.9,
                opacity: 0.6,
                speed: 2.2
            });
        };

        heroSection.addEventListener('mousedown', (e) => {
            if (e.target.closest('a') || e.target.closest('button')) return;
            generateRipple(e.clientX, e.clientY);
        });

        heroSection.addEventListener('touchstart', (e) => {
            if (e.target.closest('a') || e.target.closest('button')) return;
            const touch = e.touches[0];
            if (touch) {
                generateRipple(touch.clientX, touch.clientY);
            }
        }, { passive: true });
    }

    function render() {
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);
        
        ctx.clearRect(0, 0, w, h);
        
        // Add new ripples periodically
        if (frame % 120 === 0) {
            ripples.push({
                x: w / 2,
                y: h - 50,
                radius: 10,
                maxRadius: Math.max(w, h) * 0.9,
                opacity: 0.45,
                speed: 1.8
            });
        }
        
        ripples.forEach((r, idx) => {
            r.radius += r.speed;
            r.opacity = Math.max(0, 0.45 * (1 - r.radius / r.maxRadius));
            
            // Draw concentric glowing ring
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(99, 102, 241, ${r.opacity})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Draw secondary outer ring
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius * 0.85, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(59, 130, 246, ${r.opacity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Inner core glow dot
            ctx.beginPath();
            ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(99, 102, 241, 0.3)`;
            ctx.fill();
        });
        
        // Filter out completed ripples
        ripples = ripples.filter(r => r.radius < r.maxRadius);
        
        frame++;
    }
    
    observeVisibility(canvas, render);
}



// -------------------------------------------------------------
// 3. Intelligence: GNN (Graph Neural Network) Nodes
// -------------------------------------------------------------
function initNeuralVisualization(canvas) {
    const { ctx, width, height } = setupCanvas(canvas);
    
    // Create points
    const points = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
        points.push({
            x: 60 + Math.random() * (width - 120),
            y: 50 + Math.random() * (height - 100),
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: 3 + Math.random() * 4,
            pulseOffset: Math.random() * 100
        });
    }

    // Mouse coordinates tracker
    let mouse = { x: null, y: null, active: false };
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;
    });
    canvas.addEventListener('mouseleave', () => {
        mouse.active = false;
    });
    
    function render() {
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, w, h);

        // Draw mouse interactive halo glow
        if (mouse.active) {
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 65, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(99, 102, 241, 0.04)';
            ctx.fill();
        }
        
        // Update & Draw connections
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
                if (dist < 100) {
                    ctx.beginPath();
                    ctx.moveTo(points[i].x, points[i].y);
                    ctx.lineTo(points[j].x, points[j].y);
                    ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - dist / 100)})`;
                    ctx.stroke();
                }
            }
        }
        
        // Draw points
        points.forEach(p => {
            // Apply mouse gravitational attraction pull
            if (mouse.active) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 120) {
                    const force = (120 - dist) * 0.00025;
                    p.x += dx * force;
                    p.y += dy * force;
                }
            }

            // Move points
            p.x += p.vx;
            p.y += p.vy;
            
            // Bounce
            if (p.x < 20 || p.x > w - 20) p.vx *= -1;
            if (p.y < 20 || p.y > h - 20) p.vy *= -1;
            
            // Pulse size
            const size = p.radius + Math.sin(Date.now() / 400 + p.pulseOffset) * 1.5;
            
            // Halo glow
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
            ctx.fill();
            
            // Core
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });
    }
    
    observeVisibility(canvas, render);
}

// -------------------------------------------------------------
// 4. Pipeline: Telemetry Pipeline
// -------------------------------------------------------------
function initPipelineVisualization(canvas) {
    const { ctx, width, height } = setupCanvas(canvas);
    
    const stages = [
        { label: 'INGEST', desc: 'Cellular telemetry', x: 0.15 },
        { label: 'SIMULATE', desc: 'Cascade bottleneck', x: 0.38 },
        { label: 'RESOLVE', desc: 'AI playbook', x: 0.62 },
        { label: 'DEPLOY', desc: 'Active execution', x: 0.85 }
    ];
    
    let waveOffset = 0;
    
    function render() {
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, w, h);
        
        const cy = h / 2 - 20;
        
        // Draw Connecting pipeline tube
        ctx.beginPath();
        ctx.moveTo(w * 0.08, cy);
        ctx.lineTo(w * 0.92, cy);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 8;
        ctx.stroke();
        
        // Flow wave animation (increased increment to 1.2 to run faster)
        waveOffset = (waveOffset + 1.2) % (w * 0.84);
        const pulseX = w * 0.08 + waveOffset;
        
        // Draw pulsing flow on pipeline
        const grad = ctx.createLinearGradient(pulseX - 60, cy, pulseX + 60, cy);
        grad.addColorStop(0, 'rgba(99, 102, 241, 0)');
        grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.8)');
        grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
        
        ctx.beginPath();
        ctx.moveTo(w * 0.08, cy);
        ctx.lineTo(w * 0.92, cy);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Find the closest stage to the moving pulse
        let closestStage = null;
        let minDistance = Infinity;
        stages.forEach(s => {
            const sx = w * s.x;
            const dist = Math.abs(pulseX - sx);
            if (dist < minDistance) {
                minDistance = dist;
                closestStage = s;
            }
        });

        // Draw stages
        stages.forEach(s => {
            const sx = w * s.x;
            // Highlight only the single closest node, and only when the pulse is near it (< 55px)
            const isHighlighted = (s === closestStage) && (minDistance < 55);
            
            // Stage node circular glow
            ctx.beginPath();
            ctx.arc(sx, cy, isHighlighted ? 12 : 8, 0, Math.PI * 2);
            ctx.fillStyle = isHighlighted ? 'rgba(99, 102, 241, 0.3)' : 'rgba(7, 11, 20, 0.8)';
            ctx.fill();
            ctx.strokeStyle = isHighlighted ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Text values
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillStyle = isHighlighted ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)';
            ctx.textAlign = 'center';
            ctx.fillText(s.label, sx, cy + 30);
            
            ctx.font = '500 9px Inter, sans-serif';
            ctx.fillStyle = isHighlighted ? 'rgba(99, 102, 241, 0.9)' : 'rgba(255,255,255,0.2)';
            ctx.fillText(s.desc, sx, cy + 45);
        });
    }
    
    observeVisibility(canvas, render);
}

// -------------------------------------------------------------
// 5. Trust: Confidence Band Bounding Graph
// -------------------------------------------------------------
function initConfidenceVisualization(canvas) {
    const { ctx, width, height } = setupCanvas(canvas);
    
    const points = [];
    const count = 25;
    for (let i = 0; i < count; i++) {
        points.push({
            x: i,
            val: 50 + Math.sin(i * 0.4) * 20 + Math.random() * 5
        });
    }
    
    let timer = 0;
    
    function render() {
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, w, h);
        
        timer += 0.05;
        
        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) {
            const gy = (h / 5) * i;
            ctx.beginPath();
            ctx.moveTo(30, gy);
            ctx.lineTo(w - 30, gy);
            ctx.stroke();
        }
        
        const pxRange = w - 60;
        const xStep = pxRange / (count - 1);
        
        // Confidence band paths (top & bottom bounds)
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const x = 30 + i * xStep;
            const baseVal = 70 + Math.sin(i * 0.3 + timer) * 25 + Math.cos(i * 0.5) * 8;
            const variance = 15 + Math.sin(i * 0.2) * 8; // variance changes along time
            
            const py = h - (baseVal + variance) * (h / 140);
            
            if (i === 0) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
        }
        
        for (let i = count - 1; i >= 0; i--) {
            const x = 30 + i * xStep;
            const baseVal = 70 + Math.sin(i * 0.3 + timer) * 25 + Math.cos(i * 0.5) * 8;
            const variance = 15 + Math.sin(i * 0.2) * 8;
            
            const py = h - (baseVal - variance) * (h / 140);
            ctx.lineTo(x, py);
        }
        
        ctx.fillStyle = 'rgba(99, 102, 241, 0.06)';
        ctx.fill();
        
        // Confidence band border lines
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const x = 30 + i * xStep;
            const baseVal = 70 + Math.sin(i * 0.3 + timer) * 25 + Math.cos(i * 0.5) * 8;
            const variance = 15 + Math.sin(i * 0.2) * 8;
            const py = h - (baseVal + variance) * (h / 140);
            
            if (i === 0) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
        }
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const x = 30 + i * xStep;
            const baseVal = 70 + Math.sin(i * 0.3 + timer) * 25 + Math.cos(i * 0.5) * 8;
            const variance = 15 + Math.sin(i * 0.2) * 8;
            const py = h - (baseVal - variance) * (h / 140);
            
            if (i === 0) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
        }
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.stroke();
        
        // Central Predicted Flow Line
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const x = 30 + i * xStep;
            const baseVal = 70 + Math.sin(i * 0.3 + timer) * 25 + Math.cos(i * 0.5) * 8;
            const py = h - baseVal * (h / 140);
            
            if (i === 0) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
        }
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        // Dot at current forecasting front
        const currentFrontIdx = Math.floor(count * 0.6);
        const fx = 30 + currentFrontIdx * xStep;
        const fy = h - (70 + Math.sin(currentFrontIdx * 0.3 + timer) * 25 + Math.cos(currentFrontIdx * 0.5) * 8) * (h / 140);
        
        ctx.beginPath();
        ctx.arc(fx, fy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    observeVisibility(canvas, render);
}

// -------------------------------------------------------------
// 6. Learning: Feedback Loop Animation
// -------------------------------------------------------------
function initLearningVisualization(canvas) {
    const { ctx, width, height } = setupCanvas(canvas);
    
    function render() {
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, w, h);
        
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.3;
        
        // Draw the circular loop path
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 8;
        ctx.stroke();
        
        // Rotating flow indicators
        const time = Date.now() / 1500;
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius, time, time + Math.PI * 0.5);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius, time + Math.PI, time + Math.PI * 1.5);
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.7)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Loop Nodes (Data Ingestion, AI Forecast, Deployment Feedback, Optimization)
        const nodes = [
            { label: 'DATA', angle: 0 },
            { label: 'FORECAST', angle: Math.PI / 2 },
            { label: 'PLAYBOOK', angle: Math.PI },
            { label: 'REINFORCE', angle: (3 * Math.PI) / 2 }
        ];
        
        nodes.forEach(n => {
            const nx = cx + Math.cos(n.angle + time * 0.3) * radius;
            const ny = cy + Math.sin(n.angle + time * 0.3) * radius;
            
            // Draw Node Dot
            ctx.beginPath();
            ctx.arc(nx, ny, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#070b14';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Label
            ctx.font = 'bold 9px Inter, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.textAlign = 'center';
            ctx.fillText(n.label, nx, ny - 12);
        });
        
        // Center text (System accuracy indicator)
        ctx.font = 'bold 12px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(99, 102, 241, 1)';
        ctx.textAlign = 'center';
        ctx.fillText('Twin Drift', cx, cy - 8);
        
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillStyle = '#fff';
        const progressVal = (96.4 + Math.sin(Date.now() / 1000) * 0.2).toFixed(1);
        ctx.fillText(`${progressVal}% Acc`, cx, cy + 12);
    }
    
    observeVisibility(canvas, render);
}
