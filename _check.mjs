import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const commits = ['ca38408', 'c315172', '563278e', 'b17dfb8', '94b110e'];

for (const hash of commits) {
  try {
    const content = execSync(`git show ${hash}:src/avatar/Accessories.tsx`, { encoding: 'utf8', cwd: 'C:\\Users\\taksh\\studyforest' });
    const lineCount = content.split('\n').length;
    // Check if the file has balanced braces
    let braces = 0;
    for (const ch of content) {
      if (ch === '{') braces++;
      if (ch === '}') braces--;
    }
    const balanced = braces === 0;
    console.log(`${hash}: ${lineCount} lines | braces_balanced=${balanced}`);
  } catch (e) {
    console.log(`${hash}: ERROR`);
  }
}
