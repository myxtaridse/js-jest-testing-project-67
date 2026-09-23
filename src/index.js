import { createRequire } from 'module'
const require = createRequire(import.meta.url)
require('axios-debug-log')
const axios = require('axios')

import fsp, { mkdir } from 'fs/promises'
import path from 'path'
import * as cheerio from 'cheerio'
import debug from 'debug'
const log =  debug.debug('page-loader')

const parserLink = (link) => {
  return link
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
}

const filesForModified = [
  { tagname: 'img', attr: 'src', responseType: 'arraybuffer' },
  { tagname: 'link', attr: 'href', responseType: 'arraybuffer' },
  { tagname: 'script', attr: 'src', responseType: 'arraybuffer' },
]

const downloadResources = ($, targetUrl, filesDirName, outputDir) => {
  const promises = []
  filesForModified.forEach(({ tagname, attr, responseType }) => {
    $(tagname).each((_i, el) => {
      const currentAttr = $(el).attr(attr)
      const urlResource = new URL(currentAttr, targetUrl)
      if (targetUrl.hostname !== urlResource.hostname) return

      const hostname = targetUrl.hostname.replace(/\./g, '-')
      const changeAttr = urlResource.pathname.replace(/\//g, '-')
      const addExpansion = changeAttr.split('.').length > 1 ? '' : '.html'
      const filepath = `${filesDirName}/${[hostname, changeAttr].join('')}${addExpansion}`

      $(el).attr(attr, filepath)
      const promise = axios.get(urlResource.href, { responseType })
        .then(({ data }) => fsp.writeFile(path.join(outputDir, filepath), data))
        .catch((err) => {
          log(`failed to download resource ${urlResource.href}: ${err.message}`)
          return
        })
      promises.push(promise)
    })
  })
  return Promise.all(promises)
}

export default (targetUrl, outputDir) => {
  const url = new URL(targetUrl)
  const filename = `${parserLink(targetUrl)}.html`
  const pathname = path.join(outputDir, filename)
  const filesDirName = filename.replace(/.html/, '_files')

  return axios.get(targetUrl)
    .then(({ data }) => {
      const $ = cheerio.load(data)

      return mkdir(path.join(outputDir, filesDirName))
      .catch((err) => {
        if (err.code === 'ENOENT') {
          throw new Error(`Указанная директория ${outputDir} не существует`)
        }
        if (err.code === 'EACCES') {
          throw new Error(`Нет прав на запись в директорию ${outputDir}`)
        }
        throw err
      })
      .then(() => downloadResources($, url, filesDirName, outputDir))
      .then(() => $.html())
      .then((html) => fsp.writeFile(pathname, html))
      .then(() => filename)
    })
    .catch(err => {
      if (axios.isAxiosError(err)) {
        throw new Error(`Страница по адресу ${targetUrl} не найдена`)
      }
      throw err
    })
}
