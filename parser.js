require('./report.js')

class SerenityParser {
    constructor(fields) {
        this.fields = fields;
    }

    parse(json) {
        let parsedReport = [];
        if (!json[this.fields.status].includes("IGNORED")) {
            let folderName = this.getFolderName(json);
            let linkedItems = json.coreIssues;
            for (let testCaseSequence = 0; testCaseSequence < json[this.fields.testSteps].length; testCaseSequence++) {
                let testCaseName = this.getTestCaseName(json, testCaseSequence);

                let testSteps = [];
                let steps = json[this.fields.testSteps][testCaseSequence].children;
                if (json.dataTable == null) {
                    testCaseSequence = 9999
                    steps = json[this.fields.testSteps]
                }
                if (steps) {
                    steps.forEach(step => {
                        testSteps.push(this.addStep(step.description))
                    });
                }

                let status = this.fields.statusMap[json[this.fields.status]];

                parsedReport.push({
                    folderName: folderName,
                    testCaseName: testCaseName,
                    testSteps: testSteps,
                    linkedItems: linkedItems,
                    status: status
                });
            }
        }
        return parsedReport;
    }

    getFolderName(json) {
        return json.featureTag.name.split('/')[0];
    }

    getTestCaseName(json, testCaseSequence) {
        let testCaseName = json[this.fields.testCaseTitle];
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
}

class AllureParser {
    constructor(fields) {
        this.fields = fields;
    }

    parse(json) {
        let parsedReport = [];
        if (!json[this.fields.status].includes("skipped")) {
            let folderName = this.getFolderName(json);
            let testCaseName = json[this.fields.testCaseTitle];
            let testSteps = [];
            let linkedItems = json.links.map(element => element.name);
            let status = this.fields.statusMap[json[this.fields.status]];
            parsedReport.push({
                folderName: folderName,
                testCaseName: testCaseName,
                testSteps: testSteps,
                linkedItems: linkedItems,
                status: status
            })
        }
        return parsedReport;
    }

    getFolderName(json) {
        let packages = json.labels[6].value.split('.');
        let packageIndex = packages.length - 2;
        return packages[packageIndex];
    }
}

module.exports = {
    SerenityParser: SerenityParser,
    AllureParser: AllureParser
}
