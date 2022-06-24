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


    getListOfFiles(src = process.env.SERENITY_JSON_INPUT_PATH) {
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
        return JSON.parse(fs.readFileSync(process.env.SERENITY_JSON_INPUT_PATH + filename))
    }

    addStep(step) {
        return {
            "parameterizedString": [{'#text': step}, {'#text': ""}]
        }
    }

    addKarateStep(step){
        step = [step.prefix, step.text, step.docString].filter(Boolean).join(" ");
        return this.addStep(step)
    }

    addResult(name, testCaseId, testPointId, testSuiteId, testCaseObject) {
        let result = {
            "testCaseTitle": name, "testCaseRevision": 1, "testCase": {
                "id": testCaseId
            }, "testPoint": {
                "id": testPointId
            }, "testSuite": {
                "id": testSuiteId
            }, "testPlan": {
                "id": process.env.AZURE_TEST_PLAN_ID
            }, "outcome": this.statusMap[testCaseObject.result], "state": "Completed"
        }
        if (testCaseObject.exception) {
            let exception = JSON.stringify(testCaseObject.exception, undefined, 4)
            result.stackTrace = exception
        }
        return result;
    }

    addKarateResult(testCaseId, testPointId, testSuiteId, testCase) {
        let status = ''
        if (testCase.failed) {
            status = 'Failed'
        } else {
            status = 'Passed'
        }

        let result = {
            "testCaseTitle": testCase.name, "testCaseRevision": 1, "testCase": {
                "id": testCaseId
            }, "testPoint": {
                "id": testPointId
            }, "testSuite": {
                "id": testSuiteId
            }, "testPlan": {
                "id": process.env.AZURE_TEST_PLAN_ID
            }, "outcome": status, "state": "Completed"
        }
        if (testCase.error) {
            // let exception = JSON.stringify(testCase.error, undefined, 4)
            // result.stackTrace = exception
            result.stackTrace = testCase.error

        }
        return result;
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
                console.log(json)
                for (let paramSequence = 0; paramSequence < json.dataTable.rows[testCaseSequence].values.length; paramSequence++) {
                    testCaseName = testCaseName + `: ${json.dataTable.rows[testCaseSequence].values[paramSequence]}`
                }
                let steps = []
                let testCaseKey = this.azure.getTestCaseIdByTitle(testCaseName, suiteId)
                this.azure.addTestCaseIssueLink(testCaseKey, json.coreIssues)
                let testCaseObject = json.testSteps[testCaseSequence]
                let testSteps = testCaseObject.children;
                let testPointId = this.azure.getTestPoints(suiteId, testCaseKey)
                result.push(this.addResult(testCaseName, testCaseKey, testPointId, suiteId, testCaseObject))

                if (testSteps) {
                    testSteps.forEach(step => {
                        steps.push(this.addStep(step.description))
                    });
                }
                this.azure.addStepsToTestCase(testCaseKey, steps)
            }
        }
        this.azure.publishResults(testRunId, result)
        this.azure.completeTestRun(testRunId)
    }

    processKarateResults() {
        let result = []
        let testRunId = this.azure.addTestRun()
        let jsonFiles = this.getListOfFiles();
        for (let fileNameSequence = 0; fileNameSequence < jsonFiles.length; fileNameSequence++) {
            let json = this.readContent(jsonFiles[fileNameSequence]);
            let folderName = json.relativePath.split('/')[1];
            let suiteId = this.azure.getSuiteIdByTitle(folderName);
            for (let testCaseSequence = 0; testCaseSequence < json.scenarioResults.length; testCaseSequence++) {
                let testCase = json.scenarioResults[testCaseSequence]
                let testCaseKey = this.azure.getTestCaseIdByTitle(testCase.name, suiteId)
                let issues = this.getKarateIssues(testCase.tags)
                this.azure.addTestCaseIssueLink(testCaseKey, issues)
                let steps = []
                let testSteps = testCase.stepResults;
                let testPointId = this.azure.getTestPoints(suiteId, testCaseKey)
                result.push(this.addKarateResult(testCaseKey, testPointId, suiteId, testCase))

                if (testSteps) {
                    testSteps.forEach(step => {
                        steps.push(this.addKarateStep(step.step))
                    });
                }
                this.azure.addStepsToTestCase(testCaseKey, steps)
            }
        }
        this.azure.publishResults(testRunId, result)
        this.azure.completeTestRun(testRunId)
    }

    getKarateIssues(tags) {
        let issues = []
        if (tags){
        for (let i = 0; i < tags.length; i++) {
            let issue =  tags[i].split('issue=')[1]
            if (issue){
                issues.push(issue)
            }
        }
        return issues
    }}
}


module.exports = PublishResults;
