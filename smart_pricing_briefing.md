# Smart Pricing Strategy: Dynamic Rate Management

## Overview
The "Smart Pricing" system is designed to maximize revenue by automatically adjusting room rates based on demand, seasonality, and occupancy levels. It moves away from static pricing towards a more flexible model used by modern hotels and airlines.

## Core Features
1. **Seasonal Overrides**: Define "Peak" (e.g., Summer, Holidays) and "Off-Peak" seasons with different base rates.
2. **Occupancy-Based Pricing**: Automatically increase prices by a percentage (e.g., +15%) when a room type reaches a certain occupancy threshold (e.g., 80% full).
3. **Last-Minute Adjustments**: Offer "Flash Deals" or discounted rates for unbooked rooms within a short window (e.g., 48 hours before check-in).
4. **Day-of-Week Pricing**: Higher rates for weekends (Friday/Saturday) vs. weekdays.

## Technical Implementation

### 1. Database Schema (Supabase)
We will introduce a `pricing_rules` table:
```sql
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name TEXT,
  start_date DATE,
  end_date DATE,
  day_of_week INTEGER[], -- Array of days (0-6)
  adjustment_type TEXT, -- 'percentage' or 'flat'
  adjustment_value DECIMAL,
  min_occupancy INTEGER, -- Trigger only if occupancy > X%
  room_type_id UUID REFERENCES room_types(id)
);
```

### 2. Logic Integration
The `getRoomAvailability` and `calculatePrice` functions in `abhc-db.js` will be updated to:
- Fetch active rules for the selected date range.
- Apply multipliers to the base price.
- Return the "Smart Price" to the guest UI.

## Benefits
- **Revenue Growth**: Capture higher margins during high demand.
- **Improved Occupancy**: Fill vacant rooms during slow periods.
- **Automation**: Reduces the need for manual price updates by resort owners.
