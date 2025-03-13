import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';

const PrivacyPolicy = () => {
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
          <h1 className="text-3xl font-bold mb-6 text-[#C69B7B]">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">1. Introduction</h2>
              <p>Welcome to SubPirate. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">2. Data We Collect</h2>
              <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>Identity Data:</strong> Includes first name, last name, username or similar identifier.</li>
                <li><strong>Contact Data:</strong> Includes email address and telephone numbers.</li>
                <li><strong>Technical Data:</strong> Includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
                <li><strong>Usage Data:</strong> Includes information about how you use our website, products, and services.</li>
                <li><strong>Marketing and Communications Data:</strong> Includes your preferences in receiving marketing from us and our third parties and your communication preferences.</li>
                <li><strong>Reddit Account Data:</strong> When you connect your Reddit account, we store authentication tokens and data from your Reddit account necessary for our services to function.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">3. How We Use Your Data</h2>
              <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                <li>Where we need to comply with a legal obligation.</li>
                <li>To provide you with our services, including subreddit analysis, competitor research, and marketing insights.</li>
                <li>To manage your account and subscription.</li>
                <li>To improve our platform and services.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">4. Data Sharing and Third Parties</h2>
              <p>We may share your personal data with the following third parties:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>Service Providers:</strong> We use third-party service providers to help us operate our business, such as payment processors (Stripe), database providers (Supabase), and AI service providers (OpenRouter).</li>
                <li><strong>Reddit API:</strong> When you connect your Reddit account, we interact with Reddit's API to fetch data necessary for our services.</li>
                <li><strong>Analytics Providers:</strong> We may use analytics providers to help us understand how users interact with our platform.</li>
              </ul>
              <p className="mt-2">We require all third parties to respect the security of your personal data and to treat it in accordance with the law.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">5. Data Security</h2>
              <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">6. Data Retention</h2>
              <p>We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">7. Your Legal Rights</h2>
              <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data including:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>The right to request access to your personal data.</li>
                <li>The right to request correction of your personal data.</li>
                <li>The right to request erasure of your personal data.</li>
                <li>The right to object to processing of your personal data.</li>
                <li>The right to request restriction of processing your personal data.</li>
                <li>The right to request transfer of your personal data.</li>
                <li>The right to withdraw consent.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">8. Cookies</h2>
              <p>We use cookies and similar tracking technologies to track the activity on our service and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier.</p>
              <p className="mt-2">You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">9. Children's Privacy</h2>
              <p>Our service does not address anyone under the age of 18. We do not knowingly collect personally identifiable information from anyone under the age of 18. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">10. Changes to This Privacy Policy</h2>
              <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top of this Privacy Policy.</p>
              <p className="mt-2">You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">11. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>By email: privacy@subpirate.com</li>
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

export default PrivacyPolicy; 