'use strict';

const defaultKeywordsRegexp = '.{3,}.(JWT|expireAt).*';
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({keywords: [defaultKeywordsRegexp]});
    // for synced across devices storage should be used next:
    // chrome.storage.sync.set({keywords: [defaultKeywordsRegexp]});
});
