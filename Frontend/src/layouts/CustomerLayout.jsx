import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./CustomerLayout.css";

function CustomerLayout({ children }) {
  return (
    <div className="customer-layout-wrapper">
      <Navbar />
      <main className="customer-main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default CustomerLayout;
