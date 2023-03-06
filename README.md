# serenity-zephyr-result-publisher

## Configuration publisher
```
JSON_INPUT_PATH= #path_to_report_results
REPORT_TYPE=#report_type
AZURE_ORGANIZATION=#devops_azure_organization
AZURE_PROJECT_ID=#devops_azure_project_id
AZURE_AREA_PATH=#devops_azure_area_path
AZURE_TEST_PLAN_ID=#devops_azure_test_plan_id
AZURE_TEST_SUITE_PARENT_ID=#devops_azure_test_suite-parent_id
AZURE_USER_NAME=#devops_azure_user_name
AZURE_TOKEN=#devops_azure_token
SERENITY_REPORT_DOMAIN= #domain_where_serenity_report_results_will_be_published
RUN_ID= #run_id_on_CI
BRANCH_NAME= #branch_name
```
## Execution
```
npm run publisher
```

