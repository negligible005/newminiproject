const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// ─── Comprehensive Knowledge Base for UNIO Platform ──────────────────────────
const KNOWLEDGE = [
  // Platform overview
  { keys: ['what is unio', 'about unio', 'platform', 'unio app', 'what does unio do'],
    reply: `UNIO is a peer-to-peer resource sharing platform that lets users split costs on logistics, digital subscriptions, cargo, cold storage, and more. You can be a Consumer (find & join splits) or a Provider (list your services). Key areas: Dashboard, Marketplace, Community, and Tracking.` },

  // Registration & Login
  { keys: ['register', 'sign up', 'create account', 'new account'],
    reply: `To register on UNIO: click "Get Started" on the homepage → fill in your name, email, and password → choose your role (Consumer or Provider). You'll be logged in automatically after registration.` },
  { keys: ['login', 'log in', 'sign in', 'forgot password'],
    reply: `To login: go to the Login page and enter your email & password. Your session lasts 1 hour. If you forget your password, contact support — password reset is coming soon.` },

  // Dashboard
  { keys: ['dashboard', 'home page', 'main page', 'joined splits', 'my splits'],
    reply: `The Dashboard (consumer.html) is your main hub. It shows: Active Splits you've joined, Bookings you've made, Notifications, and quick stats. Use the left sidebar to navigate between sections.` },

  // Marketplace
  { keys: ['marketplace', 'buy', 'sell', 'browse items', 'find splits', 'explore'],
    reply: `The Marketplace (marketplace.html) lets you browse available splits by category: Logistics 🚚, Digital Subscriptions 💻, Cold Storage ❄️, Cargo 📦, and more. Use filters to narrow by price, type, or location. Click any listing to view details, join, or place a bid.` },

  // Creating a split / listing
  { keys: ['create split', 'post listing', 'list service', 'add listing', 'new listing', 'create listing', 'how to list'],
    reply: `As a Provider, go to your Provider Dashboard (provider.html) → click "Create New Listing". Fill in: service type, capacity, price per unit, location & date. Your listing goes to admin for approval before going live. Once approved, consumers can find and book it.` },

  // Bookings
  { keys: ['booking', 'book', 'reservation', 'how to book', 'join split'],
    reply: `To book/join a split: browse the Marketplace → click on a listing → select quantity → confirm booking. You'll see the booking in your Dashboard under "My Bookings". Providers will see it and can confirm or manage it.` },

  // Payments
  { keys: ['payment', 'pay', 'price', 'cost', 'amount', 'inr', 'rupee', 'how much'],
    reply: `All prices on UNIO are in INR (₹). After booking, navigate to "Make Payment" to pay via our dummy payment system. You can use simulated UPI, Card, or Net Banking. A confirmation ID is generated for each payment. Admin can track all payments.` },

  // Logistics / Cargo
  { keys: ['logistics', 'cargo', 'shipment', 'transport', 'cold', 'cold storage', 'cold rese'],
    reply: `Logistics & Cargo splits let you share transportation costs. After booking, you can track the shipment in real-time via the Map Tracking section on your Dashboard. Providers update checkpoints as the cargo moves.` },

  // Digital subscriptions
  { keys: ['digital', 'subscription', 'netflix', 'spotify', 'streaming', 'software'],
    reply: `Digital subscription splits let you share the cost of streaming services, software, or online tools. Browse the "Digital" category in the Marketplace, join a split, and the provider shares access details after payment confirmation.` },

  // Tracking
  { keys: ['track', 'tracking', 'location', 'where is', 'shipment status', 'checkpoint', 'map'],
    reply: `Real-time tracking is available for Logistics splits. In your Booking details, click "Track Shipment" or use the Map view. Providers add checkpoints (location + coordinates) which show on the map. Each checkpoint is verified by Admin.` },

  // Trust scores
  { keys: ['trust', 'trust score', 'rating', 'review', 'reputation'],
    reply: `Trust Scores (1-5 stars) reflect a user's reliability on the platform. After completing a split, you can rate your co-participants. Higher trust scores increase your visibility and credibility. Check any user's trust score on their profile in the Community section.` },

  // Community & Friends
  { keys: ['community', 'friends', 'connect', 'social', 'people', 'users'],
    reply: `The Community section lets you connect with other UNIO members. Send friend requests, see mutual connections, view friend activity, and check peer trust scores. A strong community network improves your recommendations.` },

  // Notifications
  { keys: ['notification', 'alert', 'updates', 'notify'],
    reply: `Notifications appear in your Dashboard's bell icon. You'll be notified about: booking confirmations, payment updates, friend requests, new community activity, and admin actions on your listings.` },

  // Split types
  { keys: ['split type', 'type of split', 'categories', 'kinds of split', 'services available'],
    reply: `UNIO supports these split categories:\n• 🚚 Logistics — share truck/van transport\n• ❄️ Cold Storage — share refrigerated space\n• 📦 Cargo — share cargo capacity\n• 💻 Digital Subscriptions — share software/streaming\n• 🏪 Marketplace Items — buy/sell/auction\n• 🔄 Custom Splits — any peer-to-peer arrangement` },

  // Provider role
  { keys: ['provider', 'be a provider', 'offer service', 'provide', 'how to sell'],
    reply: `Providers list services that others can join/book. To become a provider: register/login → switch to Provider view (provider.html) → create listings. Your listings need admin approval before going live. You can manage bookings, update tracking, and communicate with consumers.` },

  // Consumer role
  { keys: ['consumer', 'be a consumer', 'how to use as consumer', 'buyer'],
    reply: `Consumers browse the Marketplace and join/book available splits to save costs. After registration, you default to consumer role. Visit the Marketplace to explore, filter, book a split, make payment, and track your order.` },

  // Admin
  { keys: ['admin', 'administration', 'manage platform', 'moderation'],
    reply: `The Admin Panel (runs on port 3001) lets administrators: approve/reject listings and marketplace posts, manage all bookings, view all registered users, manage split requests, and confirm tracking updates. Contact the platform admin if you have disputes.` },

  // Splits - joining
  { keys: ['how to join', 'join a split', 'participate', 'how do i join'],
    reply: `To join a split: go to Marketplace → find a listing that suits you → click "Join Split" or "Book Now" → confirm your quantity → proceed to payment. Once payment is confirmed, you're officially part of the split!` },

  // Help / general
  { keys: ['help', 'support', 'problem', 'issue', 'not working', 'error', 'bug'],
    reply: `For platform issues, try: refreshing the page, logging out and back in, or clearing browser cache. For listing/booking disputes, contact your co-participant first. For platform-level issues, reach out to admin via the Admin Panel.` },

  // Project specifics
  { keys: ['unio features', 'functionalities', 'what can i do'],
    reply: `UNIO offers a wide range of features:\n• **Split Logistics**: Share transportation costs (trucks, vans).\n• **Cold Storage**: Share refrigerated space for perishables.\n• **Digital Splits**: Share streaming or software subscriptions.\n• **Marketplace**: Buy/sell items or start an auction.\n• **Real-time Tracking**: Live map updates for your shipments.\n• **Trust System**: Build your reputation through peer ratings.\n• **Community**: Connect with friends and view their activity.` },
  { keys: ['who built', 'creator', 'about the project', 'team'],
    reply: `UNIO is a revolutionary peer-to-peer sharing platform built to make logistics and services more accessible and affordable for everyone through the power of "splitting".` },
  { keys: ['is it safe', 'security', 'trustworthy'],
    reply: `Safety is our priority! UNIO uses a **Trust Score** system. All providers are verified by admins, and real-time tracking ensures you know where your cargo is. We also have a community-based friend system to help you split with people you know.` },

  // Greeting
  { keys: ['hi', 'hello', 'hey', 'greet', 'good morning', 'good afternoon', 'howdy'],
    reply: `Hello! 👋 I'm the UNIO Assistant. I can help you with:\n• Finding and joining splits\n• Creating listings (providers)\n• Payments & tracking\n• Community & trust scores\n• Platform navigation\n\nWhat would you like to know?` },
];

function findReply(msg) {
    const lower = msg.toLowerCase().trim();
    
    // First, check for exact/partial keyword matches in KNOWLEDGE
    let bestMatch = null;
    let maxOverlap = 0;

    for (const item of KNOWLEDGE) {
        for (const key of item.keys) {
            if (lower.includes(key)) {
                // Return immediately for high-confidence matches
                if (lower === key) return item.reply;
                
                // Track best match based on key length (more specific is better)
                if (key.length > maxOverlap) {
                    maxOverlap = key.length;
                    bestMatch = item.reply;
                }
            }
        }
    }
    
    if (bestMatch) return bestMatch;

    return null;
}

router.post('/chat', authenticateToken, async (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
        return res.json({ reply: "Please type a question and I'll do my best to help! 😊" });
    }

    let reply = findReply(message);

    if (!reply) {
        // Fallback: general catch-all
        const lower = message.toLowerCase();
        if (lower.includes('how') || lower.includes('what') || lower.includes('where') || lower.includes('when')) {
            reply = `I'm not sure about that specific question, but here are things I can help with:\n• **Joining/creating splits** — ask "how do I join a split?"\n• **Payments** — ask "how does payment work?"\n• **Tracking** — ask "how do I track my shipment?"\n• **Community** — ask "what is the community section?"\n\nTry rephrasing your question or ask about a specific feature!`;
        } else if (lower.includes('price') || lower.includes('cost') || lower.includes('cheap')) {
            reply = `Prices on UNIO vary by listing and are set by providers. All prices are in INR (₹). Splitting a service means you only pay your share — much cheaper than booking alone! Browse the Marketplace to compare prices.`;
        } else {
            reply = `I'm your UNIO Assistant 🤖 I can help you navigate the platform, understand features like splits, bookings, tracking, and payments. Try asking:\n• "How do I create a split?"\n• "What is a trust score?"\n• "How does payment work?"\n• "How do I track my shipment?"`;
        }
    }

    // Small delay for natural feel
    setTimeout(() => {
        res.json({ reply });
    }, 300);
});

module.exports = router;
