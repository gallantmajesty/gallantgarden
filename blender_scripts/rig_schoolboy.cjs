/**
 * Rename schoolboy.glb bones from Nick naming to Mixamo naming.
 * No Blender required — edits the GLB binary directly.
 *
 * Usage: node blender_scripts/rig_schoolboy.js
 * Output: public/models/avatars/schoolboy_rigged.glb
 */

const fs = require('fs');
const path = require('path');

const IN = path.join(__dirname, '..', 'public', 'models', 'avatars', 'schoolboy.glb');
const OUT = path.join(__dirname, '..', 'public', 'models', 'avatars', 'schoolboy_rigged.glb');

// Nick bone name → Mixamo bone name
const RENAME = {
  'Nick:Root_M_01':           'mixamorig:Hips',
  'Nick:Spine1_M_09':         'mixamorig:Spine',
  'Nick:Spine2_M_010':        'mixamorig:Spine1',
  'Nick:Chest_M_011':         'mixamorig:Spine2',
  'Nick:Neck_M_012':          'mixamorig:Neck',
  'Nick:Head_M_013':          'mixamorig:Head',
  'Nick:HeadEnd_M_014':       'mixamorig:HeadTop_End',
  'Nick:Hip_L_02':            'mixamorig:LeftUpLeg',
  'Nick:Knee_L_00':           'mixamorig:LeftLeg',
  'Nick:Ankle_L_03':          'mixamorig:LeftFoot',
  'Nick:Toes_L_04':           'mixamorig:LeftToeBase',
  'Nick:ToesEnd_L':           'mixamorig:LeftToe_End',
  'Nick:Hip_R_05':            'mixamorig:RightUpLeg',
  'Nick:Knee_R_06':           'mixamorig:RightLeg',
  'Nick:Ankle_R_07':          'mixamorig:RightFoot',
  'Nick:Toes_R_08':           'mixamorig:RightToeBase',
  'Nick:ToesEnd_R':           'mixamorig:RightToe_End',
  'Nick:Scapula_L_015':       'mixamorig:LeftShoulder',
  'Nick:Shoulder_L_016':      'mixamorig:LeftArm',
  'Nick:Elbow_L_017':         'mixamorig:LeftForeArm',
  'Nick:Wrist_L_018':         'mixamorig:LeftHand',
  'Nick:Scapula_R_034':       'mixamorig:RightShoulder',
  'Nick:Shoulder_R_035':      'mixamorig:RightArm',
  'Nick:Elbow_R_036':         'mixamorig:RightForeArm',
  'Nick:Wrist_R_037':         'mixamorig:RightHand',
  'Nick:ThumbFinger1_L_031':  'mixamorig:LeftHandThumb1',
  'Nick:ThumbFinger2_L_032':  'mixamorig:LeftHandThumb2',
  'Nick:ThumbFinger3_L_033':  'mixamorig:LeftHandThumb3',
  'Nick:ThumbFinger4_L':      'mixamorig:LeftHandThumb4',
  'Nick:IndexFinger1_L_019':  'mixamorig:LeftHandIndex1',
  'Nick:IndexFinger2_L_020':  'mixamorig:LeftHandIndex2',
  'Nick:IndexFinger3_L_021':  'mixamorig:LeftHandIndex3',
  'Nick:IndexFinger4_L':      'mixamorig:LeftHandIndex4',
  'Nick:MiddleFinger1_L_022': 'mixamorig:LeftHandMiddle1',
  'Nick:MiddleFinger2_L_023': 'mixamorig:LeftHandMiddle2',
  'Nick:MiddleFinger3_L_024': 'mixamorig:LeftHandMiddle3',
  'Nick:MiddleFinger4_L':     'mixamorig:LeftHandMiddle4',
  'Nick:RingFinger1_L_028':   'mixamorig:LeftHandRing1',
  'Nick:RingFinger2_L_029':   'mixamorig:LeftHandRing2',
  'Nick:RingFinger3_L_030':   'mixamorig:LeftHandRing3',
  'Nick:RingFinger4_L':       'mixamorig:LeftHandRing4',
  'Nick:PinkyFinger1_L_025':  'mixamorig:LeftHandPinky1',
  'Nick:PinkyFinger2_L_026':  'mixamorig:LeftHandPinky2',
  'Nick:PinkyFinger3_L_027':  'mixamorig:LeftHandPinky3',
  'Nick:PinkyFinger4_L':      'mixamorig:LeftHandPinky4',
  'Nick:ThumbFinger1_R_050':  'mixamorig:RightHandThumb1',
  'Nick:ThumbFinger2_R_051':  'mixamorig:RightHandThumb2',
  'Nick:ThumbFinger3_R_052':  'mixamorig:RightHandThumb3',
  'Nick:ThumbFinger4_R':      'mixamorig:RightHandThumb4',
  'Nick:IndexFinger1_R_038':  'mixamorig:RightHandIndex1',
  'Nick:IndexFinger2_R_039':  'mixamorig:RightHandIndex2',
  'Nick:IndexFinger3_R_040':  'mixamorig:RightHandIndex3',
  'Nick:IndexFinger4_R':      'mixamorig:RightHandIndex4',
  'Nick:MiddleFinger1_R_041': 'mixamorig:RightHandMiddle1',
  'Nick:MiddleFinger2_R_042': 'mixamorig:RightHandMiddle2',
  'Nick:MiddleFinger3_R_043': 'mixamorig:RightHandMiddle3',
  'Nick:MiddleFinger4_R':     'mixamorig:RightHandMiddle4',
  'Nick:RingFinger1_R_047':   'mixamorig:RightHandRing1',
  'Nick:RingFinger2_R_048':   'mixamorig:RightHandRing2',
  'Nick:RingFinger3_R_049':   'mixamorig:RightHandRing3',
  'Nick:RingFinger4_R':       'mixamorig:RightHandRing4',
  'Nick:PinkyFinger1_R_044':  'mixamorig:RightHandPinky1',
  'Nick:PinkyFinger2_R_045':  'mixamorig:RightHandPinky2',
  'Nick:PinkyFinger3_R_046':  'mixamorig:RightHandPinky3',
  'Nick:PinkyFinger4_R':      'mixamorig:RightHandPinky4',
};

// Read GLB
const buf = fs.readFileSync(IN);
const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

// Parse header
const magic = view.getUint32(0, true);
const version = view.getUint32(4, true);
const totalLen = view.getUint32(8, true);
if (magic !== 0x46546C67) throw new Error('Not a valid GLB file');

// Parse chunks
let jsonChunk = null;
let binChunk = null;
let offset = 12;

while (offset < totalLen) {
  const chunkLen = view.getUint32(offset, true);
  const chunkType = view.getUint32(offset + 4, true);
  const chunkData = buf.slice(offset + 8, offset + 8 + chunkLen);

  if (chunkType === 0x4E4F534A) { // JSON
    jsonChunk = JSON.parse(chunkData.toString('utf8'));
  } else if (chunkType === 0x004E4942) { // BIN
    binChunk = chunkData;
  }
  offset += 8 + chunkLen;
}

if (!jsonChunk || !binChunk) throw new Error('Missing JSON or BIN chunk');

let renamedCount = 0;

// Step 1: Rename nodes (which are bones in the armature)
if (jsonChunk.nodes) {
  for (const node of jsonChunk.nodes) {
    if (node.name && RENAME[node.name]) {
      const old = node.name;
      node.name = RENAME[old];
      renamedCount++;
      console.log(`  Node: ${old} -> ${node.name}`);
    }
  }
}

// Step 2: Fix skin joint references (they reference node indices, which stay the same)
// No change needed since we renamed the nodes in-place, preserving indices.

// Step 3: Serialize JSON back
let jsonStr = JSON.stringify(jsonChunk);

// Pad JSON to 4-byte alignment with spaces
while (jsonStr.length % 4 !== 0) {
  jsonStr += ' ';
}

// Pad BIN to 4-byte alignment with 0x20
let binBuf = Buffer.from(binChunk);
while (binBuf.length % 4 !== 0) {
  binBuf = Buffer.concat([binBuf, Buffer.from([0x20])]);
}

// Build new GLB
const jsonBytes = Buffer.from(jsonStr, 'utf8');
const headerLen = 12;
const jsonChunkHeader = 8;
const binChunkHeader = 8;
const newTotalLen = headerLen + jsonChunkHeader + jsonBytes.length + binChunkHeader + binBuf.length;

const out = Buffer.alloc(newTotalLen);
const outView = new DataView(out.buffer, out.byteOffset, out.byteLength);

// Header
outView.setUint32(0, 0x46546C67, true);  // magic
outView.setUint32(4, 2, true);            // version
outView.setUint32(8, newTotalLen, true);  // length

// JSON chunk
let pos = 12;
outView.setUint32(pos, jsonBytes.length, true); pos += 4;
outView.setUint32(pos, 0x4E4F534A, true); pos += 4; // "JSON"
jsonBytes.copy(out, pos); pos += jsonBytes.length;

// BIN chunk
outView.setUint32(pos, binBuf.length, true); pos += 4;
outView.setUint32(pos, 0x004E4942, true); pos += 4; // "BIN\0"
binBuf.copy(out, pos); pos += binBuf.length;

fs.writeFileSync(OUT, out);

console.log(`\nDone! Renamed ${renamedCount} bones.`);
console.log(`Output: ${OUT} (${(out.length / 1024).toFixed(1)} KB)`);
console.log(`\nNext: change CharacterAvatar.tsx to load schoolboy_rigged.glb`);
