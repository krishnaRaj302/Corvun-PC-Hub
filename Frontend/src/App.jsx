import { Routes, Route, Navigate } from "react-router-dom";
import CustomerLayout from "./layouts/CustomerLayout";
import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";
import AdminRoute from "./components/AdminRoute";

// Customer Pages
import Home from "./pages/Home";
import Products from "./pages/Products";
import PCBuilder from "./pages/PCBuilder";
import ProductDetail from "./pages/ProductDetail";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import MyOrders from "./pages/MyOrders";
import CustomerProfile from "./pages/CustomerProfile";
import SavedAddresses from "./pages/SavedAddresses";
import OrderDetails from "./pages/OrderDetails";

// Auth Pages
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import VerifyOTP from "./pages/auth/VerifyOTP";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProductList from "./pages/admin/products/AdminProductList";
import AdminAddProduct from "./pages/admin/products/AdminAddProduct";
import AdminEditProduct from "./pages/admin/products/AdminEditProduct";
import AdminUserList from "./pages/admin/users/AdminUserList";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminRefunds from "./pages/admin/AdminRefunds";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminSales from "./pages/admin/AdminSales";
import AdminOffers from "./pages/admin/AdminOffers";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminReviewDetails from "./pages/admin/AdminReviewDetails";
import AdminBanners from "./pages/admin/AdminBanners";

function App() {
  return (
    <Routes>
      {/* ==========================================
          CUSTOMER WORKSTATION PAGES
          ========================================== */}
      <Route
        path="/"
        element={
          <CustomerLayout>
            <Home />
          </CustomerLayout>
        }
      />

      <Route
        path="/products"
        element={
          <CustomerLayout>
            <Products />
          </CustomerLayout>
        }
      />

      <Route
        path="/products/:id"
        element={
          <CustomerLayout>
            <ProductDetail />
          </CustomerLayout>
        }
      />

      <Route
        path="/pc-builder"
        element={
          <CustomerLayout>
            <PCBuilder />
          </CustomerLayout>
        }
      />

      <Route
        path="/wishlist"
        element={
          <CustomerLayout>
            <Wishlist />
          </CustomerLayout>
        }
      />

      <Route
        path="/cart"
        element={
          <CustomerLayout>
            <Cart />
          </CustomerLayout>
        }
      />

      <Route
        path="/checkout"
        element={
          <CustomerLayout>
            <Checkout />
          </CustomerLayout>
        }
      />

      <Route
        path="/order-confirmation"
        element={
          <CustomerLayout>
            <OrderConfirmation />
          </CustomerLayout>
        }
      />

      <Route
        path="/my-orders"
        element={
          <CustomerLayout>
            <MyOrders />
          </CustomerLayout>
        }
      />

      <Route
        path="/profile"
        element={
          <CustomerLayout>
            <CustomerProfile />
          </CustomerLayout>
        }
      />

      <Route
        path="/addresses"
        element={
          <CustomerLayout>
            <SavedAddresses />
          </CustomerLayout>
        }
      />

      <Route
        path="/orders/:orderId"
        element={
          <CustomerLayout>
            <OrderDetails />
          </CustomerLayout>
        }
      />

      <Route
        path="/account"
        element={<Navigate to="/profile" replace />}
      />

      <Route
        path="/orders"
        element={<Navigate to="/my-orders" replace />}
      />

      {/* ==========================================
          CUSTOMER AUTHENTICATION
          ========================================== */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />

      <Route
        path="/signup"
        element={
          <AuthLayout>
            <Signup />
          </AuthLayout>
        }
      />

      <Route
        path="/verify-otp"
        element={
          <AuthLayout>
            <VerifyOTP />
          </AuthLayout>
        }
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* ==========================================
          ADMIN AUTHENTICATION (SEPARATE UI)
          ========================================== */}
      <Route
        path="/admin/login"
        element={<AdminLogin />}
      />

      {/* ==========================================
          PROTECTED ADMIN CONSOLE ROUTES
          (Role="admin" strictly required)
          ========================================== */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* Product Management Core */}
          <Route path="/admin/products" element={<AdminProductList />} />
          <Route path="/admin/products/add" element={<AdminAddProduct />} />
          <Route path="/admin/products/edit/:id" element={<AdminEditProduct />} />

          {/* Additional Admin Modules */}
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/brands" element={<AdminBrands />} />
          <Route path="/admin/users" element={<AdminUserList />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/payments/refunds" element={<AdminRefunds />} />
          <Route path="/admin/coupons" element={<AdminCoupons />} />
          <Route path="/admin/offers" element={<AdminOffers />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
          <Route path="/admin/reviews/:id" element={<AdminReviewDetails />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/referrals" element={<AdminReferrals />} />
          <Route path="/admin/sales" element={<AdminSales />} />
          <Route path="/admin/banners" element={<AdminBanners />} />
          <Route path="/admin/reports" element={<Navigate to="/admin/sales" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;