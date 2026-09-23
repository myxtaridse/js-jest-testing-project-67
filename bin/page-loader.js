#!/usr/bin/env node
import { program } from 'commander'
import pageLoader from '../src/index.js'
import debug from 'debug'
const log = debug.debug('page-loader')

program
  .name('page-loader')
  .description('Install the page from the internet and download it to a file along the specified path')
  .version('1.0.0')
  .argument('<targetUrl>')
  .option('-o, --output <dir>', 'output dir', process.cwd())
  .action((targetUrl, { output }) => {
    pageLoader(targetUrl, output)
      .then(({ filepath }) => {
        log.color = 5
        console.log(`✔️    Страница успешно скачена: ${filepath}`)
        log(filepath)
      })
      .catch((err) => {
        console.warn(`❌   Ошибка: ${err.message}`)

        log.color = 1
        log(`ERROR: ${err.message}`)
        process.exit(1)
      })
  })

program.parse()
