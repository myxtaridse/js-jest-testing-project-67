import { test, expect, beforeEach, afterEach } from 'vitest'
import os from 'os'
import { mkdtemp, readFile, rm, stat } from 'fs/promises'
import path from 'path'
import nock from 'nock'
import * as cheerio from 'cheerio'

import pageLoader from '../src/index.js'

let pageDir = null
beforeEach(async () => {
  pageDir = await mkdtemp(path.join(os.tmpdir(), 'page-loader-'))
})

test('checking the installation of the page from the internet and checking the creation of a file in the specified directory', async () => {
  const filename = 'ru-hexlet-io-courses.html'
  const basic = `<div>Page</div>`

  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, basic)

  const resUrl = await pageLoader('https://ru.hexlet.io/courses', pageDir)
  expect(resUrl).toBe(filename)

  const actual = await readFile(path.join(pageDir, filename), 'utf-8')
  const $actual = cheerio.load(actual)
  const $expected = cheerio.load(basic)
  expect($actual.html()).toBe($expected.html())
})

test('checking the download of the page and images to the specified directory', async () => {
  const getFixture = filename => path.join(process.cwd(), '__fixtures__', filename)
  const getFile = (...filepath) => path.join(pageDir, ...filepath)

  const basicHTML = await readFile(getFixture('before.html'), 'utf-8')
  const expectedHTML = await readFile(getFixture('after.html'), 'utf-8')
  const resource = await readFile(getFixture('nodejs.png'))

  const filenameLoader = 'ru-hexlet-io-courses.html'
  const dirnameLoader = 'ru-hexlet-io-courses_files'
  const resourceLoader = 'ru-hexlet-io-assets-professions-nodejs.png'
  
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, basicHTML)

  nock('https://ru.hexlet.io')
    .get('/assets/professions/nodejs.png')
    .reply(200, resource)

  const resUrl = await pageLoader('https://ru.hexlet.io/courses', pageDir)
  expect(resUrl).toBe(filenameLoader)

  const actual = await readFile(getFile(filenameLoader), 'utf-8')
  const $actual = cheerio.load(actual)
  const $expected = cheerio.load(expectedHTML)
  expect($actual.html()).toBe($expected.html())

  await (expect(stat(getFile(dirnameLoader, resourceLoader)))).resolves.toBeDefined()
})

test('checking the loading of the page and other resources from the page to the specified directory', async () => {
  const getFixture = filename => path.join(process.cwd(), '__fixtures__', filename)
  const getFile = (...filepath) => path.join(pageDir, ...filepath)

  const basicHTML = await readFile(getFixture('before.html'), 'utf-8')
  const expectedHTML = await readFile(getFixture('after.html'), 'utf-8')

  const filenameLoader = 'ru-hexlet-io-courses.html'
  const dirnameLoader = 'ru-hexlet-io-courses_files'
  const recources = [
    { reqParams: '/assets/professions/nodejs.png', content: Buffer.from('fake image content'), filename: 'ru-hexlet-io-assets-professions-nodejs.png' },
    { reqParams: '/assets/application.css', content: 'body { color: red; }', filename: 'ru-hexlet-io-assets-application.css' },
    { reqParams: '/packs/js/runtime.js', content: 'console.log("test")', filename: 'ru-hexlet-io-packs-js-runtime.js' }
  ]
  
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, basicHTML)

  recources.forEach(({ reqParams, content }) => {
    nock('https://ru.hexlet.io')
    .get(reqParams)
    .reply(200, content)
  })

  const resUrl = await pageLoader('https://ru.hexlet.io/courses', pageDir)
  expect(resUrl).toBe(filenameLoader)

  const actual = await readFile(getFile(filenameLoader), 'utf-8')
  const $actual = cheerio.load(actual)
  const $expected = cheerio.load(expectedHTML)
  expect($actual.html()).toBe($expected.html())

  await Promise.all(
    recources.map(({ filename }) => 
      expect(stat(getFile(dirnameLoader, filename))).resolves.toBeDefined()))
})


afterEach(async () => {
  await rm(pageDir, { recursive: true, force: true })
})
