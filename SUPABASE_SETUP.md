# Supabase Setup Guide

This guide will help you set up the Supabase tables for the Salon Membership Tracker application.

## Prerequisites

- A Supabase project (create one at https://supabase.com)
- Access to your Supabase project's SQL Editor

## Database Tables

The application uses the following tables:

1. **Users** - Already exists (stores client/user information)
2. **Service** - Already exists (stores service catalog)
3. **MembershipVisits** - New table (stores membership visit records)
4. **Memberships** - New table (stores membership status and visit counts)

## Setup Steps

### 1. Run the SQL Migration

1. Open your Supabase project dashboard
2. Navigate to the **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-migrations.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)

This will create:
- `MembershipVisits` table with foreign key to `Users`
- `Memberships` table with foreign key to `Users`
- Indexes for better query performance
- Triggers to automatically update timestamps
- Row Level Security policies (allowing all operations by default)

### 2. Verify Tables Were Created

1. Navigate to **Table Editor** in your Supabase dashboard
2. You should see the new `MembershipVisits` and `Memberships` tables
3. Verify the foreign key relationships are set up correctly

### 3. Configure Environment Variables

Create a `.env.local` file in the root of your project with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under **API**.

### 4. Test the Application

1. Start your development server: `npm run dev`
2. Try adding a new client - this should create a membership record
3. Add a visit - this should update the membership status
4. Check your Supabase dashboard to verify data is being stored

## Table Schemas

### MembershipVisits Table
- `id` (uuid, primary key)
- `membershipId` (uuid, foreign key to Memberships)
- `date` (date)
- `staffName` (text)
- `purchasedLocation` (text)
- `created_at` (timestamp)

### Memberships Table
- `id` (uuid, primary key)
- `userId` (uuid, foreign key to Users, unique)
- `status` (text: 'active' or 'expired')
- `totalVisits` (integer)
- `remainingVisits` (integer)
- `maxVisits` (integer, default: 5)
- `created_at` (timestamp)
- `updated_at` (timestamp, auto-updated)

## Notes

- **Multiple Memberships**: A client (User) can have multiple memberships. This allows clients to purchase new memberships after their previous one expires.
- The `Memberships` table automatically tracks visit counts and membership status
- When a client is created, a membership record is automatically created with `status: 'active'` and `remainingVisits: 5`
- When a visit is added, it is associated with the active membership (or a new one is created if none exists)
- The `MembershipVisits` table references `Memberships`, not `Users` directly, allowing visits to be properly associated with specific memberships
- Membership expires when `totalVisits >= maxVisits` (default: 5 visits)
- When getting membership status, the system returns the active membership, or the most recent one if no active membership exists

## Troubleshooting

If you encounter issues:

1. **Foreign key errors**: Make sure the `Users` table exists and has data
2. **Permission errors**: Check Row Level Security policies in Supabase
3. **Missing data**: Verify environment variables are set correctly
4. **Migration errors**: Check the SQL Editor for specific error messages

