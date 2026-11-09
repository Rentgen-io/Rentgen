import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { IconButton } from 'src/components/buttons/IconButton';
import Toggle from 'src/components/inputs/Toggle';
import Loader from 'src/components/loaders/Loader';
import { JsonDiffViewer } from 'src/components/viewers/JsonDiffViewer';
import { useAppDispatch } from 'src/store/hooks';
import { testsActions } from 'src/store/slices/testsSlice';
import { ORIGINAL_REQUEST_TEST_PARAMETER_NAME } from 'src/test-engine';
import { HttpBody, HttpRequest, HttpResponse, TestResult, TestResults } from 'src/types';
import { detectObjectType, truncateValue } from 'src/utils';
import { twMerge } from 'tailwind-merge';
import PotentialBugsTable, { PotentialBug } from '../tables/PotentialBugsTable';

import ClearCrossIcon from 'src/assets/icons/clear-cross-icon.svg';

interface Props {
  items: TestResults[];
  response: HttpResponse;
}

export default function TestResultsComparisonPanel({ items, response }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [diffReady, setDiffReady] = useState<boolean>(false);
  const [showNoise, setShowNoise] = useState<boolean>(false);
  const [statistics, setStatistics] = useState({
    percent: 0,
    added: 0,
    removed: 0,
    unchanged: 0,
  });
  const [tabIndex, setTabIndex] = useState<number>(0);

  const noisePaths = useMemo(() => {
    if (items.length < 2) return null;

    const originalResponse = items[0].dataDrivenTests.find(
      (test) => test.name === ORIGINAL_REQUEST_TEST_PARAMETER_NAME,
    )?.response;
    if (!originalResponse) return null;

    return findNoiseFields(originalResponse, response);
  }, [items, response]);

  const filteredItems = useMemo(() => {
    const filterTestArray = (tests: TestResult[]) =>
      tests.map((test) => {
        const updatedTest = { ...test };
        delete (updatedTest as { request?: HttpRequest | null }).request;

        return {
          ...updatedTest,
          response:
            !noisePaths || noisePaths.length === 0 || !updatedTest.response || showNoise
              ? updatedTest.response
              : removeNoiseFields(updatedTest.response, noisePaths),
        };
      });

    return items.map((item) => ({
      crudTests: filterTestArray(item.crudTests),
      dataDrivenTests: filterTestArray(item.dataDrivenTests),
      performanceTests: filterTestArray(item.performanceTests),
      securityTests: filterTestArray(item.securityTests),
    }));
  }, [items, noisePaths, showNoise]);

  const potentialBugs = useMemo(() => {
    if (items.length < 2) return null;

    const collectPotentialBugs = (
      originalTests: TestResult[],
      modifiedTests: TestResult[],
      matchByValue?: boolean,
    ): PotentialBug[] =>
      originalTests.flatMap((originalTest, index) => {
        const modifiedTest =
          modifiedTests.find(
            (test) => test.name === originalTest.name && (!matchByValue || test.value === originalTest.value),
          ) || (matchByValue ? modifiedTests[index] : null);
        const originalResponse = originalTest?.response;
        const modifiedResponse = modifiedTest?.response ?? null;
        const issues = compareHttpResponses(originalResponse, modifiedResponse);

        if (issues.length === 0) return [];

        return [
          {
            name: `⚠️ ${originalTest.name}` + (matchByValue ? ` (value: ${truncateValue(originalTest.value)})` : ''),
            issue: transformIssues(issues),
            originalResponse,
            modifiedResponse,
          },
        ];
      });

    return [
      ...collectPotentialBugs(items[0].securityTests, items[1].securityTests),
      ...collectPotentialBugs(items[0].performanceTests, items[1].performanceTests),
      ...collectPotentialBugs(items[0].dataDrivenTests, items[1].dataDrivenTests, true),
    ];
  }, [items]);

  const tabs = useMemo(
    () => [
      {
        component: (
          <div className="flex flex-col flex-auto h-0 gap-4 table-layout">
            {!potentialBugs || potentialBugs.length === 0 ? (
              <p className="m-0 p-3 text-xs text-green-700 dark:text-green-300 bg-green-500/10 border-green-500/30 text-center rounded">
                {t('comparison.noPotentialBugs')}
              </p>
            ) : (
              <PotentialBugsTable data={potentialBugs} />
            )}
            <Button className="w-fit self-end" onClick={() => setTabIndex(1)}>
              {t('comparison.showFullBehaviorChanges')}
            </Button>
          </div>
        ),
        label: t('comparison.potentialBugs'),
        panelClassName: 'p-4 overflow-hidden',
      },
      {
        component: (
          <div className="flex flex-col flex-auto h-0">
            <div className="flex flex-col gap-4 p-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {t('comparison.behaviorChange')} <strong>{statistics.percent}%</strong>
                </span>
                <span className="py-1 px-2 text-green-500 bg-green-500/10 rounded">+{statistics.added}</span>
                <span className="py-1 px-2 text-red-500 bg-red-500/10 rounded">-{statistics.removed}</span>
                <span className="py-1 px-2 text-muted-foreground bg-muted-foreground/10 rounded">
                  ={statistics.unchanged}
                </span>
              </div>
              <Toggle
                className="w-fit font-medium"
                label={t('comparison.showNoise')}
                disabled={!diffReady}
                onChange={(e) => {
                  setShowNoise(e.target.checked);
                  setDiffReady(false);
                }}
              />
            </div>
            <JsonDiffViewer
              className="flex-1 p-4 border-t border-border"
              data={filteredItems}
              calculateStatistics={setStatistics}
              isDiffReady={setDiffReady}
            />
          </div>
        ),
        label: t('comparison.fullBehaviorChanges'),
        isComputing: !diffReady,
      },
    ],
    [diffReady, filteredItems, potentialBugs, statistics, t],
  );

  return (
    <div className="relative flex flex-col flex-auto">
      <h5 className="m-0 py-3 px-4 bg-surface border-b border-border">{t('comparison.title')}</h5>
      <IconButton
        buttonType={ButtonType.SECONDARY_OUTLINE}
        className="absolute top-1.5 right-1.5"
        onClick={() => dispatch(testsActions.clearResultsToCompare())}
      >
        <ClearCrossIcon className="size-5" />
      </IconButton>
      {items.length < 2 ? (
        <p className="p-4 m-0">{t('comparison.noTestResults')}</p>
      ) : (
        <Tabs
          className="flex flex-col flex-auto overflow-hidden"
          forceRenderTabPanel
          selectedIndex={tabIndex}
          selectedTabClassName="text-foreground border-primary! cursor-default!"
          selectedTabPanelClassName="flex! flex-col flex-auto"
          onSelect={(index) => setTabIndex(index)}
        >
          <TabList className="flex gap-6 m-0 pt-3 pb-0 px-4 text-xs font-medium text-muted-foreground border-b border-border">
            {tabs.map(({ isComputing, label }) => (
              <Tab
                key={label}
                className="flex items-center gap-2 pb-2.5 border-b-2 border-transparent list-none outline-none truncate cursor-pointer"
                title={label}
              >
                {isComputing && <Loader className="size-4 shrink-0 [&>span]:border-2!" />}
                <span className="truncate">{label}</span>
              </Tab>
            ))}
          </TabList>

          {tabs.map(({ component, label, panelClassName }) => (
            <TabPanel key={label} className={twMerge('hidden overflow-hidden', panelClassName)}>
              {component}
            </TabPanel>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function findNoiseFields(firstObject: Record<string, any>, secondObject: Record<string, any>, path = ''): string[] {
  if (!firstObject || !secondObject) return [];

  const result: string[] = [];
  const keys = new Set<string>([...Object.keys(firstObject), ...Object.keys(secondObject)]);

  for (const key of keys) {
    const currentPath = path ? `${path}.${key}` : key;
    const firstValue = firstObject[key];
    const secondValue = secondObject[key];
    const bothObjects =
      typeof firstValue === 'object' &&
      typeof secondValue === 'object' &&
      firstValue !== null &&
      secondValue !== null &&
      !Array.isArray(firstValue) &&
      !Array.isArray(secondValue);

    if (bothObjects) result.push(...findNoiseFields(firstValue, secondValue, currentPath));
    else if (firstValue !== secondValue) result.push(currentPath);
  }

  return result;
}

function removeNoiseFields<T extends object>(object: T, noisePaths: string[]): T {
  const clone = structuredClone(object);

  for (const path of noisePaths) {
    const keys = path.split('.');
    let current: any = clone;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current || typeof current !== 'object') {
        current = null;
        break;
      }
      current = current[keys[i]];
    }

    const lastKey = keys[keys.length - 1];
    if (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, lastKey))
      delete current[lastKey];
  }

  return clone;
}

function compareHttpResponses(originalResponse: HttpResponse | null, modifiedResponse: HttpResponse | null): string[] {
  const issues: string[] = [];

  if (originalResponse === null && modifiedResponse === null) return issues;
  if (originalResponse !== null && modifiedResponse === null) return ['Entire response disappeared'];
  if (originalResponse === null && modifiedResponse !== null) return ['Entire response appeared'];

  if (originalResponse!.status !== modifiedResponse!.status)
    issues.push(`Status changed: '${originalResponse!.status}' → '${modifiedResponse!.status}'`);

  issues.push(...compareHttpResponseBodies(originalResponse!.body, modifiedResponse!.body));

  return issues;
}

function compareHttpResponseBodies(originalValue: HttpBody, modifiedValue: HttpBody, path: string = 'body'): string[] {
  const issues: string[] = [];

  const hasOwnKey = (record: Record<string, unknown>, key: string): boolean =>
    Object.prototype.hasOwnProperty.call(record, key);

  const compare = (
    previous: unknown,
    current: unknown,
    currentPath: string,
    previousExists: boolean,
    currentExists: boolean,
  ): void => {
    if (previousExists && !currentExists) {
      issues.push(`'${currentPath}' disappeared`);
      return;
    }

    if (!previousExists && currentExists) {
      issues.push(`'${currentPath}' appeared`);
      return;
    }

    if (!previousExists && !currentExists) return;

    const previousType = detectObjectType(previous);
    const currentType = detectObjectType(current);

    if (previousType !== currentType) {
      issues.push(`Type changed at '${currentPath}': '${previousType}' → '${currentType}'`);
      return;
    }

    if (previousType === 'object') {
      const previousObject =
        previous !== null && typeof previous === 'object' && !Array.isArray(previous)
          ? (previous as Record<string, unknown>)
          : {};
      const currentObject =
        current !== null && typeof current === 'object' && !Array.isArray(current)
          ? (current as Record<string, unknown>)
          : {};
      const allKeys = new Set([...Object.keys(previousObject), ...Object.keys(currentObject)]);

      for (const key of allKeys) {
        compare(
          previousObject[key],
          currentObject[key],
          `${currentPath}.${key}`,
          hasOwnKey(previousObject, key),
          hasOwnKey(currentObject, key),
        );
      }

      return;
    }

    if (previousType === 'array') {
      const previousArray = Array.isArray(previous) ? previous : [];
      const currentArray = Array.isArray(current) ? current : [];
      const maxLength = Math.max(previousArray.length, currentArray.length);

      for (let index = 0; index < maxLength; index++) {
        compare(
          previousArray[index],
          currentArray[index],
          `${currentPath}[${index}]`,
          index < previousArray.length,
          index < currentArray.length,
        );
      }

      return;
    }
  };

  compare(originalValue, modifiedValue, path, originalValue !== undefined, modifiedValue !== undefined);

  return issues;
}

function transformIssues(issues: string[]): string {
  const appeared: string[] = [];
  const disappeared: string[] = [];
  const otherLines: string[] = [];

  for (const issue of issues) {
    const match = issue.trim().match(/^'([^']+)'\s+(appeared|disappeared)$/);

    if (match) {
      const [, field, status] = match;

      if (status === 'appeared') appeared.push(`'${field}'`);
      else disappeared.push(`'${field}'`);
    } else otherLines.push(issue);
  }

  const summary: string[] = [];
  if (appeared.length) summary.push(`Appeared: ${appeared.join(', ')}.`);
  if (disappeared.length) summary.push(`Disappeared: ${disappeared.join(', ')}.`);

  return [...otherLines, ...summary].join('\n');
}
