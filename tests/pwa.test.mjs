import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import vm from 'node:vm'

const root = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
function worker(online = true) {
  const handlers = {}
  const cached = []
  const offline = { offline: true }
  const context = {
    URL, Response,
    self: { location: { origin: 'https://erp.example' }, clients: { claim: async () => {} }, addEventListener: (name, fn) => { handlers[name] = fn } },
    caches: {
      open: async () => ({ add: async path => cached.push(path) }),
      keys: async () => [], delete: async () => true, match: async () => offline,
    },
    fetch: async () => { if (!online) throw new Error('offline'); return { live: true } },
  }
  vm.runInNewContext(read('public/sw.js'), context)
  return { handlers, cached, offline }
}

test('manifest has valid local PNG icons and standalone display', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'))
  assert.equal(manifest.display, 'standalone')
  for (const icon of manifest.icons) {
    const path = new URL(`public${icon.src}`, root)
    assert.ok(existsSync(path))
    const png = readFileSync(path)
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes)
  }
  assert.match(read('index.html'), /apple-touch-icon/)
  assert.ok(existsSync(new URL('src/pwa.css', root)))
})

test('worker caches only the non-sensitive offline page during install', async () => {
  const { handlers, cached } = worker()
  let pending
  handlers.install({ waitUntil: p => { pending = p } })
  await pending
  assert.deepEqual(cached, ['/offline.html'])
})

test('worker does not intercept writes, API calls, or assets', () => {
  const { handlers } = worker()
  for (const request of [
    { url: 'https://erp.example/sales', method: 'POST', mode: 'navigate' },
    { url: 'https://db.supabase.co/rest/v1/sales', method: 'GET', mode: 'cors' },
    { url: 'https://erp.example/assets/app.js', method: 'GET', mode: 'cors' },
  ]) {
    handlers.fetch({ request, respondWith: () => assert.fail('Request must not be intercepted') })
  }
})

test('navigation uses live network online and safe offline page on failure', async () => {
  for (const online of [true, false]) {
    const { handlers, offline } = worker(online)
    let response
    handlers.fetch({ request: { url: 'https://erp.example/pos', method: 'GET', mode: 'navigate' }, respondWith: p => { response = p } })
    assert.deepEqual(await response, online ? { live: true } : offline)
  }
})
