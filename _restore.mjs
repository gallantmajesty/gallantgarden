import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const content = execSync('git show ca38408:src/avatar/Accessories.tsx', { encoding: 'utf8', cwd: 'C:\\Users\\taksh\\studyforest' });
writeFileSync('C:\\Users\\taksh\\studyforest\\src\\avatar\\Accessories.tsx', content);
console.log(`Restored ${content.split('\\n').length} lines from ca38408`);
