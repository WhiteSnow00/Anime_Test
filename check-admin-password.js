const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function checkAdminPassword() {
  const uri = 'mongodb+srv://kazenosakura100:animelovefanam1@ayaya.jtefs5i.mongodb.net/';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('anime_streaming');
    const adminsCollection = db.collection('admins');
    
    // Get the admin user
    const admin = await adminsCollection.findOne({ username: 'admin' });
    
    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }
    
    console.log('👤 Admin user found:');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password Hash: ${admin.passwordHash}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Active: ${admin.isActive}`);
    
    // Test various passwords
    const testPasswords = ['826264', 'admin', 'password', 'animelovefanam1'];
    
    console.log('\n🔍 Testing passwords:');
    for (const testPassword of testPasswords) {
      const isMatch = await bcrypt.compare(testPassword, admin.passwordHash);
      console.log(`   ${testPassword}: ${isMatch ? '✅ MATCH' : '❌ No match'}`);
    }
    
    // Option to reset password to 826264
    console.log('\n🔄 Resetting password to "826264"...');
    const newPasswordHash = await bcrypt.hash('826264', 10);
    
    await adminsCollection.updateOne(
      { username: 'admin' },
      { 
        $set: { 
          passwordHash: newPasswordHash,
          isActive: true 
        } 
      }
    );
    
    console.log('✅ Password reset successful!');
    console.log('🔑 You can now login with password: 826264');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkAdminPassword();
