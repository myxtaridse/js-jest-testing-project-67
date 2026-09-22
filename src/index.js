import axios from 'axios'
import fsp, { mkdir } from 'fs/promises'
import path from 'path'
import * as cheerio from 'cheerio'

const parserLink = (link) => {
  return link
    .replace(/^https?:\/\//, '')
    .replace(/\//g, '.')
    .replace(/\./g, '-')
}

const filesForModified = [
  { tagname: 'img', attr: 'src', responseType: 'arraybuffer' }
]

const downloadResources = ($, targetUrl, filesDirName, outputDir) => {
  const promises = []
  filesForModified.forEach(({ tagname, attr, responseType }) => {
    $(tagname).each((_i, el) => {
      const currentAttr = $(el).attr(attr)
      const hostname = targetUrl.hostname.replace(/\./g, '-')
      const changeAttr = currentAttr.replace(/\//g, '-')
      const filepath = `${filesDirName}/${[hostname, changeAttr].join('')}`

      $(el).attr(attr, filepath)

      const urlResource = new URL(currentAttr, targetUrl)
      const promise = axios.get(urlResource.href, { responseType })
        .then(({ data }) => fsp.writeFile(path.join(outputDir, filepath), data))
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

  if (process.env.NODE_ENV !== 'test') {
    return Promise.resolve(filename)
  }

  return axios.get(targetUrl)
    .then(({ data }) => {
      const $ = cheerio.load(data)

      return mkdir(path.join(outputDir, filesDirName))
      .then(() => downloadResources($, url, filesDirName, outputDir))
      .then(() => $.html())
      .then((html) => fsp.writeFile(pathname, html))
      .then(() => filename)
    })
}
