const fs = require('fs');
const path = require('path');
const https = require('https');

const issueBody = process.env.ISSUE_BODY;
if (!issueBody) {
    console.error("No issue body provided.");
    process.exit(1);
}

function extractValue(regex, defaultValue = '') {
    const match = issueBody.match(regex);
    return match ? match[1].trim() : defaultValue;
}

const title = extractValue(/\*\*Title\*\*: (.*)/) || 'Untitled';
const author = extractValue(/\*\*Author\*\*: (.*)/) || 'Unknown';
const authorLink = extractValue(/\*\*Author Link\*\*: (.*)/);
const party = extractValue(/\*\*Party\*\*: (.*)/) || 'unknown';
const type = extractValue(/\*\*Type\*\*: (.*)/) || 'upload';
const url = extractValue(/\*\*URL\*\*: (.*)/) || '#';

const descriptionMatch = issueBody.match(/### Description\n([\s\S]*?)\n---/);
const description = descriptionMatch ? descriptionMatch[1].trim() : '';

// Look for file URLs in the issue body
const fileUrls = [];
const fileRegex = /\]\((https:\/\/github\.com\/[^\)]+)\)/g;
let match;
while ((match = fileRegex.exec(issueBody)) !== null) {
    fileUrls.push(match[1]);
}

const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const projectDir = path.join(__dirname, '../../projects', party, slug);
if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
}

let screenshotPath = '';
let projectZipPath = '';

const downloadFile = (fileUrl, dest) => {
    return new Promise((resolve, reject) => {
        https.get(fileUrl, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
            }
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
};

(async () => {
    let imgExt = '.png';
    for (const fileUrl of fileUrls) {
        if (fileUrl.match(/\.(png|jpg|jpeg|gif)/i) || fileUrl.includes('/assets/')) {
            const dest = path.join(projectDir, 'screenshot' + imgExt);
            await downloadFile(fileUrl, dest);
            screenshotPath = `projects/${party}/${slug}/screenshot${imgExt}`;
        } else if (fileUrl.match(/\.zip/i) || fileUrl.includes('/files/')) {
            const dest = path.join(projectDir, 'project.zip');
            await downloadFile(fileUrl, dest);
            projectZipPath = `projects/${party}/${slug}/project.zip`;
        }
    }

    const projectsFile = path.join(__dirname, '../../projects.json');
    let projects = [];
    if (fs.existsSync(projectsFile)) {
        projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
    }

    const newProject = {
        id: Date.now(),
        title,
        author,
        authorLink: authorLink === 'N/A' ? '' : authorLink,
        party,
        description,
        screenshot: screenshotPath,
        url: type === 'upload' && projectZipPath ? projectZipPath : url,
        type
    };

    projects.unshift(newProject);
    fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 4));
    console.log("Project processed and added to projects.json");
})();
