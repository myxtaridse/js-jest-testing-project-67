import { program } from 'commander'
import pageLoader from '../src/index.js'
import debug from 'debug'
const log =  debug.debug('page-loader')

program
  .name('page-loader')
  .description('')
  .version('1.0.0')

program
  .command('page-loader')
  .description('Install the page from the internet and download it to a file along the specified path')
  .argument('<targetUrl>')
  .option('-o, --output <dir>', 'output dir', process.cwd())
  .action((targetUrl, { output }) => {
    pageLoader(targetUrl, output)
      .then((data) => log(data))
      .catch(err => {
        log('ERROR:', err.message)
        process.exit(1)
      })
  })

program.parse()