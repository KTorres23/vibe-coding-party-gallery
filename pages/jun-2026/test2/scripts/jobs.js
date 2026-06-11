// jobs.js
// Fetches job postings from the local Flask API and renders each as a styled card

// Use option 3: request a larger pagesize (100) from the backend by default
const JOBS_API_URL = 'http://localhost:5000/api/jobs?pagesize=100';

async function fetchJobs() {
    const loading = document.getElementById('loading');
    const jobsList = document.getElementById('jobs-list');
    loading.style.display = 'block';
    jobsList.innerHTML = '';

    try {
        const response = await fetch(JOBS_API_URL);
        if (!response.ok) {
            // try to read JSON error details from the backend
            try {
                const errJson = await response.json();
                throw new Error(errJson.error || JSON.stringify(errJson));
            } catch (e) {
                throw new Error(`Network response was not ok (status ${response.status})`);
            }
        }

        const jobs = await response.json();

        if (!Array.isArray(jobs) || jobs.length === 0) {
            jobsList.innerHTML = '<p>No jobs found.</p>';
            return;
        }

        // create a grid container for the job cards
        const grid = document.createElement('div');
        grid.className = 'jobs-grid';

        jobs.forEach(job => {
            const card = document.createElement('article');
            card.className = 'job-card';

            const h3 = document.createElement('h3');
            const a = document.createElement('a');
            a.href = job.link || '#';
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = job.title || 'No title';
            h3.appendChild(a);

            const loc = document.createElement('div');
            loc.className = 'job-location';
            loc.textContent = job.location || '';

            const desc = document.createElement('p');
            desc.className = 'job-description';
            desc.textContent = job.description || '';

            const footer = document.createElement('div');
            footer.className = 'job-footer';
            const viewLink = document.createElement('a');
            viewLink.href = job.link || '#';
            viewLink.target = '_blank';
            viewLink.rel = 'noopener';
            viewLink.className = 'job-apply';
            viewLink.textContent = 'View posting';
            footer.appendChild(viewLink);

            card.appendChild(h3);
            if (loc.textContent) card.appendChild(loc);
            card.appendChild(desc);
            card.appendChild(footer);

            grid.appendChild(card);
        });

        jobsList.appendChild(grid);

    } catch (error) {
        jobsList.innerHTML = `<p>Could not load jobs. ${error && error.message ? error.message : ''} <br/>Is your backend running?</p>`;
    } finally {
        loading.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', fetchJobs);