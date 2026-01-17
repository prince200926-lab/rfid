const http = require('http');

function simulateCardScan(cardId) {
  const data = JSON.stringify({ cardId });

  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/attendance',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log(`\n✓ Card Scanned: ${cardId}`);
      console.log('Response:', JSON.parse(responseData));
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.write(data);
  req.end();
}

// Test with registered cards
console.log('🧪 Simulating card scans...\n');

const cards = [
    'SP291616'
   // Unknown card
];

cards.forEach((card, index) => {
  setTimeout(() => {
    simulateCardScan(card);
  }, index * 1000);
});