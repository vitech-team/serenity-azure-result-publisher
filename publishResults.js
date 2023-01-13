const fs = require('fs')
const devAzureClient = require('./devAzureClient.js')
require('dotenv').config();


class PublishResults {
    azure = new devAzureClient({
        'userName': process.env.AZURE_USER_NAME,
        'token': process.env.AZURE_TOKEN,
        'organization': process.env.AZURE_ORGANIZATION,
        'projectId': process.env.AZURE_PROJECT_ID,
        'testPlanId': process.env.AZURE_TEST_PLAN_ID,
        'testSuiteParentId': process.env.AZURE_TEST_SUITE_PARENT_ID
    });


    statusMap = {
        'SUCCESS': 'Passed',
        'ERROR': 'Failed',
        'FAILURE': 'Failed',
        'SKIPPED': 'NotExecuted',
        'IGNORED': 'NotApplicable'
    };

    chunkSize = process.env.AZURE_CHUNK_SIZE || 10;


    getListOfFiles(src = process.env.JSON_INPUT_PATH) {
        let jsonFiles = [];
        let files = fs.readdirSync(src)
        files.forEach(file => {
            if (file.includes('json')) {
                jsonFiles.push(file)
            }
            ;
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

    getTestCaseName(json, testCaseSequence) {
        let testCaseName = json.title;
        if (json.dataTable) {
            for (let paramSequence = 0; paramSequence < json.dataTable.rows[testCaseSequence].values.length; paramSequence++) {
                if (json.dataTable.rows[testCaseSequence].values[paramSequence] != 'null') {
                    testCaseName = testCaseName + `: ${json.dataTable.rows[testCaseSequence].values[paramSequence]}`
                }
            }
        }
        return testCaseName

    }

    addStep(step) {
        return {
            "parameterizedString": [{'#text': step}, {'#text': ""}]
        }
    }

    addResult(name, testCaseId, testPointId, testSuiteId, testCaseObject) {
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
            "outcome": this.statusMap[testCaseObject.result],
            "state": "Completed"
        }
        if (testCaseObject.exception) {
            let exception = JSON.stringify(testCaseObject.exception, undefined, 4)
            result.stackTrace = exception
        }
        return result;
    }

    processFiles(files) {
        return new Promise((resolve) => {
            let result = []
            files.forEach(file => {
                let json = this.readContent(file);
                let folderName = json.featureTag.name.split('/')[0];
                let suiteId = this.azure.getSuiteIdByTitle(folderName);
                if (json.result !== "IGNORED") {
                    for (let testCaseSequence = 0; testCaseSequence < json.testSteps.length; testCaseSequence++) {
                        let testCaseName = this.getTestCaseName(json, testCaseSequence)
                        let steps = []
                        let testCaseKey = this.azure.getTestCaseIdByTitle(testCaseName, suiteId)
                        this.azure.addTestCaseIssueLink(testCaseKey, json.coreIssues)
                        let testCaseObject = json.testSteps[testCaseSequence]
                        let testSteps = testCaseObject.children;
                        let testPointId = this.azure.getTestPoints(suiteId, testCaseKey)
                        result.push(this.addResult(testCaseName, testCaseKey, testPointId, suiteId, testCaseObject))
                        if (json.dataTable == null) {
                            testCaseSequence = 9999
                            testSteps = json.testSteps
                        }
                        if (testSteps) {
                            testSteps.forEach(step => {
                                steps.push(this.addStep(step.description))
                            });
                        }
                        this.azure.addStepsToTestCase(testCaseKey, steps)
                    }
                }
            });
            resolve(result);
        })
    }


    processResults() {
        let processedFiles = []
        let testRunId = this.azure.addTestRun()
        let jsonFiles = this.getListOfFiles();
        let jsonSlices = this.sliceArray(jsonFiles);
        jsonSlices.forEach(jsonSlice => {
            processedFiles.push(this.processFiles(jsonSlice))
        })
        Promise.all(processedFiles).then((resultsArray) => {
            let results = []
            resultsArray.forEach(resultItem => {
                results = [...resultItem,...results]
            })
            this.azure.publishResults(testRunId, results)
            this.azure.completeTestRun(testRunId)
        }).catch((error) => {
            console.log(error)
        })
    }
}

module.exports = PublishResults;
