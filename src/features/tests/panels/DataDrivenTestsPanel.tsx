import { useTranslation } from 'react-i18next';
import SimpleSelect from 'src/components/inputs/SimpleSelect';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import Panel from 'src/components/panels/Panel';
import { getDatasets } from 'src/constants/datasets';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBodyParameters,
  selectDataDrivenTests,
  selectIsDataDrivenRunning,
  selectQueryParameters,
  selectSelectedRequestId,
  selectTestEngineConfiguration,
} from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';
import { testsActions } from 'src/store/slices/testsSlice';
import {
  determineRequestParameterTestStatus,
  determineTestStatus,
  ERROR_RESPONSE_EXPECTED,
  generateEnumTestData,
  SUCCESS_RESPONSE_EXPECTED,
} from 'src/test-engine';
import TestsTable, { ExpandedTestComponent, getTestsTableColumns, TestsTableHeader } from '../tables/TestsTable';

export default function DataDrivenTestsPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const dataDrivenTests = useAppSelector(selectDataDrivenTests);
  const isDataDrivenRunning = useAppSelector(selectIsDataDrivenRunning);
  const bodyParameters = useAppSelector(selectBodyParameters);
  const queryParameters = useAppSelector(selectQueryParameters);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const testEngineConfiguration = useAppSelector(selectTestEngineConfiguration);

  const datasets = getDatasets(testEngineConfiguration.email.domain);

  return (
    <Panel title={<TestsTableHeader tests={dataDrivenTests} title={t('tests.dataDrivenTests')} />}>
      <TestsTable
        columns={[
          ...getTestsTableColumns(['Parameter', 'Value'], t),
          {
            name: t('tables.expected'),
            selector: (row) => row.expected,
            cell: (row, id) => {
              const readOnlyCell = (
                <div className="pl-0.5" data-column-id={id} data-tag="allowRowEvents">
                  {row.expected}
                </div>
              );

              const isBodyParameter = row.name.startsWith('body.');
              const isQueryParameter = row.name.startsWith('query.');

              if (!isBodyParameter && !isQueryParameter) return readOnlyCell;

              const parameters = isBodyParameter ? bodyParameters : queryParameters;
              const name = row.name.replace(/^(body|query)\./, '');
              const parameter = parameters[name];

              if (!parameter) return readOnlyCell;

              let dataset = datasets[parameter.type]?.find((item) => item.value === row.value);

              // Dynamic test configurability: 2xx and 4xx.
              // Handles dynamically generated test cases for enum type.
              if (!dataset && parameter.type === 'enum') {
                if (/^ {3}(.*) {3}$/.test(row.value)) dataset = { value: row.value, valid: false };
                else {
                  const enumDatasets = generateEnumTestData(parameter.value as string);
                  dataset = enumDatasets.find((enumDataset) => enumDataset.value === row.value && !enumDataset.valid);
                }
              }

              if (!dataset) return readOnlyCell;

              return (
                <SimpleSelect
                  className="pl-0 text-[13px] bg-transparent border-none"
                  options={[
                    { value: SUCCESS_RESPONSE_EXPECTED, label: SUCCESS_RESPONSE_EXPECTED },
                    { value: ERROR_RESPONSE_EXPECTED, label: ERROR_RESPONSE_EXPECTED },
                  ]}
                  value={row.expected}
                  onChange={(event) => {
                    const expected = event.target.value as string;
                    const valid = expected === SUCCESS_RESPONSE_EXPECTED;
                    const testData = { value: row.value, valid };
                    const overrides = [...(parameter.overrides ?? [])];
                    const index = overrides.findIndex((item) => item.value === testData.value);

                    if (index !== -1) {
                      if (dataset.valid === testData.valid) overrides.splice(index, 1);
                      else overrides[index] = testData;
                    } else overrides.push(testData);

                    if (isBodyParameter)
                      dispatch(
                        requestActions.setBodyParameters({
                          ...bodyParameters,
                          [name]: { ...parameter, overrides },
                        }),
                      );
                    else
                      dispatch(
                        requestActions.setQueryParameters({
                          ...queryParameters,
                          [name]: { ...parameter, overrides },
                        }),
                      );

                    if (!row.response) return;

                    const { actual, status } = determineTestStatus(row.response, (response, statusCode) =>
                      determineRequestParameterTestStatus(response, statusCode, testData),
                    );
                    const testResult = { ...row, actual, expected, status };

                    dispatch(testsActions.updateDataDrivenTest(testResult));

                    if (selectedRequestId)
                      dispatch(
                        testsActions.updateDataDrivenTestResults({
                          requestId: selectedRequestId,
                          result: testResult,
                        }),
                      );
                  }}
                />
              );
            },
          },
          ...getTestsTableColumns(['Actual', 'Result'], t),
        ]}
        expandableRows
        expandableRowsComponent={ExpandedTestComponent}
        expandOnRowClicked
        data={dataDrivenTests}
        fixedHeader={true}
        fixedHeaderScrollHeight="720px"
        progressComponent={<LoaderWithText text={t('tests.runningDataDrivenTests')} />}
        progressPending={isDataDrivenRunning}
      />
    </Panel>
  );
}
