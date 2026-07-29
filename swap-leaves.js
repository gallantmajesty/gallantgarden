const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public', 'icons');
const a = path.join(dir, 'leaf.png');
const b = path.join(dir, 'golden-leaf.png');
const tmp = path.join(dir, '_tmp_swap.png');

fs.copyFileSync(a, tmp);
fs.copyFileSync(b, a);
fs.copyFileSync(tmp, b);
fs.unlinkSync(tmp);

console.log('Swapped leaf.png <-> golden-leaf.png');
