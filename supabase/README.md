# NagrikQ — Supabase Database Setup & Schema Guide

This directory contains the database schema, normalized tables, RLS policies, triggers, and Realtime configurations for **NagrikQ**.

## File Structure

- `query.sql`: Complete PostgreSQL script for tables, ENUM types, Foreign Keys, RLS Security Policies, and Realtime Publications.

## How to Apply Schema to Supabase

1. Log in to your [Supabase Dashboard](https://app.supabase.com).
2. Select your NagrikQ project (`https://fcsrwywlhmcusqababtq.supabase.co`).
3. Open **SQL Editor** from the left sidebar.
4. Click **New query** and paste the complete contents of `supabase/query.sql`.
5. Click **Run** to execute.

## Key Tables

| Table | Description | RLS Policy Summary |
|-------|-------------|-------------------|
| `profiles` | User account metadata & UI preferences | Owner write; Self + Staff read |
| `departments` | Government departments (Revenue, Municipal, etc.) | Public read |
| `offices` | Physical offices & counter numbers | Public read |
| `services` | Government services catalog | Public read |
| `document_requirements` | Dynamic service document requirements | Public read |
| `applications` | Citizen applications | Citizen owner read/create; Staff update |
| `documents` | Uploaded citizen document metadata | Citizen owner & Staff access |
| `queue_tokens` | Virtual queue tokens with live ETA | Realtime enabled; Citizen owner & Staff |
| `service_change_requests` | Admin document requirement change requests | Admin create; Super Admin approve/reject |
| `audit_logs` | Immutable security audit logs | Admin & Super Admin read-only |

## Realtime Subscription Enablement

Realtime is enabled for:
- `queue_tokens`
- `applications`
- `notifications`
- `service_change_requests`
