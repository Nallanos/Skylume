import RichTextService from '../app/services/rich_text_service.js'
import MentionResolverService from '../app/services/mention_resolver_service.js'

async function testRichTextService() {
  console.log('🧪 Testing RichTextService...')
  
  try {
    const mentionResolver = new MentionResolverService()
    const richTextService = new RichTextService(mentionResolver)
    
    // Test 1: Hashtags
    console.log('\n📝 Test 1: Hashtag detection')
    const text1 = "Hello #world! This is a #test post."
    const result1 = await richTextService.parseText(text1)
    
    console.log(`Text: "${result1.text}"`)
    console.log(`Facets: ${result1.facets.length}`)
    result1.facets.forEach((facet, i) => {
      console.log(`  ${i + 1}. ${facet.features[0].$type} - "${facet.features[0].tag}" (${facet.index.byteStart}-${facet.index.byteEnd})`)
    })
    
    // Test 2: Explicit links
    console.log('\n🔗 Test 2: Explicit links')
    const text2 = "Check out our website for more info!"
    const explicitLinks = [
      { text: "our website", url: "https://example.com" }
    ]
    const result2 = await richTextService.parseText(text2, explicitLinks)
    
    console.log(`Text: "${result2.text}"`)
    console.log(`Facets: ${result2.facets.length}`)
    result2.facets.forEach((facet, i) => {
      console.log(`  ${i + 1}. ${facet.features[0].$type} - "${facet.features[0].uri}" (${facet.index.byteStart}-${facet.index.byteEnd})`)
    })
    
    // Test 3: UTF-8 with emoji
    console.log('\n🚀 Test 3: UTF-8 with emoji')
    const text3 = "Hello 👋 #world"
    const result3 = await richTextService.parseText(text3)
    
    console.log(`Text: "${result3.text}"`)
    console.log(`Facets: ${result3.facets.length}`)
    result3.facets.forEach((facet, i) => {
      console.log(`  ${i + 1}. ${facet.features[0].$type} - "${facet.features[0].tag}" (${facet.index.byteStart}-${facet.index.byteEnd})`)
    })
    
    // Test 4: Combined hashtags and links
    console.log('\n🎯 Test 4: Combined hashtags and links')
    const text4 = "Visit our site for #amazing content!"
    const explicitLinks4 = [
      { text: "our site", url: "https://example.com" }
    ]
    const result4 = await richTextService.parseText(text4, explicitLinks4)
    
    console.log(`Text: "${result4.text}"`)
    console.log(`Facets: ${result4.facets.length}`)
    result4.facets.forEach((facet, i) => {
      const feature = facet.features[0]
      if (feature.$type === 'app.bsky.richtext.facet#link') {
        console.log(`  ${i + 1}. Link - "${feature.uri}" (${facet.index.byteStart}-${facet.index.byteEnd})`)
      } else if (feature.$type === 'app.bsky.richtext.facet#tag') {
        console.log(`  ${i + 1}. Hashtag - "#${feature.tag}" (${facet.index.byteStart}-${facet.index.byteEnd})`)
      }
    })
    
    console.log('\n✅ All tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testRichTextService()
