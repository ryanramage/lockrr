#!/usr/local/env bare
import Corestore from 'corestore'
import Autopass from 'autopass'
import env from 'bare-env'
import { command, arg, flag, summary, description, bail } from 'paparam'
import process from 'bare-process'
import readline from 'bare-readline'
import { spawn } from 'bare-subprocess'
import tty from 'bare-tty'
import baseEmoji from 'base-emoji'
import crypto from 'hypercore-crypto'
import { Writable } from 'streamx'
import generate from './sgp/generate.mjs'
import hostname from './sgp/hostname'


const homeDir = env.HOME || env.USERPROFILE // USERPROFILE for Windows compatibility

// Define the main 'lockrr' command
const lockrr = command(
  'lockrr',
  summary('lockrr command-line tool'),
  description('A command-line tool to manage secrets in a lockrr.'),
  flag('--store', 'store a value in the lockrr'),
  flag('--profile [profile]', 'specify a isolated profile to use'),
  arg('<url>', 'the url'),
  arg('<key>', 'the key to store, like username'),
  arg('<value', 'the value of the key, like bob'),
  async () => {
    const domain = hostname(lockrr.args.url, {})
    const autopass = await getAutopass(lockrr.flags.profile)

    if (lockrr.flags.store) {
      const { key, value } = lockrr.args
      console.log(`Storing value '${value}' with domain ${domain} and key '${key}'`);
      await autopass.add(`${domain}|${key}`, value)
      await autopass.close()
      process.exit(0)

    }

    const entries = []
    const query = {
      gt: `${domain}|`,
      lt: `${domain}|~`
    }
    const readstream = await autopass.list(query)
    readstream.on('data', (data) => {
      const [_domain, key] = data.key.split('|')
      const entry = { key, value: data.value }
      console.log(key, ':', data.value)
      entries.push(entry)
    })
    readstream.on('end', async () => {
      await run(domain)
      await autopass.close()
    })
  }
);

lockrr.parse(process.argv.slice(2));

async function getAutopass (profile) {
  if (!profile) profile = 'default'
  const baseDir = `${homeDir}/.lockrr/${profile}/`
  const autopass = new Autopass(new Corestore(baseDir))
  await autopass.ready()
  return autopass
}

async function run (domain) {
  const password = await getPassword()
  emoji(password)
  const hash = await sgp(password, domain, {  })
  await toClipboard(hash)
  console.log('✓ password copied to clipboard\n')
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
