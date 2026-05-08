export type NicResultCode =
  | 'good'
  | 'nochg'
  | 'nohost'
  | 'badauth'
  | 'badagent'
  | 'abuse'
  | '!donator'
  | '911';

export interface NicResponse {
  code: NicResultCode;
  ip?: string;
}

export function formatNicResponse(res: NicResponse): string {
  if (res.code === 'good' || res.code === 'nochg') {
    return res.ip ? `${res.code} ${res.ip}` : res.code;
  }
  return res.code;
}
