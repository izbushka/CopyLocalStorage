// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const getKeys = new Promise((resolve) => {
  chrome.storage.sync.get('keywords', function(data) {
    resolve(data);
  });
});

getKeys.then(keywords => {
  console.log(keywords)
  if (keywords?.keywords) {
    document.getElementById('keywords').value = keywords.keywords.join("\n");
  }
  document.getElementById('save').onclick = save;
})

function save() {
  const keys = document.getElementById('keywords').value.split("\n").map(i => i.trim()).filter(Boolean);
  chrome.storage.sync.set({keywords: keys});
  alert('Saved');
}
