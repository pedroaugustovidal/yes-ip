export const RESULT_CODES = [
  'good',
  'nochg',
  'nohost',
  'badauth',
  'badagent',
  'abuse',
  '!donator',
  '911',
] as const;

export type ResultCode = (typeof RESULT_CODES)[number];

export function isResultCode(value: string | null | undefined): value is ResultCode {
  return !!value && (RESULT_CODES as readonly string[]).includes(value);
}
