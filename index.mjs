import process from 'bare-process'
import readline from 'bare-readline'
import { spawn } from 'bare-subprocess'
import tty from 'bare-tty'
import baseEmoji from 'base-emoji'
import crypto from 'hypercore-crypto'
import { Writable } from 'streamx'
import generate from './sgp/generate.mjs'
run()


async function run () {
  const password = await getPassword()
  emoji(password)
  const hash = await sgp(password, 'https://google.com', {  })
  await toClipboard(hash)
  process.exit()
}


function sgp (password, url, opts) {
  return new Promise((resolve, reject) => {
    generate(password, url, opts, (err, result) => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}


function emoji (password) {
  // print out 5 emoji from a md5 hash
  var buf = Buffer.from(password, 'utf8')
  var bits = crypto.hash(buf)
  var parts = []
  for (var i = 0; i < 5; i++) {
    var bit = bits.slice(i, i + 1)
    var pic = baseEmoji.toUnicode(Buffer.from(bit, 'utf8'))
    parts.push(pic)
  }
  console.log('password check: ' + parts.join('  '))
}

function getPassword () {
  return new Promise((resolve) => {
    console.log('Enter Password:')
    const stdin = new tty.ReadStream(0)
    stdin.setRawMode(true)
    const mask = (_data, cb) => cb(null, '*')
    const rl = readline.createInterface({
      input: stdin,
      output: new Writable({ write: mask })
    })
    rl.on('data', (line) => {
      stdin.setRawMode(false)
      rl.close()
      resolve(line)
    })
  })
}

function toClipboard(text) {
  return new Promise((resolve, reject) => {
    var proc = spawn(clipboard(), {
      stdio: ["pipe", "ignore", "ignore"]
    });
    proc.on("error", reject);
    proc.on("exit", () => resolve())
    proc.stdin.write(text)
    proc.stdin.end()
  })
}

function clipboard () {
  switch (process.platform) {
    case 'darwin':
      return 'pbcopy';
    case 'win32':
      return 'clip';
    case 'linux':
      return 'xclip -selection clipboard';
    case 'android':
      return 'termux-clipboard-set'
  }
}
