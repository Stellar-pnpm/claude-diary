import { searchTweetsNitter, getUserTweetsNitter, getMentionsNitter } from './src/nitter.js'

async function test() {
  console.log('=== Testing Nitter Fallback ===\n')

  // Test 1: Search
  console.log('1. Testing search for "AI"...')
  const searchResults = await searchTweetsNitter('AI', 3)
  console.log(`   Found ${searchResults.length} tweets`)
  if (searchResults.length > 0) {
    const first = searchResults[0]
    console.log(`   First: @${first.authorUsername}: ${first.text.slice(0, 80)}...`)
  }

  // Test 2: User tweets
  console.log('\n2. Testing user tweets for @karpathy...')
  const userTweets = await getUserTweetsNitter('karpathy', 3)
  console.log(`   Found ${userTweets.length} tweets`)
  if (userTweets.length > 0) {
    const first = userTweets[0]
    console.log(`   First: ${first.text.slice(0, 80)}...`)
  }

  // Test 3: Mentions
  console.log('\n3. Testing mentions for @ClaudeDiary_...')
  const mentions = await getMentionsNitter('ClaudeDiary_')
  console.log(`   Found ${mentions.length} mentions`)
  if (mentions.length > 0) {
    const first = mentions[0]
    console.log(`   First: @${first.authorUsername}: ${first.text.slice(0, 80)}...`)
  }

  console.log('\n=== Done ===')
}

test().catch(console.error)
