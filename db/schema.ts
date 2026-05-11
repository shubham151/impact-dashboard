import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const authors = sqliteTable('authors', {
  login: text('login').primaryKey(),
  name: text('name'),
  isBot: integer('is_bot', { mode: 'boolean' }).notNull().default(false)
})

export const pulls = sqliteTable('pulls', {
  id: text('id').primaryKey(),
  number: integer('number').notNull(),
  repo: text('repo').notNull(),
  title: text('title').notNull(),
  state: text('state').notNull(),
  authorLogin: text('author_login')
    .notNull()
    .references(() => authors.login),
  body: text('body'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  closedAt: text('closed_at'),
  mergedAt: text('merged_at'),
  isDraft: integer('is_draft', { mode: 'boolean' }).notNull().default(false),
  mergedBy: text('merged_by'),
  baseRef: text('base_ref').notNull(),
  headRef: text('head_ref').notNull(),
  labels: text('labels', { mode: 'json' }).$type<string[]>().notNull().default([]),
  additions: integer('additions'),
  deletions: integer('deletions'),
  changedFiles: integer('changed_files'),
  ingestedAt: text('ingested_at')
    .notNull()
    .default(sql`(datetime('now'))`)
})

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  prId: text('pr_id')
    .notNull()
    .references(() => pulls.id),
  prNumber: integer('pr_number').notNull(),
  reviewerLogin: text('reviewer_login').notNull(),
  state: text('state').notNull(),
  submittedAt: text('submitted_at').notNull()
})

export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`)
})
