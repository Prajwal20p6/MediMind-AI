// ==========================================================================
// MEDIMIND AI - GLOBAL STATE & INITIALIZATION
// ==========================================================================
let activePage = 'home';
let currentUser = null;
let currentSymptomStep = null; // tracking chat symptom interview steps
let progressInterval = null;

// Document lists
let reportFilesList = [];
let selectedPrescFile = null;
let selectedImagingFile = null;
let chatAttachedFile = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Rehydrate session from localStorage
    const savedUser = localStorage.getItem('medimind_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showAppShell();
    } else {
        showAuthScreen();
    }
    
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Bind Drag & Drop Zones
    initDragAndDrop();
    
    // Bind Tab Drag/Wheel scrolling
    initTabDragScrolling();
});

function initTabDragScrolling() {
    const tabBars = document.querySelectorAll('.reports-tabs');
    tabBars.forEach(tabBar => {
        let isDown = false;
        let isDragging = false;
        let startX;
        let scrollLeft;

        tabBar.addEventListener('mousedown', (e) => {
            isDown = true;
            isDragging = false;
            tabBar.style.cursor = 'grabbing';
            startX = e.pageX - tabBar.offsetLeft;
            scrollLeft = tabBar.scrollLeft;
        });

        tabBar.addEventListener('mouseleave', () => {
            isDown = false;
            tabBar.style.cursor = 'pointer';
        });

        tabBar.addEventListener('mouseup', () => {
            isDown = false;
            tabBar.style.cursor = 'pointer';
            // Reset isDragging on next tick so click handler has time to intercept
            setTimeout(() => { isDragging = false; }, 0);
        });

        tabBar.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const x = e.pageX - tabBar.offsetLeft;
            const diff = Math.abs(x - startX);
            if (diff > 5) {
                isDragging = true;
            }
            e.preventDefault();
            const walk = (x - startX) * 1.5;
            tabBar.scrollLeft = scrollLeft - walk;
        });

        tabBar.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                tabBar.scrollLeft += e.deltaY;
            }
        });

        // Intercept clicks if the user was actively dragging
        tabBar.addEventListener('click', (e) => {
            if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    });
}

// Switch screens
function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function showAppShell() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    // Update sidebar profiles
    document.getElementById('sidebar-username').innerText = currentUser.name;
    document.getElementById('sidebar-avatar-char').innerText = currentUser.name.charAt(0).toUpperCase();
    
    // Load home page
    navigateTo('home');
}


// ==========================================================================
// ROUTING & SIDEBAR INTERACTION
// ==========================================================================
function navigateTo(pageId) {
    activePage = pageId;
    
    // Toggle active nav buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.getAttribute('data-page') === pageId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Toggle page sections
    document.querySelectorAll('.page-section').forEach(section => {
        if (section.id === `page-${pageId}`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
    
    // Custom actions per page
    if (pageId === 'home') {
        loadDashboardData();
    } else if (pageId === 'history') {
        loadUserHistory();
    } else if (pageId === 'profile') {
        loadProfileStats();
    } else if (pageId === 'chat') {
        updateRAGStatus();
    }
    
    // Mobile drawer auto collapse
    const sidebar = document.getElementById('app-sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active-mobile');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const toggleIcon = document.getElementById('toggle-icon');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('active-mobile');
    } else {
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            toggleIcon.setAttribute('data-lucide', 'chevron-right');
        } else {
            toggleIcon.setAttribute('data-lucide', 'chevron-left');
        }
        lucide.createIcons();
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <i data-lucide="x" style="cursor:pointer; width:14px; height:14px;" onclick="this.parentElement.remove()"></i>
    `;
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

function showLoader(message = "Loading...", taskId = null) {
    document.getElementById('loading-overlay-message').innerText = message;
    document.getElementById('loading-overlay').classList.remove('hidden');
    
    const progContainer = document.getElementById('loading-progress-container');
    const progFill = document.getElementById('loading-progress-fill');
    const progText = document.getElementById('loading-progress-text');
    
    if (taskId) {
        progContainer.classList.remove('hidden');
        progFill.style.width = '0%';
        progText.innerText = 'Initializing...';
        
        if (progressInterval) clearInterval(progressInterval);
        progressInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/tasks/${taskId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status !== 'not_found') {
                        const pct = Math.round((data.step / data.total_steps) * 100);
                        progFill.style.width = `${pct}%`;
                        progText.innerText = `${data.message} (${pct}%)`;
                        if (data.status === 'completed' || data.status === 'failed') {
                            clearInterval(progressInterval);
                        }
                    }
                }
            } catch (e) {
                console.error("Error polling progress status:", e);
            }
        }, 600);
    } else {
        progContainer.classList.add('hidden');
    }
}

function hideLoader() {
    document.getElementById('loading-overlay').classList.add('hidden');
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}


// ==========================================================================
// USER AUTHENTICATION HANDLERS
// ==========================================================================
function switchAuthTab(type) {
    document.querySelectorAll('.auth-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById('auth-status').innerText = '';
    
    if (type === 'login') {
        document.getElementById('tab-login-btn').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.getElementById('tab-signup-btn').classList.add('active');
        document.getElementById('signup-form').classList.add('active');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const statusDiv = document.getElementById('auth-status');
    
    showLoader("Authenticating...");
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            currentUser = data.user;
            localStorage.setItem('medimind_user', JSON.stringify(currentUser));
            statusDiv.className = "auth-status-message success";
            statusDiv.innerText = data.message;
            showToast(data.message, "success");
            setTimeout(() => {
                hideLoader();
                showAppShell();
            }, 800);
        } else {
            hideLoader();
            statusDiv.className = "auth-status-message error";
            statusDiv.innerText = data.detail || "Incorrect email or password.";
            showToast(data.detail || "Authentication failed.", "error");
        }
    } catch (err) {
        hideLoader();
        statusDiv.className = "auth-status-message error";
        statusDiv.innerText = "Connection failure. Ensure backend is running.";
        showToast("Connection to server failed.", "error");
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const statusDiv = document.getElementById('auth-status');
    
    showLoader("Registering...");
    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            hideLoader();
            statusDiv.className = "auth-status-message success";
            statusDiv.innerText = "Account created. Switching to login...";
            showToast("Account created successfully!", "success");
            setTimeout(() => {
                switchAuthTab('login');
                document.getElementById('login-email').value = email;
            }, 1500);
        } else {
            hideLoader();
            statusDiv.className = "auth-status-message error";
            statusDiv.innerText = data.detail || "Failed to create account.";
            showToast(data.detail || "Registration failed.", "error");
        }
    } catch (err) {
        hideLoader();
        statusDiv.className = "auth-status-message error";
        statusDiv.innerText = "Connection error.";
        showToast("Network connection error.", "error");
    }
}

function handleLogout() {
    localStorage.removeItem('medimind_user');
    currentUser = null;
    clearActiveChat();
    // Clear dynamic previews
    document.getElementById('report-files-list').innerHTML = '<div class="list-empty">No PDF documents processed yet.</div>';
    document.getElementById('report-summary-output').innerHTML = '';
    document.getElementById('presc-output-container').innerHTML = '';
    document.getElementById('imaging-results-wrapper').classList.add('hidden');
    document.getElementById('imaging-empty-state').classList.remove('hidden');
    
    showToast("Logged out successfully.", "info");
    showAuthScreen();
}


// ==========================================================================
// HOME PAGE - DATA POPULATOR
// ==========================================================================
async function loadDashboardData() {
    if (!currentUser) return;
    
    // Set Welcome Header
    document.getElementById('home-welcome-title').innerText = `Welcome Back, ${currentUser.name}`;
    
    try {
        // Fetch recent items
        const res = await fetch(`/api/history?email=${encodeURIComponent(currentUser.email)}&category=all`);
        const data = await res.json();
        
        if (res.ok && data.success) {
            populateDashboardLists(data.history);
        }
    } catch (err) {
        console.error("Dashboard population failure", err);
    }
}

function populateDashboardLists(history) {
    const timeline = document.getElementById('home-timeline');
    const reportsList = document.getElementById('home-recent-reports');
    const scansList = document.getElementById('home-recent-scans');
    
    timeline.innerHTML = '';
    reportsList.innerHTML = '';
    scansList.innerHTML = '';
    
    const chats = history.filter(x => x.category === 'chats').slice(0, 3);
    const reports = history.filter(x => x.category === 'reports').slice(0, 3);
    const imaging = history.filter(x => x.category === 'imaging').slice(0, 3);
    
    // 1. Timeline Events
    if (chats.length > 0) {
        chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <span class="timeline-title">${chat.title}</span>
                    <span class="timeline-desc">${chat.detail.substring(0, 80)}...</span>
                    <span class="timeline-time">${formatTimestamp(chat.timestamp)}</span>
                </div>
            `;
            timeline.appendChild(div);
        });
    } else {
        timeline.innerHTML = '<div class="timeline-empty">Start a chat conversation to create logs.</div>';
    }
    
    // 2. Recent reports
    if (reports.length > 0) {
        reports.forEach(rep => {
            const div = document.createElement('div');
            div.className = 'recent-item';
            div.onclick = () => navigateTo('reports');
            div.innerHTML = `
                <div class="recent-item-icon"><i data-lucide="file-text"></i></div>
                <div class="recent-item-details">
                    <span class="recent-item-name">${rep.title}</span>
                    <span class="recent-item-time">${formatTimestamp(rep.timestamp)}</span>
                </div>
            `;
            reportsList.appendChild(div);
        });
    } else {
        reportsList.innerHTML = '<div class="recent-list-empty">No reports processed.</div>';
    }
    
    // 3. Recent scans
    if (imaging.length > 0) {
        imaging.forEach(scan => {
            const div = document.createElement('div');
            div.className = 'recent-item';
            div.onclick = () => {
                navigateTo('imaging');
                displayImagingResult(scan.detail, scan.confidence, scan.image_url, scan.heatmap_url, scan.pdf_url);
            };
            div.innerHTML = `
                <div class="recent-item-icon"><i data-lucide="scan"></i></div>
                <div class="recent-item-details">
                    <span class="recent-item-name">${scan.title}</span>
                    <span class="recent-item-time">${formatTimestamp(scan.timestamp)}</span>
                </div>
            `;
            scansList.appendChild(div);
        });
    } else {
        scansList.innerHTML = '<div class="recent-list-empty">No scans classified.</div>';
    }
    
    lucide.createIcons();
}


// ==========================================================================
// UNIFIED CHAT MODULE
// ==========================================================================
function updateRAGStatus() {
    if (!currentUser) return;
    
    fetch(`/api/profile?email=${encodeURIComponent(currentUser.email)}`)
        .then(res => res.json())
        .then(data => {
            const span = document.getElementById('chat-rag-status');
            if (data.success && data.stats.reports > 0) {
                span.className = 'status-ready';
                span.innerText = `${data.stats.reports} medical report(s) active`;
            } else {
                span.className = 'status-warning';
                span.innerText = 'No reports loaded';
            }
        });
}

function handleChatFileSelect() {
    const input = document.getElementById('chat-file-input');
    if (input.files.length > 0) {
        chatAttachedFile = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('chat-upload-img-preview').src = e.target.result;
            document.getElementById('chat-upload-preview-container').classList.remove('hidden');
        };
        reader.readAsDataURL(chatAttachedFile);
        
        const text = document.getElementById('chat-input-textarea').value.toLowerCase();
        if (text.includes("presc") || text.includes("rx") || text.includes("decode")) {
            setChatIntentBadge("prescription_decode", "💊 Prescription Decoder");
        } else {
            setChatIntentBadge("imaging_analysis", "👁️ Imaging Analysis");
        }
    }
}

function clearChatAttachment() {
    chatAttachedFile = null;
    document.getElementById('chat-file-input').value = '';
    document.getElementById('chat-upload-preview-container').classList.add('hidden');
    handleChatTyping();
}

function setChatIntentBadge(mode, label) {
    const badge = document.getElementById('chat-intent-badge');
    const labelSpan = document.getElementById('chat-intent-label');
    
    labelSpan.innerText = label;
    badge.className = 'active-badge';
    
    if (mode === 'symptom_interview') {
        badge.style.borderColor = 'var(--color-warning)';
        badge.style.background = 'rgba(245, 158, 11, 0.08)';
    } else if (mode === 'report_analysis' || mode === 'report_rag') {
        badge.style.borderColor = 'var(--color-danger)';
        badge.style.background = 'rgba(239, 68, 68, 0.08)';
    } else if (mode === 'prescription_decode') {
        badge.style.borderColor = 'var(--color-success)';
        badge.style.background = 'rgba(16, 185, 129, 0.08)';
    } else if (mode === 'imaging_analysis') {
        badge.style.borderColor = 'var(--color-accent)';
        badge.style.background = 'rgba(6, 182, 212, 0.08)';
    } else {
        badge.style.borderColor = 'rgba(99, 102, 241, 0.2)';
        badge.style.background = 'rgba(99, 102, 241, 0.08)';
    }
}

function handleChatTyping() {
    if (currentSymptomStep !== null) {
        setChatIntentBadge("symptom_interview", "🤒 Symptom Interview");
        return;
    }
    
    if (chatAttachedFile) return;
    
    const text = document.getElementById('chat-input-textarea').value.toLowerCase();
    if (!text.trim()) {
        setChatIntentBadge("educational", "🧠 Educational Mode");
        return;
    }
    
    const symptom_keywords = ['fever', 'pain', 'headache', 'symptom', 'feel', 'hurt', 'cough', 'cold'];
    const report_keywords = ['report', 'analyze report', 'lab results', 'blood report'];
    const prescription_keywords = ['prescription', 'decode prescription', 'rx', 'pill', 'medicine'];
    const imaging_keywords = ['x-ray', 'mri', 'scan', 'imaging', 'skin disease'];
    
    if (prescription_keywords.some(k => text.includes(k))) {
        setChatIntentBadge("prescription_decode", "💊 Prescription Decoder");
    } else if (imaging_keywords.some(k => text.includes(k))) {
        setChatIntentBadge("imaging_analysis", "👁️ Imaging Analysis");
    } else if (report_keywords.some(k => text.includes(k))) {
        setChatIntentBadge("report_analysis", "📄 Medical Report RAG");
    } else if (symptom_keywords.some(k => text.includes(k))) {
        setChatIntentBadge("symptom_interview", "🤒 Symptom Assessment");
    } else {
        setChatIntentBadge("educational", "🧠 Educational Mode");
    }
}

function handleChatSubmitOnEnter(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitChatPrompt();
    }
}

async function submitChatPrompt() {
    const textarea = document.getElementById('chat-input-textarea');
    const message = textarea.value.trim();
    if (!message && !chatAttachedFile) return;
    
    appendChatMessage('user', message, chatAttachedFile ? document.getElementById('chat-upload-img-preview').src : null);
    
    textarea.value = '';
    textarea.style.height = '45px';
    
    const formData = new FormData();
    formData.append('email', currentUser.email);
    formData.append('message', message || "[Attached Scan Image]");
    if (chatAttachedFile) {
        formData.append('attachment', chatAttachedFile);
    }
    
    clearChatAttachment();
    const typingBubble = appendChatTypingIndicator();
    
    try {
        const res = await fetch('/api/chat/message', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        typingBubble.remove();
        
        if (res.ok && data.success) {
            if (data.mode === 'symptom_interview') {
                currentSymptomStep = true;
                setChatIntentBadge("symptom_interview", "🤒 Symptom Interview");
            } else if (data.mode === 'symptom_interview_complete') {
                currentSymptomStep = null;
                setChatIntentBadge("educational", "🧠 Educational Mode");
            }
            
            appendChatMessage('system', data.response, null, data.heatmap_url, data.pdf_url);
        } else {
            appendChatMessage('system', "Error processing query. Ensure Groq credentials are set up.", null);
            showToast("Chat response failed.", "error");
        }
    } catch (err) {
        typingBubble.remove();
        appendChatMessage('system', "Failed to connect to backend server.", null);
        showToast("Server connection error.", "error");
    }
}

function appendChatMessage(sender, text, imgPreviewUrl = null, heatmapUrl = null, pdfUrl = null) {
    const thread = document.getElementById('chat-messages-thread');
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender}-bubble`;
    
    let mediaSection = '';
    if (imgPreviewUrl) {
        mediaSection += `<div class="bubble-media-wrapper"><img src="${imgPreviewUrl}"></div>`;
    }
    if (heatmapUrl) {
        mediaSection += `<div class="bubble-media-wrapper"><img src="${heatmapUrl}"></div>`;
    }
    if (pdfUrl) {
        mediaSection += `
            <div class="bubble-actions">
                <a class="btn-secondary" href="${pdfUrl}" download><i data-lucide="download"></i> Download Report PDF</a>
            </div>
        `;
    }
    
    bubble.innerHTML = `
        <div class="bubble-avatar"><i data-lucide="${sender === 'user' ? 'user' : 'activity'}"></i></div>
        <div class="bubble-body">
            <p>${formatMarkdown(text)}</p>
            ${mediaSection}
        </div>
    `;
    
    thread.appendChild(bubble);
    lucide.createIcons();
    thread.scrollTop = thread.scrollHeight;
}

function appendChatTypingIndicator() {
    const thread = document.getElementById('chat-messages-thread');
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble system-bubble';
    bubble.innerHTML = `
        <div class="bubble-avatar"><i data-lucide="activity"></i></div>
        <div class="bubble-body">
            <p>Analyzing context...</p>
        </div>
    `;
    thread.appendChild(bubble);
    lucide.createIcons();
    thread.scrollTop = thread.scrollHeight;
    return bubble;
}

function clearActiveChat() {
    currentSymptomStep = null;
    document.getElementById('chat-messages-thread').innerHTML = `
        <div class="message-bubble system-bubble">
            <div class="bubble-avatar"><i data-lucide="activity"></i></div>
            <div class="bubble-body">
                <p>Chat cleared. Ask anything medical to begin a new context.</p>
            </div>
        </div>
    `;
    lucide.createIcons();
}


// ==========================================================================
// MEDICAL REPORTS - PDF PARSING AND RAG SEARCH
// ==========================================================================
function initDragAndDrop() {
    const reportDrop = document.getElementById('report-drop-zone');
    const reportInput = document.getElementById('report-file-input');
    reportDrop.onclick = () => reportInput.click();
    reportDrop.ondragover = (e) => {
        e.preventDefault();
        reportDrop.classList.add('dragover');
    };
    reportDrop.ondragleave = () => reportDrop.classList.remove('dragover');
    
    const prescDrop = document.getElementById('presc-drop-zone');
    const prescInput = document.getElementById('presc-file-input');
    prescDrop.onclick = () => prescInput.click();
    prescDrop.ondragover = (e) => {
        e.preventDefault();
        prescDrop.classList.add('dragover');
    };
    prescDrop.ondragleave = () => prescDrop.classList.remove('dragover');
    
    const imgDrop = document.getElementById('imaging-drop-zone');
    const imgInput = document.getElementById('imaging-file-input');
    imgDrop.onclick = () => imgInput.click();
    imgDrop.ondragover = (e) => {
        e.preventDefault();
        imgDrop.classList.add('dragover');
    };
    imgDrop.ondragleave = () => imgDrop.classList.remove('dragover');
}

function handleReportDrop(e) {
    e.preventDefault();
    document.getElementById('report-drop-zone').classList.remove('dragover');
    processReportFiles(e.dataTransfer.files);
}

function handleReportFileSelect() {
    processReportFiles(document.getElementById('report-file-input').files);
}

function renderReportFilesList() {
    const listContainer = document.getElementById('report-files-list');
    listContainer.innerHTML = '';
    
    if (reportFilesList.length === 0) {
        listContainer.innerHTML = '<div class="list-empty">No PDF documents processed yet.</div>';
        lucide.createIcons();
        return;
    }
    
    reportFilesList.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <div class="file-item-info">
                <i data-lucide="file"></i>
                <div class="file-details">
                    <span class="file-item-name">${file.name}</span>
                    <span class="file-item-size">${(file.size / 1024).toFixed(1)} KB</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge low">Imported</span>
                <button class="remove-file-btn" onclick="removeReportFile('${file.name.replace(/'/g, "\\'")}')" style="background: none; border: none; color: #ef4444; cursor: pointer; display: flex; align-items: center; padding: 2px;" title="Remove file"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
            </div>
        `;
        listContainer.appendChild(item);
    });
    lucide.createIcons();
}

function removeReportFile(name) {
    reportFilesList = reportFilesList.filter(f => f.name !== name);
    renderReportFilesList();
}

function processReportFiles(files) {
    if (files.length === 0) return;
    
    const newPDFs = Array.from(files).filter(f => f.name.endsWith('.pdf'));
    newPDFs.forEach(newFile => {
        if (!reportFilesList.some(existingFile => existingFile.name === newFile.name)) {
            reportFilesList.push(newFile);
        }
    });
    
    if (reportFilesList.length > 3) {
        showToast("Maximum of 3 reports can be uploaded for comparison. Keeping first 3.", "warning");
        reportFilesList = reportFilesList.slice(0, 3);
    }
    
    renderReportFilesList();
    showToast(`${reportFilesList.length} report(s) imported.`, "info");
}

async function runReportAnalysis() {
    if (reportFilesList.length === 0) {
        showToast("Please drop or browse PDF medical reports first.", "error");
        return;
    }
    
    const taskId = "task_rep_" + Date.now();
    showLoader("Extracting and building semantic vector database...", taskId);
    
    const formData = new FormData();
    formData.append('email', currentUser.email);
    formData.append('task_id', taskId);
    reportFilesList.forEach(file => {
        formData.append('files', file);
    });
    
    try {
        const uploadRes = await fetch('/api/reports/upload', {
            method: 'POST',
            body: formData
        });
        const uploadData = await uploadRes.json();
        
        if (!uploadRes.ok) {
            hideLoader();
            showToast(uploadData.detail || "Error loading reports.", "error");
            return;
        }
        
        showLoader("Running LLM Clinical Analyzer...", taskId);
        const analyzeRes = await fetch('/api/reports/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, task_id: taskId })
        });
        const analyzeData = await analyzeRes.json();
        
        hideLoader();
        
        if (analyzeRes.ok) {
            const summaryDiv = document.getElementById('report-summary-output');
            summaryDiv.innerHTML = `<div class="formatted-output">${formatMarkdown(analyzeData.analysis)}</div>`;
            
            const dlBtn = document.getElementById('report-download-pdf-btn');
            if (analyzeData.pdf_url) {
                dlBtn.href = analyzeData.pdf_url;
                dlBtn.classList.remove('hidden');
            } else {
                dlBtn.classList.add('hidden');
            }
            
            showToast("Report analyzed and indexed successfully!", "success");
            loadDashboardData();
            
            // Simultaneously run comparison and pre-load all other report metrics
            loadComparison();
            loadHealthTwin();
            loadForecasting();
            loadCoach();
        } else {
            showToast("Failed to perform clinical analysis.", "error");
        }
    } catch (err) {
        hideLoader();
        showToast("Error connecting to backend API.", "error");
    }
}

function switchReportTab(tab) {
    document.querySelectorAll('.report-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.report-panel').forEach(panel => panel.classList.remove('active'));
    
    const activeBtn = document.getElementById(`report-tab-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');
    const activePanel = document.getElementById(`report-panel-${tab}`);
    if (activePanel) activePanel.classList.add('active');
    
    if (tab === 'twin') {
        loadHealthTwin();
    } else if (tab === 'comparison') {
        loadComparison();
    } else if (tab === 'forecasting') {
        loadForecasting();
    } else if (tab === 'coach') {
        loadCoach();
    }
}

let currentPrescriptionData = null;

async function loadHealthTwin() {
    const output = document.getElementById('report-twin-output');
    output.innerHTML = '<div class="loading-spinner-box"><div class="spinner"></div><p>Calculating Health Score & Biomarkers...</p></div>';
    
    try {
        const res = await fetch(`/api/reports/health-twin?email=${encodeURIComponent(currentUser.email)}`);
        const data = await res.json();
        if (res.ok && data.success) {
            if (!data.has_data) {
                output.innerHTML = `<div class="empty-state-message"><i data-lucide="info"></i><p>${data.message}</p></div>`;
                lucide.createIcons();
                return;
            }
            
            let biomarkersHTML = '';
            for (const [name, list] of Object.entries(data.biomarkers)) {
                if (list.length > 0) {
                    const latest = list[list.length - 1];
                    biomarkersHTML += `
                        <div class="biomarker-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 15px; border-radius: 12px; margin-bottom: 10px;">
                            <h4 style="margin: 0; color: #a5b4fc;">${name}</h4>
                            <p style="margin: 5px 0 0 0; font-size: 1.2rem; font-weight: bold;">${latest.value} ${latest.unit}</p>
                            <span style="font-size: 0.8rem; color: #9ca3af;">Latest reading: ${latest.date}</span>
                        </div>
                    `;
                }
            }
            
            output.innerHTML = `
                <div class="health-twin-layout" style="display: flex; flex-direction: column; gap: 20px; text-align: left;">
                    <div class="score-summary-row" style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div class="score-card" style="flex: 1; min-width: 150px; background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 100%); border: 1px solid rgba(99,102,241,0.3); padding: 20px; border-radius: 16px; text-align: center;">
                            <span style="font-size: 0.9rem; color: #c7d2fe; text-transform: uppercase; letter-spacing: 0.05em;">Overall Health Score</span>
                            <div style="font-size: 3rem; font-weight: 800; color: #fff; margin: 10px 0;">${data.health_score}<span style="font-size: 1.2rem; font-weight: normal; color: #a5b4fc;">/100</span></div>
                            <span style="color: #10b981; font-weight: 600;">+${data.improvement_score}% Improvement</span>
                        </div>
                        <div class="summary-text-card" style="flex: 2; min-width: 250px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px;">
                            <h3 style="margin-top: 0; color: #a5b4fc;">Risk & Trends Assessment</h3>
                            <p style="font-size: 0.95rem; line-height: 1.5; color: #d1d5db;">${data.risk_trends}</p>
                            <div style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); color: #34d399; padding: 10px 15px; border-radius: 8px; font-size: 0.85rem; margin-top: 10px;">
                                <strong>Status:</strong> ${data.status_summary}
                            </div>
                        </div>
                    </div>
                    
                    ${data.chart_url ? `
                    <div class="chart-container-card" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 16px;">
                        <h3 style="margin-top: 0; color: #a5b4fc; margin-bottom: 15px;">Biomarker Trajectory Map</h3>
                        <img src="${data.chart_url}" style="width: 100%; border-radius: 12px;" alt="Biomarker Trends Chart">
                    </div>
                    ` : ''}

                    <div class="biomarkers-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                        ${biomarkersHTML}
                    </div>
                </div>
            `;
        } else {
            output.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-circle"></i><p>Failed to retrieve Health Twin details.</p></div>`;
        }
    } catch (e) {
        output.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-triangle"></i><p>Connection issue.</p></div>`;
    }
    lucide.createIcons();
}

async function loadComparison() {
    const output = document.getElementById('report-comparison-output');
    output.innerHTML = '<div class="loading-spinner-box"><div class="spinner"></div><p>Performing Comparative Report Audit...</p></div>';
    
    try {
        const res = await fetch(`/api/reports/compare?email=${encodeURIComponent(currentUser.email)}`);
        const data = await res.json();
        if (res.ok && data.success) {
            if (!data.has_data) {
                output.innerHTML = `<div class="empty-state-message"><i data-lucide="info"></i><p>${data.message}</p></div>`;
                lucide.createIcons();
                return;
            }
            
            let improvementsHTML = data.improvements.map(x => `<li><i data-lucide="trending-up" style="color:#10b981; width:16px; margin-right:8px; display:inline-block; vertical-align:middle;"></i>${x}</li>`).join('');
            let worseningHTML = data.worsening.map(x => `<li><i data-lucide="trending-down" style="color:#ef4444; width:16px; margin-right:8px; display:inline-block; vertical-align:middle;"></i>${x}</li>`).join('');
            let stableHTML = data.stable.map(x => `<li><i data-lucide="minus" style="color:#f59e0b; width:16px; margin-right:8px; display:inline-block; vertical-align:middle;"></i>${x}</li>`).join('');
            let newAbnormalitiesHTML = data.new_abnormalities.map(x => `<li><i data-lucide="alert-triangle" style="color:#ef4444; width:16px; margin-right:8px; display:inline-block; vertical-align:middle;"></i>${x}</li>`).join('');
            
            output.innerHTML = `
                <div class="comparison-layout" style="display: flex; flex-direction: column; gap: 20px; text-align: left;">
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px;">
                        <h3 style="margin-top: 0; color: #a5b4fc;">Comparison Summary</h3>
                        <p style="font-size: 0.95rem; line-height: 1.5; color: #d1d5db;">${data.narrative}</p>
                    </div>
                    
                    ${data.chart_url ? `
                    <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 16px;">
                        <h3 style="margin-top: 0; color: #a5b4fc; margin-bottom: 15px;">Biomarker Comparison Chart</h3>
                        <img src="${data.chart_url}" style="width: 100%; border-radius: 12px;" alt="Comparison Chart">
                    </div>
                    ` : ''}

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px;">
                        <div style="background: rgba(16,185,129,0.04); border: 1px solid rgba(16,185,129,0.15); padding: 15px; border-radius: 12px;">
                            <h4 style="margin: 0 0 10px 0; color:#34d399;">Improvements</h4>
                            <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem; line-height: 1.6;">${improvementsHTML}</ul>
                        </div>
                        <div style="background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.15); padding: 15px; border-radius: 12px;">
                            <h4 style="margin: 0 0 10px 0; color:#f87171;">Worsening</h4>
                            <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem; line-height: 1.6;">${worseningHTML}</ul>
                        </div>
                        <div style="background: rgba(245,158,11,0.04); border: 1px solid rgba(245,158,11,0.15); padding: 15px; border-radius: 12px;">
                            <h4 style="margin: 0 0 10px 0; color:#fbbf24;">Stable</h4>
                            <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem; line-height: 1.6;">${stableHTML}</ul>
                        </div>
                        <div style="background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.15); padding: 15px; border-radius: 12px;">
                            <h4 style="margin: 0 0 10px 0; color:#f87171;">New Abnormalities</h4>
                            <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem; line-height: 1.6;">${newAbnormalitiesHTML}</ul>
                        </div>
                    </div>
                </div>
            `;
        } else {
            output.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-circle"></i><p>Failed to retrieve comparison analytics.</p></div>`;
        }
    } catch (e) {
        output.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-triangle"></i><p>Connection issue.</p></div>`;
    }
    lucide.createIcons();
}

async function loadForecasting() {
    const output = document.getElementById('report-forecasting-output');
    output.innerHTML = '<div class="loading-spinner-box"><div class="spinner"></div><p>Calculating Predictive Trends...</p></div>';
    
    try {
        const res = await fetch(`/api/reports/forecast?email=${encodeURIComponent(currentUser.email)}`);
        const data = await res.json();
        if (res.ok && data.success) {
            if (!data.has_data) {
                output.innerHTML = `<div class="empty-state-message"><i data-lucide="info"></i><p>${data.message}</p></div>`;
                lucide.createIcons();
                return;
            }
            
            let forecastHTML = data.predictions.map(x => `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin: 0; color: #a5b4fc;">${x.biomarker}</h4>
                        <span style="font-size: 0.8rem; color:#9ca3af;">Current: ${x.current} ${x.unit} &bull; Confidence: ${x.confidence}%</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: block; font-size: 0.85rem; color:#fbbf24;">3 Months: ${x.three_months} ${x.unit}</span>
                        <span style="display: block; font-size: 0.85rem; color:#34d399;">6 Months: ${x.six_months} ${x.unit}</span>
                    </div>
                </div>
            `).join('');
            
            output.innerHTML = `
                <div class="forecasting-layout" style="display: flex; flex-direction: column; gap: 20px; text-align: left;">
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px;">
                        <h3 style="margin-top: 0; color: #a5b4fc;">Forecasting Insight</h3>
                        <p style="font-size: 0.95rem; line-height: 1.5; color: #d1d5db;">${data.narrative}</p>
                    </div>
                    
                    ${data.chart_url ? `
                    <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 16px;">
                        <h3 style="margin-top: 0; color: #a5b4fc; margin-bottom: 15px;">Trajectory Projections</h3>
                        <img src="${data.chart_url}" style="width: 100%; border-radius: 12px;" alt="Forecasting Projections Chart">
                    </div>
                    ` : ''}

                    <div>
                        <h3 style="color:#a5b4fc; margin-bottom: 10px;">Predictive Biomarkers</h3>
                        ${forecastHTML}
                    </div>
                </div>
            `;
        } else {
            output.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-circle"></i><p>Failed to retrieve forecasting details.</p></div>`;
        }
    } catch (e) {
        output.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-triangle"></i><p>Connection issue.</p></div>`;
    }
    lucide.createIcons();
}

async function loadCoach() {
    const output = document.getElementById('report-coach-output');
    output.innerHTML = '<div class="loading-spinner-box"><div class="spinner"></div><p>Assembling daily exercise & coaching routine...</p></div>';
    
    try {
        const res = await fetch(`/api/reports/coach?email=${encodeURIComponent(currentUser.email)}`);
        const data = await res.json();
        if (res.ok && data.success) {
            if (!data.has_data) {
                output.innerHTML = `<div class="empty-state-message"><i data-lucide="info"></i><p>${data.message}</p></div>`;
                lucide.createIcons();
                return;
            }
            output.innerHTML = `
                <div class="coach-layout" style="text-align: left; line-height: 1.6;">
                    <div class="formatted-output">${formatMarkdown(data.advice)}</div>
                </div>
            `;
        } else {
            output.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-circle"></i><p>Failed to retrieve coach details.</p></div>`;
        }
    } catch (e) {
        output.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-triangle"></i><p>Connection issue.</p></div>`;
    }
    lucide.createIcons();
}

async function searchDiseaseExplorer() {
    const query = document.getElementById('explorer-query').value.trim();
    if (!query) {
        showToast("Please enter a disease query.", "error");
        return;
    }
    
    const output = document.getElementById('report-explorer-output');
    output.innerHTML = '<div class="loading-spinner-box"><div class="spinner"></div><p>Searching Medical Disease Repository...</p></div>';
    
    try {
        const res = await fetch(`/api/reports/explorer?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (res.ok && data.success) {
            output.innerHTML = `
                <div class="explorer-layout" style="text-align: left; display: flex; flex-direction: column; gap: 20px;">
                    ${data.chart_url ? `
                    <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); padding: 15px; border-radius: 12px; text-align: center;">
                        <img src="${data.chart_url}" style="max-height: 250px; border-radius: 8px;" alt="Timeline Chart">
                    </div>
                    ` : ''}
                    <div class="formatted-output">${formatMarkdown(data.explorer_data)}</div>
                </div>
            `;
        } else {
            output.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-circle"></i><p>Failed to query disease details.</p></div>`;
        }
    } catch (e) {
        output.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-triangle"></i><p>Connection issue.</p></div>`;
    }
    lucide.createIcons();
}

function handleRAGSubmitOnEnter(e) {
    if (e.key === 'Enter') {
        submitRAGQuery();
    }
}

async function submitRAGQuery() {
    const input = document.getElementById('report-rag-input');
    const question = input.value.trim();
    if (!question) return;
    
    input.value = '';
    const thread = document.getElementById('report-rag-chat-thread');
    
    const userBubble = document.createElement('div');
    userBubble.className = 'rag-bubble user';
    userBubble.innerText = question;
    thread.appendChild(userBubble);
    thread.scrollTop = thread.scrollHeight;
    
    const typingBubble = document.createElement('div');
    typingBubble.className = 'rag-bubble ai';
    typingBubble.innerText = 'Searching context database...';
    thread.appendChild(typingBubble);
    thread.scrollTop = thread.scrollHeight;
    
    try {
        const res = await fetch('/api/reports/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, question })
        });
        const data = await res.json();
        
        typingBubble.remove();
        
        const aiBubble = document.createElement('div');
        aiBubble.className = 'rag-bubble ai';
        aiBubble.innerHTML = formatMarkdown(data.answer);
        thread.appendChild(aiBubble);
        thread.scrollTop = thread.scrollHeight;
        
    } catch (err) {
        typingBubble.remove();
        const aiBubble = document.createElement('div');
        aiBubble.className = 'rag-bubble ai';
        aiBubble.innerText = "Error querying RAG server.";
        thread.appendChild(aiBubble);
        showToast("RAG database lookup failed.", "error");
    }
}


// ==========================================================================
// PRESCRIPTION DECODER MODULE
// ==========================================================================
function handlePrescDrop(e) {
    e.preventDefault();
    document.getElementById('presc-drop-zone').classList.remove('dragover');
    processPrescFile(e.dataTransfer.files[0]);
}

function handlePrescFileSelect() {
    const input = document.getElementById('presc-file-input');
    if (input.files.length > 0) {
        processPrescFile(input.files[0]);
    }
}

function processPrescFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    selectedPrescFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('presc-img-preview').src = e.target.result;
        document.getElementById('presc-drop-zone').classList.add('hidden');
        document.getElementById('presc-preview-container').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

async function runPrescriptionDecode() {
    if (!selectedPrescFile) return;
    
    const taskId = "task_presc_" + Date.now();
    showLoader("Performing OCR and Medication Safety Decoding...", taskId);
    
    const formData = new FormData();
    formData.append('email', currentUser.email);
    formData.append('image', selectedPrescFile);
    formData.append('task_id', taskId);
    
    try {
        const res = await fetch('/api/prescription/decode', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        hideLoader();
        if (res.ok && data.success) {
            currentPrescriptionData = data.structured_data;
            document.getElementById('presc-tabs-container').classList.remove('hidden');
            switchPrescTab('detail');
            showToast("Prescription decoded successfully!", "success");
            loadDashboardData();
        } else {
            showToast("Prescription decoding failed.", "error");
        }
    } catch (err) {
        hideLoader();
        showToast("Connection to backend server failed.", "error");
    }
}

function switchPrescTab(tab) {
    document.querySelectorAll('#presc-tabs-container .report-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`presc-tab-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    const outDiv = document.getElementById('presc-output-container');
    if (!currentPrescriptionData) return;
    
    if (tab === 'detail') {
        outDiv.innerHTML = `
            <div class="formatted-output">${formatMarkdown(currentPrescriptionData.narrative)}</div>
            <div style="margin-top: 20px; text-align: left;">
                <h3 style="color:#a5b4fc; margin-bottom: 10px;">Drug Reference & Alerts</h3>
                ${currentPrescriptionData.medicines.map(m => `
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                        <h4 style="margin:0 0 8px 0; color:#fff; font-size:1.1rem;">${m.name}</h4>
                        <p style="margin: 4px 0;"><strong>Purpose:</strong> ${m.purpose}</p>
                        <p style="margin: 4px 0;"><strong>Dosage:</strong> ${m.dosage} (${m.frequency})</p>
                        <p style="margin: 4px 0;"><strong>Duration:</strong> ${m.duration}</p>
                        <p style="margin: 4px 0; color:#fbbf24;"><strong>Warnings:</strong> ${m.warnings}</p>
                        <p style="margin: 4px 0; color:#f87171;"><strong>Side Effects:</strong> ${m.side_effects}</p>
                        <p style="margin: 4px 0; color:#34d399;"><strong>Alternative Brands:</strong> ${m.alternatives}</p>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (tab === 'schedule') {
        outDiv.innerHTML = `
            <div style="text-align: left;">
                <h3 style="color:#a5b4fc; margin-bottom: 15px;">🗓️ Medication Schedule Calendar</h3>
                <div class="schedule-calendar-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">
                    ${currentPrescriptionData.medicines.map(m => `
                        <div style="background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.2); padding: 15px; border-radius: 12px;">
                            <h4 style="margin: 0 0 10px 0; color:#a5b4fc;">${m.name}</h4>
                            <p style="margin:4px 0; font-size:0.9rem;"><strong>Duration:</strong> ${m.duration}</p>
                            <p style="margin:4px 0; font-size:0.9rem; color:#f59e0b;"><strong>Required Quantity (Calc):</strong> ${m.quantity_needed} pills/capsules</p>
                            <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
                                <span style="display:block; font-size:0.8rem; text-transform:uppercase; color:#9ca3af; margin-bottom:5px;">Daily Dosage Alarms:</span>
                                ${m.schedule.map(s => `
                                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; background:rgba(0,0,0,0.2); padding:4px 8px; border-radius:6px; margin-bottom:4px;">
                                        <span>⏰ ${s.time}</span>
                                        <span>Take ${s.quantity} dose</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (tab === 'purchase') {
        outDiv.innerHTML = `
            <div style="text-align: left;">
                <h3 style="color:#a5b4fc; margin-bottom: 15px;">🛒 Pharmacy Purchase Assistant</h3>
                ${currentPrescriptionData.medicines.map(m => `
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                        <h4 style="margin:0 0 10px 0; color:#fff;">${m.name}</h4>
                        <div style="display:flex; gap:10px; margin-bottom:10px; font-size:0.9rem;">
                            <span><strong>Required Pack Size:</strong> ${m.quantity_needed} units</span>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:10px;">
                            ${m.purchase_options.map(opt => `
                                <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; display:flex; flex-direction:column; justify-content:space-between; border: 1px solid rgba(255,255,255,0.05);">
                                    <span style="font-weight:600; color:#a5b4fc;">${opt.store}</span>
                                    <span style="font-size:1.1rem; font-weight:bold; margin:5px 0;">${opt.cost}</span>
                                    <span style="font-size:0.75rem; color:#9ca3af; margin-bottom:10px;">Pack: ${opt.pack_size}</span>
                                    <a href="${opt.buy_link}" target="_blank" class="btn-primary" style="padding: 5px; font-size: 0.8rem; text-align: center; text-decoration: none; display: block; border-radius: 6px;">Buy Now <i data-lucide="external-link" style="width:12px; height:12px; vertical-align:middle;"></i></a>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        lucide.createIcons();
    } else if (tab === 'adherence') {
        loadAdherenceTrackerUI();
    }
}

async function loadAdherenceTrackerUI() {
    const outDiv = document.getElementById('presc-output-container');
    outDiv.innerHTML = '<div class="loading-spinner-box"><div class="spinner"></div><p>Loading Adherence logs...</p></div>';
    
    try {
        const res = await fetch(`/api/prescription/adherence?email=${encodeURIComponent(currentUser.email)}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
            let checklistHTML = '';
            
            currentPrescriptionData.medicines.forEach(m => {
                m.schedule.forEach(s => {
                    checklistHTML += `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); padding:12px 15px; border-radius:10px; margin-bottom:8px;">
                            <div>
                                <span style="font-weight:600; display:block;">${m.name}</span>
                                <span style="font-size:0.8rem; color:#9ca3af;">Dosage alarm: ${s.time}</span>
                            </div>
                            <div style="display:flex; gap:10px;">
                                <button class="btn-primary" style="padding:6px 12px; font-size:0.8rem;" onclick="logAdherenceAction('take', '${m.name.replace(/'/g, "\\'")}', '${s.time}')"><i data-lucide="check" style="width:14px; height:14px; vertical-align:middle;"></i> Taken</button>
                                <button class="btn-secondary" style="padding:6px 12px; font-size:0.8rem; border-color:rgba(239,68,68,0.4); color:#f87171;" onclick="logAdherenceAction('miss', '${m.name.replace(/'/g, "\\'")}', '${s.time}')"><i data-lucide="x" style="width:14px; height:14px; vertical-align:middle;"></i> Missed</button>
                            </div>
                        </div>
                    `;
                });
            });
            
            outDiv.innerHTML = `
                <div style="text-align: left; display:flex; flex-direction:column; gap:20px;">
                    <h3 style="color:#a5b4fc; margin-bottom: 5px;">📈 Adherence Tracker Dashboard</h3>
                    
                    <div style="display:flex; gap:15px; flex-wrap:wrap;">
                        <div style="flex:1; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); padding:15px; border-radius:12px; text-align:center;">
                            <span style="font-size:0.8rem; color:#9ca3af; text-transform:uppercase;">Taken Doses</span>
                            <div style="font-size:2rem; font-weight:bold; color:#10b981; margin-top:5px;">${data.taken}</div>
                        </div>
                        <div style="flex:1; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); padding:15px; border-radius:12px; text-align:center;">
                            <span style="font-size:0.8rem; color:#9ca3af; text-transform:uppercase;">Missed Doses</span>
                            <div style="font-size:2rem; font-weight:bold; color:#ef4444; margin-top:5px;">${data.missed}</div>
                        </div>
                        <div style="flex:2; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); padding:15px; border-radius:12px; text-align:center;">
                            <span style="font-size:0.8rem; color:#c7d2fe; text-transform:uppercase;">Medication Adherence Rate</span>
                            <div style="font-size:2rem; font-weight:bold; color:#fff; margin:5px 0;">${data.completion_pct}%</div>
                            <div class="progress-bar-container" style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                                <div style="width:${data.completion_pct}%; height:100%; background:#10b981;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="color:#a5b4fc; margin-bottom:10px;">Today's Dosage Alarm Checklist</h4>
                        ${checklistHTML || '<p>No scheduled doses found.</p>'}
                    </div>
                </div>
            `;
            lucide.createIcons();
        } else {
            outDiv.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-circle"></i><p>Failed to retrieve adherence data.</p></div>`;
        }
    } catch (e) {
        outDiv.innerHTML = `<div class="empty-state-message"><i data-lucide="alert-triangle"></i><p>Connection issue.</p></div>`;
    }
}

async function logAdherenceAction(action, medName, timeSlot) {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const res = await fetch('/api/prescription/adherence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: currentUser.email,
                action,
                med_name: medName,
                time_slot: timeSlot,
                date: today
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(`Dose marked as ${action === 'take' ? 'taken' : 'missed'}!`, "success");
            loadAdherenceTrackerUI();
        }
    } catch (e) {
        showToast("Error updating adherence log.", "error");
    }
}


// ==========================================================================
// MEDICAL IMAGING MODULE
// ==========================================================================
function handleImagingDrop(e) {
    e.preventDefault();
    document.getElementById('imaging-drop-zone').classList.remove('dragover');
    processImagingFile(e.dataTransfer.files[0]);
}

function handleImagingFileSelect() {
    const input = document.getElementById('imaging-file-input');
    if (input.files.length > 0) {
        processImagingFile(input.files[0]);
    }
}

function processImagingFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    selectedImagingFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('imaging-img-preview').src = e.target.result;
        document.getElementById('imaging-drop-zone').classList.add('hidden');
        document.getElementById('imaging-preview-container').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

async function runImagingAnalysis() {
    if (!selectedImagingFile) return;
    
    const taskId = "task_img_" + Date.now();
    showLoader("Running Neural Feature Classifiers...", taskId);
    
    const formData = new FormData();
    formData.append('email', currentUser.email);
    formData.append('image_type', 'auto');
    formData.append('image', selectedImagingFile);
    formData.append('task_id', taskId);
    
    try {
        const res = await fetch('/api/imaging/analyze', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        hideLoader();
        if (res.ok && data.success) {
            displayImagingResult(data.analysis, data.confidence, data.image_url, data.heatmap_url, data.pdf_url);
            showToast("Diagnostic scan analyzed successfully!", "success");
            loadDashboardData();
        } else {
            showToast("Neural imaging analysis failed.", "error");
        }
    } catch (err) {
        hideLoader();
        showToast("Fail connecting to backend.", "error");
    }
}

function displayImagingResult(analysis, confidence, origImgUrl, heatmapUrl, pdfUrl) {
    document.getElementById('imaging-empty-state').classList.add('hidden');
    
    const wrap = document.getElementById('imaging-results-wrapper');
    wrap.classList.remove('hidden');
    
    const pct = (confidence * 100).toFixed(1);
    document.getElementById('imaging-confidence-val').innerText = `${pct}%`;
    document.getElementById('imaging-confidence-fill').style.width = `${pct}%`;
    
    const badge = document.getElementById('imaging-severity-badge');
    badge.className = 'badge';
    
    const lowerText = analysis.toLowerCase();
    let severity = "low";
    if (lowerText.includes("critical") || lowerText.includes("emergency")) {
        severity = "critical";
    } else if (lowerText.includes("high severity") || lowerText.includes("high risk")) {
        severity = "high";
    } else if (lowerText.includes("moderate") || lowerText.includes("mild")) {
        severity = "moderate";
    }
    
    badge.classList.add(severity);
    badge.innerText = severity;
    
    document.getElementById('imaging-result-orig-img').src = origImgUrl;
    document.getElementById('imaging-result-heatmap-img').src = heatmapUrl || origImgUrl;
    document.getElementById('imaging-narrative-output').innerHTML = formatMarkdown(analysis);
    
    const pdfBtn = document.getElementById('imaging-download-pdf-btn');
    if (pdfUrl) {
        pdfBtn.href = pdfUrl;
        pdfBtn.classList.remove('hidden');
    } else {
        pdfBtn.classList.add('hidden');
    }
}


// ==========================================================================
// HISTORY & SEARCH timelines
// ==========================================================================
async function loadUserHistory() {
    if (!currentUser) return;
    
    const cat = document.getElementById('history-category-select').value;
    const search = document.getElementById('history-search-input').value;
    
    try {
        const res = await fetch(`/api/history?email=${encodeURIComponent(currentUser.email)}&category=${cat}&search=${encodeURIComponent(search)}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
            renderHistoryLogs(data.history);
        }
    } catch (err) {
        console.error("History fetch failure", err);
    }
}

let historyCache = [];

function renderHistoryLogs(items) {
    historyCache = items;
    const wrap = document.getElementById('history-items-container');
    wrap.innerHTML = '';
    
    if (items.length === 0) {
        wrap.innerHTML = '<div class="list-empty">No matching records found.</div>';
        return;
    }
    
    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'history-card';
        
        let subDetails = '';
        if (item.category === 'chats') {
            subDetails = `<span class="history-text-preview">${item.detail.substring(0, 120)}...</span>`;
        } else if (item.category === 'imaging') {
            subDetails = `<span class="history-text-preview">${item.detail.substring(0, 120)}...</span>`;
        } else if (item.category === 'prescriptions') {
            subDetails = `<span class="history-text-preview">${item.detail.substring(0, 120)}...</span>`;
        }
        
        card.innerHTML = `
            <div class="history-card-left">
                <div class="history-icon-wrapper ${item.category}"><i data-lucide="${getCategoryIcon(item.category)}"></i></div>
                <div class="history-details">
                    <span class="history-title">${item.title}</span>
                    <span class="history-meta">${formatTimestamp(item.timestamp)} &bull; ${item.category.toUpperCase()}</span>
                    ${subDetails}
                </div>
            </div>
            <div class="history-card-right">
                <button class="btn-secondary" onclick="reopenHistoryItem(${index})">Reopen</button>
            </div>
        `;
        wrap.appendChild(card);
    });
    
    lucide.createIcons();
}

function reopenHistoryItem(index) {
    const item = historyCache[index];
    if (!item) return;
    
    if (item.category === 'chats') {
        reopenChatHistory(item.title, item.detail, item.image_url);
    } else if (item.category === 'imaging') {
        reopenImagingScan(item.title, item.detail, item.image_url, item.heatmap_url, item.pdf_url);
    } else if (item.category === 'reports') {
        navigateTo('reports');
    } else if (item.category === 'prescriptions') {
        navigateTo('prescription');
        document.getElementById('presc-drop-zone').classList.add('hidden');
        const previewBox = document.getElementById('presc-preview-container');
        previewBox.classList.remove('hidden');
        document.getElementById('presc-img-preview').src = item.image_url;
        
        currentPrescriptionData = item.structured_data;
        document.getElementById('presc-tabs-container').classList.remove('hidden');
        switchPrescTab('detail');
    }
}

function getCategoryIcon(cat) {
    if (cat === 'chats') return 'message-square';
    if (cat === 'reports') return 'file-text';
    if (cat === 'prescriptions') return 'pill';
    return 'scan';
}

function reopenChatHistory(title, detail, imageUrl) {
    navigateTo('chat');
    const thread = document.getElementById('chat-messages-thread');
    thread.innerHTML = '';
    appendChatMessage('user', title, null);
    appendChatMessage('system', detail, imageUrl);
}

function reopenImagingScan(title, analysis, origImgUrl, heatmapUrl, pdfUrl) {
    navigateTo('imaging');
    displayImagingResult(analysis, 0.92, origImgUrl, heatmapUrl, pdfUrl);
}


// ==========================================================================
// PROFILE AND COUNTER DISPLAY
// ==========================================================================
async function loadProfileStats() {
    if (!currentUser) return;
    
    try {
        const res = await fetch(`/api/profile?email=${encodeURIComponent(currentUser.email)}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
            document.getElementById('profile-card-name').innerText = data.name;
            document.getElementById('profile-card-email').innerText = data.email;
            document.getElementById('profile-avatar-large').innerText = data.name.charAt(0).toUpperCase();
            document.getElementById('profile-card-date').innerText = new Date(data.join_date).toLocaleDateString();
            
            document.getElementById('stat-count-chats').innerText = data.stats.chats;
            document.getElementById('stat-count-reports').innerText = data.stats.reports;
            document.getElementById('stat-count-prescriptions').innerText = data.stats.prescriptions;
            document.getElementById('stat-count-imaging').innerText = data.stats.imaging;
        }
    } catch (err) {
        console.error("Profile counter fetch error", err);
    }
}


// ==========================================================================
// CLIENT FORMATTING UTILS
// ==========================================================================
function formatTimestamp(isoStr) {
    try {
        const d = new Date(isoStr);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return isoStr;
    }
}

function formatMarkdown(text) {
    if (!text) return "";
    
    let html = text;
    html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    html = html.replace(/\n/g, '<br>');
    return html;
}