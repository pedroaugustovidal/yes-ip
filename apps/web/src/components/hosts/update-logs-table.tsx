import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LogPage, ResultCode } from '@/lib/update-logs';

const SUCCESS_CODES: ResultCode[] = ['good', 'nochg'];
const ERROR_CODES: ResultCode[] = ['badauth', 'badagent', 'abuse', '911'];

function variantForResult(code: ResultCode): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (SUCCESS_CODES.includes(code)) return 'default';
  if (ERROR_CODES.includes(code)) return 'destructive';
  return 'secondary';
}

function fmt(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

interface Props {
  data: LogPage;
  basePath: string;
  searchParams: URLSearchParams;
}

export function UpdateLogsTable({ data, basePath, searchParams }: Props) {
  if (data.rows.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-muted-foreground">
        No update attempts recorded yet.
      </div>
    );
  }

  function pageHref(target: number): string {
    const next = new URLSearchParams(searchParams.toString());
    next.set('page', String(target));
    return `${basePath}?${next.toString()}`;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Source IP</TableHead>
            <TableHead>User-Agent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs whitespace-nowrap">{fmt(row.ts)}</TableCell>
              <TableCell>
                <Badge variant={variantForResult(row.result)}>{row.result}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{row.ip ?? '—'}</TableCell>
              <TableCell className="font-mono text-xs">{row.sourceIp ?? '—'}</TableCell>
              <TableCell className="max-w-[24ch] truncate text-xs text-muted-foreground" title={row.userAgent ?? ''}>
                {row.userAgent ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <div className="text-muted-foreground">
          Page {data.page} of {data.totalPages} · {data.total} total
        </div>
        <div className="flex gap-2">
          {data.page > 1 ? (
            <Link
              href={pageHref(data.page - 1)}
              className="inline-flex h-8 items-center rounded-md border px-3 hover:bg-accent"
            >
              Previous
            </Link>
          ) : null}
          {data.page < data.totalPages ? (
            <Link
              href={pageHref(data.page + 1)}
              className="inline-flex h-8 items-center rounded-md border px-3 hover:bg-accent"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
