const fs = require('fs')
const devAzureClient = require('./devAzureClient.js')
const report = require('./report.js')
require('dotenv').config();


class PublishResults {
    azure = new devAzureClient({
        'userName': process.env.AZURE_USER_NAME,
        'token': process.env.AZURE_TOKEN,
        'organization': process.env.AZURE_ORGANIZATION,
        'projectId': process.env.AZURE_PROJECT_ID,
        'azureAreaPath': process.env.AZURE_AREA_PATH,
        'testPlanId': process.env.AZURE_TEST_PLAN_ID,
        'testSuiteParentId': process.env.AZURE_TEST_SUITE_PARENT_ID
    });
    report = new report(process.env.REPORT_TYPE || "SerenityReport");
    chunkSize = process.env.AZURE_CHUNK_SIZE || 10;

    getListOfFiles(src = process.env.JSON_INPUT_PATH) {
        let jsonFiles = [];
        let files = fs.readdirSync(src)
        files.forEach(file => {
            if (file.includes(this.report.fields.sourceFile)) {
                jsonFiles.push(file)
            }
        });
        return jsonFiles;
    }

    readContent(filename) {
        return JSON.parse(fs.readFileSync(process.env.JSON_INPUT_PATH + filename))
    }

    sliceArray(array, chunkSize = this.chunkSize) {
        chunkSize = Number.parseInt(chunkSize)
        let result = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            result.push(array.slice(i, i + chunkSize));
        }
        return result;
    }

    addResult(name, testCaseId, testPointId, testSuiteId, parsedTest) {
        let result = {
            "testCaseTitle": name, "testCaseRevision": 1, "testCase": {
                "id": testCaseId
            },
            "testPoint": {
                "id": testPointId
            },
            "testSuite": {
                "id": testSuiteId
            },
            "testPlan": {
                "id": process.env.AZURE_TEST_PLAN_ID
            },
            "outcome": parsedTest.status,
            "state": "Completed"
        }
        if (parsedTest.exception) {
            result.stackTrace = JSON.stringify(parsedTest.exception, undefined, 4)
        }
        return result;
    }

    processFiles(files) {
        return new Promise(async (resolve) => {
            let result = []
            for (const file of files) {
                let json = this.readContent(file);
                let parsedTests = this.report.parser.parse(json);
                if (parsedTests.length > 0) {
                    let suiteId = await this.azure.getSuiteIdByTitle(parsedTests[0].folderName);
                    for (let parsedTest of parsedTests) {
                        let testCaseKey = await this.azure.getTestCaseIdByTitle(parsedTest.testCaseName, suiteId);
                        await this.azure.addTestCaseIssueLink(testCaseKey, parsedTest.linkedItems);
                        let testPointId = await this.azure.getTestPoints(suiteId, testCaseKey);
                        result.push(this.addResult(parsedTest.testCaseName, testCaseKey, testPointId, suiteId, parsedTest))
                        await this.azure.addStepsToTestCase(testCaseKey, parsedTest.testSteps)
                    }
                }
            }
            resolve(result);
        })
    }

    async processResults() {
        let processedFiles = []
        let testRunId = await this.azure.addTestRun()
        let jsonFiles = this.getListOfFiles();
        let jsonSlices = this.sliceArray(jsonFiles);
        for (const jsonSlice of jsonSlices) {
            processedFiles.push(this.processFiles(jsonSlice))
        }
        Promise.all(processedFiles).then(async (resultsArray) => {
            let results = []
            resultsArray.forEach(resultItem => {
                results = [...resultItem, ...results]
            })
            if (results.length > 0) {
                await this.azure.publishResults(testRunId, results)
            }
            await this.azure.completeTestRun(testRunId)
        }).catch((error) => {
            console.log(error)
        })
    }
}

module.exports = PublishResults;
