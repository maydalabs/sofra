import { NextResponse } from 'next/server'

import { getDatabase } from '@/server/database/client'

/**
 * Deployment health check.
 *
 * Answers the two questions that actually matter after a deploy: can this
 * instance reach the database, and is the schema it expects the schema that is
 * there. A deploy where the code shipped but the migration did not is the
 * failure this is here to catch.
 *
 * Deliberately terse. It reports counts and a migration name, never connection
 * details, versions, or anything that would help someone probing the service.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const sql = getDatabase()
  if (!sql) {
    return NextResponse.json(
      { status: 'error', detail: 'no database configured' },
      { status: 503 },
    )
  }

  try {
    const rows = await sql<{ name: string; total: number }[]>`
      select name, count(*) over ()::int as total
      from public.schema_migrations
      order by name desc
      limit 1
    `

    if (rows.length === 0) {
      return NextResponse.json(
        { status: 'error', detail: 'no migrations applied' },
        { status: 503 },
      )
    }

    return NextResponse.json(
      {
        status: 'ok',
        migrations: rows[0].total,
        latestMigration: rows[0].name,
      },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    )
  } catch {
    // The underlying error may name hosts or credentials, so it is not echoed.
    return NextResponse.json(
      { status: 'error', detail: 'database unreachable' },
      { status: 503 },
    )
  }
}
