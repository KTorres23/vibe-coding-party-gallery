#!/usr/bin/env python3
"""
export_jobs_xml.py

Scrape the Texas A&M Natural Resources Job Board and save all job postings to an XML file.

Pagination: uses PageSize and PageNum query parameters as requested, e.g.
  https://jobs.rwfm.tamu.edu/search/?PageSize=500&PageNum=1#results

Usage:
  python scripts/export_jobs_xml.py --output ../jobs.xml --pagesize 500

By default this requests pages with PageSize=500 and iterates PageNum=1..N until
no new jobs are found.
"""
import argparse
import time
import re
import sys
from urllib.parse import urljoin, urlparse, parse_qs

import requests
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET


JOBS_URL = "https://jobs.rwfm.tamu.edu/search/"


def normalize_link(href: str) -> str:
    if not href:
        return ''
    href = href.strip()
    if href.startswith('//'):
        return 'https:' + href
    if href.startswith('/'):
        return urljoin('https://jobs.rwfm.tamu.edu', href)
    if href.startswith('http'):
        return href
    return urljoin('https://jobs.rwfm.tamu.edu/', href)


def extract_jobs_from_soup(soup):
    """Return a list of job dicts found on the page soup."""
    jobs = []
    seen = set()
    for a in soup.find_all('a', href=re.compile(r'view-job')):
        href = a.get('href')
        if not href:
            continue
        link = normalize_link(href)
        if link in seen:
            continue
        seen.add(link)

        # Walk up to find a containing block and a heading
        title = None
        parent = a
        for _ in range(6):
            parent = getattr(parent, 'parent', None)
            if parent is None:
                break
            heading = parent.find(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
            if heading:
                title = heading.get_text(strip=True)
                break

        if not title:
            prev_h = a.find_previous(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
            if prev_h:
                title = prev_h.get_text(strip=True)

        # Container text to use for extracting location/description
        container = parent or a
        text = container.get_text(" ", strip=True)

        # Try to extract Location: ... (best-effort)
        location = ''
        m = re.search(r'Location[:\s]+([^\[]+?)(?:\s{2,}|\s*\[|$)', text)
        if m:
            location = m.group(1).strip()

        # Description: prefer first paragraph in the container
        description = ''
        p = container.find('p')
        if p:
            description = p.get_text(strip=True)
        else:
            snippet = text.replace(title or '', '').strip()
            description = snippet[:600].strip()

        # Attempt to extract a numeric id from the link query params (if present)
        job_id = ''
        try:
            parsed = urlparse(link)
            q = parse_qs(parsed.query)
            if 'id' in q:
                job_id = q['id'][0]
        except Exception:
            job_id = ''

        jobs.append({
            'id': job_id,
            'title': title or '',
            'link': link,
            'location': location,
            'description': description,
        })

    return jobs


def fetch_full_description(link, headers=None, timeout=15):
    """Fetch the job detail page and return a best-effort full description text.

    This tries to pick the largest meaningful text container on the page (article/section/div/main)
    which usually holds the job posting details.
    """
    if not link:
        return ''
    headers = headers or {'User-Agent': 'ecology-vibe-exporter/1.0 (+https://github.com/KTorres23)'}
    try:
        resp = requests.get(link, headers=headers, timeout=timeout)
        resp.raise_for_status()
    except Exception:
        return ''

    soup = BeautifulSoup(resp.text, 'html.parser')

    # Prefer obvious containers first
    selectors = ['article', 'section', 'main']
    best_text = ''
    # check specific common classes first
    for sel in selectors:
        for el in soup.find_all(sel):
            text = el.get_text('\n\n', strip=True)
            if len(text) > len(best_text):
                best_text = text

    # consider large divs as fallback
    for div in soup.find_all('div'):
        # skip tiny divs
        text = div.get_text('\n\n', strip=True)
        if len(text) > len(best_text) and len(text) > 200:
            # avoid footer-like content
            cl = ' '.join(div.get('class') or [])
            if 'footer' in cl.lower() or 'nav' in cl.lower():
                continue
            best_text = text

    # final fallback: body text
    if not best_text:
        best_text = soup.get_text('\n\n', strip=True)

    # normalize whitespace a bit
    best_text = re.sub(r"\n{3,}", '\n\n', best_text)
    return best_text.strip()


def scrape_all_jobs(pagesize=100, sleep=0.6, max_pages=0, verbose=True, fetch_details=True, detail_sleep=0.2, timeout=15):
    """Paginate through the job board and return a list of job dicts.

    pagesize: number of results per page (PageSize param). The site supports large values; use 500 as requested.
    sleep: seconds to wait between page requests.
    max_pages: if >0 stop after this many pages.
    """
    headers = {
        'User-Agent': 'ecology-vibe-exporter/1.0 (+https://github.com/KTorres23)'
    }
    all_jobs = []
    seen_links = set()
    page = 1
    while True:
        params = {'PageSize': pagesize, 'PageNum': page}
        if verbose:
            print(f'Fetching page {page} (PageSize={pagesize})...')
        try:
            resp = requests.get(JOBS_URL, params=params, headers=headers, timeout=15)
            resp.raise_for_status()
        except Exception as exc:
            print(f'Error fetching page {page}: {exc}', file=sys.stderr)
            break

        soup = BeautifulSoup(resp.text, 'html.parser')
        jobs = extract_jobs_from_soup(soup)

        # Filter duplicates by link
        new_count = 0
        for j in jobs:
            if j['link'] in seen_links:
                continue
            seen_links.add(j['link'])

            # Optionally fetch the full job detail page to get the complete description
            if fetch_details:
                full_desc = fetch_full_description(j['link'], headers=headers, timeout=timeout)
                if full_desc:
                    j['description'] = full_desc
                # be polite to the server between detail requests
                time.sleep(detail_sleep)

            all_jobs.append(j)
            new_count += 1

        if verbose:
            print(f'  Found {len(jobs)} jobs on page, {new_count} new (total {len(all_jobs)})')

        # Stop if this page yielded no jobs or no new jobs
        if not jobs or new_count == 0:
            if verbose:
                print('No more new jobs found; stopping.')
            break

        page += 1
        if max_pages and page > max_pages:
            if verbose:
                print(f'Reached max_pages={max_pages}; stopping.')
            break

        time.sleep(sleep)

    return all_jobs


def write_jobs_to_xml(jobs, outpath):
    root = ET.Element('jobs')
    for j in jobs:
        job_el = ET.SubElement(root, 'job')
        if j.get('id'):
            job_el.set('id', str(j['id']))

        title_el = ET.SubElement(job_el, 'title')
        title_el.text = j.get('title') or ''

        link_el = ET.SubElement(job_el, 'link')
        link_el.text = j.get('link') or ''

        loc_el = ET.SubElement(job_el, 'location')
        loc_el.text = j.get('location') or ''

        desc_el = ET.SubElement(job_el, 'description')
        desc_el.text = j.get('description') or ''

    tree = ET.ElementTree(root)
    # write with XML declaration and UTF-8 encoding
    tree.write(outpath, encoding='utf-8', xml_declaration=True)


def main():
    parser = argparse.ArgumentParser(description='Export jobs from jobs.rwfm.tamu.edu to XML')
    parser.add_argument('--pagesize', type=int, default=100, help='PageSize to request per page (default: 100)')
    parser.add_argument('--output', '-o', default='jobs.xml', help='Output XML file path')
    parser.add_argument('--sleep', type=float, default=0.6, help='Seconds to sleep between page requests')
    parser.add_argument('--max-pages', type=int, default=0, help='Optional limit on number of pages to fetch (0 = unlimited)')
    parser.add_argument('--quiet', action='store_true', help='Reduce output')
    parser.add_argument('--no-details', action='store_true', help='Do not fetch individual job detail pages (faster)')
    parser.add_argument('--detail-sleep', type=float, default=0.2, help='Seconds to sleep between detail page requests')
    parser.add_argument('--detail-timeout', type=float, default=15, help='Timeout seconds for detail page requests')

    args = parser.parse_args()

    jobs = scrape_all_jobs(
        pagesize=args.pagesize,
        sleep=args.sleep,
        max_pages=args.max_pages,
        verbose=not args.quiet,
        fetch_details=not args.no_details,
        detail_sleep=args.detail_sleep,
        timeout=args.detail_timeout,
    )
    print(f'Writing {len(jobs)} jobs to {args.output}...')
    write_jobs_to_xml(jobs, args.output)
    print('Done.')


if __name__ == '__main__':
    main()
