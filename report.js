const {SerenityParser, AllureParser} = require("./parser");

class Report {
    serenityReport = {
        sourceFile: "json",
        dataTable: "dataTable",
        testSuiteParent: "featureTag",
        testSuiteChild: "name",
        testCaseTitle: "title",
        testSteps: "testSteps",
        status: "result",
        linkedItem: "coreIssues",
        statusMap: {
            'SUCCESS': 'Passed',
            'ERROR': 'Failed',
            'FAILURE': 'Failed',
            'SKIPPED': 'NotExecuted',
            'IGNORED': 'NotApplicable'
        }
    };
    allureReport = {
        sourceFile: "result.json",
        testCaseTitle: "name",
        testSteps: "steps",
        status: "status",
        statusMap: {
            'passed': 'Passed',
            'failed': 'Failed',
            'skipped': 'NotExecuted'
        }
    };

    constructor(type) {
        this.type = type;
        switch (type) {
            case 'SerenityReport': {
                this.fields = this.serenityReport;
                this.parser = new SerenityParser(this.fields);
                break;
            }
            case 'AllureReport': {
                this.fields = this.allureReport;
                this.parser = new AllureParser(this.fields);
                break;
            }
            default:
                console.log(`${type} type is not supported.`);
        }
    }
}

module.exports = Report;
