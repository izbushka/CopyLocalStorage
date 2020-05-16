// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
/* global chrome */


// let changeColor = document.getElementById('changeColor');

// chrome.storage.sync.get('color', function(data) {
//   changeColor.style.backgroundColor = data.color;
//   changeColor.setAttribute('value', data.color);
// });
let monitoredKeys = [];
let currentLocalStorage = [];
let currentUrl = '';

const getCurrentUrl = new Promise((resolve) => {
  chrome.tabs.getSelected(null, (tab) => resolve(tab.url))
});

const getPageLocalStorage = new Promise((resolve) => {
  let pageScript = 'JSON.stringify(Object.entries(localStorage));';
  chrome.tabs.query({active: true}, function (tabs) {
    chrome.tabs.executeScript(tabs[0].id, {code: pageScript}, (data) => resolve(data));
  });
});

// const getDomains = new Promise((resolve) => {
//   chrome.storage.sync.get('domains', data => resolve(data))
// });
const getKeys = new Promise((resolve) => {
  chrome.storage.sync.get('keywords', data => resolve(data))
});

Promise.all([
    getCurrentUrl,
    getKeys,
    getPageLocalStorage
]).then(results => {
  currentUrl = results[0];
  monitoredKeys = results[1].keywords;
  console.log(monitoredKeys, results);
  let localStorageData = JSON.parse(results[2]);

  currentLocalStorage = localStorageData.reduce( (obj, item) => ({
    ...obj,
    [item[0]]: item[1]
  }), {});

  render();
})

function copyItems() {
  let checked = document.querySelectorAll('.selectedKey:checked');
  let toSave = {
    from: getDomain(true),
    data: {},
    date: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };
  console.log(toSave);
  for (let i of checked) {
    const name = i.value;
    toSave.data[name] = currentLocalStorage[name];
  }

  localStorage.setItem('savedItems', JSON.stringify(toSave));
  render();
}

function pasteItems() {
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
    addItemToPageLocalStorage(key, value);
  }

  showSuccess();
}

function getDomain(withPath, url) {
  if (!url) {
    url = currentUrl;
  }
  if (withPath) {
    return url.replace(/(https?:\/\/[^\/]+(\/[^\/]+)?(\/[^\/]+)?).*/, "$1");
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
      path: { [settings.path]: 'checked' },
      quotes: { [settings.quotes]: 'checked' },
      domain: { [settings.domain]: 'checked' },
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
}

function renderLocalStorage() {
  let tplData = Object.keys(currentLocalStorage).map((i, n) => ({
    name: i,
    id: n,
    selected: isKeyMonitored(i)
  })).sort((a, b) => +a.selected < +b.selected ? 1 : -1);

  const container = document.getElementById('items');
  const template = document.getElementById('itemList').innerHTML;

  container.innerHTML = Mustache.render(template, {items: tplData});
}

function isKeyMonitored(key) {
  const curDomain = getDomain(true);
  let match = monitoredKeys.some(i => key.indexOf(i) === (key.length - i.length));
  if (match && getDomain(false, key).includes('http')) {
    match = key.includes(curDomain);
  }
  return match;
}

function addItemToPageLocalStorage(key, value) {
  const scriptCode = `localStorage.setItem('${key}', '${value}');`;
  console.log(`Running ${scriptCode} on this page`);
  chrome.tabs.query({active:true}, function(tabs) {
    chrome.tabs.executeScript(tabs[0].id, {code: scriptCode});
  });
}

function showSuccess() {
  const confirmation = document.getElementById('confirmation');
  confirmation.style.display = 'block';
  document.getElementById('refresh').onclick = refreshOrigin;
  setTimeout(() => {
    confirmation.style.display = 'none';
  }, 4000);
}
function refreshOrigin() {
  const scriptCode = `window.location.href="${getDomain(false)}";`;
  console.log(`Running ${scriptCode} on this page`);
  chrome.tabs.query({active:true}, function(tabs) {
    chrome.tabs.executeScript(tabs[0].id, {code: scriptCode});
  });
}
