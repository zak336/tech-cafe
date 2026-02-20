# 🧪 Checkout & Slots Testing Guide

## ✅ Step-by-Step Checkout Flow

### **Phase 1: Menu & Cart (Must Complete)**

1. ✅ Log in as a customer (or create new account)
2. ✅ Go to home page `/`
3. ✅ Click on any menu item to open it
4. ✅ Click "+ Add to Cart" button
5. ✅ See toast notification: "Item added to cart"
6. ✅ See cart counter at bottom showing item count
7. ✅ Repeat for at least 2-3 items

### **Phase 2: Admin Slot Setup (CRITICAL)**

1. ✅ Log in as **admin** user
2. ✅ Go to Admin Dashboard `/admin`
3. ✅ Should see yellow alert: "No pickup slots configured"
4. ✅ Click "Setup Slots" button or go to `/admin/slots`
5. ✅ See blue alert: "No slots created yet"
6. ✅ Click "Create Slots" button (⚡ icon)
7. ✅ Wait for success toast: "✅ Created 56 pickup slots"
8. ✅ Refresh page - should now show slot list with times

### **Phase 3: Checkout - Slots Loading**

1. ✅ Go back to customer view (switch user or open new incognito tab)
2. ✅ Add items to cart (repeat Phase 1)
3. ✅ Click "View Cart" → "Proceed to Checkout"
4. ✅ Should see "Pickup Slot" section loading
5. ✅ **Expected**: Grid of time slots appear (8:00 AM, 8:15 AM, etc.)
6. ✅ **If stuck on LOADING**: Check browser console (F12) for errors

### **Phase 4: Checkout - Slot Selection**

1. ✅ Click on any available time slot (should turn gold)
2. ✅ See slot time highlighted at top of grid
3. ✅ Verify "Pay" button at bottom is NOW ENABLED (not greyed out)

### **Phase 5: Checkout - Order Summary**

1. ✅ Verify order item list shows all items
2. ✅ Verify Subtotal, Tax (5%), Total are calculated
3. ✅ (Optional) Add coupon code if available
4. ✅ Add special instructions if desired

### **Phase 6: Payment**

1. ✅ Click "Pay ₹XXX" button
2. ✅ Razorpay modal opens
3. ✅ Complete test payment (use test cards)
4. ✅ See loading indicator after payment
5. ✅ Should redirect to `/track/[order-id]`
6. ✅ See order status in real-time

---

## 🔴 **If Slots Are Still Showing "Loading"**

### **Diagnostic Steps:**

**Step A: Check Browser Console**

1. Press F12 to open Developer Tools
2. Go to **Console** tab
3. Go back to checkout page
4. Look for red error messages
5. **Copy and paste any errors** from console

**Step B: Check Network Tab**

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Go to checkout page
4. Look for request to `/api/slots?cafe_id=...`
5. Click it and check:
   - Status: Should be **200** (green)
   - Response: Should show JSON with slot array
   - If 400/500: There's an API error

**Step C: Verify Admin Created Slots**

1. Log in as **admin**
2. Go to `/admin/slots`
3. You should see numbered list of slots (8:00, 8:15, 8:30, etc.)
4. If empty: Click "Create Slots" button again
5. Wait for success message

**Step D: Check cafeId is Saved**

1. Go to home page
2. Open Developer Tools (F12)
3. Go to **Application** → **Local Storage**
4. Find key: `tech-cafe-cart` (or similar)
5. Expand it and look for `cafeId` field
6. Should contain a UUID (not empty/null)
7. If missing: Add item to cart again to set it

---

## 🟡 **Known Issues & Solutions**

### **Issue: "No slots available" message**

- **Cause**: Admin hasn't created slots yet
- **Fix**: Go to `/admin/slots` and click "Create Slots"

### **Issue: "No cafe selected" error**

- **Cause**: cafeId not set in cart store
- **Fix**: Go back to home page, add an item to cart, then try checkout again

### **Issue: Slots loading infinitely**

- **Cause**: API might be failing silently
- **Fix**: Check browser console (F12 → Console) for errors

### **Issue: Time slots show but Pay button is disabled**

- **Cause**: You haven't clicked to select a slot
- **Fix**: Click on any available time slot (background should turn gold)

### **Issue: Selected slot but Pay button still disabled**

- **Cause**: Slot might actually be full or blocked
- **Fix**: Try a different time slot

---

## ✨ **Success Indicators**

✅ You have successfully completed checkout when:

1. Add items to cart from menu
2. See slot times in checkout
3. Click a slot and it turns gold
4. Pay button becomes **enabled and clickable**
5. Razorpay modal opens when you click Pay
6. Redirected to order tracking page after payment

---

## 📞 **Troubleshooting Checklist**

- [ ] Admin has logged in and created 56 slots
- [ ] Admin slots page shows "8:00 AM" through "10:00 PM"
- [ ] Customer has added 2+ items to cart
- [ ] Cart shows non-zero item count
- [ ] Checkout page loads without JS errors (F12)
- [ ] Slots API returns 200 status (F12 → Network)
- [ ] Slots grid appears (not loading spinner)
- [ ] At least one slot is available (not crossed out)
- [ ] Selected slot is highlighted in gold
- [ ] Pay button text shows amount (e.g., "Pay ₹299")
- [ ] Pay button is not greyed out / disabled
