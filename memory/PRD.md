# Seerweb OMS - React Native App

## Original Problem Statement
Fix error: "Text strings must be rendered within a <Text> component" that occurs on page reload, clicking tabs, opening profile, or pressing buttons.

## Tech Stack
- React Native with Expo
- NativeWind (TailwindCSS for React Native)
- React Navigation (Native Stack)
- AsyncStorage for local state persistence
- TypeScript

## Architecture
- `/app/App.tsx` - Main app entry with navigation setup
- `/app/screens/` - All screen components (Login, Dashboards, Carts, Orders, Profile)
- `/app/components/` - Shared components (BottomTabNavigator, Navbar, CustomAlert, etc.)
- `/app/context/` - Theme context for dark/light mode
- `/app/src/lib/` - API services and utilities

## User Roles
1. **Retailer** - Can browse products, add to cart, place orders, view order history
2. **Staff (Sales Executive)** - Can select customers, create orders on behalf of retailers
3. **Dealer** - Dashboard access (not fully implemented in current codebase)

## Bug Fixes Implemented (Jan 2026)

### Issue: "Text strings must be rendered within a <Text> component"
Root cause: In React Native, all text content must be wrapped in `<Text>` components. The error was caused by:

1. **CartScreen.tsx** (lines 219-226): The increment/decrement buttons used `<TouchableOpacity>` with bare `<Text>` containing just symbols, causing issues on some React Native versions
   - Fixed: Properly styled the buttons with proper `<Text>` wrappers

2. **StaffCartScreen.tsx** (lines 226-232): Icons (MinusCircle, PlusCircle) were incorrectly wrapped in `<Text>` components instead of proper touchable components
   - Fixed: Changed from `<Text onPress={...}>` to `<TouchableOpacity onPress={...}>`

3. **BottomTabNavigator.tsx** (lines 145-149): The conditional badge rendering used short-circuit evaluation `tab.badge && tab.badge > 0 && (...)` which could potentially render falsy values
   - Fixed: Changed to explicit ternary `tab.badge !== undefined && tab.badge > 0 ? (...) : null`

## What's Implemented
- Multi-role authentication (Retailer/Staff)
- Product browsing with search
- Shopping cart with quantity management
- Order placement and tracking
- Order history with filtering (date, status)
- Profile management with password change
- Bottom tab navigation
- Pull-to-refresh on screens
- Voice search for products (RetailerHome)

## Backlog / Future Features
- P0: Full dealer role implementation
- P1: Push notifications for order updates
- P2: Product images gallery
- P2: Order invoice generation/download
- P3: Analytics dashboard improvements
