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
const fileRegex = /(https:\/\/(?:github\.com|githubusercontent\.com)[^\s\)]+)/g;
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

const { execSync } = require('child_process');

(async () => {
    let imgExt = '.png';
    let localZipDest = '';
    
    for (const fileUrl of fileUrls) {
        if (fileUrl.match(/\.(png|jpg|jpeg|gif)/i) || fileUrl.includes('/assets/')) {
            const dest = path.join(projectDir, 'screenshot' + imgExt);
            await downloadFile(fileUrl, dest);
            screenshotPath = `projects/${party}/${slug}/screenshot${imgExt}`;
        } else if (fileUrl.match(/\.zip/i) || fileUrl.includes('/files/')) {
            localZipDest = path.join(projectDir, 'project.zip');
            await downloadFile(fileUrl, localZipDest);
        }
    }

    let finalType = type;
    let finalUrl = url;

    // Intelligent ZIP extraction logic
    if (type === 'upload' && localZipDest && fs.existsSync(localZipDest)) {
        try {
            // Check if zip contains an HTML file
            const zipList = execSync(`unzip -l "${localZipDest}"`).toString();
            if (zipList.match(/\.html(\s|$)/i)) {
                // It's a hosted project!
                finalType = 'hosted';
                const pagesDir = path.join(__dirname, '../../pages', party, slug);
                if (!fs.existsSync(pagesDir)) {
                    fs.mkdirSync(pagesDir, { recursive: true });
                }
                
                // Extract to pages folder
                execSync(`unzip -o "${localZipDest}" -d "${pagesDir}"`);
                
                // Remove the zip file from projects dir to keep repo tidy
                fs.unlinkSync(localZipDest);

                // Find the primary HTML file
                const extractOutput = execSync(`find "${pagesDir}" -name "*.html"`).toString().split('\n').filter(Boolean);
                const indexFile = extractOutput.find(f => f.toLowerCase().endsWith('index.html')) || extractOutput[0];
                
                // Convert absolute path to relative URL for GitHub Pages
                finalUrl = indexFile.replace(path.join(__dirname, '../../'), '').replace(/\\/g, '/');
                if (finalUrl.startsWith('/')) finalUrl = finalUrl.substring(1); // remove leading slash
            } else {
                // Source code only
                finalType = 'download';
                finalUrl = `projects/${party}/${slug}/project.zip`;
            }
        } catch (e) {
            console.error("Error processing zip:", e);
            finalType = 'download';
            finalUrl = `projects/${party}/${slug}/project.zip`;
        }
    } else if (type === 'upload') {
        // Fallback if no zip was found
        finalType = 'download';
        finalUrl = '#';
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
        url: finalUrl,
        type: finalType
    };

    projects.unshift(newProject);
    fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 4));
    console.log("Project processed and added to projects.json");
})();
