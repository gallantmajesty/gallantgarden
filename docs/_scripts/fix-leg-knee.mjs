// Fix the missing `bind(lower)` knee group in the Leg function.
// Symptom: shin rendered inside the thigh (both lathes spanned 0..-len in the
// bind(upper) space) and the foot sat at knee level → stubby "no legs" look.
// Fix: restore the original nesting — bind(lower) at the knee wraps robot-knee +
// shin + hacker pockets + foot, then bind(upper) closes after it.
import { readFileSync, writeFileSync } from 'node:fs'

const p = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let src = readFileSync(p, 'utf8')
// Normalize to LF for reliable matching, write back with CRLF (repo style).
src = src.replace(/\r\n/g, '\n')

const edits = [
  {
    // 1) Open bind(lower) right before the robot-knee comment.
    from: `        {/* Robot: mechanical knee joint — a dark pivot sphere with a glowing ring */}`,
    to: `      <group ref={bind(lower)} position={[0, -P.upperLeg * (isPanda ? pLegY : eLegY), 0]}>
        {/* Robot: mechanical knee joint — a dark pivot sphere with a glowing ring */}`,
  },
  {
    // 2) Remove the early `</group>` (old bind(upper) close) before the hacker block.
    from: `        )}
    </group>

        {/* Hacker cargo pockets + neon-green side stripes on the leg */}`,
    to: `        )}

        {/* Hacker cargo pockets + neon-green side stripes on the leg */}`,
  },
  {
    // 3) Close bind(lower) then bind(upper) after the foot group ends.
    from: `        </group>
    </>
  )
}`,
    to: `        </group>
      </group>
    </group>
    </>
  )
}`,
  },
]

let count = 0
for (const { from, to } of edits) {
  const idx = src.indexOf(from)
  if (idx < 0) throw new Error('anchor not found: ' + JSON.stringify(from.slice(0, 60)))
  src = src.slice(0, idx) + to + src.slice(idx + from.length)
  count++
}

writeFileSync(p, src.replace(/\n/g, '\r\n'), 'utf8')
console.log('OK, edits applied:', count)
