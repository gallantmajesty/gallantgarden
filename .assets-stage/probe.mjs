import { Jimp } from 'jimp'
const dir = 'C:/Users/taksh/studyforest/public/icons'
const names = [
  'tasks', 'notes', 'analytics', 'focus-timer', 'calendar',
  'achievements', 'streaks', 'goals', 'habits', 'study-rooms',
  'realm', 'friends', 'messages', 'profile', 'settings',
]
const C = 5, S = 170, P = 6
const bg = new Jimp({ width: C * S, height: 3 * S, color: 0xece5d3ff })
for (let i = 0; i < names.length; i++) {
  const img = await Jimp.read(`${dir}/${names[i]}.png`)
  img.resize({ w: S - P * 2, h: S - P * 2 })
  bg.composite(img, (i % C) * S + P, Math.floor(i / C) * S + P)
}
await bg.write('C:/Users/taksh/studyforest/.assets-stage/probe_all.png')
console.log('ok')
