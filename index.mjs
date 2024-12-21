import readline from 'bare-readline'
import tty from 'bare-tty'

const stdio_in = tty.WriteStream(0)

const mask = (data, cb) => {
  cb(null)
}

const _rl = readline.createInterface({
  input: stdio_in,
  output: new Writable({ write: mask })
})
