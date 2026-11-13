export const parserLink = (link) => {
  return link
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
}
