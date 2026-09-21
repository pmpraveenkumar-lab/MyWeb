import type { Env } from '../../_lib/types';
import { csvCell } from '../../_lib/validate';

interface Row {
  id: number;
  created_at: string;
  name: string;
  phone: string;
  email: string;
}

// Access is enforced by functions/admin/_middleware.ts, which covers everything under /admin/.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { results } = await env.DB.prepare(
    'SELECT id, created_at, name, phone, email FROM enrollments ORDER BY id DESC LIMIT 5000',
  ).all<Row>();

  const noStore = { 'Cache-Control': 'no-store' };

  if (new URL(request.url).searchParams.get('format') === 'csv') {
    const lines = [
      'Received,Name,Phone,Email',
      ...results.map((r) => [r.created_at, r.name, r.phone, r.email].map(csvCell).join(',')),
    ];
    return new Response(lines.join('\r\n'), {
      headers: {
        ...noStore,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="enrollments.csv"',
      },
    });
  }

  return Response.json(results, { headers: noStore });
};
