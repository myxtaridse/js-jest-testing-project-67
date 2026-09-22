import { program } from "commander";
import pageLoader from '../src/index.js'

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
    console.log(pageLoader(targetUrl, output))
  })

program.parse()