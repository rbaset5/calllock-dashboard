#!/usr/bin/env npx ts-node
import 'dotenv/config';

const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const USER_EMAIL = process.env.DASHBOARD_USER_EMAIL || 'rashid.baset@gmail.com';

if (!WEBHOOK_SECRET) {
  console.error('ERROR: WEBHOOK_SECRET not set in environment');
  process.exit(1);
}

interface TestCase {
  name: string;
  payload: Record<string, unknown>;
  expectedType: 'lead' | 'job';
  expectedArchetype?: string;
}

const testCases: TestCase[] = [
  {
    name: 'HAZARD - Gas Leak with V6 tags',
    payload: {
      call_id: `test_hazard_${Date.now()}`,
      customer_name: 'Test Hazard Customer',
      customer_phone: '+15551234567',
      customer_address: '123 Emergency St',
      service_type: 'hvac',
      urgency: 'emergency',
      user_email: USER_EMAIL,
      end_call_reason: 'callback_later',
      ai_summary: 'Customer reports gas smell near furnace',
      tags: {
        HAZARD: ['GAS_LEAK'],
        URGENCY: ['CRITICAL_DISPATCH'],
        CONTEXT: ['ELDERLY_OCCUPANT'],
      },
    },
    expectedType: 'lead',
    expectedArchetype: 'HAZARD',
  },
  {
    name: 'RECOVERY - Callback Risk with Review Threat',
    payload: {
      call_id: `test_recovery_${Date.now()}`,
      customer_name: 'Test Angry Customer',
      customer_phone: '+15559876543',
      customer_address: '456 Complaint Ave',
      service_type: 'hvac',
      urgency: 'medium',
      user_email: USER_EMAIL,
      end_call_reason: 'callback_later',
      priority_color: 'red',
      priority_reason: 'Customer mentioned leaving review',
      ai_summary: 'Third callback, customer very frustrated',
      sentiment_score: 1,
      tags: {
        RECOVERY: ['CALLBACK_RISK', 'REVIEW_THREAT'],
        CUSTOMER: ['EXISTING_CUSTOMER'],
      },
    },
    expectedType: 'lead',
    expectedArchetype: 'RECOVERY',
  },
  {
    name: 'REVENUE - Commercial Hot Lead',
    payload: {
      call_id: `test_revenue_${Date.now()}`,
      customer_name: 'Test Commercial LLC',
      customer_phone: '+15555551234',
      customer_address: '789 Business Park',
      service_type: 'hvac',
      urgency: 'medium',
      user_email: USER_EMAIL,
      end_call_reason: 'sales_lead',
      priority_color: 'green',
      priority_reason: 'Commercial property',
      property_type: 'commercial',
      revenue_tier: 'replacement',
      revenue_tier_label: '$$$$',
      estimated_value: 8500,
      ai_summary: 'New commercial account, needs full system replacement',
      tags: {
        REVENUE: ['HOT_LEAD', 'COMMERCIAL_LEAD', 'REPLACE_OPP'],
        CUSTOMER: ['COMMERCIAL_ACCT', 'DECISION_MAKER'],
        SERVICE_TYPE: ['INSTALL_REPLACEMENT'],
      },
    },
    expectedType: 'lead',
    expectedArchetype: 'REVENUE',
  },
  {
    name: 'LOGISTICS - Standard Service Call',
    payload: {
      call_id: `test_logistics_${Date.now()}`,
      customer_name: 'Test Standard Customer',
      customer_phone: '+15552223333',
      customer_address: '321 Normal Dr',
      service_type: 'hvac',
      urgency: 'low',
      user_email: USER_EMAIL,
      end_call_reason: 'callback_later',
      ai_summary: 'AC not cooling efficiently, routine service needed',
      work_type: 'service',
      tags: {
        SERVICE_TYPE: ['REPAIR_AC', 'DIAGNOSTIC_PERFORMANCE'],
        CUSTOMER: ['NEW_CUSTOMER'],
        LOGISTICS: ['GATE_CODE'],
      },
    },
    expectedType: 'lead',
    expectedArchetype: 'LOGISTICS',
  },
  {
    name: 'BOOKED JOB - AI Scheduled Appointment',
    payload: {
      call_id: `test_job_${Date.now()}`,
      customer_name: 'Test Booked Customer',
      customer_phone: '+15554445555',
      customer_address: '999 Scheduled Ln',
      service_type: 'hvac',
      urgency: 'medium',
      user_email: USER_EMAIL,
      end_call_reason: 'completed',
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      ai_summary: 'Furnace tune-up scheduled',
      tags: {
        SERVICE_TYPE: ['TUNEUP_HEATING'],
        CUSTOMER: ['EXISTING_CUSTOMER'],
      },
    },
    expectedType: 'job',
  },
];

async function runTest(testCase: TestCase): Promise<{ success: boolean; message: string }> {
  const url = `${WEBHOOK_URL}/api/webhook/jobs`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET!,
      },
      body: JSON.stringify(testCase.payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP ${response.status}: ${JSON.stringify(data)}`,
      };
    }

    const actualType = data.type;
    if (actualType !== testCase.expectedType) {
      return {
        success: false,
        message: `Expected type '${testCase.expectedType}' but got '${actualType}'`,
      };
    }

    return {
      success: true,
      message: `Created ${data.type} with ID: ${data.lead_id || data.job_id}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('CallLock E2E Webhook Test Suite');
  console.log('='.repeat(60));
  console.log(`Target: ${WEBHOOK_URL}`);
  console.log(`User: ${USER_EMAIL}`);
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    process.stdout.write(`Testing: ${testCase.name}... `);
    const result = await runTest(testCase);
    
    if (result.success) {
      console.log(`✅ PASS - ${result.message}`);
      passed++;
    } else {
      console.log(`❌ FAIL - ${result.message}`);
      failed++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
