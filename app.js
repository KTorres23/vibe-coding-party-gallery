// Global State
let partiesMap = {};
let mockProjects = [];
let mockResources = [];
let currentResourceCategory = 'all';

// DOM Elements - Theme
const themeToggleBtn = document.getElementById('themeToggleBtn');

// DOM Elements - Tabs
const tabGallery = document.getElementById('tabGallery');
const tabLearn = document.getElementById('tabLearn');
const tabResources = document.getElementById('tabResources');

const galleryView = document.getElementById('galleryView');
const learnView = document.getElementById('learnView');
const resourcesView = document.getElementById('resourcesView');

// DOM Elements - Gallery Controls
const galleryContainer = document.getElementById('galleryContainer');
const sourceFilter = document.getElementById('sourceFilter');
const partyFilter = document.getElementById('partyFilter');
const typeFilter = document.getElementById('typeFilter');
const searchInput = document.getElementById('searchInput');

// DOM Elements - Resources Controls
const resourcesContainer = document.getElementById('resourcesContainer');
const resourceSearchInput = document.getElementById('resourceSearchInput');
const resCatPills = document.querySelectorAll('.res-cat-pill');

// DOM Elements - Modals
const submitBtn = document.getElementById('submitBtn');
const submitResourceBtn = document.getElementById('submitResourceBtn');

const submissionModal = document.getElementById('submissionModal');
const resourceModal = document.getElementById('resourceModal');
const detailModal = document.getElementById('detailModal');

const closeBtn = document.querySelector('.close-btn');
const closeResourceBtn = document.getElementById('closeResourceBtn');
const closeDetailBtn = document.getElementById('closeDetailBtn');

const submissionForm = document.getElementById('submissionForm');
const resourceForm = document.getElementById('resourceForm');

const copyPromptBtn = document.getElementById('copyPromptBtn');
const copyResourcePromptBtn = document.getElementById('copyResourcePromptBtn');
const toastNotification = document.getElementById('toastNotification');

// ==================== THEME MANAGEMENT ====================
function initTheme() {
    const savedTheme = localStorage.getItem('vibe_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleBtn.textContent = '☀️ Light Mode';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggleBtn.textContent = '🌙 Night Mode';
    }
}

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('vibe_theme', isDark ? 'dark' : 'light');
    themeToggleBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Night Mode';
});

initTheme();

// ==================== TAB SWITCHING ====================
function switchTab(activeBtn, activeView) {
    [tabGallery, tabLearn, tabResources].forEach(btn => btn.classList.remove('active'));
    [galleryView, learnView, resourcesView].forEach(view => view.classList.add('hidden'));

    activeBtn.classList.add('active');
    activeView.classList.remove('hidden');
}

tabGallery.addEventListener('click', () => switchTab(tabGallery, galleryView));
tabLearn.addEventListener('click', () => switchTab(tabLearn, learnView));
tabResources.addEventListener('click', () => switchTab(tabResources, resourcesView));

// ==================== MARKDOWN PARSER ====================
function parseMarkdown(text) {
    if (!text) return 'No description provided.';
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    html = html.replace(/^### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    const lines = html.split('\n');
    let inList = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* ')) {
            const content = lines[i].trim().substring(2);
            lines[i] = (inList ? '' : '<ul>') + `<li>${content}</li>`;
            inList = true;
        } else {
            if (inList) {
                lines[i - 1] += '</ul>';
                inList = false;
            }
            if (lines[i].trim() !== '' && !lines[i].match(/<h[1-6]|<ul|<li/)) {
                lines[i] = `<p>${lines[i]}</p>`;
            }
        }
    }
    if (inList) lines[lines.length - 1] += '</ul>';
    return lines.join('\n');
}

// Fallback Gradient SVG Generator
function generateGradientSvg(title, party) {
    const isBlue = party.includes('jun') || party.includes('aug') || party.includes('other');
    const c1 = isBlue ? '%23051c14' : '%23064e3b';
    const c2 = isBlue ? '%2306b6d4' : '%2310b981';
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='${c1}'/><stop offset='100%25' stop-color='${c2}'/></linearGradient></defs><rect width='100%25' height='100%25' fill='url(%23g)'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' font-weight='bold' fill='white'>${encodeURIComponent(title)}</text><text x='50%25' y='65%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='rgba(255,255,255,0.7)'>Ecology & AI Vibe Coding</text></svg>`;
}

// ==================== GALLERY RENDER ====================
function renderGallery() {
    galleryContainer.innerHTML = '';
    const sFilter = sourceFilter.value;
    const pFilter = partyFilter.value;
    const tFilter = typeFilter.value;
    const q = searchInput.value.toLowerCase().trim();

    const filtered = mockProjects.filter(p => {
        const pSource = (p.sourceType || 'other').toLowerCase().trim();
        const pParty = (p.party || 'other').toLowerCase().trim();
        const pType = (p.type || 'link').toLowerCase().trim();

        const matchSource = sFilter === 'all' || pSource === sFilter;
        const matchParty = pFilter === 'all' || pParty === pFilter;
        const matchType = tFilter === 'all' || pType === tFilter || (tFilter === 'hosted' && pType === 'hosted');
        const matchSearch = !q || p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);

        return matchSource && matchParty && matchType && matchSearch;
    });

    if (filtered.length === 0) {
        galleryContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No projects found matching your criteria. Try adjusting your filters!</div>';
        return;
    }

    filtered.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';

        const sourceLabel = project.sourceType === 'other' ? 'Other Project' : (partiesMap[project.party] || project.party);
        const badgeClass = project.sourceType === 'other' ? 'tag-badge badge-other' : 'tag-badge';

        let typeBadgeText = 'Link ↗';
        if (project.type === 'hosted') typeBadgeText = 'Hosted Webpage 🌐';
        else if (project.type === 'download' || project.type === 'upload') typeBadgeText = 'Download ⬇️';

        const screenshotHtml = project.screenshot ? `<img class="project-screenshot" src="${project.screenshot}" alt="${project.title}">` : '';

        card.innerHTML = `
            ${screenshotHtml}
            <div class="project-card-header">
                <h3>${project.title}</h3>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.25rem;">
                    <span class="${badgeClass}">${sourceLabel}</span>
                    <span class="tag-mini" style="font-size:0.7rem;">${typeBadgeText}</span>
                </div>
            </div>
            <p class="author">by ${project.authorLink ? `<a href="${project.authorLink}" target="_blank" style="color:var(--accent-color);">${project.author}</a>` : project.author}</p>
            <div class="desc-content">${parseMarkdown(project.description.slice(0, 160))}...</div>
            <p class="card-footer-link">Click to view full details →</p>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'A') {
                openDetailModal(project);
            }
        });

        galleryContainer.appendChild(card);
    });
}

function openDetailModal(project) {
    const detailContainer = document.getElementById('detailContainer');
    let actionLink = 'View External Project ↗';
    if (project.type === 'hosted') actionLink = 'Play Hosted Web Project →';
    else if (project.type === 'download') actionLink = 'Download Project Files ⬇️';

    const screenshotHtml = project.screenshot ? `<img style="width:100%; max-height:350px; object-fit:contain; background:rgba(0,0,0,0.03); border-radius:16px; margin-bottom:1.5rem;" src="${project.screenshot}" alt="${project.title}">` : '';

    detailContainer.innerHTML = `
        ${screenshotHtml}
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
            <h2>${project.title}</h2>
            <span class="tag-badge">${partiesMap[project.party] || project.party}</span>
        </div>
        <p style="color:var(--text-muted); margin-bottom:1.5rem;">Created by <strong>${project.authorLink ? `<a href="${project.authorLink}" target="_blank" style="color:var(--accent-color);">${project.author}</a>` : project.author}</strong></p>
        <div style="margin-bottom:1.5rem;" class="desc-content">${parseMarkdown(project.description)}</div>
        <div style="display:flex; gap:1rem;">
            <a href="${project.url}" target="_blank" class="btn-primary">${actionLink}</a>
        </div>
    `;
    detailModal.classList.remove('hidden');
}

// ==================== RESOURCES RENDER ====================
function renderResources() {
    resourcesContainer.innerHTML = '';
    const q = resourceSearchInput.value.toLowerCase().trim();

    const filtered = mockResources.filter(r => {
        const matchCat = currentResourceCategory === 'all' || r.category === currentResourceCategory;
        const matchSearch = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.author.toLowerCase().includes(q);
        return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
        resourcesContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No resources found.</div>';
        return;
    }

    filtered.forEach(res => {
        const card = document.createElement('div');
        card.className = 'resource-card';

        const tagsHtml = (res.tags || []).map(t => `<span class="tag-mini">#${t}</span>`).join(' ');

        card.innerHTML = `
            <h3>${res.title}</h3>
            <p class="resource-author">by ${res.author}</p>
            <p style="font-size:0.9rem; color:var(--text-muted); flex-grow:1;">${parseMarkdown(res.description)}</p>
            <div class="resource-tags">${tagsHtml}</div>
            <a href="${res.url}" target="_blank" class="btn-secondary" style="margin-top:1rem; text-align:center; text-decoration:none;">Open Resource ↗</a>
        `;
        resourcesContainer.appendChild(card);
    });
}

// Resource Category Pill Clicks
resCatPills.forEach(pill => {
    pill.addEventListener('click', () => {
        resCatPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentResourceCategory = pill.dataset.category;
        renderResources();
    });
});

resourceSearchInput.addEventListener('input', renderResources);

// ==================== DATA LOADING ====================
async function loadData() {
    const timestamp = Date.now();
    try {
        const [partiesRes, resourcesRes] = await Promise.all([
            fetch(`parties.yaml?v=${timestamp}`),
            fetch(`resources.yaml?v=${timestamp}`)
        ]);

        let projectsRes = await fetch(`projects.yaml?v=${timestamp}`);
        if (!projectsRes.ok) {
            console.log("projects.yaml not found, fetching projects.json...");
            projectsRes = await fetch(`projects.json?v=${timestamp}`);
        }

        if (partiesRes.ok) {
            const partiesText = await partiesRes.text();
            const parsedParties = jsyaml.load(partiesText);
            if (parsedParties) {
                partiesMap = parsedParties;
                updatePartyDropdowns();
            }
        }

        if (projectsRes.ok) {
            const projText = await projectsRes.text();
            try {
                mockProjects = jsyaml.load(projText) || [];
            } catch (err) {
                console.warn("Failed to parse projects with YAML, trying JSON...", err);
                mockProjects = JSON.parse(projText);
            }
        }

        if (resourcesRes.ok) {
            const resText = await resourcesRes.text();
            mockResources = jsyaml.load(resText) || [];
        }
    } catch (e) {
        console.warn("Using fallback data structures:", e);
    }

    renderGallery();
    renderResources();
}

function updatePartyDropdowns() {
    partyFilter.innerHTML = '<option value="all">All Parties</option>';
    const partySelect = document.getElementById('partySelect');
    partySelect.innerHTML = '';

    for (const [slug, name] of Object.entries(partiesMap)) {
        const opt1 = document.createElement('option');
        opt1.value = slug;
        opt1.textContent = name;
        partyFilter.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = slug;
        opt2.textContent = name;
        partySelect.appendChild(opt2);
    }
}

loadData();

// Filter Event Listeners
sourceFilter.addEventListener('change', renderGallery);
partyFilter.addEventListener('change', renderGallery);
typeFilter.addEventListener('change', renderGallery);
searchInput.addEventListener('input', renderGallery);

// ==================== MODALS & FORM SUBMISSIONS ====================
submitBtn.addEventListener('click', () => submissionModal.classList.remove('hidden'));
submitResourceBtn.addEventListener('click', () => resourceModal.classList.remove('hidden'));

closeBtn.addEventListener('click', () => submissionModal.classList.add('hidden'));
closeResourceBtn.addEventListener('click', () => resourceModal.classList.add('hidden'));
closeDetailBtn.addEventListener('click', () => detailModal.classList.add('hidden'));

window.addEventListener('click', (e) => {
    if (e.target === submissionModal) submissionModal.classList.add('hidden');
    if (e.target === resourceModal) resourceModal.classList.add('hidden');
    if (e.target === detailModal) detailModal.classList.add('hidden');
});

// Submission Type Toggle Logic (Upload .zip, Hosted Webpage URL, External Link)
const radioTypes = document.getElementsByName('subType');
const uploadSection = document.getElementById('uploadSection');
const linkSection = document.getElementById('linkSection');
const projectUrlInput = document.getElementById('projectUrl');
const urlLabel = document.getElementById('urlLabel');

radioTypes.forEach(radio => {
    if (radio.checked) radio.parentElement.classList.add('active-format');
    radio.addEventListener('change', (e) => {
        radioTypes.forEach(r => r.parentElement.classList.remove('active-format'));
        if (e.target.checked) e.target.parentElement.classList.add('active-format');

        const val = e.target.value;
        if (val === 'upload') {
            uploadSection.classList.remove('hidden');
            linkSection.classList.add('hidden');
        } else if (val === 'hosted') {
            uploadSection.classList.add('hidden');
            linkSection.classList.remove('hidden');
            urlLabel.textContent = 'Live Hosted Webpage URL *';
            projectUrlInput.placeholder = 'https://my-ecology-app.github.io';
        } else if (val === 'link') {
            uploadSection.classList.add('hidden');
            linkSection.classList.remove('hidden');
            urlLabel.textContent = 'External Link / Repository URL *';
            projectUrlInput.placeholder = 'https://github.com/username/repository';
        }
    });
});

// Toast Helper
function showToast(msg) {
    toastNotification.textContent = msg;
    toastNotification.classList.remove('hidden');
    setTimeout(() => toastNotification.classList.add('hidden'), 3000);
}

// Copy LLM Prompt Logic
copyPromptBtn.addEventListener('click', async () => {
    const promptText = `I have built an ecology/AI vibe-coded project. Please summarize my project into a clean markdown format (under 500 characters) for a website submission gallery.

Format requirements:
- Highlight the core ecology/AI problem solved.
- List 2-3 key features with bullet points.
- Include bold text and code snippets if relevant.`;
    await navigator.clipboard.writeText(promptText);
    showToast('Project LLM Prompt copied to clipboard! 📋');
});

copyResourcePromptBtn.addEventListener('click', async () => {
    const promptText = `Please structure this resource/tool for an ecology AI vibe coding directory:
- Title:
- Category (Templates, AI Assistants, IDEs, Ecological Datasets/APIs, Community Tech):
- Author/Organization:
- URL:
- Description (2-3 sentences explaining its utility for ecology vibe coding):
- Tags (3-4 comma separated tags):`;
    await navigator.clipboard.writeText(promptText);
    showToast('Resource LLM Prompt copied to clipboard! 📋');
});

// Project Form Submission to GitHub Issue
submissionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('projectName').value;
    const author = document.getElementById('authorName').value;
    const authorLink = document.getElementById('authorLink').value;
    const sourceType = document.getElementById('sourceTypeSelect').value;
    const party = document.getElementById('partySelect').value;
    const description = document.getElementById('projectDesc').value;

    const subType = document.querySelector('input[name="subType"]:checked').value;
    const isUpload = subType === 'upload';
    const url = !isUpload ? document.getElementById('projectUrl').value : '#';

    const issueBody = `
### Project Details
**Title**: ${title}
**Author**: ${author}
**Author Link**: ${authorLink || 'N/A'}
**Source Type**: ${sourceType}
**Party**: ${party}
**Type**: ${subType}
**URL**: ${url}

### Description
${description}

---
### 📎 Files & Attachments (Optional)
*Optional: You can drag & drop a screenshot image (.png / .jpg) and/or project \`.zip\` file directly into this issue body!*
    `.trim();

    const issueUrl = `https://github.com/KTorres23/vibe-coding-party-gallery/issues/new?title=${encodeURIComponent("[Submission] " + title)}&body=${encodeURIComponent(issueBody)}`;
    window.open(issueUrl, '_blank');

    submissionModal.classList.add('hidden');
    submissionForm.reset();
});

// Resource Form Submission to GitHub Issue
resourceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('resourceTitle').value;
    const category = document.getElementById('resourceCategory').value;
    const author = document.getElementById('resourceAuthor').value;
    const url = document.getElementById('resourceLink').value;
    const description = document.getElementById('resourceDesc').value;
    const tags = document.getElementById('resourceTags').value;

    const issueBody = `
### Resource Details
**Resource Title**: ${title}
**Category**: ${category}
**Submitted By**: ${author}
**URL**: ${url}
**Tags**: ${tags}

### Description
${description}
    `.trim();

    const issueUrl = `https://github.com/KTorres23/vibe-coding-party-gallery/issues/new?title=${encodeURIComponent("[Resource] " + title)}&body=${encodeURIComponent(issueBody)}`;
    window.open(issueUrl, '_blank');

    resourceModal.classList.add('hidden');
    resourceForm.reset();
});
