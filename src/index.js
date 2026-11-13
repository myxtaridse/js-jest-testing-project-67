import { createRequire } from 'module'
import filesForModified from './config/filesForModified.json' with { type: 'json' }
import { parserLink } from './utils/index.js'
const require = createRequire(import.meta.url)
require('axios-debug-log')
const axios = require('axios')

import fsp, { mkdir } from 'fs/promises'
import path from 'path'
import * as cheerio from 'cheerio'
import debug from 'debug'
const log = debug.debug('page-loader')

const downloadResources = ($, targetUrl, filesDirName, outputDir) => {
  const promises = []
  filesForModified.forEach(({ tagname, attr, responseType }) => {
    $(tagname).each((_i, el) => {
      const currentAttr = $(el).attr(attr)
      const resourceUrl = new URL(currentAttr, targetUrl)

      if (targetUrl.hostname !== resourceUrl.hostname) return

      const hostname = targetUrl.hostname.replace(/\./g, '-')
      const changeAttr = resourceUrl.pathname.replace(/\//g, '-')
      const addExpansion = changeAttr.split('.').length > 1 ? '' : '.html'
      const filepath = `${filesDirName}/${[hostname, changeAttr].join('')}${addExpansion}`

      $(el).attr(attr, filepath)

      const promise = axios.get(resourceUrl.href, { responseType })
        .then(({ data }) => fsp.writeFile(path.join(outputDir, filepath), data))
        .then(() => console.log(`✔️    Ресурс успешно скачен: ${resourceUrl}`))
        .catch((err) => {
          console.warn(`⚠️   Не удалось скачать ресурс: ${resourceUrl}`)
          log(`failed to download resource ${resourceUrl.href}: ${err.message}`)
          return
        })
      promises.push(promise)
    })
  })
  return Promise.all(promises)
}

export default (targetUrl, outputDir = process.cwd()) => {
  const resolvedOutput = path.resolve(outputDir)
  const url = new URL(targetUrl)
  const filename = `${parserLink(targetUrl)}.html`
  const filepath = path.join(resolvedOutput, filename)
  const filesDirName = filename.replace(/.html/, '_files')

  return axios.get(targetUrl)
    .then(({ data }) => {
      const $ = cheerio.load(data)

      return mkdir(path.join(resolvedOutput, filesDirName))
        .then(() => downloadResources($, url, filesDirName, outputDir))
        .then(() => $.html())
        .then(html => fsp.writeFile(filepath, html))
        .then(() => ({ filepath }))
        .catch((err) => {
          if (err.code === 'ENOENT') {
            throw new Error(`Указанная директория ${resolvedOutput} не существует`, { cause: err })
          }
          if (err.code === 'EACCES') {
            throw new Error(`Нет прав на запись в директорию ${resolvedOutput}`, { cause: err })
          }
          if (err.code === 'EEXIST') {
            throw new Error(`Страница по адресу ${targetUrl} уже была скачена в директорию ${resolvedOutput}`, { cause: err })
          }
          throw err
        })
    })
    .catch((err) => {
      if (axios.isAxiosError(err)) {
        throw new Error(`Страница по адресу ${targetUrl} не найдена`)
      }
      throw err
    })
}
