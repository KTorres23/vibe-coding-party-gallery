from flask import Flask, jsonify, request
import requests
from bs4 import BeautifulSoup
from flask_cors import CORS
import re

app = Flask(__name__)
# Allow cross-origin requests to /api/* so the front-end can fetch from a different origin during development
CORS(app, resources={r"/api/*": {"origins": "*"}})

JOBS_URL = "https://jobs.rwfm.tamu.edu/search/"


@app.route('/api/jobs')
def get_jobs():
    # allow caller to request a larger pagesize (site caps at ~100) and optionally limit results
    try:
        pagesize = int(request.args.get('pagesize', 100))
    except Exception:
        pagesize = 100
    try:
        max_results = int(request.args.get('max', 0))
    except Exception:
        max_results = 0

    # fetch upstream with a user agent and simple timeout. pass pagesize as query param.
    try:
        headers = {'User-Agent': 'ecology-vibe-coding/1.0 (+https://github.com/KTorres23)'}
        params = {'pagesize': pagesize} if pagesize else {}
        resp = requests.get(JOBS_URL, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        # return a clear JSON error and 502 so the front-end can surface the issue
        return jsonify({'error': 'failed to fetch upstream jobs', 'details': str(e)}), 502

    soup = BeautifulSoup(resp.text, 'html.parser')
    jobs = []
    # The job board uses 'View' links to individual jobs; find those and extract surrounding info.
    seen = set()
    for a in soup.find_all('a', href=re.compile(r'view-job')):
        href = a.get('href')
        if not href:
            continue
        # normalize to absolute URL
        if href.startswith('//'):
            link_url = 'https:' + href
        elif href.startswith('/'):
            link_url = 'https://jobs.rwfm.tamu.edu' + href
        elif href.startswith('http'):
            link_url = href
        else:
            link_url = 'https://jobs.rwfm.tamu.edu/' + href

        if link_url in seen:
            continue
        seen.add(link_url)

        # Walk up the DOM a few levels to find a nearby heading/title and descriptive text
        title = None
        location = ''
        description = ''
        parent = a
        for _ in range(5):
            parent = parent.parent
            if parent is None:
                break
            # prefer heading tags
            heading = parent.find(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
            if heading:
                title = heading.get_text(strip=True)
                break

        if not title:
            prev_heading = a.find_previous(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
            if prev_heading:
                title = prev_heading.get_text(strip=True)

        # try to extract 'Location: ...' from the nearest container text
        container = parent or a
        text = container.get_text(" ", strip=True)
        m = re.search(r'Location[:\s]+([^\[]+?)(?:\s{2,}|\s*\[|$)', text)
        if m:
            location = m.group(1).strip()

        # description: first paragraph or a short snippet nearby
        p = container.find('p')
        if p:
            description = p.get_text(strip=True)
        else:
            # fallback: take a substring of the container text (avoid repeating title)
            snippet = text.replace(title or '', '').strip()
            description = snippet[:300].strip()

        jobs.append({
            'title': title or 'No title',
            'link': link_url,
            'location': location,
            'description': description
        })
        # if caller requested a maximum number of results, stop early
        if max_results and len(jobs) >= max_results:
            break
    return jsonify(jobs)


if __name__ == '__main__':
    app.run(debug=True)
