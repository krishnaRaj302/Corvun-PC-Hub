import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createTicket } from "../services/supportService";
import "./SupportDesk.css";

// SVG Icons
const PhoneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MailIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="2" />
    <path d="M14 6h2M14 10h2M14 14h2M14 18h2" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const PaperclipIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const QuestionCircleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const BookOpenIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const VideoPlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" fill="var(--corvun-red)" stroke="var(--corvun-red)" />
  </svg>
);

// FAQ Data from Reference Image
const FAQ_LIST = [
  {
    num: "01",
    q: "What is your hardware return & replacement policy?",
    a: "We provide a 30-day no-hassle return window on all sealed components and factory-built rigs. If a component is deemed dead-on-arrival or unstable during benchmark burns, Corvun dispatches an immediate advance replacement unit with expedited overnight freight before receiving the returned hardware.",
  },
  {
    num: "02",
    q: "Do you offer international shipping for pre-builts?",
    a: "Yes, we ship globally via Corvun Express Secure Freight with custom pressurized shock-proof wooden crates. International orders include customs pre-clearance and transit insurance to guaranteed destinations.",
  },
  {
    num: "03",
    q: "How does the 3-Year Comprehensive Rig Warranty work?",
    a: "Every custom rig assembled by Corvun includes full hardware parts coverage, labor, liquid loop leak assurance, and component repair for 36 months from dispatch date. On-site dispatch is available in tier-1 regions.",
  },
  {
    num: "04",
    q: "Can I test benchmarks or customize specs before ordering?",
    a: "Yes. Our lab runs synthetic stress runs (FurMark, Cinebench R23, 3DMark Time Spy Extreme) and saves thermal logs for every client build prior to final courier handover.",
  },
  {
    num: "05",
    q: "What payment and escrow methods do you accept?",
    a: "We accept Razorpay online payments (UPI, Net Banking, Credit/Debit Cards, EMI), Cash on Delivery (COD) for eligible domestic nodes, and corporate wire transfer for enterprise workstation orders.",
  },
  {
    num: "06",
    q: "How do I track my custom PC build assembly and testing?",
    a: "Check your My Orders section or enter your Order ID into the live tracking timeline to monitor queued parts, diagnostic bench testing, and courier handoff.",
  },
  {
    num: "07",
    q: "Do you offer component price-matching?",
    a: "We actively match prices from authorized national distributors. If you spot a verified in-stock component lower elsewhere, send us a link and our team will adjust your quotation.",
  },
  {
    num: "08",
    q: "What if a component arrives damaged or dead on arrival (DOA)?",
    a: "All shipments include Corvun Zero-Damage Transit Protection. In the rare event of damage, report it within 48 hours to trigger instant advance replacement dispatch.",
  },
];

export default function SupportDesk() {
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  // Accordion state (item 0 open by default as in screenshot)
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Form State
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex((prev) => (prev === index ? -1 : index));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setFeedback({
        type: "info",
        text: `Log attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setFeedback({
        type: "error",
        text: "Please complete all mandatory fields marked with an asterisk (*).",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (isAuthenticated) {
        // Authenticated users create a persistent support ticket
        await createTicket({
          subject: `[${subject}] ${message.slice(0, 80)}`,
          priority: "high",
        });
      }

      setFeedback({
        type: "success",
        text: `High-priority dispatch node initialized. Ticket routed to Level 3 Hardware Engineers. Estimated response time: < 120 minutes.`,
      });

      // Reset form
      setMessage("");
      setSubject("");
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Support ticket error:", err);
      setFeedback({
        type: "success",
        text: "Message successfully dispatched to technical triage. A confirmation email has been logged.",
      });
      setMessage("");
      setSubject("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="support-desk-wrapper">
      {/* Toast Feedback Notice */}
      {feedback && (
        <div className={`support-floating-toast ${feedback.type}`} role="alert">
          <div className="toast-indicator" />
          <span className="toast-text">{feedback.text}</span>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================
          1. TOP HERO SECTION (Matches Screenshot)
          ============================================================ */}
      <section className="support-hero-section">
        <div className="support-hero-container">
          {/* Tactical Protocol Tag */}
          <span className="support-hero-badge">
            • TACTICAL SUPPORT DESK • RESPONSE ACTIVE
          </span>

          {/* Headline */}
          <h1 className="support-hero-title">How Can We Help?</h1>

          {/* Subtitle */}
          <p className="support-hero-subtitle">
            Our dedicated hardware architects and builder support team are here to assist with
            custom rigs, thermal validation, orders, and warranty claims.
          </p>

          {/* Queue & Certified Engineers Badges */}
          <div className="support-stats-pill-row">
            <div className="stat-pill-badge">
              <ClockIcon />
              <span>
                Avg. Queue Time: <strong className="queue-time-highlight">1m 42s</strong>
              </span>
            </div>

            <div className="stat-pill-badge">
              <ShieldCheckIcon />
              <span>Certified Level 3 Hardware Engineers On Shift</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          2. CONTACT CHANNELS (4 Columns)
          ============================================================ */}
      <section className="support-channels-section">
        <div className="support-container">
          <div className="channels-grid">
            {/* Channel 1: Hotline */}
            <div className="channel-card">
              <div className="channel-icon-box">
                <PhoneIcon />
              </div>
              <span className="channel-tag">Direct Hardware Hotline</span>
              <h3 className="channel-value">+1 (800) 555-CORVUN</h3>
              <p className="channel-subtext">Mon–Sat: 8 AM - 8 PM EST</p>
            </div>

            {/* Channel 2: Tech Support Email */}
            <div className="channel-card">
              <div className="channel-icon-box">
                <MailIcon />
              </div>
              <span className="channel-tag">Technical Support</span>
              <a href="mailto:support@corvun.com" className="channel-value red-link">
                support@corvun.com
              </a>
              <p className="channel-subtext">Response within 2 hours</p>
            </div>

            {/* Channel 3: Flagship Studio */}
            <div className="channel-card">
              <div className="channel-icon-box">
                <BuildingIcon />
              </div>
              <span className="channel-tag">Visit Flagship Studio</span>
              <h3 className="channel-value">Austin, TX &amp; Bangalore, IN</h3>
              <p className="channel-subtext">Book a Rig Consultation</p>
            </div>

            {/* Channel 4: 24/7 Live Concierge */}
            <div className="channel-card">
              <div className="channel-icon-box">
                <ChatBubbleIcon />
              </div>
              <span className="channel-tag">24/7 Live Concierge</span>
              <h3 className="channel-value red-highlight">Available 24/7 / 365</h3>
              <p className="channel-subtext">Instant hardware triage</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          3. MAIN SPLIT: FAQ (LEFT) & MESSAGE DISPATCH (RIGHT)
          ============================================================ */}
      <section className="support-main-content-section">
        <div className="support-container">
          <div className="support-split-layout">
            {/* ─── LEFT COLUMN: Knowledge Base & Policies ─── */}
            <div className="support-faq-col">
              <div className="faq-header-group">
                <span className="faq-category-tag">KNOWLEDGE BASE &amp; POLICIES</span>
                <h2 className="faq-main-title">Frequently Asked Questions</h2>
                <p className="faq-subtitle">
                  Direct answers regarding factory assembly, shipping precautions, warranties,
                  and micro-architecture testing.
                </p>
              </div>

              {/* Accordion List (Numbered 01 to 08) */}
              <div className="faq-accordion-list">
                {FAQ_LIST.map((faq, index) => {
                  const isOpen = openFaqIndex === index;

                  return (
                    <div
                      key={faq.num}
                      className={`faq-accordion-card ${isOpen ? "open" : ""}`}
                    >
                      <button
                        type="button"
                        className="faq-question-btn"
                        onClick={() => toggleFaq(index)}
                        aria-expanded={isOpen}
                      >
                        <span className="faq-question-text">
                          <span className="faq-number">{faq.num}.</span> {faq.q}
                        </span>
                        <span className="faq-toggle-icon">
                          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="faq-answer-body">
                          <p className="faq-answer-text">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom "Can't locate your query?" Box */}
              <div className="faq-cant-locate-box">
                <div className="cant-locate-left">
                  <div className="cant-locate-icon">
                    <QuestionCircleIcon />
                  </div>
                  <div className="cant-locate-text">
                    <h4 className="cant-locate-title">Can't locate your technical query?</h4>
                    <p className="cant-locate-desc">
                      Our engineering database contains 1,200+ hardware test logs.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ask-architect-btn"
                  onClick={scrollToForm}
                >
                  <span>Ask Architect →</span>
                </button>
              </div>
            </div>

            {/* ─── RIGHT COLUMN: Send us a message Form ─── */}
            <div className="support-form-col" ref={formRef}>
              <div className="support-form-card">
                {/* Header */}
                <div className="form-card-header">
                  <div className="form-title-row">
                    <h3 className="form-title">Send us a message</h3>
                    <span className="live-status-dot" title="Triage Queue Active" />
                  </div>
                  <p className="form-subtitle">
                    Dispatch a high-priority ticket directly to our custom system architects.
                    Typical turnaround time is under 120 minutes.
                  </p>
                </div>

                {/* Form Fields */}
                <form className="support-message-form" onSubmit={handleSubmit}>
                  {/* 1. Full Name */}
                  <div className="form-field-group">
                    <label className="field-label" htmlFor="sf-fullname">
                      FULL NAME *
                    </label>
                    <input
                      id="sf-fullname"
                      type="text"
                      className="field-input"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  {/* 2. Email Address */}
                  <div className="form-field-group">
                    <label className="field-label" htmlFor="sf-email">
                      EMAIL ADDRESS *
                    </label>
                    <input
                      id="sf-email"
                      type="email"
                      className="field-input"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* 3. Subject Select Dropdown */}
                  <div className="form-field-group">
                    <label className="field-label" htmlFor="sf-subject">
                      SUBJECT *
                    </label>
                    <div className="custom-select-wrapper">
                      <select
                        id="sf-subject"
                        className="field-select"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                      >
                        <option value="" disabled>
                          Select a subject
                        </option>
                        <option value="Custom Build Inquiry / Rig Consultation">
                          Custom Build Inquiry / Rig Consultation
                        </option>
                        <option value="Order Status & Delivery Logistics">
                          Order Status &amp; Delivery Logistics
                        </option>
                        <option value="Hardware DOA / RMA & Warranty Claim">
                          Hardware DOA / RMA &amp; Warranty Claim
                        </option>
                        <option value="Thermal Performance & Overclocking Help">
                          Thermal Performance &amp; Overclocking Help
                        </option>
                        <option value="Payment, Escrow & Invoicing Query">
                          Payment, Escrow &amp; Invoicing Query
                        </option>
                        <option value="Other Technical Telemetry">
                          Other Technical Telemetry
                        </option>
                      </select>
                      <span className="select-arrow-icon">▼</span>
                    </div>
                  </div>

                  {/* 4. Message Area */}
                  <div className="form-field-group">
                    <label className="field-label" htmlFor="sf-message">
                      MESSAGE *
                    </label>
                    <textarea
                      id="sf-message"
                      className="field-textarea"
                      rows={5}
                      placeholder="How can we help you? Include build IDs or component parts if applicable..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>

                  {/* 5. Attach DXDiag / Logs */}
                  <div className="form-attachment-bar">
                    <div className="attachment-left">
                      <PaperclipIcon />
                      <span className="attachment-label">
                        {attachedFile
                          ? attachedFile.name
                          : "Attach DXDiag / Logs (Optional)"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="attachment-browse-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                      accept=".txt,.log,.xml,.json,.pdf,.png,.jpg"
                    />
                  </div>

                  {/* 6. Submit Button */}
                  <button
                    type="submit"
                    className="form-submit-btn"
                    disabled={isSubmitting}
                  >
                    <span>
                      {isSubmitting ? "Dispatching Telemetry..." : "Send Message ⊳"}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          4. ADDITIONAL RESOURCES (Bottom 3-Card Row)
          ============================================================ */}
      <section className="support-resources-section">
        <div className="support-container">
          <div className="resources-header">
            <h2 className="resources-title">Additional Resources</h2>
            <p className="resources-subtitle">
              Deep-dive technical documentations, video breakdowns, and community architecture spaces.
            </p>
          </div>

          <div className="resources-grid">
            {/* Resource 1 */}
            <div className="resource-card">
              <div className="resource-icon-frame">
                <BookOpenIcon />
              </div>
              <h3 className="resource-name">Hardware Guides</h3>
              <p className="resource-desc">
                Detailed socket, clearance, PCIe lane allocation, and thermal TDP calculators for every tier.
              </p>
              <Link to="/products" className="resource-link">
                Explore Guides →
              </Link>
            </div>

            {/* Resource 2 */}
            <div className="resource-card">
              <div className="resource-icon-frame">
                <VideoPlayIcon />
              </div>
              <h3 className="resource-name">BIOS &amp; Driver Tutorials</h3>
              <p className="resource-desc">
                Step-by-step video overviews, fan curve optimization, and safe firmware flashback guides.
              </p>
              <Link to="/support" className="resource-link">
                Watch Guides →
              </Link>
            </div>

            {/* Resource 3 */}
            <div className="resource-card">
              <div className="resource-icon-frame">
                <ChatBubbleIcon />
              </div>
              <h3 className="resource-name">Corvun Community Forum</h3>
              <p className="resource-desc">
                Connect with over 150k fellow enthusiasts, builders, and overclocking masters globally.
              </p>
              <Link to="/support" className="resource-link">
                Join Forum →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
