/* ════════════════════════════════════
   DATABASE TEMPLATE UNTUK PENCARIAN
════════════════════════════════════ */
const templateDB = [
    { id: 'photoA.png', title: 'Strip A', desc: 'Vintage Journal (2 Pose)', img: 'photo3.jpeg' },
    { id: 'photoB.png', title: 'Strip B', desc: 'Strawberry Canon (1 Pose)', img: 'photo1.jpeg' },
    { id: 'photoC.png', title: 'Strip C', desc: 'Pastel Butterfly (1 Pose)', img: 'photo2.jpeg' },
    { id: 'photoD.png', title: 'Strip D', desc: 'Frog & Totoro (2 Pose)', img: 'photo6.jpeg' },
    { id: 'photoE.png', title: 'Strip E', desc: 'Floral Moments (2 Pose)', img: 'photo5.jpeg' },
    { id: 'photoF.png', title: 'Strip F', desc: 'Toy Story (2 Pose)', img: 'photo4.jpeg' },
    { id: 'photoG.png', title: 'Strip G', desc: 'Taylor Swift (6 Pose)', img: 'photo7.jpeg' },
    { id: 'photoH.png', title: 'Strip H', desc: 'LANY (6 Pose)', img: 'photo8.jpeg' }
];

/* ════════════════════════════════════
   GLOBAL VARIABLES
════════════════════════════════════ */
const PW = 540, PH = 960;          
const OUT_W = 1080, OUT_H = 1920;  

const frameCoords = {
    'photoA.png': [{ x: 190, y: 370, w: 700, h: 510, r: 0 }, { x: 190, y: 1000, w: 700, h: 510, r: 0 }],
    'photoB.png': [{ x: 500, y: 548, w: 540, h: 600, r: 0 }],
    'photoC.png': [{ x: 267, y: 600, w: 545, h: 800, r: -8 }],
    'photoD.png': [{ x: 75, y: 130, w: 800, h: 710, r: -4 }, { x: 220, y: 860, w: 800, h: 710, r: 3 }],
    'photoE.png': [{ x: 330, y: 180, w: 680, h: 650, r: 9 }, { x: 60, y: 960, w: 680, h: 650, r: -8 }],
    'photoF.png': [{ x: 50, y: 120, w: 780, h: 640, r: 8 }, { x: 208, y: 880, w: 753, h: 645, r: 16 }],
    'photoG.png': [
        { x: 20, y: 65,   w: 500, h: 520, r: 0 }, { x: 560, y: 65,   w: 500, h: 520, r: 0 }, 
        { x: 20, y: 580,  w: 500, h: 460, r: 0 }, { x: 560, y: 580,  w: 500, h: 460, r: 0 }, 
        { x: 20, y: 1050, w: 500, h: 400, r: 0 }, { x: 560, y: 1050, w: 500, h: 400, r: 0 }  
    ],
    'photoH.png': [ 
        { x: 35,  y: 125,  w: 470, h: 510, r: 0 }, { x: 568, y: 125,  w: 470, h: 510, r: 0 }, 
        { x: 35,  y: 650, w: 470, h: 530, r: 0 }, { x: 568, y: 655, w: 470, h: 520, r: 0 }, 
        { x: 30,  y: 1180, w: 470, h: 510, r: 0 }, { x: 568, y: 1180, w: 470, h: 510, r: 0 }  
    ]
};

let capturedImages = []; 
let filteredImages = []; 
let currentSlotIndex = 0;

let selectedTemplate = '';
let videoStream      = null;
let templateImg      = null;
let animFrameId      = null;
let isCaptured       = false; 
let currentFilter    = 'none';

let timeLeft         = 180; 
let timerInterval    = null;

let shotDelay        = 3; 
let isCountingDown   = false;
let countdownTimerId = null;
let autoCaptureTimeoutId = null;

let video;
let previewCanvas;
let pCtx;
let searchInput;
let searchResults;

// Variabel untuk Presisi AR Mediapipe
const liveVideoCanvas = document.createElement('canvas'); // Kanvas perantara video
const lcCtx = liveVideoCanvas.getContext('2d');
let currentAR = 'none';
let faceMesh = null;
let currentFaceResults = null;
let arAssets = {};

// Load Asset Gambar AR (Pastikan file PNG transparan ini ada di folder)
arAssets.hearts = new Image(); arAssets.hearts.src = 'hearts.png';
arAssets.dog = new Image(); arAssets.dog.src = 'dog.png';

/* ════════════════════════════════════
   MEMUAT ELEMEN SETELAH HTML SIAP
════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    video = document.getElementById('video-hidden');
    previewCanvas = document.getElementById('preview-canvas');
    if (previewCanvas) {
        pCtx = previewCanvas.getContext('2d');
        previewCanvas.width = PW;
        previewCanvas.height = PH;
    }

    searchInput = document.getElementById('search-input');
    searchResults = document.getElementById('search-results');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            searchResults.innerHTML = '';
            
            if (query.length === 0) {
                searchResults.classList.remove('active');
                return;
            }

            const results = templateDB.filter(t => t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query));

            if (results.length > 0) {
                results.forEach(result => {
                    const item = document.createElement('div');
                    item.className = 'search-item';
                    item.onclick = () => { selectTemplate(result.id); searchInput.value = ''; searchResults.classList.remove('active'); };
                    item.innerHTML = `
                        <img src="${result.img}" alt="${result.title}" class="search-item-img">
                        <div class="search-item-info">
                            <span class="search-item-title">${result.title}</span>
                            <span class="search-item-desc">${result.desc}</span>
                        </div>
                    `;
                    searchResults.appendChild(item);
                });
                searchResults.classList.add('active');
            } else { searchResults.classList.remove('active'); }
        });
    }

    document.addEventListener('click', function(event) {
        if (searchInput && searchResults && !searchInput.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.classList.remove('active');
        }
    });

    // Mengirim frame video ke Mediapipe untuk diproses
    video.addEventListener('timeupdate', async () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA && faceMesh) {
            await faceMesh.send({image: video});
        }
    });
});

/* ════════════════════════════════════
   AR TRACKING & MEDIAPIPE LOGIC
════════════════════════════════════ */
function setAR(effect, el) {
    currentAR = effect;
    document.querySelectorAll('#ar-selection .filter-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
}

async function initMediapipe() {
    const loadingOverlay = document.getElementById('loading-ar-overlay');
    loadingOverlay.classList.add('active');

    faceMesh = new FaceMesh({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }});

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onARResults);
    await faceMesh.initialize();
    console.log("Mediapipe Face Mesh Initialized");
}

function onARResults(results) {
    currentFaceResults = results;
}

function getLm(lmIdx, results, canvas) {
    const lm = results.multiFaceLandmarks[0][lmIdx];
    return {
        // Karena canvas kita mirror (-1), koordinat X-nya harus kita balik agar posisinya akurat
        x: (1 - lm.x) * canvas.width, 
        y: lm.y * canvas.height,
        z: lm.z 
    };
}

function dist2D(pt1, pt2) {
    return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
}

function drawDebugLandmarks(ctx, canvas, results) {
    if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
    
    ctx.fillStyle = '#ff0055'; 
    for (let i = 0; i < results.multiFaceLandmarks[0].length; i++) {
        const pt = getLm(i, results, canvas);
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2); ctx.fill();
        
        if (i % 20 === 0) { 
            ctx.fillStyle = '#fff'; ctx.font = '7px sans-serif';
            ctx.fillText(i, pt.x + 2, pt.y - 2);
            ctx.fillStyle = '#ff0055';
        }
    }
}

function drawARFilter(ctx, canvas, results, type) {
    if (type === 'none' || !results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0 || !arAssets[type]?.complete) return;
    if (type === 'debug') { drawDebugLandmarks(ctx, canvas, results); return; }

    const img = arAssets[type];
    ctx.save();

    // 1. Ambil Titik Landmark (Menggunakan mata yang berlawanan karena efek mirror kamera)
    const noseTip = getLm(1, results, canvas);       
    const noseBottom = getLm(2, results, canvas);    
    const forehead = getLm(10, results, canvas);     
    const leftCheek = getLm(234, results, canvas);   
    const rightCheek = getLm(454, results, canvas);  
    
    // Mata asli secara fisik (setelah dimirror posisinya berkebalikan di layar)
    const eyeVisualLeft = getLm(263, results, canvas); // Secara visual ada di kiri layar 
    const eyeVisualRight = getLm(33, results, canvas); // Secara visual ada di kanan layar

    // 2. Skala Presisi: Jarak Lebar Wajah (Pipi ke pipi)
    const faceWidth = dist2D(leftCheek, rightCheek);
    
    // 3. KUNCI ROTASI: Hitung kemiringan dari mata kiri(visual) ke mata kanan(visual)
    const angleRad = Math.atan2(eyeVisualRight.y - eyeVisualLeft.y, eyeVisualRight.x - eyeVisualLeft.x);

    let drawW = 0, drawH = 0;

    if (type === 'hearts') {
        drawW = faceWidth * 1.2; 
        drawH = drawW * (img.height / img.width);
        ctx.translate(forehead.x, forehead.y);
        ctx.rotate(angleRad);
        // Hati diletakkan di atas dahi
        ctx.drawImage(img, -drawW / 2, -drawH * 0.8, drawW, drawH);
        
    } else if (type === 'dog') {
        drawW = faceWidth * 1.5; 
        drawH = drawW * (img.height / img.width);
        ctx.translate(noseTip.x, noseTip.y);
        ctx.rotate(angleRad); 
        // Hidung anjing di gambar ditarik sejajar dengan hidungmu
        ctx.drawImage(img, -drawW / 2, -drawH * 0.75, drawW, drawH);

    } else if (type === 'mustache') {
        drawW = faceWidth * 0.6; 
        drawH = drawW * (img.height / img.width);
        ctx.translate(noseBottom.x, noseBottom.y);
        ctx.rotate(angleRad);
        // Kumis diletakkan pas di atas bibir (bawah hidung)
        ctx.drawImage(img, -drawW / 2, -drawH * 0.1, drawW, drawH);
    }

    ctx.restore();
}

/* ════════════════════════════════════
   PIXEL PROCESSING ALGORITHMS
════════════════════════════════════ */
function processPixelFilter(sourceCanvas, type) {
    if (type === 'none') return sourceCanvas;
    
    const w = sourceCanvas.width; const h = sourceCanvas.height;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = w; outCanvas.height = h;
    const ctx = outCanvas.getContext('2d');
    
    ctx.drawImage(sourceCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    if (type === 'grit') {
        for (let i = 0; i < data.length; i += 4) {
            let noise = (Math.random() - 0.5) * 100;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
            data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);
    } else if (type === 'distort') {
        const tempData = new Uint8ClampedArray(data);
        const freq = 0.05; const amp = 15;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let srcX = (x + Math.sin(y * freq) * amp) | 0;
                let srcY = (y + Math.cos(x * freq) * amp) | 0;
                srcX = Math.max(0, Math.min(w - 1, srcX)); srcY = Math.max(0, Math.min(h - 1, srcY));
                
                let dstIdx = (y * w + x) * 4; let srcIdx = (srcY * w + srcX) * 4;
                data[dstIdx] = tempData[srcIdx]; data[dstIdx+1] = tempData[srcIdx+1];
                data[dstIdx+2] = tempData[srcIdx+2]; data[dstIdx+3] = tempData[srcIdx+3];
            }
        }
        ctx.putImageData(imgData, 0, 0);
    } else if (type === 'fat') {
        const tempData = new Uint8ClampedArray(data);
        const cx = w / 2; const cy = h / 2; const radius = Math.min(w, h) * 0.6;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let dx = x - cx; let dy = y - cy; let distance = Math.sqrt(dx*dx + dy*dy);
                let dstIdx = (y * w + x) * 4;
                if (distance < radius) {
                    let r_norm = distance / radius; let a = r_norm * r_norm; 
                    let srcX = (cx + dx * a) | 0; let srcY = (cy + dy * a) | 0;
                    srcX = Math.max(0, Math.min(w - 1, srcX)); srcY = Math.max(0, Math.min(h - 1, srcY));
                    let srcIdx = (srcY * w + srcX) * 4;
                    data[dstIdx] = tempData[srcIdx]; data[dstIdx+1] = tempData[srcIdx+1];
                    data[dstIdx+2] = tempData[srcIdx+2]; data[dstIdx+3] = tempData[srcIdx+3];
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
    } else if (type === 'dot') {
        ctx.fillStyle = 'white'; ctx.fillRect(0,0,w,h); ctx.fillStyle = 'black';
        const step = 8; 
        for(let y=0; y<h; y+=step) {
            for(let x=0; x<w; x+=step) {
                let idx = (y * w + x) * 4;
                let luma = 0.2126 * data[idx] + 0.7152 * data[idx+1] + 0.0722 * data[idx+2];
                let radius = (1 - luma/255) * (step/2 * 1.2);
                if (radius > 0) {
                    ctx.beginPath(); ctx.arc(x + step/2, y + step/2, radius, 0, Math.PI*2); ctx.fill();
                }
            }
        }
        return outCanvas; 
    }
    return outCanvas;
}

/* ════════════════════════════════════
   NAVIGASI & INISIALISASI
════════════════════════════════════ */
function goToPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    const navLinks = document.querySelectorAll('.nav-links span');
    navLinks.forEach(link => link.classList.remove('active'));
    if(id === 'page1') navLinks[0].classList.add('active');
    else if (id === 'page-about') navLinks[1].classList.add('active');
    else if (id === 'page-privacy') navLinks[2].classList.add('active');

    if (id === 'page3') initSession();
    else teardownSession();
}

function selectTemplate(png) {
    selectedTemplate = png;
    goToPage('page3');
}

async function initSession() {
    isCaptured       = false;
    currentFilter    = 'none';
    currentAR        = 'none';
    currentFaceResults = null;
    capturedImages   = []; 
    filteredImages   = [];
    currentSlotIndex = 0;  
    
    resetCountdown(); 
    
    const timerChips = document.querySelectorAll('#timer-selection .filter-chip');
    setTimer(3, timerChips[1]);
    document.querySelectorAll('#ar-selection .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));

    document.getElementById('session-title').textContent = 'Pose 1!';
    document.getElementById('live-controls').style.display  = 'block';
    document.getElementById('post-controls').style.display  = 'none';
    document.querySelectorAll('#post-controls .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));

    timeLeft = 180;
    updateTimerDisplay();

    templateImg = null;
    if (selectedTemplate) {
        const img = new Image();
        img.src    = selectedTemplate;
        img.onload = () => { templateImg = img; };
    }

    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        video.srcObject = videoStream;
        await video.play();

        if (!faceMesh) {
            await initMediapipe();
        }
        
        document.getElementById('loading-ar-overlay').classList.remove('active');

    } catch (err) {
        alert('Izinkan akses kamera untuk menggunakan photobooth!');
        return;
    }

    startRenderLoop();
    document.getElementById('warning-modal').style.display = 'flex';
}

function teardownSession() {
    resetCountdown();
    cancelAnimationFrame(animFrameId);
    clearInterval(timerInterval);
    if (videoStream) videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
    
    document.getElementById('timeout-modal').style.display = 'none';
    document.getElementById('warning-modal').style.display = 'none';
}

function startPhotoSession() {
    document.getElementById('warning-modal').style.display = 'none';
    startTimer(); 
}

/* ════════════════════════════════════
   TIMER HITUNG MUNDUR & AUTO CAPTURE
════════════════════════════════════ */
function setTimer(seconds, el) {
    if (isCountingDown) return; 
    shotDelay = seconds;
    document.querySelectorAll('#timer-selection .filter-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
}

function resetCountdown() {
    if (countdownTimerId) clearInterval(countdownTimerId);
    clearTimeout(autoCaptureTimeoutId);
    isCountingDown = false;
    document.getElementById('countdown-overlay').style.display = 'none';
    
    const btn = document.getElementById('capture-btn');
    if (btn) { btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.disabled = false; }
    const timerSel = document.getElementById('timer-selection');
    if (timerSel) { timerSel.style.pointerEvents = 'auto'; timerSel.style.opacity = '1'; }
}

function triggerCapture() {
    if (isCountingDown) return; 
    if (shotDelay === 0) { capturePhoto(); } 
    else {
        isCountingDown = true;
        const btn = document.getElementById('capture-btn');
        btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; btn.disabled = true;

        const timerSel = document.getElementById('timer-selection');
        timerSel.style.pointerEvents = 'none'; timerSel.style.opacity = '0.5';

        const overlay = document.getElementById('countdown-overlay');
        overlay.style.display = 'flex';
        
        let count = shotDelay;
        overlay.textContent = count;

        countdownTimerId = setInterval(() => {
            count--;
            if (count > 0) { overlay.textContent = count; } 
            else {
                clearInterval(countdownTimerId);
                overlay.style.display = 'none';
                isCountingDown = false;
                capturePhoto(); 
            }
        }, 1000);
    }
}

function showTimeoutModal() {
    teardownSession(); 
    document.getElementById('timeout-modal').style.display = 'flex';
}

function closeTimeoutModal() {
    document.getElementById('timeout-modal').style.display = 'none';
    goToPage('page1'); 
}

/* ════════════════════════════════════
   RENDER LOOP (LIVE PREVIEW & STATIC)
════════════════════════════════════ */
function startRenderLoop() {
    cancelAnimationFrame(animFrameId);
    function loop() {
        renderFrame();
        if (!isCaptured) animFrameId = requestAnimationFrame(loop);
    }
    loop();
}

async function renderFrame() {
    if (!pCtx || !video.videoWidth) return;

    pCtx.fillStyle = '#fff';
    pCtx.fillRect(0, 0, PW, PH);

    pCtx.filter = currentFilter !== 'none' ? currentFilter : 'none';

    const scaleX = PW / OUT_W;
    const scaleY = PH / OUT_H;
    
    const slots = frameCoords[selectedTemplate] || [{x: 0, y: 0, w: OUT_W, h: OUT_H, r: 0}];

    for (let index = 0; index < slots.length; index++) {
        const slot = slots[index];
        let srcToDraw = null;
        let applyMirror = false;

        if (index < currentSlotIndex) {
            srcToDraw = filteredImages[index] || capturedImages[index];
            applyMirror = false; 
        } else if (index === currentSlotIndex && !isCaptured) {
            
            liveVideoCanvas.width = video.videoWidth;
            liveVideoCanvas.height = video.videoHeight;
            
            lcCtx.save(); lcCtx.scale(-1, 1);
            lcCtx.drawImage(video, -video.videoWidth, 0); lcCtx.restore();
            
            drawARFilter(lcCtx, liveVideoCanvas, currentFaceResults, currentAR);
            
            srcToDraw = liveVideoCanvas; 
            applyMirror = false; 
        }
        
        if (srcToDraw) {
            drawCover(pCtx, srcToDraw, slot.x * scaleX, slot.y * scaleY, slot.w * scaleX, slot.h * scaleY, applyMirror, slot.r || 0);
        }
    }

    pCtx.filter = 'none';
    if (templateImg) pCtx.drawImage(templateImg, 0, 0, PW, PH);
}

function drawCover(ctx, src, dx, dy, dw, dh, applyMirror, rotationDeg = 0) {
    const srcW = src.videoWidth  || src.width; const srcH = src.videoHeight || src.height;
    if (!srcW || !srcH) return;

    const srcAR = srcW / srcH; const dstAR = dw / dh;
    let sx, sy, sw, sh;

    if (srcAR > dstAR) {
        sh = srcH; sw = srcH * dstAR;
        sy = 0;    sx = (srcW - sw) / 2;
    } else {
        sw = srcW; sh = srcW / dstAR;
        sx = 0;    sy = (srcH - sh) / 2;
    }

    ctx.save();
    ctx.translate(dx + dw / 2, dy + dh / 2);
    if (rotationDeg !== 0) { ctx.rotate(rotationDeg * Math.PI / 180); }
    if (applyMirror) { ctx.scale(-1, 1); }

    ctx.drawImage(src, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
}

/* ════════════════════════════════════
   CAPTURE, FILTER & RETAKE
════════════════════════════════════ */
function capturePhoto() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width  = liveVideoCanvas.width;
    tempCanvas.height = liveVideoCanvas.height;
    const tCtx = tempCanvas.getContext('2d');
    
    tCtx.save();
    tCtx.drawImage(liveVideoCanvas, 0, 0); 
    tCtx.restore();

    capturedImages.push(tempCanvas);
    filteredImages.push(tempCanvas); 

    const flash = document.getElementById('flash-overlay');
    flash.classList.remove('flash'); void flash.offsetWidth; flash.classList.add('flash');

    currentSlotIndex++;
    const slots = frameCoords[selectedTemplate] || [{}];

    if (currentSlotIndex >= slots.length) {
        isCaptured = true;
        cancelAnimationFrame(animFrameId);
        
        renderFrame(); 

        document.getElementById('session-title').textContent = 'Looking Good!';
        document.getElementById('live-controls').style.display = 'none';
        document.getElementById('post-controls').style.display = 'block';
        clearInterval(timerInterval);

        const btn = document.getElementById('capture-btn');
        btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.disabled = false;
        
        const timerSel = document.getElementById('timer-selection');
        timerSel.style.pointerEvents = 'auto'; timerSel.style.opacity = '1';

    } else {
        document.getElementById('session-title').textContent = `Pose ${currentSlotIndex + 1}!`;
        if (shotDelay > 0) {
            autoCaptureTimeoutId = setTimeout(() => { triggerCapture(); }, 1000); 
        }
    }
}

function applyFilter(filterCSS, pixelType, chipEl) {
    currentFilter = filterCSS;
    document.querySelectorAll('#post-controls .filter-chip').forEach(c => c.classList.remove('active'));
    if (chipEl) chipEl.classList.add('active');
    
    if (isCaptured) {
        const textLoad = document.getElementById('processing-text');
        if (pixelType !== 'none') {
            textLoad.style.display = 'block';
            setTimeout(() => {
                filteredImages = capturedImages.map(img => processPixelFilter(img, pixelType));
                textLoad.style.display = 'none';
                renderFrame();
            }, 50);
        } else {
            filteredImages = [...capturedImages];
            renderFrame(); 
        }
    }
}

function retake() {
    isCaptured       = false;
    currentFilter    = 'none';
    currentAR        = 'none';
    capturedImages   = []; 
    filteredImages   = [];
    currentSlotIndex = 0;  
    
    resetCountdown();

    document.querySelectorAll('#ar-selection .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    document.getElementById('session-title').textContent = 'Pose 1!';
    document.getElementById('live-controls').style.display = 'block';
    document.getElementById('post-controls').style.display = 'none';
    document.querySelectorAll('#post-controls .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));

    timeLeft = 180;
    updateTimerDisplay();
    document.getElementById('warning-modal').style.display = 'flex';

    startRenderLoop();
}

/* ════════════════════════════════════
   DOWNLOAD & TIMER GLOBAL
════════════════════════════════════ */
function downloadPhoto() {
    const outCanvas = document.createElement('canvas');
    outCanvas.width  = OUT_W; outCanvas.height = OUT_H;
    const oCtx = outCanvas.getContext('2d');

    oCtx.fillStyle = '#fff';
    oCtx.fillRect(0, 0, OUT_W, OUT_H);

    oCtx.filter = currentFilter !== 'none' ? currentFilter : 'none';

    const slots = frameCoords[selectedTemplate] || [{x: 0, y: 0, w: OUT_W, h: OUT_H, r: 0}];
    slots.forEach((slot, index) => {
        if (filteredImages[index]) {
            drawCover(oCtx, filteredImages[index], slot.x, slot.y, slot.w, slot.h, false, slot.r || 0);
        }
    });

    oCtx.filter = 'none';

    const frameImg = new Image();
    frameImg.src   = selectedTemplate;
    frameImg.onload = () => {
        oCtx.drawImage(frameImg, 0, 0, OUT_W, OUT_H);

        const link      = document.createElement('a');
        link.download   = 'my foto gweh.jpg';
        link.href       = outCanvas.toDataURL('image/jpeg', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    frameImg.onerror = () => alert(`Template PNG "${selectedTemplate}" tidak ditemukan!`);
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 180;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer-badge').textContent = 'Time!';
            if (!isCaptured) { showTimeoutModal(); }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timer-badge').textContent = `${m}:${s}`;
}