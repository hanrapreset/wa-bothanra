const { makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  // ✅ Ganti nomor HP kamu di sini (format internasional tanpa +)
  if (!sock.authState.creds.registered) {
    const phoneNumber = '6282265496001'; // ← GANTI INI
    const code = await sock.requestPairingCode(phoneNumber);
    console.log(`\n🔑 Pairing Code kamu: ${code}\n`);
    console.log('Masukkan kode ini di WhatsApp > Perangkat Tertaut > Tautkan dengan Nomor Telepon');
  }

  sock.ev.on('creds.update', saveCreds);

  // ✅ Auto-lihat status dengan delay 10 detik
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') {
        const sender = msg.key.participant || msg.key.remoteJid;
        console.log(`📸 Status baru dari: ${sender}`);

        await delay(10000); // Tunggu 10 detik

        try {
          await sock.readMessages([msg.key]);
          console.log(`✅ Status dari ${sender} sudah dilihat`);
        } catch (err) {
          console.error('Gagal read status:', err.message);
        }
      }
    }
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('✅ Bot terhubung!');
    } else if (connection === 'close') {
      console.log('❌ Koneksi terputus, reconnecting...');
      startBot();
    }
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

startBot();
