import { test, expect, beforeEach } from 'vitest'
import os from 'os'
import fs from 'fs'
import path from 'path'
import nock from 'nock'

import pageLoader from '../src/index.js'

let pageDir = null
beforeEach(async () => {
  pageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader'))
})

test('page-loader', async () => {
  const filename = 'ru-hexlet-io-courses.html'
  const content = `<div>Page</div>`

  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, content)

  await expect(await pageLoader('https://ru.hexlet.io/courses', pageDir)).toBe(filename)
  await expect(fs.readFile(path.join(pageDir, filename), 'utf-8')).toBe(content)
})
