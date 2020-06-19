// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
/* global chrome */

let monitoredKeys = [];
let currentLocalStorage = [];
let currentLocalhostTabs = [];
let currentUrl = '';

chrome.permissions.request(
    {origins: ['http://localhost:4200']},
    function(granted) {
        if (granted) {
            console.log('GRANGTED')
        } else {
            console.log('ERR')
            // Handle grant failure
        }
    });

const getCurrentUrl = new Promise((resolve) => {
    chrome.tabs.getSelected(null, (tab) => resolve(tab.url))
});

const getPageLocalStorage = new Promise((resolve) => {
    let pageScript = 'JSON.stringify(Object.entries(localStorage));';
    chrome.tabs.query({active: true, lastFocusedWindow: true}, function (tabs) {
        chrome.tabs.executeScript(tabs[0].id, {code: pageScript}, (data) => resolve(data));
    });
});

const getLocalhostTabs = new Promise((resolve) => {
    chrome.tabs.query({url: '*://localhost/*'}, function (tabs) {
        resolve(tabs);
    });
});

const getKeys = new Promise((resolve) => {
    chrome.storage.local.get('keywords', data => resolve(data))
});

Promise.all([
    getCurrentUrl,
    getKeys,
    getPageLocalStorage,
    getLocalhostTabs
]).then(results => {
    currentUrl = results[0];
    if (currentUrl.includes('chrome://')) {
        throw "Page is not supported";
    }

    monitoredKeys = results[1].keywords || [];
    let localStorageData = [];
    try {
        localStorageData = JSON.parse(String(results[2]));
    } catch (e) {
    }

    currentLocalStorage = localStorageData.reduce((obj, item) => ({
        ...obj,
        [item[0]]: item[1]
    }), {});
    currentLocalhostTabs = results[3];

    render();
}).catch(e => console.log(e));

function copyItems() {
    let checked = document.querySelectorAll('.selectedKey:checked');
    let toSave = {
        from: getDomain(true),
        data: {},
        date: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    for (let i of checked) {
        const name = i.value;
        toSave.data[name] = currentLocalStorage[name];
    }

    localStorage.setItem('savedItems', JSON.stringify(toSave));
    render();
    showInfo({text: "Copied", timeout: 1000});
}

function pasteItems(tabId) {
    let storedItems = JSON.parse(localStorage.getItem('savedItems'));
    const quotes = document.querySelector('input[name=quotes]:checked').value;
    const domain = document.querySelector('input[name=domain]:checked').value;
    const path = document.querySelector('input[name=path]:checked').value;

    const pasteSettings = {
        quotes: quotes,
        domain: domain,
        path: path
    };

    localStorage.setItem('pasteSettings', JSON.stringify(pasteSettings));

    for (let [key, value] of Object.entries(storedItems.data)) {
        key.replace(/.*\//, '/');
        if (quotes === 'remove') {
            value = value.replace(/^"(.*)"$/, "$1");
        }

        if (domain === 'replace') {
            key = key.replace(getDomain(false, key), getDomain(false));
        } else if (domain === 'remove') {
            key = key.replace(getDomain(false, key), '');
        }

        if (path === 'remove') {
            if (key.match(/https?:\/\//)) { // has domain
                key = key.replace(/(https?:\/\/[^\/]+\/).*\//, '$1');
            } else {
                key = key.replace(/.*\//, '/');
            }
        }
        addItemToPageLocalStorage(key, value, tabId);
    }

    render();
    showInfo({text: "Done", refresh: true, timeout: 4000});
}

function getDomain(withPath, url) {
    if (!url) {
        url = currentUrl;
    }
    if (withPath) {
        return url.replace(/(https?:\/\/[^\/]+(\/[^\/]+)?(\/[^\/]+\/)?).*/, "$1");
    } else {
        return url.replace(/(https?:\/\/[^\/]+).*/, "$1");
    }
}


function render() {
    let settings = localStorage.getItem('pasteSettings');
    if (!settings) {
        settings = {
            path: 'remove',
            quotes: 'remove',
            domain: 'remove'
        }
    } else {
        settings = JSON.parse(settings);
    }

    const storedItems = JSON.parse(localStorage.getItem('savedItems'));
    const tplData = {
        settings: {
            path: {[settings.path]: 'checked'},
            quotes: {[settings.quotes]: 'checked'},
            domain: {[settings.domain]: 'checked'},
        }
    };
    if (storedItems) {
        tplData.copied = {
            from: storedItems.from,
            date: storedItems.date
        };
    }

    const container = document.getElementById('app');
    const template = document.getElementById('main').innerHTML;
    container.innerHTML = Mustache.render(template, tplData);


    document.getElementById('copy').onclick = copyItems;
    const pasteButton = document.getElementById('paste');
    if (pasteButton) {
        pasteButton.onclick = pasteItems;
    }

    renderLocalStorage();
    renderLocalhostTabs();
}

function renderLocalStorage() {
    let tplData = Object.keys(currentLocalStorage).map((i, n) => ({
        name: i.trim(),
        id: n,
        selected: isKeyMonitored(i)
    })).sort((a, b) => +a.selected < +b.selected ? 1 : -1);

    const container = document.getElementById('items');
    const template = document.getElementById('itemList').innerHTML;

    container.innerHTML = Mustache.render(template, {items: tplData});
}

function renderLocalhostTabs() {
    if (!currentLocalhostTabs) {
        return;
    }
    let tplData = currentLocalhostTabs;
    const container = document.getElementById('tabs');
    const template = document.getElementById('localhostTabsTemplate').innerHTML;

    container.innerHTML = Mustache.render(template, {tabs: tplData});
    setTimeout(() => {
        console.log('render', currentLocalhostTabs);
            document.querySelectorAll('.pasteTo').forEach(btn => {
                let id = +btn.getAttribute('data-id');
                let tab = currentLocalhostTabs.find(tab => tab.id === id);
                console.log('iterator',tab)
                btn.onclick = () => copyTo(tab);
            });

    },100)
}

function copyTo(tab) {
    console.log('clicked', tab);
    copyItems();
    pasteItems(tab.id);
    chrome.tabs.update(tab.id, {active: true}, () => {
        console.log('runnug refresh', tab)
        refreshOrigin(tab);
        // chrome.window.update(tab.windowId, {drawAttention: true, focused: true}, () => {});
    });
}

function isKeyMonitored(key) {
    const curDomain = getDomain(true);
    let match = monitoredKeys.some(i => {
        const r = new RegExp(i);
        return key.match(r);
    });
    if (match && getDomain(false, key).includes('http')) {
        match = key.includes(curDomain);
    }
    return match;
}

function addItemToPageLocalStorage(key, value, tabId) {
    const scriptCode = `localStorage.setItem('${key}', '${value}');`;
    if (tabId) {
        chrome.tabs.executeScript(tabId, {code: scriptCode});
        return
    }
    chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
        chrome.tabs.executeScript(tabs[0].id, {code: scriptCode});
    });
}

function refreshOrigin(tab) {
    // const scriptCode = `window.location.href="../";`;
    const scriptCode = `window.location.href="${getDomain(false, tab ? tab.url : undefined)}";`;
    console.log(`Running ${scriptCode} on this page`, tab);
    if (tab) {
        chrome.tabs.executeScript(tab.id, {code: scriptCode});
        return;
    }
    chrome.tabs.query({active: true, lastFocusedWindow: true}, function (tabs) {
        chrome.tabs.executeScript(tabs[0].id, {code: scriptCode});
    });
}

function showInfo(options) {
    const container = document.getElementById('modalContainer');
    const template = document.getElementById('modalTemplate').innerHTML;

    container.innerHTML = Mustache.render(template, options);
    container.classList.add('visible');

    const refreshBtn = document.getElementById('refresh');
    if (refreshBtn) {
        refreshBtn.onclick = refreshOrigin;
    }

    setTimeout(() => {
        container.classList.remove('visible');
    }, options.timeout);
}
