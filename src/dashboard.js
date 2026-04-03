import * as p from '@clack/prompts';
import { readFileSync, existsSync } from 'fs';
import { getCaptures, getHistory } from './db.js';

export async function showDashboard() {
  let showDashboard = true;

  while (showDashboard) {
    // Get stats
    const captures = getCaptures(100);
    const messages = getHistory(50);
    const todayCaptures = captures.filter(c => {
      const captureDate = new Date(c.created_at).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      return captureDate === today;
    }).length;

    // Display header
    console.clear();
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║        🧠 Second Brain Dashboard       ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('📊 Quick Stats:');
    console.log(`   Total Captures: ${captures.length}`);
    console.log(`   Today's Captures: ${todayCaptures}`);
    console.log(`   Conversation History: ${messages.length} messages\n`);

    if (captures.length > 0) {
      console.log('📝 Recent Captures:');
      captures.slice(0, 5).forEach((c, i) => {
        const preview = (c.title + (c.body ? ' - ' + c.body : '')).substring(0, 50);
        console.log(`   ${i + 1}. [${c.category}] ${preview}${preview.length > 50 ? '...' : ''}`);
      });
      console.log();
    }

    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'start', label: '▶️  Start Second Brain', hint: 'begin chatting' },
        { value: 'status', label: '📋 System Status' },
        { value: 'export', label: '📤 Export Captures' },
        { value: 'config', label: '⚙️  Settings' },
        { value: 'help', label: '❓ Help & Docs' },
        { value: 'exit', label: '🚪 Exit' }
      ]
    });

    if (p.isCancel(action)) {
      console.log('\nGoodbye! 👋');
      process.exit(0);
    }

    switch (action) {
      case 'start':
        return; // Exit dashboard and start server

      case 'status':
        await showStatus();
        break;

      case 'export':
        await exportCaptures();
        break;

      case 'config':
        await showConfig();
        break;

      case 'help':
        await showHelp();
        break;

      case 'exit':
        console.log('\nGoodbye! 👋');
        process.exit(0);
    }
  }
}

async function showStatus() {
  console.clear();
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          📋 System Status             ║');
  console.log('╚════════════════════════════════════════╝\n');

  const envPath = '.env';
  if (!existsSync(envPath)) {
    console.log('❌ Configuration not found. Please run setup first.');
    console.log('\nRun: node bin/cli.js setup\n');
    await p.confirm({ message: 'Back to dashboard?' });
    return;
  }

  const env = Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => l.split('=').map((s) => s.trim()))
  );

  console.log('✅ Configuration Status:');
  console.log(`   Channel: ${env.CHANNEL || '❌ Not set'}`);
  console.log(`   Storage Backend: ${env.STORAGE_BACKEND || '❌ Not set'}`);
  console.log(`   Groq API: ${env.GROQ_API_KEY ? '✅ Configured' : '❌ Not set'}`);
  console.log(`   Google OAuth: ${env.GOOGLE_REFRESH_TOKEN ? '✅ Configured' : '❌ Not set'}`);

  if (env.CHANNEL === 'telegram') {
    console.log(`   Telegram Bot: ${env.TELEGRAM_BOT_TOKEN ? '✅ Configured' : '❌ Not set'}`);
    console.log(`   Telegram Chat: ${env.TELEGRAM_CHAT_ID || '❌ Not set'}`);
  }

  console.log('\n📁 Database Status:');
  if (existsSync('memory.db')) {
    console.log('   ✅ Database found');
  } else {
    console.log('   ⚠️  Database will be created on first run');
  }

  await p.confirm({ message: 'Back to dashboard?' });
}

async function exportCaptures() {
  console.clear();
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║         📤 Export Captures            ║');
  console.log('╚════════════════════════════════════════╝\n');

  const captures = getCaptures();
  const format = await p.select({
    message: 'Export format:',
    options: [
      { value: 'json', label: 'JSON' },
      { value: 'csv', label: 'CSV' },
      { value: 'markdown', label: 'Markdown' }
    ]
  });

  if (p.isCancel(format)) return;

  let content = '';
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `captures-${timestamp}.${format === 'markdown' ? 'md' : format}`;

  if (format === 'json') {
    content = JSON.stringify(captures, null, 2);
  } else if (format === 'csv') {
    content = 'Date,Category,Title,Content\n';
    captures.forEach(c => {
      const date = new Date(c.created_at).toLocaleDateString();
      content += `"${date}","${c.category}","${c.title}","${(c.body || '').replace(/"/g, '""')}"\n`;
    });
  } else if (format === 'markdown') {
    content = '# Second Brain Export\n\n';
    let currentCategory = '';
    captures.forEach(c => {
      if (c.category !== currentCategory) {
        currentCategory = c.category;
        content += `\n## ${c.category}\n\n`;
      }
      content += `### ${c.title}\n`;
      if (c.body) content += `${c.body}\n\n`;
    });
  }

  // Save file
  const fs = await import('fs');
  fs.writeFileSync(filename, content);
  console.log(`\n✅ Exported to ${filename}`);
  await p.confirm({ message: 'Back to dashboard?' });
}

async function showConfig() {
  console.clear();
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          ⚙️  Settings                ║');
  console.log('╚════════════════════════════════════════╝\n');

  const action = await p.select({
    message: 'Configuration:',
    options: [
      { value: 'reconfigure', label: '🔄 Reconfigure Setup' },
      { value: 'resetdb', label: '🗑️  Reset Database' },
      { value: 'back', label: '← Back to Dashboard' }
    ]
  });

  if (p.isCancel(action) || action === 'back') return;

  if (action === 'reconfigure') {
    const { setup } = await import('./setup.js');
    await setup();
    process.exit(0);
  }

  if (action === 'resetdb') {
    const confirm = await p.confirm({
      message: '⚠️  This will delete all captures and conversation history. Continue?'
    });

    if (confirm) {
      const fs = await import('fs');
      try {
        fs.rmSync('memory.db', { force: true });
        fs.rmSync('memory.db-shm', { force: true });
        fs.rmSync('memory.db-wal', { force: true });
        console.log('\n✅ Database reset successfully');
      } catch (err) {
        console.log(`\n❌ Error: ${err.message}`);
      }
    }
    await p.confirm({ message: 'Back to dashboard?' });
  }
}

async function showHelp() {
  console.clear();
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║         ❓ Help & Documentation       ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('📚 Quick Start Guide:\n');
  console.log('1. SETUP (one-time):');
  console.log('   $ node bin/cli.js setup\n');

  console.log('2. RUN SERVER:');
  console.log('   $ npm start\n');

  console.log('3. START CHATTING:');
  console.log('   - Type in terminal, messages sync to Telegram');
  console.log('   - Send messages via Telegram, they appear in terminal\n');

  console.log('💡 Usage Tips:\n');
  console.log('• CAPTURE: "check this: https://example.com"');
  console.log('• TASK: "remember to do X by friday"');
  console.log('• REMINDER: "remind me at 3pm to call mom"');
  console.log('• RECALL: "what did I save about react?"');
  console.log('• CONVERSATION: just chat normally\n');

  console.log('🔗 Resources:');
  console.log('• Documentation: https://github.com/anomalyco/second-brain');
  console.log('• Issues: https://github.com/anomalyco/second-brain/issues\n');

  await p.confirm({ message: 'Back to dashboard?' });
}
