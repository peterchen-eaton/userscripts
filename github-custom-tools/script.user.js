// ==UserScript==
// @name         GitHub Custom Tools
// @namespace    https://github.com/PeterChen-eaton/userscripts/blob/main/github-custom-tools
// @version      2026.06.17
// @description  GitHub Custom Tools
// @author       Peter
// @match        https://github.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // The <ul> whose repos have already been sorted. Sorting runs only once per
    // list; it re-runs only if GitHub replaces the list with a new element
    // (e.g. SPA navigation back to the dashboard).
    let sortedList = null;

    function widenSidebar() {
        const sidebar = document.querySelector('.feed-left-sidebar');
        if (sidebar && sidebar.style.minWidth !== '375px') {
            sidebar.style.minWidth = '375px';
        }
    }

    function autoFollowSso() {
        // SSO banner on the dashboard
        const ssoBanner = Array.from(document.querySelectorAll('section')).find(s => {
            return Array.from(s.classList).some(c => c.startsWith('GlobalSSOBanner'));
        });
        if (ssoBanner) {
            ssoBanner.querySelectorAll('a').forEach(a => {
                if (a.href.includes('sso')) {
                    a.click();
                }
            });
        }

        // SSO continue page
        const ssoContinue = document.querySelector('.org-sso button.btn');
        if (ssoContinue) {
            ssoContinue.click();
        }
    }

    function sortRepos() {
        const ul = document.querySelector('.js-dashboard-repos-list');
        if (!ul || ul === sortedList) {
            return; // list not present yet, or this exact list is already sorted
        }

        // Expand the full list first; only sort once everything is loaded so that
        // repos pulled in by "Show more" are included in the ordering.
        const moreBtn = document.querySelector('.js-more-repos-form button');
        if (moreBtn) {
            moreBtn.click();
            return; // the observer fires again when the new repos arrive
        }

        const items = Array.from(ul.querySelectorAll('li'));
        if (items.length === 0) {
            return;
        }

        const userLogin = (document.querySelector('meta[name="user-login"]') || {}).content || '';
        const personalPrefix = ('/' + userLogin + '/').toLowerCase();

        items.sort((a, b) => {
            const aLink = a.querySelector('a');
            const bLink = b.querySelector('a');
            const aHref = (aLink ? aLink.getAttribute('href') || '' : '').toLowerCase();
            const bHref = (bLink ? bLink.getAttribute('href') || '' : '').toLowerCase();
            const aPersonal = userLogin && aHref.startsWith(personalPrefix) ? 0 : 1;
            const bPersonal = userLogin && bHref.startsWith(personalPrefix) ? 0 : 1;
            if (aPersonal !== bPersonal) {
                return aPersonal - bPersonal;
            }
            return aHref.localeCompare(bHref);
        });

        items.forEach(li => ul.appendChild(li));
        sortedList = ul; // mark as done; won't re-sort unless the list is replaced
    }

    function run() {
        widenSidebar();
        autoFollowSso();
        sortRepos();
    }

    // React to DOM changes instead of polling on a timer. This handles content
    // that appears late on slow networks, and stays idle when nothing changes.
    // Mutations are coalesced with requestAnimationFrame so a burst of changes
    // triggers at most one pass per frame.
    let scheduled = false;
    const observer = new MutationObserver(() => {
        if (scheduled) {
            return;
        }
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            run();
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Handle content that is already present when the script runs.
    run();
})();
