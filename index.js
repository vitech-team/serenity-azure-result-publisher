const PublishResults = require("./publishResults.js");

let publish = new PublishResults()

let start = Date.now()
publish.processResults().then(() => {
    console.log(`Elapsed time: ${(Date.now()-start)/1000}`)
})
