# Enhancement Plan - Progress Tracker

## Phase 1: Type System Updates ✅
- [x] Add HSN/SAC code to Dish type
- [x] Add unit type to CartItem type
- [x] Add customerName/customerPhone to Order type
- [x] Add shippingCharges/roundOff to order payload
- [x] Add PnLSummary, OrderPayload, UnitType types

## Phase 2: Billing View - Invoice Modal & Scroll Enhancement
- [ ] Enhanced product table (S.No, Unit, Discount column, HSN/SAC)
- [ ] Bill summary (Round Off, Shipping/Other Charges)
- [ ] Customer info capture (name/phone)
- [ ] Improved Tax Details section
- [ ] Due Date in invoice info

## Phase 3: Dashboard - P&L Statement with Bills
- [ ] Add date filter component
- [ ] Add P&L summary card (Revenue - Expenses = Net Profit)
- [ ] Expandable bills table in P&L section
- [ ] "View All Bills" button with drill-down

## Phase 4: API Layer Updates ✅
- [x] Add getPnLSummary API to electron/main.ts
- [x] Update order creation with new fields (customerName, customerPhone, shippingCharges, roundOff, dueDate)
- [x] Add getOrdersByDateRange to electron API
- [x] Update preload.js to expose new IPC channels
