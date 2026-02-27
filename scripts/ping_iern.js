// Ping Unit 1 endpoint – verify IERN is returned
fetch('http://localhost:3000/api/schools_iern/134295')
  .then(r => r.json())
  .then(d => console.log("IERN Lookup:", JSON.stringify(d, null, 2)))
  .catch(console.error);
