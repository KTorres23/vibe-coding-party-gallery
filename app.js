// Helper to generate a beautiful placeholder SVG gradient screenshot
function generateGradientSvg(title, theme = 'jun-2026') {
    const isBlueTheme = theme.includes('jun') || theme.includes('aug') || theme.includes('ocean');
    const color1 = isBlueTheme ? '%23064e3b' : '%23065f46';
    const color2 = isBlueTheme ? '%233b82f6' : '%2310b981';
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='${color1}'/><stop offset='100%25' stop-color='${color2}'/></linearGradient></defs><rect width='100%25' height='100%25' fill='url(%23g)'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' font-weight='bold' fill='white'>${encodeURIComponent(title)}</text><text x='50%25' y='65%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='rgba(255,255,255,0.7)'>Vibe Coding Showcase</text></svg>`;
}
// Global dictionary mapping party slugs to full display names
let partiesMap = {};



// Global projects data
let mockProjects = [];

// DOM Elements
const galleryContainer = document.getElementById('galleryContainer');
const partyFilter = document.getElementById('partyFilter');
const typeFilter = document.getElementById('typeFilter');
const submitBtn = document.getElementById('submitBtn');
const submissionModal = document.getElementById('submissionModal');
const closeBtn = document.querySelector('.close-btn');
const submissionForm = document.getElementById('submissionForm');
const radioTypes = document.getElementsByName('subType');
const uploadSection = document.getElementById('uploadSection');
const linkSection = document.getElementById('linkSection');
const dragDropZone = document.getElementById('uploadSection');
const fileInput = document.getElementById('fileUpload');

// New Elements
const tabGallery = document.getElementById('tabGallery');
const tabLearn = document.getElementById('tabLearn');
const galleryView = document.getElementById('galleryView');
const learnView = document.getElementById('learnView');

const screenshotZone = document.getElementById('screenshotZone');
const screenshotUpload = document.getElementById('screenshotUpload');
const screenshotPreviewContainer = document.getElementById('screenshotPreviewContainer');
const screenshotPreview = document.getElementById('screenshotPreview');
const removeScreenshotBtn = document.getElementById('removeScreenshotBtn');

let currentScreenshotBase64 = null;

// Tab Switching logic
tabGallery.addEventListener('click', () => {
    tabGallery.classList.add('active');
    tabLearn.classList.remove('active');
    galleryView.classList.remove('hidden');
    learnView.classList.add('hidden');
});

tabLearn.addEventListener('click', () => {
    tabLearn.classList.add('active');
    tabGallery.classList.remove('active');
    learnView.classList.remove('hidden');
    galleryView.classList.add('hidden');
});

// Markdown Parser
function parseMarkdown(text) {
    if (!text) return 'No description provided.';

    // Simple HTML escaping to prevent XSS
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Headings (e.g. ### Header)
    html = html.replace(/^### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2>$1</h2>');

    // Bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italics (*text*)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Inline Code (`code`)
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Hyperlinks [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Bullet lists (simple processing line-by-line)
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
            // Double line break for paragraphs, single for br
            if (lines[i].trim() !== '') {
                // If it doesn't already contain heading/list tags, wrap in p
                if (!lines[i].match(/<h[1-6]|<ul|<li/)) {
                    lines[i] = `<p>${lines[i]}</p>`;
                }
            }
        }
    }
    if (inList) {
        lines[lines.length - 1] += '</ul>';
    }

    return lines.join('\n');
}

// Render Gallery
function renderGallery() {
    galleryContainer.innerHTML = '';
    const pFilter = partyFilter.value;
    const tFilter = typeFilter.value;

    const filtered = mockProjects.filter(p => {
        const matchParty = pFilter === 'all' || p.party === pFilter;
        const matchType = tFilter === 'all' || p.type === tFilter;
        return matchParty && matchType;
    });

    filtered.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';

        // Check if author has website link
        const authorDisplay = project.authorLink
            ? `<a href="${project.authorLink}" target="_blank" class="author-link">${project.author}</a>`
            : project.author;

        let linkText = 'View External Project ↗';
        if (project.type === 'hosted') linkText = 'Play Hosted Project →';
        else if (project.type === 'download') linkText = 'Download Source Code ⬇️';
        else if (project.type === 'upload') linkText = 'Download Project ⬇️'; // Legacy fallback

        // Render card content
        card.innerHTML = `
            <img class="project-screenshot" src="${project.screenshot || generateGradientSvg(project.title, project.party)}" alt="${project.title} Screenshot">
            <div class="project-card-header">
                <h3>${project.title}</h3>
                <span class="tag">${partiesMap[project.party] || project.party}</span>
            </div>
            <p class="author">by ${authorDisplay}</p>
            <div class="desc-content">${parseMarkdown(project.description)}</div>
            <p><a href="${project.url}" target="_blank">${linkText}</a></p>
        `;
        galleryContainer.appendChild(card);
    });
}

// Populate party dropdown elements dynamically
function updatePartyDropdowns(list) {
    // Populate filter (keep "All Parties")
    partyFilter.innerHTML = '<option value="all">All Parties</option>';
    // Populate select inside form
    const partySelect = document.getElementById('partySelect');
    partySelect.innerHTML = '';

    list.forEach(item => {
        const optFilter = document.createElement('option');
        optFilter.value = item.slug;
        optFilter.textContent = item.name;
        partyFilter.appendChild(optFilter);

        const optSelect = document.createElement('option');
        optSelect.value = item.slug;
        optSelect.textContent = item.name;
        partySelect.appendChild(optSelect);
    });
}

// Fetch data
async function loadData() {
    try {
        const [partiesRes, projectsRes] = await Promise.all([
            fetch('parties.yaml'),
            fetch('projects.json')
        ]);
        
        if (projectsRes.ok) {
            mockProjects = await projectsRes.json();
        }

        if (!partiesRes.ok) throw new Error('Could not fetch parties.yaml');
        const text = await partiesRes.text();

        // Parse YAML using js-yaml
        const parsedData = jsyaml.load(text);

        if (parsedData && typeof parsedData === 'object') {
            const newPartiesMap = {};
            const partiesList = [];

            for (const [slug, name] of Object.entries(parsedData)) {
                newPartiesMap[slug] = name;
                partiesList.push({ slug, name });
            }

            if (partiesList.length > 0) {
                partiesMap = newPartiesMap;
                updatePartyDropdowns(partiesList);
            }
        }
    } catch (e) {
        console.warn("Using default fallback categories:", e);
        const fallbacks = Object.entries(partiesMap).map(([slug, name]) => ({ slug, name }));
        updatePartyDropdowns(fallbacks);
    }

    // Initial Gallery Render
    renderGallery();
}

// Initial Load
loadData();

// Filter Events
partyFilter.addEventListener('change', renderGallery);
typeFilter.addEventListener('change', renderGallery);

// Modal Toggles
submitBtn.addEventListener('click', () => {
    submissionModal.classList.remove('hidden');
});

closeBtn.addEventListener('click', () => {
    submissionModal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target === submissionModal) {
        submissionModal.classList.add('hidden');
    }
});

// Submission Type Toggle
radioTypes.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'upload') {
            uploadSection.classList.remove('hidden');
            linkSection.classList.add('hidden');
        } else {
            uploadSection.classList.add('hidden');
            linkSection.classList.remove('hidden');
        }
    });
});

// Drag and Drop Logic for Project Files
dragDropZone.addEventListener('click', () => fileInput.click());

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dragDropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dragDropZone.addEventListener(eventName, () => dragDropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dragDropZone.addEventListener(eventName, () => dragDropZone.classList.remove('dragover'), false);
});

dragDropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    fileInput.files = files; // Assign files to input
    if (files.length > 0) {
        dragDropZone.querySelector('p').textContent = `${files.length} file(s) selected for upload.`;
    }
}

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        dragDropZone.querySelector('p').textContent = `${fileInput.files.length} file(s) selected for upload.`;
    }
});

// Screenshot Upload & Drag/Drop
screenshotZone.addEventListener('click', () => screenshotUpload.click());

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    screenshotZone.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    screenshotZone.addEventListener(eventName, () => screenshotZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    screenshotZone.addEventListener(eventName, () => screenshotZone.classList.remove('dragover'), false);
});

screenshotZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        handleScreenshotFile(files[0]);
    }
});

screenshotUpload.addEventListener('change', () => {
    if (screenshotUpload.files.length > 0) {
        handleScreenshotFile(screenshotUpload.files[0]);
    }
});

function handleScreenshotFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        currentScreenshotBase64 = e.target.result;
        screenshotPreview.src = currentScreenshotBase64;
        screenshotPreviewContainer.classList.remove('hidden');
        screenshotZone.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

removeScreenshotBtn.addEventListener('click', () => {
    currentScreenshotBase64 = null;
    screenshotUpload.value = '';
    screenshotPreview.src = '';
    screenshotPreviewContainer.classList.add('hidden');
    screenshotZone.classList.remove('hidden');
});

// Form Submission Simulation
submissionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('projectName').value;
    const author = document.getElementById('authorName').value;
    const authorLink = document.getElementById('authorLink').value;
    const description = document.getElementById('projectDesc').value;
    const party = document.getElementById('partySelect').value;
    const isLink = document.querySelector('input[name="subType"]:checked').value === 'link';

    const url = isLink ? document.getElementById('projectUrl').value : '#';
    const type = isLink ? 'link' : 'upload';

    // Generate Issue Body
    const issueBody = `
### Project Details
**Title**: ${title}
**Author**: ${author}
**Author Link**: ${authorLink || 'N/A'}
**Party**: ${party}
**Type**: ${type}
**URL**: ${url}

### Description
${description}

---
### 📎 Files
*Drag and drop your project \`.zip\` and screenshot image here!*
    `.trim();

    // Create the pre-filled GitHub Issue URL
    const issueUrl = `https://github.com/KTorres23/vibe-coding-party-gallery/issues/new?title=${encodeURIComponent("[Submission] " + title)}&body=${encodeURIComponent(issueBody)}`;
    
    // Navigate directly to the Issue template to avoid popup blockers
    window.location.href = issueUrl;

    // Add to local data to show immediate feedback on the current page
    mockProjects.unshift({
        id: Date.now(),
        title,
        author,
        authorLink,
        party,
        description,
        screenshot: currentScreenshotBase64 || generateGradientSvg(title, party),
        url,
        type
    });

    // Reset page and modal
    renderGallery();
    submissionModal.classList.add('hidden');
    submissionForm.reset();

    // Reset screenshot inputs
    currentScreenshotBase64 = null;
    screenshotPreview.src = '';
    screenshotPreviewContainer.classList.add('hidden');
    screenshotZone.classList.remove('hidden');

    // Reset file uploads
    dragDropZone.querySelector('p').textContent = 'Drag & Drop your project files (.zip or source files) here or click to browse.';
    
    // Reset char count
    document.getElementById('charCount').textContent = '0 / 500 characters';
});

// Character Counter Logic
const projectDesc = document.getElementById('projectDesc');
const charCount = document.getElementById('charCount');

projectDesc.addEventListener('input', () => {
    const length = projectDesc.value.length;
    charCount.textContent = `${length} / 500 characters`;
    if (length >= 500) {
        charCount.style.color = '#ef4444'; // Red when maxed
    } else {
        charCount.style.color = '#64748b'; // Normal
    }
});

// Copy LLM Prompt Logic
const copyPromptBtn = document.getElementById('copyPromptBtn');
copyPromptBtn.addEventListener('click', async () => {
    const promptText = "Generate a summary of our vibe-coded project in under 500 characters, with markdown support. Emphasize the core features and the overall 'vibe'.";
    try {
        await navigator.clipboard.writeText(promptText);
        const originalText = copyPromptBtn.textContent;
        copyPromptBtn.textContent = 'Copied! ✅';
        setTimeout(() => {
            copyPromptBtn.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy prompt to clipboard.');
    }
});


