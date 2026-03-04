# WhatsApp Status Advertising Platform

A scalable advertising and affiliate distribution platform that connects **advertisers** with **WhatsApp users (affiliates)** who monetize their WhatsApp Status by sharing promotional content.

The system enables businesses to launch campaigns while affiliates earn commissions based on **views, clicks, and conversions** generated through their WhatsApp status posts.

This project is designed as a **full-stack campaign distribution platform with enterprise-grade governance, auditing, and role-based permissions**.

---

# Project Overview

The WhatsApp Status Advertising Platform acts as a **marketplace between advertisers and affiliates**.

### Advertisers

Businesses create marketing campaigns that include media assets (images or videos), budgets, and commission rates.

### Affiliates

Verified users promote campaigns by posting the content on their WhatsApp status and earn commissions based on campaign engagement.

### Platform

The platform manages:

* Campaign lifecycle
* Affiliate participation
* Event tracking
* Commission accounting
* Withdrawals and payouts
* Governance and moderation

The frontend landing page introduces the concept of **monetizing WhatsApp status and launching targeted campaigns**. 

---

# Core Platform Features

## Campaign Marketplace

Advertisers create campaigns that affiliates can join and promote.

Each campaign includes:

* Promotional media
* Budget allocation
* Commission rate
* Duration
* Tracking link
* Target audience
* Performance analytics

Campaign lifecycle states include:

* Draft
* Scheduled
* Active
* Paused
* Completed
* Archived

Campaign review states allow moderation:

* Not submitted
* Pending review
* Approved
* Rejected

This ensures campaign governance before content becomes public.

---

## Affiliate Monetization System

Affiliates can:

* Register and verify their account
* Join available campaigns
* Share campaign materials
* Track views, clicks, and conversions
* Earn commission based on performance
* Withdraw earnings

Affiliate verification data and payout information are stored separately from core authentication to improve security and compliance. 

---

## Campaign Tracking & Analytics

The platform tracks engagement through campaign events:

* **View**
* **Click**
* **Conversion**

These events are stored and indexed to enable:

* performance analytics
* commission calculations
* fraud detection
* advertiser reporting

Each campaign maintains metrics such as:

* total views
* clicks
* conversions
* remaining campaign budget.

---

## Earnings Ledger

All affiliate earnings are recorded in a financial ledger.

The ledger records:

* affiliate ID
* campaign source
* amount
* transaction type
* reference identifiers

This provides a transparent financial record for all commissions and payments.

---

## Withdrawal System

Affiliates can request withdrawals from their account balance.

Withdrawal lifecycle:

1. Request created
2. Admin review
3. Approved / Rejected
4. Payment processed

Withdrawal records include status tracking and administrative notes.

---

## Referral System

The platform includes a referral program where affiliates can invite new users.

Referral relationships are stored and allow:

* tracking referral chains
* rewarding affiliates for platform growth

---

## Organization and Brand Management

Businesses can operate within **organizations** that manage multiple marketing brands.

Organizations can:

* manage teams
* manage brands
* create campaigns
* assign roles to members

Organization membership includes role-based access control.

Supported roles include:

* Owner
* Admin
* Marketer
* Viewer

---

## Role Based Access Control (RBAC)

The system includes a permission engine with:

* modules
* tabs
* roles
* actions

Permissions define which roles can perform specific operations in different parts of the system.

This enables enterprise-level security and governance.

---

# User Roles

The platform supports multiple types of users.

## Affiliates

Individuals who monetize their WhatsApp status by promoting campaigns.

Capabilities:

* join campaigns
* share promotional content
* earn commissions
* withdraw earnings
* invite referrals

---

## Advertisers

Businesses that create marketing campaigns.

Capabilities:

* create campaigns
* upload promotional materials
* define budgets and commission rates
* monitor campaign analytics
* manage brand assets

---

## Organization Members

Users belonging to a company account.

Roles determine permissions:

* Owner
* Admin
* Marketer
* Viewer

---

## Platform Administrators

System administrators responsible for governance and moderation.

Capabilities include:

* approving campaigns
* reviewing withdrawal requests
* managing user accounts
* monitoring platform analytics

---

# Technology Stack

## Backend

* Node.js
* TypeScript
* PostgreSQL
* Prisma ORM

The database schema models:

* campaign lifecycle
* financial accounting
* user roles and permissions
* affiliate tracking
* organizations and brands.

---

## Database

PostgreSQL with Prisma schema modeling entities such as:

* Users
* Campaigns
* Campaign Events
* Campaign Participants
* Earnings Ledger
* Withdrawals
* Organizations
* Brands
* Organization Members
* Referrals

These models support **scalable campaign distribution and financial tracking**. 

---

## Frontend

The landing page demonstrates the platform concept using:

* React
* Modern responsive UI
* Campaign marketplace layout
* Affiliate onboarding flow

The interface highlights:

* real-time analytics
* campaign browsing
* earnings estimates
* advertiser onboarding. 

---

# Platform Architecture

High level architecture:

```
Advertisers
     │
     │ Create Campaigns
     ▼
Campaign Governance System
     │
     │ Approved Campaigns
     ▼
Campaign Marketplace
     │
     │ Join Campaign
     ▼
Affiliates
     │
     │ Share on WhatsApp Status
     ▼
Audience Engagement
     │
     ├── Views
     ├── Clicks
     └── Conversions
     ▼
Event Tracking System
     ▼
Earnings Ledger
     ▼
Affiliate Withdrawals
```

---

# Security & Governance

The system includes multiple security layers:

* Role-based access control
* Campaign approval workflows
* Financial ledger auditing
* Affiliate verification
* Soft-deletion and audit trails
* Indexed analytics events

These features ensure platform integrity and transparency.

---

# Development Status

The platform is incomplete and currently under active development.

---

# Future Enhancements

Planned improvements include:

* WhatsApp automation integrations
* fraud detection and view validation
* advertiser targeting tools
* campaign recommendation engine
* affiliate performance ranking
* payout integrations (mobile money, bank transfers)
* real-time analytics dashboards.

---

# Contributing

Contributions are welcome.

When contributing:

* follow the established code structure
* document all new modules
* include comments for maintainability
* maintain database migration discipline
* ensure all features include tests where applicable.

---

# License

This project is currently private and proprietary.

All rights reserved.

