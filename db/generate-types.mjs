#!/usr/bin/env node
/**
 * Generates src/server/database/database.types.ts by introspecting the live
 * database. Replaces `supabase gen types`.
 *
 *   pnpm db:types
 *
 * Type choices mirror the driver configuration in src/server/database/client.ts:
 * timestamps arrive as ISO strings and numerics as numbers, so the emitted
 * types describe what the application actually receives at runtime.
 */
import { writeFile } from 'node:fs/promises'
import postgres from 'postgres'

const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const isLocal = /@(localhost|127\.0\.0\.1)/.test(connectionString)
const sql = postgres(connectionString, {
  max: 1,
  onnotice: () => {},
  ssl: isLocal ? false : 'require',
})

const OUT = new URL('../src/server/database/database.types.ts', import.meta.url)

/** Better Auth owns these; they are not part of the domain model. */
const EXCLUDED = new Set([
  'user',
  'session',
  'account',
  'verification',
  'rateLimit',
  'schema_migrations',
])

const pascal = (s) =>
  s
    .split('_')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('')

function tsType(column, enumNames) {
  const { data_type: dataType, udt_name: udt } = column
  if (dataType === 'ARRAY') {
    const inner = udt.replace(/^_/, '')
    if (enumNames.has(inner)) {
      return `Database['public']['Enums']['${inner}'][]`
    }
    return `${scalar(inner, enumNames)}[]`
  }
  return scalar(udt, enumNames)
}

function scalar(udt, enumNames) {
  if (enumNames.has(udt)) return `Database['public']['Enums']['${udt}']`
  switch (udt) {
    case 'uuid':
    case 'text':
    case 'varchar':
    case 'bpchar':
    case 'char':
    case 'name':
    case 'citext':
      return 'string'
    case 'int2':
    case 'int4':
    case 'float4':
    case 'float8':
    case 'numeric': // parsed to number by the client
      return 'number'
    case 'int8':
      return 'string' // bigint stays a string to avoid precision loss
    case 'bool':
      return 'boolean'
    case 'timestamptz':
    case 'timestamp':
    case 'date':
    case 'time':
    case 'timetz':
      return 'string' // ISO 8601, normalised by the client
    case 'json':
    case 'jsonb':
      return 'Json'
    default:
      return 'unknown'
  }
}

try {
  // ---- enums -------------------------------------------------------------
  const enumRows = await sql`
    select t.typname as name,
           array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typnamespace = 'public'::regnamespace
    group by t.typname
    order by t.typname
  `
  const enumNames = new Set(enumRows.map((r) => r.name))

  // ---- tables and views --------------------------------------------------
  const relations = await sql`
    select c.relname as name,
           case c.relkind when 'v' then 'view' when 'm' then 'view' else 'table' end as kind
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'v', 'm')
    order by c.relname
  `
  const columns = await sql`
    select table_name, column_name, data_type, udt_name, is_nullable,
           column_default, is_identity, is_generated
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `
  const byRelation = new Map()
  for (const col of columns) {
    if (!byRelation.has(col.table_name)) byRelation.set(col.table_name, [])
    byRelation.get(col.table_name).push(col)
  }

  // ---- functions ---------------------------------------------------------
  const functions = await sql`
    select p.proname as name,
           p.proargnames as arg_names,
           p.proargmodes as arg_modes,
           p.proallargtypes::oid[] as all_arg_types,
           pg_get_function_identity_arguments(p.oid) as ident_args,
           p.proretset as returns_set,
           pg_get_function_result(p.oid) as result
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
      -- Trigger functions are invoked by the database, never by the app.
      and pg_get_function_result(p.oid) <> 'trigger'
    order by p.proname
  `

  /** Maps a SQL type name (not a udt name) onto its TypeScript equivalent. */
  const sqlTypeToTs = (declared) => {
    const t = declared.trim().toLowerCase().replace(/\[\]$/, '')
    const isArray = declared.trim().endsWith('[]')
    let mapped
    if (enumNames.has(t)) mapped = `Database['public']['Enums']['${t}']`
    else if (
      /^(uuid|text|character varying|varchar|character|char|name)$/.test(t)
    )
      mapped = 'string'
    else if (
      /^(integer|int|int4|int2|smallint|real|double precision|numeric|decimal)$/.test(
        t,
      )
    )
      mapped = 'number'
    else if (/^bigint$/.test(t)) mapped = 'string'
    else if (/^bool(ean)?$/.test(t)) mapped = 'boolean'
    else if (/^(timestamp|timestamptz|date|time)/.test(t)) mapped = 'string'
    else if (/^jsonb?$/.test(t)) mapped = 'Json'
    else mapped = 'unknown'
    return isArray ? `${mapped}[]` : mapped
  }

  /** "p_table_id uuid, p_profile_id uuid" -> [[name, type], ...] */
  const parseIdentArgs = (identArgs) => {
    if (!identArgs || !identArgs.trim()) return []
    return identArgs.split(',').map((chunk, i) => {
      const part = chunk.trim()
      const space = part.indexOf(' ')
      if (space === -1) return [`arg${i + 1}`, part]
      return [part.slice(0, space), part.slice(space + 1)]
    })
  }
  const typeNames = await sql`select oid, typname from pg_type`
  const oidToName = new Map(typeNames.map((r) => [String(r.oid), r.typname]))

  // ---- emit --------------------------------------------------------------
  const L = []
  L.push('/**')
  L.push(' * GENERATED FILE -- do not edit by hand.')
  L.push(' *')
  L.push(' * Regenerate against the running database with:')
  L.push(' *   pnpm db:types')
  L.push(' */')
  L.push('')
  L.push('export type Json =')
  L.push('  | string')
  L.push('  | number')
  L.push('  | boolean')
  L.push('  | null')
  L.push('  | { [key: string]: Json | undefined }')
  L.push('  | Json[]')
  L.push('')

  for (const e of enumRows) {
    L.push(`export type ${pascal(e.name)} =`)
    for (const label of e.labels) L.push(`  | '${label}'`)
    L.push('')
  }

  L.push('export interface Database {')
  L.push('  public: {')

  L.push('    Tables: {')
  for (const rel of relations.filter((r) => r.kind === 'table')) {
    if (EXCLUDED.has(rel.name)) continue
    const cols = byRelation.get(rel.name) ?? []
    L.push(`      ${rel.name}: {`)
    L.push('        Row: {')
    for (const c of cols) {
      const nullable = c.is_nullable === 'YES' ? ' | null' : ''
      L.push(`          ${c.column_name}: ${tsType(c, enumNames)}${nullable}`)
    }
    L.push('        }')
    L.push('        Insert: {')
    for (const c of cols) {
      if (c.is_generated === 'ALWAYS' || c.is_identity === 'YES') continue
      const optional = c.column_default !== null || c.is_nullable === 'YES'
      const nullable = c.is_nullable === 'YES' ? ' | null' : ''
      L.push(
        `          ${c.column_name}${optional ? '?' : ''}: ${tsType(c, enumNames)}${nullable}`,
      )
    }
    L.push('        }')
    L.push('        Update: {')
    for (const c of cols) {
      if (c.is_generated === 'ALWAYS' || c.is_identity === 'YES') continue
      const nullable = c.is_nullable === 'YES' ? ' | null' : ''
      L.push(`          ${c.column_name}?: ${tsType(c, enumNames)}${nullable}`)
    }
    L.push('        }')
    L.push('      }')
  }
  L.push('    }')

  L.push('    Views: {')
  for (const rel of relations.filter((r) => r.kind === 'view')) {
    if (EXCLUDED.has(rel.name)) continue
    const cols = byRelation.get(rel.name) ?? []
    L.push(`      ${rel.name}: {`)
    L.push('        Row: {')
    for (const c of cols) {
      const nullable = c.is_nullable === 'YES' ? ' | null' : ''
      L.push(`          ${c.column_name}: ${tsType(c, enumNames)}${nullable}`)
    }
    L.push('        }')
    L.push('      }')
  }
  L.push('    }')

  L.push('    Functions: {')
  for (const fn of functions) {
    const names = fn.arg_names ?? []
    const modes = fn.arg_modes ?? null

    L.push(`      ${fn.name}: {`)
    const args = parseIdentArgs(fn.ident_args)
    if (args.length === 0) {
      L.push('        Args: Record<string, never>')
    } else {
      L.push('        Args: {')
      for (const [argName, argType] of args) {
        L.push(`          ${argName}: ${sqlTypeToTs(argType)}`)
      }
      L.push('        }')
    }

    // RETURNS TABLE surfaces its columns as OUT parameters ('t' or 'o').
    if (modes && names.length) {
      const outCols = []
      const allTypes = (fn.all_arg_types ?? []).map((oid) =>
        oidToName.get(String(oid)),
      )
      modes.forEach((mode, i) => {
        if (mode === 't' || mode === 'o') {
          outCols.push([names[i], allTypes[i]])
        }
      })
      if (outCols.length) {
        L.push('        Returns: {')
        for (const [colName, udt] of outCols) {
          L.push(`          ${colName}: ${scalar(udt, enumNames)} | null`)
        }
        L.push('        }[]')
        L.push('      }')
        continue
      }
    }
    const scalarReturn = fn.result.replace(/^SETOF\s+/i, '')
    const mapped = scalar(scalarReturn.split('.').pop(), enumNames)
    L.push(`        Returns: ${mapped}${fn.returns_set ? '[]' : ''}`)
    L.push('      }')
  }
  L.push('    }')

  L.push('    Enums: {')
  for (const e of enumRows) {
    L.push(`      ${e.name}: ${pascal(e.name)}`)
  }
  L.push('    }')

  L.push('  }')
  L.push('}')
  L.push('')

  await writeFile(OUT, L.join('\n'), 'utf8')
  console.log(
    `generated ${relations.filter((r) => !EXCLUDED.has(r.name)).length} relations, ` +
      `${enumRows.length} enums, ${functions.length} functions`,
  )
} catch (error) {
  console.error('type generation failed:', error?.message ?? error)
  process.exitCode = 1
} finally {
  await sql.end()
}
