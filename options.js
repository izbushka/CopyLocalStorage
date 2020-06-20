// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';


const getKeys = new Promise((resolve) => {
  chrome.storage.local.get('keywords', function(data) {
    resolve(data);
  });
});

const getAutoRefresh = new Promise((resolve) => {
  chrome.storage.local.get('autorefresh', function(data) {
    resolve(data);
  });
});

const example = document.getElementById('keysExample');
example.onclick = () => {
  document.getElementById('keywords').value = example.innerText;
}

Promise.all([
    getKeys,
    getAutoRefresh
]).then(data => {
  const ls = {...data?.[0], ...data?.[1]};
  if (ls.keywords) {
    document.getElementById('keywords').value = ls.keywords.join("\n");
  }
  document.getElementById('autorefresh').checked = ls?.autorefresh || !('autorefresh' in ls);

  document.getElementById('save').onclick = save;
})

function save() {
  const keys = document.getElementById('keywords').value.split("\n").map(i => i.trim()).filter(Boolean);
  const refresh = document.getElementById('autorefresh').checked;
  chrome.storage.local.set({keywords: keys, autorefresh: refresh});
  window.close()
}

