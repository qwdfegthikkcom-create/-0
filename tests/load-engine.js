/* يحمّل سكربتات منطق اللعبة في Node بنفس ترتيب index.html (بدون ملفات الواجهة) */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((s) => /^js\/(core|data|sim)\//.test(s) || s === 'js/game/moment-core.js');

for (const s of scripts) {
  vm.runInThisContext(fs.readFileSync(path.join(root, s), 'utf8'), { filename: s });
}
module.exports = globalThis.FC;
