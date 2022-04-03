const fs = require('fs')
const devAzureClient = require('./devAzureClient.js')


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
        'SKIPPED': ''
    };


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

    addStep(step) {
        return {
            "parameterizedString": [{'#text': step}, {'#text': ""}]
        }
    }


    addActualResult(step) {
        let actualResult = ''
        if (step.screenshots) {
            let imgUrl = `https://${process.env.SERENITY_REPORT_DOMAIN}/${process.env.RUN_ID}/${step.screenshots[0].screenshot}`
            let resultImg = `<img src="${imgUrl}" />`
            actualResult = actualResult.concat(resultImg)
        }
        if (step.exception) {
            let exception = JSON.stringify(step.exception, undefined, 4)
            exception = exception.replace(/\n/g, `<br>`)
            exception = exception.replace(/\s/g, `&emsp;`)
            actualResult = actualResult.concat(`<b>Stacktrace:</b><br>${exception}`)
        }
        return actualResult
    }

    addStepResult(step) {
        let result = {}
        if (step.result == undefined) {
            step.children.forEach(child => {
                if (['FAILURE', 'ERROR'].includes(child.result)) {
                    step = child
                }
            })
        }
        result.statusName = this.statusMap[step.result]
        let actualResult = this.addActualResult(step)
        if (actualResult) {
            result.actualResult = actualResult
        }
        return result;
    }

    addResult(name, testCaseId, testPointId, testSuiteId, status) {
        return {
            "testCaseTitle": name, "testCaseRevision": 1, "testCase": {
                "id": testCaseId
            }, "testPoint": {
                "id": testPointId
            }, "testSuite": {
                "id": testSuiteId
            }, "testPlan": {
                "id": process.env.AZURE_TEST_PLAN_ID
            }, "outcome": status, "state": "Completed"
        }
    }

    processResults() {
        let result = []
        let testRunId = this.azure.addTestRun()
        let jsonFiles = this.getListOfFiles();
        for (let fileNameSequence = 0; fileNameSequence < jsonFiles.length; fileNameSequence++) {
            let json = this.readContent(jsonFiles[fileNameSequence]);
            let folderName = json.featureTag.name.split('/')[0];
            let suiteId = this.azure.getSuiteIdByTitle(folderName);
            let groupName = json.featureTag.name.split('/')[1];
            for (let testCaseSequence = 0; testCaseSequence < json.testSteps.length; testCaseSequence++) {
                let testCaseName = groupName;
                for (let paramSequence = 0; paramSequence < json.dataTable.rows[testCaseSequence].values.length; paramSequence++) {
                    testCaseName = testCaseName + `: ${json.dataTable.rows[testCaseSequence].values[paramSequence]}`
                }
                let steps = []
                let testCaseKey = this.azure.getTestCaseIdByTitle(testCaseName, suiteId)
                this.azure.addTestCaseIssueLink(testCaseKey, json.coreIssues)
                let testSteps = json.testSteps[testCaseSequence].children;
                let testCaseResult = this.statusMap[json.result]
                let testPointId = this.azure.getTestPoints(suiteId, testCaseKey)
                result.push(this.addResult(testCaseName, testCaseKey, testPointId, suiteId, testCaseResult))
                testSteps.forEach(step => {
                    steps.push(this.addStep(step.description))
                    // result.push(this.addStepResult(step))
                });
                this.azure.addStepsToTestCase(testCaseKey, steps)
            }
        }
        this.azure.publishResults(testRunId, result)
    }

}

module.exports = PublishResults;
