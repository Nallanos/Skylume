// Test script pour vérifier la correction du post vidéo
console.log('Testing video embed structure...');

// Simuler la structure que nous créons maintenant
const videoData = {
    alt: "Test video",
    aspectRatio: { width: 1920, height: 1080 },
    video: {
        $type: "blob",
        ref: {
            $link: "bafkreiexample"
        },
        mimeType: "video/mp4",
        size: 1024000
    },
    captions: []
};

// Nouvelle structure (correcte)
const correctEmbed = {
    $type: 'app.bsky.embed.video',
    video: videoData.video, // Directement la blob ref
    alt: videoData.alt,
    aspectRatio: videoData.aspectRatio,
    captions: videoData.captions
};

// Ancienne structure (incorrecte)
const incorrectEmbed = {
    $type: 'app.bsky.embed.video',
    video: videoData // Tout l'objet au lieu de juste la blob ref
};

console.log('✅ Correct embed structure:');
console.log(JSON.stringify(correctEmbed, null, 2));

console.log('\n❌ Incorrect embed structure (old):');
console.log(JSON.stringify(incorrectEmbed, null, 2));

console.log('\n📝 Key difference:');
console.log('- Correct: embed.video is directly the blob ref');
console.log('- Incorrect: embed.video is an object containing the blob ref');
