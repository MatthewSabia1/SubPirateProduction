import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <Logo size="md" />
          </Link>
          <Link to="/" className="flex items-center text-sm text-gray-400 hover:text-[#C69B7B]">
            <ArrowLeft size={16} className="mr-2" />
            Back to Home
          </Link>
        </div>
        
        <div className="max-w-4xl mx-auto bg-[#111111] rounded-xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold mb-6 text-[#C69B7B]">Terms of Service</h1>
          <p className="text-gray-400 mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">1. Introduction</h2>
              <p>Welcome to SubPirate. These Terms of Service ("Terms") govern your use of our website, services, and applications (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Services.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">2. Account Registration</h2>
              <p>To access certain features of the Services, you may be required to register for an account. You must provide accurate, current, and complete information during the registration process and keep your account information up-to-date.</p>
              <p className="mt-2">You are responsible for safeguarding the password used to access the Services and for any activities or actions under your password. We encourage you to use strong passwords (e.g., a combination of uppercase and lowercase letters, numbers, and symbols) with your account.</p>
              <p className="mt-2">You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">3. Subscription and Payments</h2>
              <p>Some of our Services are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set on a monthly or annual basis, depending on the subscription plan you select.</p>
              <p className="mt-2">At the end of each Billing Cycle, your subscription will automatically renew under the same conditions unless you cancel it or we cancel it. You may cancel your subscription renewal either through your online account management page or by contacting our customer support team.</p>
              <p className="mt-2">We use Stripe as our payment processor. By submitting your payment information, you authorize us to charge your payment method for the type of subscription you have selected. If payment cannot be charged to your payment method or if a charge is refunded for any reason, we reserve the right to either suspend or terminate your access to our Services.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">4. Free Trial</h2>
              <p>We may, at our sole discretion, offer a subscription with a free trial for a limited period of time. You may be required to enter your billing information to sign up for the free trial.</p>
              <p className="mt-2">If you do enter your billing information when signing up for a free trial, you will not be charged by us until the free trial has expired. On the last day of the free trial period, unless you cancel your subscription, you will be automatically charged the applicable subscription fee for the type of subscription you have selected.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">5. Reddit API Usage and Limitations</h2>
              <p>Our Services interact with the Reddit API and are subject to Reddit's Terms of Service and API usage limitations. You understand and agree that:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>The data we provide through our Services is sourced from Reddit and dependent on Reddit's API availability and policies.</li>
                <li>We may implement rate limiting to comply with Reddit's API usage requirements.</li>
                <li>You must comply with Reddit's Terms of Service when using insights gained from our platform.</li>
                <li>Changes to Reddit's API policies may affect our Services' functionality.</li>
                <li>You will not use our Services to engage in activities prohibited by Reddit.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">6. Intellectual Property</h2>
              <p>The Services and their original content (excluding Content provided by users), features, and functionality are and will remain the exclusive property of SubPirate and its licensors. The Services are protected by copyright, trademark, and other laws of both the United States and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of SubPirate.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">7. User Content</h2>
              <p>Our Services allow you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post to the Services, including its legality, reliability, and appropriateness.</p>
              <p className="mt-2">By posting Content to the Services, you grant us the right and license to use, modify, perform, display, reproduce, and distribute such Content on and through the Services. You retain any and all of your rights to any Content you submit, post, or display on or through the Services and you are responsible for protecting those rights.</p>
              <p className="mt-2">You represent and warrant that: (i) the Content is yours (you own it) or you have the right to use it and grant us the rights and license as provided in these Terms, and (ii) the posting of your Content on or through the Services does not violate the privacy rights, publicity rights, copyrights, contract rights or any other rights of any person.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">8. Acceptable Use</h2>
              <p>You agree not to use the Services:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>In any way that violates any applicable federal, state, local, or international law or regulation.</li>
                <li>To send, knowingly receive, upload, download, use, or re-use any material that violates the rights of others.</li>
                <li>To impersonate or attempt to impersonate another person or entity.</li>
                <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Services.</li>
                <li>To attempt to circumvent any rate limiting mechanisms or security features.</li>
                <li>To use any automated systems or scripts to scrape or extract data from the Services.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">9. Termination</h2>
              <p>We may terminate or suspend your account and access to the Services immediately, without prior notice or liability, for any reason whatsoever, including, without limitation, if you breach the Terms.</p>
              <p className="mt-2">Upon termination, your right to use the Services will immediately cease. If you wish to terminate your account, you may simply discontinue using the Services or contact us to request account deletion.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">10. Limitation of Liability</h2>
              <p>In no event shall SubPirate, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Services; (ii) any conduct or content of any third party on the Services; (iii) any content obtained from the Services; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">11. Disclaimer</h2>
              <p>Your use of the Services is at your sole risk. The Services are provided on an "AS IS" and "AS AVAILABLE" basis. The Services are provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.</p>
              <p className="mt-2">SubPirate, its subsidiaries, affiliates, and its licensors do not warrant that a) the Services will function uninterrupted, secure or available at any particular time or location; b) any errors or defects will be corrected; c) the Services are free of viruses or other harmful components; or d) the results of using the Services will meet your requirements.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">12. Governing Law</h2>
              <p>These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.</p>
              <p className="mt-2">Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">13. Changes to Terms</h2>
              <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>
              <p className="mt-2">By continuing to access or use our Services after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Services.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">14. Contact Us</h2>
              <p>If you have any questions about these Terms, please contact us:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>By email: terms@subpirate.com</li>
                <li>By visiting the contact page on our website: <Link to="/contact" className="text-[#C69B7B] hover:underline">Contact Page</Link></li>
              </ul>
            </section>
          </div>
        </div>
      </div>
      
      <footer className="bg-black border-t border-[#222222] py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm mb-4 md:mb-0">© 2023 SubPirate. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy-policy" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Privacy Policy</Link>
              <span className="text-gray-700">•</span>
              <Link to="/terms-of-service" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfService; 