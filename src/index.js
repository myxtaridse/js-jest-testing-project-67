import axios from 'axios'
import fsp from 'fs/promises'
import path from 'path'

const parserLink = (link) => {
  return link
    .replace(/^https?:\/\//, '')
    .replace(/\//g, '.')
    .replace(/\./g, '-')
}

export default (link, dir) => {
  const filename = `${parserLink(link)}.html`
  const pathname = path.join(dir, filename)

  return axios.get(link)
    .then(({ data }) => {
      fsp.writeFile(pathname, data)
    })
    .then(() => filename)
}
