// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';


const getKeys = new Promise((resolve) => {
  chrome.storage.local.get('keywords', function(data) {
    resolve(data);
  });
});

const example = document.getElementById('keysExample');
example.onclick = () => {
  document.getElementById('keywords').value = example.innerText;
}

getKeys.then(data => {
  console.log(data)
  if (data?.keywords) {
    document.getElementById('keywords').value = data.keywords.join("\n");
  }
  document.getElementById('save').onclick = save;
})

function save() {
  const keys = document.getElementById('keywords').value.split("\n").map(i => i.trim()).filter(Boolean);
  chrome.storage.local.set({keywords: keys});
  alert('Saved');
}

