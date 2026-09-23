import { test, expect, beforeEach, afterEach } from 'vitest'
import os from 'os'
import { chmod, mkdtemp, readFile, rm, stat } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import nock from 'nock'
import * as cheerio from 'cheerio'
import pageLoader from '../src/index.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reqNock = (domain, urlPath, statusCode, content) =>
  nock(domain)
    .get(urlPath)
    .reply(statusCode, content)

const getPath = (dirName, ...filepath) => path.join(dirName, ...filepath)
const getContentFile = pathname => readFile(pathname, 'utf-8')
const getFixture = filename => path.join(__dirname, '..', '__fixtures__', filename)

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
  reqNock(domain, '/courses', 200, basic)

  const resUrl = await pageLoader(targetUrl, pageDir)
  const rightPath = { filepath: getPath(pageDir, pageFilename) }
  expect(resUrl).toEqual(rightPath)

  const actual = await getContentFile(rightPath.filepath)
  const $actual = cheerio.load(actual)
  const $expected = cheerio.load(basic)
  expect($actual.html()).toBe($expected.html())
})

test('checking the download of the page and images to the specified directory', async () => {
  const basicHTML = await getContentFile(getFixture('basic1.html'))
  const expectedHTML = await getContentFile(getFixture('expected1.html'))
  const resource = await readFile(getFixture('nodejs.png'))

  const resourceFilename = 'ru-hexlet-io-assets-professions-nodejs.png'

  reqNock(domain, '/courses', 200, basicHTML)
  reqNock(domain, '/assets/professions/nodejs.png', 200, resource)

  const resUrl = await pageLoader(targetUrl, pageDir)
  const rightPath = { filepath: getPath(pageDir, pageFilename) }
  expect(resUrl).toEqual(rightPath)

  const actual = await getContentFile(rightPath.filepath)
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
    { urlPath: '/courses', content: '<div>Hello, World!</div>', filename: pageFilename },
  ]

  reqNock(domain, '/courses', 200, basicHTML)
  resources.forEach(({ urlPath, content }) => reqNock(domain, urlPath, 200, content))

  const resUrl = await pageLoader(targetUrl, pageDir)
  const rightPath = { filepath: getPath(pageDir, pageFilename) }
  expect(resUrl).toEqual(rightPath)

  const actual = await getContentFile(rightPath.filepath)
  const $actual = cheerio.load(actual)
  const $expected = cheerio.load(expectedHTML)
  expect($actual.html()).toBe($expected.html())

  await Promise.all(
    resources.map(({ filename }) =>
      expect(stat(getPath(pageDir, resourcesDirName, filename))).resolves.toBeDefined()))
})

test('check the situation if the specified page is not available on the internet', async () => {
  reqNock(domain, '/courses', 404)
  await expect(pageLoader(targetUrl, pageDir)).rejects.toThrow(`Страница по адресу ${targetUrl} не найдена`)
})

test('check the situation if the specified directory is missing', async () => {
  const pageDir = '/undefined'
  const basic = `<div>Page</div>`
  reqNock(domain, '/courses', 200, basic)

  await expect(pageLoader(targetUrl, pageDir)).rejects.toThrow(`Указанная директория ${pageDir} не существует`)
})

test('check the situation when there are no write permissions for the directory', async () => {
  const basic = `<div>Page</div>`
  reqNock(domain, '/courses', 200, basic)

  // для понимания прав для директории лучше использовать временную с ограниченными правами
  // поскольку '/bin' не дает гарантии в закрытости или открытости для записи
  // 0o444 -> S_IRUSR | S_IRGRP | S_IROTH
  await chmod(pageDir, 0o444)

  await expect(pageLoader(targetUrl, pageDir)).rejects.toThrow(`Нет прав на запись в директорию ${pageDir}`)
  await chmod(pageDir, 0o755)
})

test('check the situation if the resource from the page is not available on the internet', async () => {
  const basicHTML = await getContentFile(getFixture('basic1.html'))
  const expectedHTML = await getContentFile(getFixture('expected1.html'))

  const resourceFilename = 'ru-hexlet-io-assets-professions-nodejs.png'

  reqNock(domain, '/courses', 200, basicHTML)
  reqNock(domain, '/assets/professions/nodejs.png', 404)

  const resUrl = await pageLoader(targetUrl, pageDir)
  const rightPath = { filepath: getPath(pageDir, pageFilename) }
  expect(resUrl).toEqual(rightPath)

  const actual = await getContentFile(rightPath.filepath)
  const $actual = cheerio.load(actual)
  const $expected = cheerio.load(expectedHTML)
  expect($actual.html()).toBe($expected.html())

  await expect(stat(getPath(pageDir, resourcesDirName, resourceFilename))).rejects.toBeDefined()
})

afterEach(async () => {
  nock.cleanAll()
  await rm(pageDir, { recursive: true, force: true })
})
