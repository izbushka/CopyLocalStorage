// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

// let page = document.getElementById('buttonDiv');
// const kButtonColors = ['#3aa757', '#e8453c', '#f9bb2d', '#4688f1'];
// function constructOptions(kButtonColors) {
//   for (let item of kButtonColors) {
//     let button = document.createElement('button');
//     button.style.backgroundColor = item;
//     button.addEventListener('click', function() {
//       chrome.storage.sync.set({color: item}, function() {
//         console.log('color is ' + item);
//       })
//     });
//     page.appendChild(button);
//   }
// }
// constructOptions(kButtonColors);
const defaultDomains = ['localhost', '127.0.0.1', 'develop', 'aa'];
const defaultKeys = ['.JWT', '.JWT.auth', '.JWT.refresh', '.expireAt', 'ss'];

const getDomains = new Promise((resolve) => {
  chrome.storage.sync.get('domains', function(data) {
    resolve(data);
  });
});
const getKeys = new Promise((resolve) => {
  chrome.storage.sync.get('keywords', function(data) {
    resolve(data);
  });
});

Promise.all([getDomains, getKeys]).then(res => {
  const domains = res[0]?.domains || defaultDomains;
  const keywords = res[1]?.keywords || defaultKeys;
  console.log(domains, keywords)
  document.getElementById('domains').value = domains.join("\n");
  document.getElementById('keywords').value = keywords.join("\n");
  document.getElementById('save').onclick = save;
})
// domains =

function save() {
  const domains = document.getElementById('domains').value.split("\n").map(i => i.trim());
  const keys = document.getElementById('keywords').value.split("\n").map(i => i.trim());
  chrome.storage.sync.set({domains: domains, keywords: keys});
  alert('Saved');
}
