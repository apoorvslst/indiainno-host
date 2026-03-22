require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'civicsync' });
    const users = await User.find({}).select('_id email role active').limit(20).lean();
    console.log('USER_COUNT=' + users.length);
    if (!users.length) {
      await mongoose.disconnect();
      return;
    }

    const user = users.find(u => u.role === 'user' && u.active) || users[0];
    console.log('TEST_USER=' + user.email + '|' + user.role);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '10m' });

    const res = await fetch('http://localhost:5000/api/tickets/my-complaints', {
      headers: { Authorization: 'Bearer ' + token }
    });

    console.log('STATUS=' + res.status);
    const body = await res.text();
    console.log('BODY=' + body.slice(0, 1200));

    await mongoose.disconnect();
  } catch (e) {
    console.error('SCRIPT_ERR=' + (e && e.stack ? e.stack : e));
    process.exit(1);
  }
})();
