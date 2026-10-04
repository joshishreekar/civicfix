import bcrypt from 'bcryptjs';
const password=process.argv[2];
if(!password){console.error('Usage: node utils/generateHash.js "Password"');process.exit(1);}
console.log(await bcrypt.hash(password,12));
