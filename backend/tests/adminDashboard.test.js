const test = require('node:test');
const assert = require('node:assert/strict');
const { dashboard } = require('../services/adminDashboard.service');

function fakeDatabase() {
  const calls = [];

  async function query(sql, params = []) {
    calls.push({ sql, params });

    if (sql.includes('FROM users') && sql.includes('active_last_7_days')) {
      return {
        rows: [
          {
            total: 10,
            admins: 1,
            suspended: 2,
            active_last_7_days: 4,
            active_last_30_days: 6,
            new_today: 1,
            new_last_24_hours: 1,
            new_last_7_days: 3,
            new_last_30_days: 5,
            new_this_week: 2,
            new_this_month: 4,
            new_this_year: 9,
          },
        ],
      };
    }

    if (sql.includes('FROM subscriptions') && sql.includes('active_entitled')) {
      return {
        rows: [
          {
            total: 4,
            active_entitled: 3,
            paid_active: 2,
            plus_active: 2,
            premium_active: 1,
            institution_active: 0,
            trialing: 0,
            past_due: 1,
            canceled: 1,
            expired: 1,
          },
        ],
      };
    }

    if (sql.includes('FROM payment_records') && sql.includes('transaction_count')) {
      return {
        rows: [
          {
            transaction_count: 6,
            pending_count: 1,
            successful_count: 3,
            failed_count: 1,
            cancelled_count: 0,
            refunded_count: 1,
            disputed_count: 0,
            pending_amount_cents: '1000',
            lifetime_gross_cents: '5000',
            lifetime_refunds_cents: '200',
            lifetime_net_cents: '4800',
            today_gross_cents: '1000',
            today_refunds_cents: '100',
            this_month_gross_cents: '3000',
            this_month_refunds_cents: '200',
            this_year_gross_cents: '5000',
            this_year_refunds_cents: '200',
            last_30_days_gross_cents: '4000',
            last_30_days_refunds_cents: '200',
            paying_users: 5,
            currency: 'USD',
            currency_count: 1,
          },
        ],
      };
    }

    if (sql.includes('mrr_cents')) {
      return { rows: [{ mrr_cents: '1500' }] };
    }

    if (sql.includes('career_goals_total')) {
      return {
        rows: [
          {
            career_goals_total: 3,
            career_goals_active: 2,
            roadmaps_total: 4,
            roadmaps_completed: 1,
            roadmaps_active: 2,
            roadmap_tasks_total: 10,
            roadmap_tasks_completed: 5,
            projects_total: 2,
            projects_completed: 1,
            projects_average_score: '81.6',
            applications_total: 7,
            applications_active: 3,
            ai_analyses_total: 9,
            career_assessments_total: 5,
            career_assessments_this_month: 2,
            mentor_threads_total: 3,
            mentor_threads_this_month: 1,
            mentor_messages_total: 12,
            mentor_messages_this_month: 4,
            cv_documents_total: 2,
            cover_letters_total: 1,
            mock_interviews_total: 2,
            mock_interviews_completed: 1,
            opportunity_saves_total: 6,
            opportunity_views_total: 8,
            opportunities_total: 20,
            opportunities_active: 15,
            learning_resources_total: 5,
            learning_resources_active: 4,
            notifications_total: 11,
            notifications_unread: 3,
          },
        ],
      };
    }

    if (sql.includes('COUNT(u.id)')) {
      return { rows: [{ date: '2026-10-31', count: 2 }] };
    }

    if (sql.includes('gross g') && sql.includes('refunds r')) {
      return {
        rows: [
          {
            date: '2026-10-31',
            gross_cents: '2000',
            refunds_cents: '500',
            net_cents: '1500',
          },
        ],
      };
    }

    if (sql.includes('GROUP BY COALESCE(plan_code')) {
      return {
        rows: [{ plan_code: 'plus', payments: 2, net_cents: '3000' }],
      };
    }

    if (sql.includes('FROM institutions')) {
      return {
        rows: [
          {
            total: 2,
            active: 1,
            pending: 1,
            suspended: 0,
            active_members: 6,
          },
        ],
      };
    }

    if (sql.includes('FROM activity_logs')) {
      return { rows: [{ total: 30, last_24_hours: 4, last_7_days: 12 }] };
    }

    if (sql.includes('ORDER BY created_at DESC, id DESC LIMIT 8')) {
      return { rows: [{ id: 1, name: 'Admin', email: 'a@example.com' }] };
    }

    if (sql.includes('FROM plan_requests')) {
      return { rows: [{ pending: 4 }] };
    }

    throw new Error(`Unexpected dashboard query: ${sql.slice(0, 80)}`);
  }

  return { query, calls };
}

test('dashboard aggregates users, subscriptions, revenue and growth', async () => {
  const database = fakeDatabase();
  const result = await dashboard(database);

  assert.equal(database.calls.length, 12);
  assert.equal(result.users.total, 10);
  assert.equal(result.users.free_users, 7);
  assert.equal(result.users.premium_subscribers, 3);
  assert.equal(result.subscriptions.pending_requests, 4);
  assert.equal(result.subscriptions.paid_active, 2);
  assert.equal(result.revenue.today.net_cents, 900);
  assert.equal(result.revenue.this_month.net_cents, 2800);
  assert.equal(result.revenue.lifetime.net_cents, 4800);
  assert.equal(result.revenue.mrr_cents, 1500);
  assert.equal(result.revenue.conversion_rate, 0.5);
  assert.equal(result.revenue.revenue_by_plan[0].net_cents, 3000);
  assert.equal(result.feature_usage.roadmaps.total, 4);
  assert.equal(result.roadmaps.task_completion_percent, 50);
  assert.equal(result.projects.average_score, 82);
  assert.equal(result.growth.signups_last_14_days[0].count, 2);
  assert.equal(result.growth.revenue_last_14_days[0].net_cents, 1500);
  assert.equal(result.recent_users[0].email, 'a@example.com');
  assert.equal(result.timezone, 'Africa/Harare');
  assert.ok(result.generated_at);
});

test('dashboard passes the reporting timezone to date-based metrics', async () => {
  const database = fakeDatabase();
  await dashboard(database);

  const timezoneQueries = database.calls.filter(
    (call) => call.sql.includes('AT TIME ZONE $1') && call.params[0]
  );
  assert.ok(timezoneQueries.length > 0);
  assert.ok(timezoneQueries.every((call) => call.params[0] === 'Africa/Harare'));
});
