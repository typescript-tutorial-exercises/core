import axios from 'axios';
import { Message } from '@arco-design/web-react';
import * as problemsUrl from '@problems/index';
import problemsJson from '@config/problems.json';
import i18nJson from '@config/i18n.json';
import localCache from '@src/utils/local-cache';
import { Setting } from '@src/utils/setting';
import typeAssertions from '../../node_modules/type-assertions/lib/index.d.ts?raw';

export type Problem = {
  key: string;
  subject: string;
  subjectKey: string;
  title: string;
  contributor?: {
    name: string;
    link: string;
  };
  keywords?: string[];
  cases?: {
    source: string;
    target: string;
  }[];
  index: number;
};

const filePrefixes = ['check', 'template'] as const;

export enum ProblemFiles {
  test = 'test.ts',
  check = 'check.ts',
  template = 'template.ts',
}

export enum ProblemDocs {
  description = 'description',
  tutorial = 'tutorial',
}

export type ProblemRaw = Record<
  | Exclude<ProblemFiles, ProblemFiles.test>
  | `node_modules/type-assertions/index.${'d.ts' | 'js'}`,
  {
    content: string;
    readOnly?: boolean;
  }
>;

export enum ProblemTestReplaceVal {
  source = 'TEST_SOURCE_STRING',
  target = 'TEST_TARGET_STRING',
}

export const NULL_CASE: NonNullable<Problem['cases']>[number] = {
  source: 'null',
  target: 'null',
};

async function Get<T>(url: string, fallback: T) {
  try {
    const response = await axios.get<T>(url);
    const { status, data } = response;
    if (status < 200 || status >= 300) {
      throw new Error(JSON.stringify(response));
    }
    return data;
  } catch (e) {
    console.error(e);
    const { language } = localCache.getSettingCache();
    Message.error(i18nJson['request_error'][language]);
  }
  return fallback;
}

export function getProblems(): Problem[] {
  return problemsJson.map((problem, index) => ({
    ...problem,
    index,
  }));
}

export const DEFAULT_RAW: ProblemRaw = {
  [ProblemFiles.check]: {
    content: '',
    readOnly: true,
  },
  [ProblemFiles.template]: {
    content: '',
  },
  'node_modules/type-assertions/index.d.ts': {
    content: typeAssertions,
    readOnly: true,
  },
  'node_modules/type-assertions/index.js': {
    content: 'export function assert() { return true }',
    readOnly: true,
  },
};

export function formatCodeByUpdateTabSize(
  code: string,
  prev: Setting['tabSize'],
  next: Setting['tabSize'],
) {
  return code
    .split('\n')
    .map(function (line) {
      let index = 0;
      while (line[index] === ' ') {
        ++index;
      }
      if (index === 0) return line;
      const suffix = line.slice(index);
      index -= 1;
      if (index % 2 === 1) {
        index += 1;
      }
      const prefix = ' '.repeat((index * next) / prev);
      return `${prefix}${suffix}`;
    })
    .join('\n');
}

export async function getProblemRaw(problem: Problem): Promise<ProblemRaw> {
  const raw: ProblemRaw = { ...DEFAULT_RAW };
  const { subjectKey, key } = problem;
  await Promise.all(
    filePrefixes.map(function (prefix) {
      if (ProblemFiles.template.includes(prefix)) {
        const problemsCacheJson = localCache.getProblemCacheJson();
        const cache = problemsCacheJson[problem.key];
        if (typeof cache?.lastUpdated === 'string') {
          raw[ProblemFiles[prefix]] = {
            ...raw[ProblemFiles[prefix]],
            content: cache.lastUpdated,
          };
          return;
        }
      }
      const url = problemsUrl[subjectKey][key][prefix];
      return Get<string>(url, '').then(function (data) {
        if (ProblemFiles.template.includes(prefix)) {
          const { tabSize } = localCache.getSettingCache();
          if (tabSize === 4) {
            data = formatCodeByUpdateTabSize(data, 2, 4);
          }
        }
        raw[ProblemFiles[prefix]] = {
          ...raw[ProblemFiles[prefix]],
          content: data.replace(/\n\/\/ @ts-ignore/g, ''),
        };
      });
    }),
  );
  return raw;
}

export async function getProblemDocs(
  problem: Problem,
  type: ProblemDocs,
  language: Setting['language'] = 'en',
) {
  const { subjectKey, key } = problem;
  const url =
    problemsUrl[subjectKey][key][type][language] ||
    problemsUrl[subjectKey][key][type]['en'];
  return await Get<string>(url, '');
}

export async function getProblemTestRaw(
  problem: Problem,
): Promise<string | undefined> {
  const { subjectKey, key } = problem;
  const url =
    problemsUrl[subjectKey][key]['test'] ||
    problemsUrl[subjectKey][key]['check'];
  const data = await Get<string>(url, undefined as unknown as string);
  return data?.replace(/\n\/\/ @ts-ignore/g, '').trim();
}
