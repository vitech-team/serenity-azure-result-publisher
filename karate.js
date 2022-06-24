const PublishResults = require("./publishResults.js");

let publish = new PublishResults()

let start = Date.now()
publish.processKarateResults()
console.log(`Elapsed time: ${(Date.now()-start)/1000}`)
