-- Add sales_opportunity status for sales/replacement leads
-- Migration: 0005_add_sales_opportunity_status.sql

-- Add the new status value to the lead_status enum
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'sales_opportunity';
