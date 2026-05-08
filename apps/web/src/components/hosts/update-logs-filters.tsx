'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { RESULT_CODES } from '@/lib/result-codes';

interface Props {
  basePath: string;
}

export function UpdateLogsFilters({ basePath }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get('result') ?? '';

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    if (e.target.value) next.set('result', e.target.value);
    else next.delete('result');
    next.delete('page');
    router.push(`${basePath}?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="result-filter" className="text-sm text-muted-foreground">
        Result
      </label>
      <Select id="result-filter" value={current} onChange={onChange} className="w-40">
        <option value="">All</option>
        {RESULT_CODES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </Select>
    </div>
  );
}
