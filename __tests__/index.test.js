import { test, expect, beforeEach } from 'vitest'
import os from 'os'
import { mkdtemp, readFile } from 'fs/promises'
import path from 'path'
import nock from 'nock'

import pageLoader from '../src/index.js'

let pageDir = null
beforeEach(async () => {
  pageDir = await mkdtemp(path.join(os.tmpdir(), 'page-loader-'))
})

test('page-loader', async () => {
  const filename = 'ru-hexlet-io-courses.html'
  const content = `<div>Page</div>`

  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, content)

  await expect(pageLoader('https://ru.hexlet.io/courses', pageDir)).resolves.toBe(filename)
  await expect(readFile(path.join(pageDir, filename), 'utf-8')).resolves.toBe(content)
})
