// ==========================================
// ESP8266 RFID Simulator
// Simulates card scans without actual hardware
// ==========================================

const readline = require('readline');

// ==========================================
// CONFIGURATION
// ==========================================

const SERVER_URL = 'http://localhost:8080/api/rfid/scan';
const API_KEY = 'your-secret-api-key-here'; // Optional: Match with backend

// Sample card IDs for quick testing
const SAMPLE_CARDS = {
  '1': 'SP291616',
};

// ==========================================
// FUNCTIONS
// ==========================================

/**
 * Send RFID scan to server
 */
async function scanCard(cardId) {
  console.log('\n📱 Simulating card scan...');
  console.log(`Card ID: ${cardId}`);
  console.log('─'.repeat(50));

  const payload = {
    cardId: cardId,
    // apiKey: API_KEY  // Uncomment if using API key
  };

  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log(`\n📥 Server Response (${response.status}):`);
    console.log('─'.repeat(50));

    if (data.success) {
      if (data.data.student) {
        console.log('✅ SUCCESS - Student Found!');
        console.log(`Name: ${data.data.student.name}`);
        console.log(`Class: ${data.data.student.class}`);
        console.log(`Roll: ${data.data.student.rollNumber || 'N/A'}`);
        console.log(`Status: ${data.data.status}`);
      } else {
        console.log('⚠️  WARNING - Unknown Card!');
        console.log('Card scanned but not registered in system');
        console.log(`Status: ${data.data.status}`);
      }
      console.log(`Timestamp: ${data.data.timestamp}`);
      console.log(`Record ID: ${data.data.id}`);
    } else {
      console.log('❌ ERROR');
      console.log(`Message: ${data.message}`);
    }

  } catch (error) {
    console.log('❌ REQUEST FAILED');
    console.log(`Error: ${error.message}`);
    
    if (error.message.includes('fetch is not defined')) {
      console.log('\n⚠️  Note: You need Node.js v18+ or install node-fetch');
      console.log('Run: npm install node-fetch@2');
    }
  }

  console.log('─'.repeat(50));
}

/**
 * Generate random card ID
 */
function generateRandomCardId() {
  const chars = '0123456789ABCDEF';
  let cardId = '';
  for (let i = 0; i < 8; i++) {
    cardId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return cardId;
}

/**
 * Interactive menu
 */
function showMenu() {
  console.log('\n' + '═'.repeat(50));
  console.log('🎓 ESP8266 RFID SIMULATOR');
  console.log('═'.repeat(50));
  console.log('Server: ' + SERVER_URL);
  console.log('─'.repeat(50));
  console.log('\nQuick Test Cards:');
  Object.keys(SAMPLE_CARDS).forEach(key => {
    console.log(`  ${key}. ${SAMPLE_CARDS[key]}`);
  });
  console.log('\nCommands:');
  console.log('  [1-5]       - Scan sample card');
  console.log('  random      - Generate & scan random card');
  console.log('  <card_id>   - Scan custom card ID');
  console.log('  auto        - Auto-scan sample cards (demo mode)');
  console.log('  test        - Test server connection');
  console.log('  exit        - Quit simulator');
  console.log('─'.repeat(50));
}

/**
 * Test server connection
 */
async function testServer() {
  console.log('\n🔍 Testing server connection...');
  
  try {
    const response = await fetch('http://localhost:8080/api/rfid/test', {
      method: 'GET'
    });

    const data = await response.json();
    
    console.log('✅ Server is online!');
    console.log(`Message: ${data.message}`);
    console.log(`Server Time: ${data.serverTime}`);
  } catch (error) {
    console.log('❌ Server connection failed!');
    console.log(`Error: ${error.message}`);
    console.log('\nMake sure your server is running on http://localhost:8080');
  }
}

/**
 * Auto-scan demo mode
 */
async function autoScanDemo() {
  console.log('\n🤖 AUTO-SCAN DEMO MODE');
  console.log('Scanning all sample cards with 2-second delays...\n');
  
  for (let key in SAMPLE_CARDS) {
    await scanCard(SAMPLE_CARDS[key]);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Auto-scan complete!');
}

// ==========================================
// MAIN PROGRAM
// ==========================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

showMenu();

rl.on('line', async (input) => {
  const command = input.trim().toLowerCase();

  if (command === 'exit' || command === 'quit') {
    console.log('\n👋 Goodbye!\n');
    rl.close();
    process.exit(0);
  }

  else if (command === 'test') {
    await testServer();
  }

  else if (command === 'random') {
    const randomCard = generateRandomCardId();
    await scanCard(randomCard);
  }

  else if (command === 'auto') {
    await autoScanDemo();
  }

  else if (SAMPLE_CARDS[command]) {
    await scanCard(SAMPLE_CARDS[command]);
  }

  else if (command.length > 0) {
    // Treat as custom card ID
    await scanCard(command.toUpperCase());
  }

  console.log('\nEnter command (or "exit" to quit): ');
});

rl.on('close', () => {
  process.exit(0);
});

console.log('\nEnter command (or "exit" to quit): ');