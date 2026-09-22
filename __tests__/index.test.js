import { test, expect, beforeEach, afterEach } from 'vitest'
import os from 'os'
import { mkdtemp, readFile, rm, stat } from 'fs/promises'
import path from 'path'
import nock from 'nock'
import * as cheerio from 'cheerio'
import pageLoader from '../src/index.js'

const reqNock = (domain, urlPath, content) => 
  nock(domain)
    .get(urlPath)
    .reply(200, content)

const getPath = (dirName, ...filepath) => path.join(dirName, ...filepath)
const getContentFile = pathname => readFile(pathname, 'utf-8')
const getFixture = filename => path.join(process.cwd(), '__fixtures__', filename)

const domain = 'https://ru.hexlet.io'
const pageFilename = 'ru-hexlet-io-courses.html'
const targetUrl = 'https://ru.hexlet.io/courses'
const resourcesDirName = 'ru-hexlet-io-courses_files'

let pageDir = null
beforeEach(async () => {
  pageDir = await mkdtemp(getPath(os.tmpdir(), 'page-loader-'))
})


test('checking the installation of the page from the internet and checking the creation of a file in the specified directory', async () => {
  const basic = `<div>Page</div>`
  reqNock(domain, '/courses', basic)

  const resUrl = await pageLoader(targetUrl, pageDir)
  expect(resUrl).toBe(pageFilename)

  const actual = await getContentFile(getPath(pageDir, pageFilename))
  const $actual = cheerio.load(actual)
  const $expected = cheerio.load(basic)
  expect($actual.html()).toBe($expected.html())
})

test('checking the download of the page and images to the specified directory', async () => {
  const basicHTML = await getContentFile(getFixture('basic1.html'))
  const expectedHTML = await getContentFile(getFixture('expected1.html'))
  const resource = await readFile(getFixture('nodejs.png'))

  const resourceFilename = 'ru-hexlet-io-assets-professions-nodejs.png'

  reqNock(domain, '/courses', basicHTML)
  reqNock(domain, '/assets/professions/nodejs.png', resource)

  const resUrl = await pageLoader(targetUrl, pageDir)
  expect(resUrl).toBe(pageFilename)

  const actual = await getContentFile(getPath(pageDir, pageFilename))
  const $actual = cheerio.load(actual)
  const $expected = cheerio.load(expectedHTML)
  expect($actual.html()).toBe($expected.html())

  await (expect(stat(getPath(pageDir, resourcesDirName, resourceFilename)))).resolves.toBeDefined()
})

test('checking the loading of the page and other resources from the page to the specified directory', async () => {
  const basicHTML = await getContentFile(getFixture('basic2.html'))
  const expectedHTML = await getContentFile(getFixture('expected2.html'))

  const resources = [
    { urlPath: '/assets/professions/nodejs.png', content: Buffer.from('fake image content'), filename: 'ru-hexlet-io-assets-professions-nodejs.png' },
    { urlPath: '/assets/application.css', content: 'body { color: red; }', filename: 'ru-hexlet-io-assets-application.css' },
    { urlPath: '/packs/js/runtime.js', content: 'console.log("test")', filename: 'ru-hexlet-io-packs-js-runtime.js' },
    { urlPath: '/courses', content: '<div>Hello, World!</div>', filename: pageFilename }
  ]

  reqNock(domain, '/courses', basicHTML)
  resources.forEach(({ urlPath, content }) => reqNock(domain, urlPath, content))

  const resUrl = await pageLoader(targetUrl, pageDir)
  expect(resUrl).toBe(pageFilename)

  const actual = await getContentFile(getPath(pageDir, pageFilename))
  const $actual = cheerio.load(actual)
  const $expected = cheerio.load(expectedHTML)
  expect($actual.html()).toBe($expected.html())

  await Promise.all(
    resources.map(({ filename }) => 
      expect(stat(getPath(pageDir, resourcesDirName, filename))).resolves.toBeDefined()))
})


afterEach(async () => {
  nock.cleanAll()
  await rm(pageDir, { recursive: true, force: true })
})
