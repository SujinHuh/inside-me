import type { Href } from 'expo-router';

/** 실제 Expo Router 파일이 존재하는 경로만 공통 계약으로 공개한다. */
export const homeHref = '/' satisfies Href;
export const textEntryHref = '/text-entry' satisfies Href;
export const calendarHref = '/calendar' satisfies Href;
