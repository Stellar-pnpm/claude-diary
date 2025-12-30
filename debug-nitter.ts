async function debug() {
  const instance = 'https://nitter.catsarch.com'
  const username = 'AmandaAskell'
  const url = `${instance}/${username}`

  console.log(`Fetching ${url}...\n`)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',  // No compression
      },
    })

    console.log(`Status: ${response.status}`)
    console.log(`Content-Type: ${response.headers.get('content-type')}`)
    console.log(`Content-Length: ${response.headers.get('content-length')}`)

    const html = await response.text()
    console.log(`\nActual HTML length: ${html.length}`)

    // Check patterns
    console.log(`\nContains 'tweet-content': ${html.includes('tweet-content')}`)
    console.log(`Contains 'timeline-item': ${html.includes('timeline-item')}`)

    // Print snippet
    console.log(`\nFirst 500 chars:\n${html.slice(0, 500)}`)
    console.log(`\nLast 500 chars:\n${html.slice(-500)}`)

  } catch (error) {
    console.error('Fetch error:', error)
  }
}

debug()
