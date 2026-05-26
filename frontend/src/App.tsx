import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PublicOfferListing from './pages/PublicOfferListing';
import PublicOfferDetail from './pages/PublicOfferDetail';
import BookingConfirmation from './pages/BookingConfirmation';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import CustomerBookings from './pages/CustomerBookings';
import AdminDashboard from './pages/AdminDashboard';
import CreateOffer from './pages/CreateOffer';
import ManageOffers from './pages/ManageOffers';
import ManageBookings from './pages/ManageBookings';

export default function App() {
  const basename = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <Router basename={basename}>
      <Layout>
        <Routes>
          <Route path="/" element={<PublicOfferListing />} />
          <Route path="/offer/:id" element={<PublicOfferDetail />} />
          <Route path="/booking-confirmation/:id" element={<BookingConfirmation />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/customer/bookings" element={<CustomerBookings />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/create-offer" element={<CreateOffer />} />
          <Route path="/admin/offers" element={<ManageOffers />} />
          <Route path="/admin/bookings" element={<ManageBookings />} />
        </Routes>
      </Layout>
    </Router>
  );
}
