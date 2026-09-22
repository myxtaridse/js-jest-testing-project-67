import { test, expect, beforeEach, afterEach } from 'vitest'
import os from 'os'
import { access, mkdtemp, readFile, rm, stat } from 'fs/promises'
import path from 'path'
import nock from 'nock'

import pageLoader from '../src/index.js'

let pageDir = null
beforeEach(async () => {
  pageDir = await mkdtemp(path.join(os.tmpdir(), 'page-loader-'))
})

test('checking the installation of the page from the internet and checking the creation of a file in the specified directory', async () => {
  const filename = 'ru-hexlet-io-courses.html'
  const content = `<div>Page</div>`

  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, content)

  const resUrl = await pageLoader('https://ru.hexlet.io/courses', pageDir)

  expect(resUrl).toBe(filename)
  await expect(readFile(path.join(pageDir, filename), 'utf-8')).resolves.toBe(content)
})

test('checking the download of the page and images to the specified directory', async () => {
  const getFixture = filename => path.join(process.cwd(), '__fixtures__', filename)
  const getFile = (...filepath) => path.join(pageDir, ...filepath)

  const beforeHTML = await readFile(getFixture('before.html'), 'utf-8')
  const afterHTML = await readFile(getFixture('after.html'), 'utf-8')

  const filenameLoader = 'ru-hexlet-io-courses.html'
  const dirnameLoader = 'ru-hexlet-io-courses_files'
  const imgLoader = 'ru-hexlet-io-assets-professions-nodejs.png'
  
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, beforeHTML)

  const resUrl = await pageLoader('https://ru.hexlet.io/courses', pageDir)

  expect(resUrl).toBe(filenameLoader)
  await expect(readFile(getFile(filenameLoader), 'utf-8')).resolves.toBe(afterHTML)
  await (expect(stat(getFile(dirnameLoader, imgLoader)))).resolves.toBeDefined()
})


afterEach(async () => {
  await rm(pageDir, { recursive: true, force: true })
})
