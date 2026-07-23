const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

let yaml;
try {
    yaml = require('js-yaml');
} catch (e) {
    console.log("js-yaml package not found, using fallback parser.");
}

const issueTitle = process.env.ISSUE_TITLE || '';
const issueBody = process.env.ISSUE_BODY || '';

if (!issueBody) {
    console.error("No issue body provided.");
    process.exit(1);
}

function extractValue(regex, defaultValue = '') {
    const match = issueBody.match(regex);
    return match ? match[1].trim() : defaultValue;
}

const isResourceSubmission = issueTitle.startsWith('[Resource]');

if (isResourceSubmission) {
    // Process Resource Submission
    const title = extractValue(/\*\*Resource Title\*\*: (.*)/) || extractValue(/\*\*Title\*\*: (.*)/) || 'Untitled Resource';
    const author = extractValue(/\*\*Submitted By\*\*: (.*)/) || extractValue(/\*\*Author\*\*: (.*)/) || 'Community Contributor';
    const category = extractValue(/\*\*Category\*\*: (.*)/) || 'community';
    const url = extractValue(/\*\*URL\*\*: (.*)/) || '#';
    const tagsRaw = extractValue(/\*\*Tags\*\*: (.*)/);
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : ['Resource'];

    const descriptionMatch = issueBody.match(/### Description\n([\s\S]*?)(?:\n---|$)/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : 'No description provided.';

    const resourcesFile = path.join(__dirname, '../../resources.yaml');
    let resources = [];

    if (fs.existsSync(resourcesFile)) {
        if (yaml) {
            resources = yaml.load(fs.readFileSync(resourcesFile, 'utf8')) || [];
        } else {
            console.log("Reading raw resources.yaml...");
        }
    }

    const newResource = {
        id: Date.now(),
        category,
        categoryName: category,
        title,
        author,
        url,
        description,
        tags
    };

    resources.unshift(newResource);

    if (yaml) {
        fs.writeFileSync(resourcesFile, yaml.dump(resources));
    }
    console.log("Resource successfully processed and added to resources.yaml");
} else {
    // Process Project Submission
    const title = extractValue(/\*\*Title\*\*: (.*)/) || 'Untitled Project';
    const author = extractValue(/\*\*Author\*\*: (.*)/) || 'Unknown Author';
    const authorLink = extractValue(/\*\*Author Link\*\*: (.*)/);
    const sourceType = extractValue(/\*\*Source Type\*\*: (.*)/) || 'party';
    const party = extractValue(/\*\*Party\*\*: (.*)/) || 'other';
    const type = extractValue(/\*\*Type\*\*: (.*)/) || 'upload';
    const url = extractValue(/\*\*URL\*\*: (.*)/) || '#';

    const descriptionMatch = issueBody.match(/### Description\n([\s\S]*?)(?:\n---|$)/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';

    // File download handling
    const fileUrls = [];
    const fileRegex = /(https:\/\/(?:github\.com|githubusercontent\.com)[^\s\)]+)/g;
    let match;
    while ((match = fileRegex.exec(issueBody)) !== null) {
        // Strip trailing quotes, markdown brackets, or spaces
        const cleanUrl = match[1].replace(/["'\)\>\]]+$/, '');
        fileUrls.push(cleanUrl);
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
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                }
            };
            https.get(fileUrl, options, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
                }
                if (res.statusCode !== 200) {
                    return reject(new Error(`Failed to download ${fileUrl}: HTTP ${res.statusCode}`));
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
        let localZipDest = '';
        
        for (const fileUrl of fileUrls) {
            const isImage = fileUrl.match(/\.(png|jpg|jpeg|gif|webp)/i) || 
                            fileUrl.includes('/assets/') || 
                            fileUrl.includes('/user-attachments/') || 
                            fileUrl.includes('githubusercontent.com');
            const isZip = fileUrl.match(/\.zip/i) || fileUrl.includes('/files/');

            if (isImage && !isZip) {
                const extMatch = fileUrl.match(/\.(png|jpg|jpeg|gif|webp)/i);
                imgExt = extMatch ? extMatch[0].toLowerCase() : '.png';
                const dest = path.join(projectDir, 'screenshot' + imgExt);
                try {
                    await downloadFile(fileUrl, dest);
                    // Validation: Check if downloaded file is an HTML error page rather than a real image
                    const fileHeader = fs.readFileSync(dest, 'utf8', { flag: 'r' }).slice(0, 100);
                    if (fileHeader.includes('<!DOCTYPE') || fileHeader.includes('<html')) {
                        console.warn("Downloaded URL returned HTML page instead of raw image data, removing invalid screenshot.");
                        if (fs.existsSync(dest)) fs.unlinkSync(dest);
                        screenshotPath = '';
                    } else {
                        screenshotPath = `projects/${party}/${slug}/screenshot${imgExt}`;
                    }
                } catch (downloadErr) {
                    console.warn("Could not download screenshot:", downloadErr.message);
                    if (fs.existsSync(dest)) fs.unlinkSync(dest);
                    screenshotPath = '';
                }
            } else if (isZip) {
                localZipDest = path.join(projectDir, 'project.zip');
                try {
                    await downloadFile(fileUrl, localZipDest);
                } catch (downloadErr) {
                    console.warn("Could not download zip file:", downloadErr.message);
                }
            }
        }

        let finalType = type;
        let finalUrl = url;

        if (type === 'upload' && localZipDest && fs.existsSync(localZipDest)) {
            try {
                const zipList = execSync(`unzip -l "${localZipDest}"`).toString();
                if (zipList.match(/\.html(\s|$)/i)) {
                    finalType = 'hosted';
                    const pagesDir = path.join(__dirname, '../../pages', party, slug);
                    if (!fs.existsSync(pagesDir)) {
                        fs.mkdirSync(pagesDir, { recursive: true });
                    }
                    execSync(`unzip -o "${localZipDest}" -d "${pagesDir}"`);
                    execSync(`chmod -R 777 "${pagesDir}"`);
                    try {
                        execSync(`find "${pagesDir}" -name ".git" -type d -exec rm -rf {} +`);
                    } catch(e) {}
                    
                    fs.unlinkSync(localZipDest);
                    const extractOutput = execSync(`find "${pagesDir}" -name "*.html"`).toString().split('\n').filter(Boolean);
                    const indexFile = extractOutput.find(f => f.toLowerCase().endsWith('index.html')) || extractOutput[0];
                    finalUrl = indexFile.replace(path.join(__dirname, '../../'), '').replace(/\\/g, '/');
                    if (finalUrl.startsWith('/')) finalUrl = finalUrl.substring(1);
                } else {
                    finalType = 'download';
                    finalUrl = `projects/${party}/${slug}/project.zip`;
                }
            } catch (e) {
                console.error("Error processing zip:", e);
                finalType = 'download';
                finalUrl = `projects/${party}/${slug}/project.zip`;
            }
        }

        const newProject = {
            id: Date.now(),
            title,
            author,
            authorLink: authorLink === 'N/A' ? '' : authorLink,
            sourceType,
            party,
            year: new Date().getFullYear(),
            description,
            screenshot: screenshotPath,
            url: finalUrl,
            type: finalType,
            tags: ["Vibe Coded", "Ecology"]
        };

        // Update projects.yaml
        const projectsFileYaml = path.join(__dirname, '../../projects.yaml');
        let projectsYamlList = [];
        if (fs.existsSync(projectsFileYaml) && yaml) {
            projectsYamlList = yaml.load(fs.readFileSync(projectsFileYaml, 'utf8')) || [];
        }
        projectsYamlList.unshift(newProject);
        if (yaml) {
            fs.writeFileSync(projectsFileYaml, yaml.dump(projectsYamlList));
        }

        // Also update projects.json for backwards compatibility
        const projectsFileJson = path.join(__dirname, '../../projects.json');
        let projectsJsonList = [];
        if (fs.existsSync(projectsFileJson)) {
            projectsJsonList = JSON.parse(fs.readFileSync(projectsFileJson, 'utf8'));
        }
        projectsJsonList.unshift(newProject);
        fs.writeFileSync(projectsFileJson, JSON.stringify(projectsJsonList, null, 4));

        console.log("Project processed and saved to projects.yaml and projects.json");
    })();
}
