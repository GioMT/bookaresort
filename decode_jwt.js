const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1YnV3cmp3a2Z4aHB1dnRsZ2dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE4MTg1NywiZXhwIjoyMDkxNzU3ODU3fQ.kz1_ydC7DtYvxdKuzkDsqa7QltOJHTEwBQFlit0gKSs';
const decoded = jwt.decode(token);
console.log("Decoded Token:", decoded);
