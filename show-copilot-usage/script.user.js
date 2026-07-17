// ==UserScript==
// @name         GitHub Copilot Quota Overlay
// @namespace    https://github.com/PeterChen-eaton/userscripts/blob/main/show-copilot-usage
// @version      2026.07.17
// @description  Show Copilot quota on any GitHub page and refresh every 5 minutes.
// @author       Peter
// @match        https://github.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    if (window.__tmCopilotQuotaOverlayInitialized) {
        return;
    }
    window.__tmCopilotQuotaOverlayInitialized = true;

    const API_URL = 'https://github.com/github-copilot/chat/entitlement';
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
    const STORAGE_KEY = 'copilotQuotaOverlayCacheV2';
    const WIDGET_ID = 'tm-copilot-quota-overlay';

    const state = {
        data: null,
        updatedAt: 0,
        stale: false,
        loading: true,
        error: ''
    };

    let lastFetchAt = 0;

    function formatCount(value) {
        return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US') : '-';
    }

    function formatMoney(value) {
        return typeof value === 'number' && Number.isFinite(value) ? '$' + value.toFixed(2) : '-';
    }

    function formatPercent(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return '-';
        }
        return value.toFixed(1) + '%';
    }

    function formatUpdatedTime(ts) {
        if (!ts) {
            return '--:--';
        }
        const date = new Date(ts);
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return hh + ':' + mm;
    }

    function formatResetDate(data) {
        if (data && data.resetDate) {
            return data.resetDate;
        }
        if (data && data.resetDateUtc) {
            return String(data.resetDateUtc).slice(0, 10);
        }
        return '-';
    }

    function loadCache() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                return null;
            }
            if (!parsed.data || typeof parsed.updatedAt !== 'number') {
                return null;
            }
            return parsed;
        } catch (_) {
            return null;
        }
    }

    function saveCache(data, updatedAt) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, updatedAt }));
        } catch (_) {
            // Ignore storage failures and keep runtime state only.
        }
    }

    function firstFiniteNumber(values) {
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
        }
        return null;
    }

    function normalizeQuotaPayload(payload) {
        const quotas = payload && payload.quotas;
        if (!quotas || typeof quotas !== 'object') {
            throw new Error('Missing quotas in response');
        }

        // Token-based billing (rolled out 2026-06) exposes per-feature *Quota
        // objects; fall back to the legacy limits/remaining shape for resilience.
        const limits = quotas.limits || {};
        const remaining = quotas.remaining || {};
        const premiumQuota = quotas.premiumInteractionsQuota || {};
        const chatQuota = quotas.chatQuota || {};
        const completionsQuota = quotas.completionsQuota || {};
        const overageQuota = quotas.overageQuota || {};

        const premiumTotal = firstFiniteNumber([premiumQuota.total, limits.premiumInteractions]);

        const derivedUsed = (typeof limits.premiumInteractions === 'number' &&
            typeof remaining.premiumInteractions === 'number')
            ? limits.premiumInteractions - remaining.premiumInteractions
            : null;
        const premiumUsed = firstFiniteNumber([premiumQuota.used, derivedUsed]);

        const premiumPercentRemaining = firstFiniteNumber([
            premiumQuota.percentRemaining,
            remaining.premiumInteractionsPercentage
        ]);

        const premiumUnlimited = premiumQuota.unlimited === true;

        if (!premiumUnlimited && premiumTotal === null && premiumPercentRemaining === null) {
            throw new Error('Missing premium quota fields in response');
        }

        return {
            premiumTotal: premiumTotal,
            premiumUsed: premiumUsed,
            premiumPercentRemaining: premiumPercentRemaining,
            premiumUnlimited: premiumUnlimited,
            chatUnlimited: chatQuota.unlimited === true,
            completionsUnlimited: completionsQuota.unlimited === true,
            overagesEnabled: quotas.overagesEnabled === true,
            overageSpend: firstFiniteNumber([overageQuota.spend]),
            overageBudget: firstFiniteNumber([overageQuota.budget]),
            tokenBasedBilling: quotas.tokenBasedBillingEnabled === true,
            resetDate: quotas.resetDate || null,
            resetDateUtc: quotas.resetDateUtc || null
        };
    }

    async function fetchQuota() {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            credentials: 'include',
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error('Request failed: ' + response.status);
        }

        const payload = await response.json();
        return normalizeQuotaPayload(payload);
    }

    function setupHoverMove(widget) {
        let onLeft = false;
        let timer = null;

        widget.addEventListener('mouseenter', () => {
            if (onLeft) {
                // Already on left side, move back to right
                clearTimeout(timer);
                widget.style.right = '12px';
                widget.style.left = '';
                onLeft = false;
            } else {
                // On right side, move to left
                widget.style.right = '';
                widget.style.left = '12px';
                onLeft = true;
            }

            // Auto-return to right side after 8 seconds
            timer = setTimeout(() => {
                if (onLeft) {
                    widget.style.left = '';
                    widget.style.right = '12px';
                    onLeft = false;
                }
            }, 8000);
        });
    }

    function getWidget() {
        let widget = document.getElementById(WIDGET_ID);
        if (!widget) {
            widget = document.createElement('div');
            widget.id = WIDGET_ID;
            widget.style.position = 'fixed';
            widget.style.right = '12px';
            widget.style.zIndex = '9999';
            widget.style.width = 'min(260px, calc(100vw - 24px))';
            widget.style.padding = '8px 10px';
            widget.style.borderRadius = '10px';
            widget.style.border = '1px solid rgba(240, 246, 252, 0.14)';
            widget.style.background = 'linear-gradient(165deg, rgba(22, 27, 34, 0.72), rgba(48, 54, 61, 0.52))';
            widget.style.backdropFilter = 'blur(7px)';
            widget.style.boxShadow = '0 8px 22px rgba(1, 4, 9, 0.28)';
            widget.style.color = 'rgba(230, 237, 243, 0.82)';
            widget.style.fontSize = '12px';
            widget.style.lineHeight = '1.32';
            widget.style.fontFamily = 'IBM Plex Sans, Noto Sans SC, Segoe UI, sans-serif';
            widget.style.pointerEvents = 'auto';
            widget.style.userSelect = 'none';
            widget.style.letterSpacing = '0.1px';
            widget.style.transition = 'left 0.28s ease, right 0.28s ease';

            document.body.appendChild(widget);
            setupHoverMove(widget);
        }
        return widget;
    }

    function getTopOffset() {
        const header = document.querySelector('header[role="banner"], .Header, #header');
        if (!header) {
            return 64;
        }
        const rect = header.getBoundingClientRect();
        const bottom = Math.max(rect.bottom, header.offsetHeight || 0);
        return Math.max(48, Math.round(bottom) + 8);
    }

    function updateWidgetPosition() {
        const widget = getWidget();
        widget.style.top = getTopOffset() + 'px';
    }

    function render() {
        const widget = getWidget();
        updateWidgetPosition();

        if (state.loading && !state.data) {
            widget.innerHTML = [
                '<div style="font-weight: 600; opacity: 0.9; margin-bottom: 4px;">Copilot Quota</div>',
                '<div style="opacity: 0.72;">Loading...</div>'
            ].join('');
            return;
        }

        if (!state.data) {
            widget.innerHTML = [
                '<div style="font-weight: 600; opacity: 0.9; margin-bottom: 4px;">Copilot Quota</div>',
                '<div style="opacity: 0.72;">Unavailable</div>'
            ].join('');
            return;
        }

        const staleBadge = state.stale
            ? '<span style="padding: 1px 5px; border-radius: 999px; background: rgba(255, 200, 120, 0.18); color: rgba(255, 218, 161, 0.9); font-size: 10px;">stale</span>'
            : '<span style="padding: 1px 5px; border-radius: 999px; background: rgba(110, 180, 130, 0.17); color: rgba(176, 232, 190, 0.86); font-size: 10px;">live</span>';

        // Premium is the only depletable budget; under token-based billing the
        // percentage left is the headline metric, raw used/total is context.
        const premiumLine = state.data.premiumUnlimited
            ? 'Premium: unlimited'
            : 'Premium: ' + formatPercent(state.data.premiumPercentRemaining) + ' left' +
                (typeof state.data.premiumTotal === 'number'
                    ? ' (' + formatCount(state.data.premiumUsed) + ' / ' + formatCount(state.data.premiumTotal) + ')'
                    : '');

        const rows = ['<div style="opacity: 0.84; white-space: nowrap;">' + premiumLine + '</div>'];

        if (typeof state.data.overageSpend === 'number' && state.data.overageSpend > 0) {
            rows.push('<div style="opacity: 0.8; margin-top: 2px;">Overage: ' + formatMoney(state.data.overageSpend) + ' spent</div>');
        }

        rows.push('<div style="opacity: 0.8; margin-top: 2px;">Reset: ' + formatResetDate(state.data) + '</div>');
        rows.push('<div style="opacity: 0.58; margin-top: 4px; font-size: 10px;">Updated ' + formatUpdatedTime(state.updatedAt) + '</div>');

        widget.innerHTML = [
            '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">',
            '<span style="font-weight: 600; opacity: 0.9;">Copilot Quota</span>',
            staleBadge,
            '</div>'
        ].concat(rows).join('');
    }

    async function refreshQuota() {
        state.loading = true;
        render();

        try {
            const quotaData = await fetchQuota();
            state.data = quotaData;
            state.updatedAt = Date.now();
            state.stale = false;
            state.error = '';
            saveCache(quotaData, state.updatedAt);
        } catch (error) {
            state.error = error && error.message ? error.message : 'Unknown error';

            if (!state.data) {
                const cached = loadCache();
                if (cached) {
                    state.data = cached.data;
                    state.updatedAt = cached.updatedAt;
                }
            }

            if (state.data) {
                state.stale = true;
            }
        } finally {
            state.loading = false;
            lastFetchAt = Date.now();
            render();
        }
    }

    function setupVisibilityRefresh() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                return;
            }
            if (Date.now() - lastFetchAt >= REFRESH_INTERVAL_MS) {
                refreshQuota();
            }
        });
    }

    function setupNavigationAwarePositioning() {
        window.addEventListener('resize', updateWidgetPosition);
        document.addEventListener('turbo:render', updateWidgetPosition);
        document.addEventListener('pjax:end', updateWidgetPosition);

        // GitHub updates parts of the header on navigation; periodic correction keeps the widget aligned.
        setInterval(updateWidgetPosition, 2500);
    }

    function init() {
        const cached = loadCache();
        if (cached) {
            state.data = cached.data;
            state.updatedAt = cached.updatedAt;
            state.stale = true;
            state.loading = false;
        }

        render();
        refreshQuota();
        setInterval(refreshQuota, REFRESH_INTERVAL_MS);
        setupVisibilityRefresh();
        setupNavigationAwarePositioning();
    }

    init();
})();
