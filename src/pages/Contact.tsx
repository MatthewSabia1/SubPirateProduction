import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import Logo from '../components/Logo';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<null | 'success' | 'error'>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    // In a real implementation, you would send this data to your backend
    // This is a simulated API call
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Form submitted:', formData);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      
      setSubmitStatus('success');
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Get in Touch</h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Have questions about our services or need help with your account? Our team is here to assist you.
            </p>
          </div>
          
          <div className="flex justify-center mb-16">
            <div className="bg-[#111111] rounded-xl p-8 flex flex-col items-center text-center max-w-md w-full">
              <div className="w-14 h-14 bg-[#C69B7B]/20 rounded-full flex items-center justify-center mb-4">
                <Mail size={24} className="text-[#C69B7B]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Email Us</h3>
              <p className="text-gray-400 mb-4">Our friendly team is here to help.</p>
              <a href="mailto:support@subpirate.com" className="text-[#C69B7B] hover:underline">support@subpirate.com</a>
            </div>
          </div>
          
          <div className="bg-[#111111] rounded-xl p-8 md:p-12 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white">Send Us a Message</h2>
                <p className="text-gray-400 mb-8">
                  Whether you have a question about our features, pricing, or anything else, we're ready to answer all your questions.
                </p>
                
                <div className="space-y-4 text-gray-400">
                  <div className="flex items-start">
                    <div className="mr-4 mt-1">
                      <Mail size={18} className="text-[#C69B7B]" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Sales Inquiries</h4>
                      <p className="mt-1">For questions about our pricing plans or enterprise solutions.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="mr-4 mt-1">
                      <Mail size={18} className="text-[#C69B7B]" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Technical Support</h4>
                      <p className="mt-1">If you're having issues with our platform or need assistance.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="mr-4 mt-1">
                      <Mail size={18} className="text-[#C69B7B]" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Partnership Opportunities</h4>
                      <p className="mt-1">Interested in collaborating with us? Let's talk.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                {submitStatus === 'success' ? (
                  <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send size={24} className="text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">Message Sent!</h3>
                    <p className="text-gray-300 mb-4">
                      Thank you for reaching out. We'll get back to you as soon as possible.
                    </p>
                    <button 
                      onClick={() => setSubmitStatus(null)}
                      className="px-6 py-2 rounded-md bg-[#111111] text-white hover:bg-[#222222] transition-colors"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#C69B7B] focus:border-transparent"
                        placeholder="Your name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#C69B7B] focus:border-transparent"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#C69B7B] focus:border-transparent"
                      >
                        <option value="" disabled>Select a subject</option>
                        <option value="general">General Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="billing">Billing Question</option>
                        <option value="feature">Feature Request</option>
                        <option value="partnership">Partnership</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-400 mb-1">Message</label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        required
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#C69B7B] focus:border-transparent resize-none"
                        placeholder="How can we help you?"
                      />
                    </div>
                    
                    {submitStatus === 'error' && (
                      <div className="p-3 bg-red-900/20 border border-red-500 rounded-md text-red-400 text-sm">
                        Something went wrong while sending your message. Please try again.
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full px-6 py-3 rounded-md flex items-center justify-center gap-2 text-black font-semibold shadow-xl ${
                        isSubmitting 
                          ? 'bg-[#A37959] cursor-not-allowed' 
                          : 'bg-gradient-to-r from-[#C69B7B] to-[#B38A6A] hover:from-[#B38A6A] hover:to-[#A37959] shadow-[#C69B7B]/10 transition-all transform hover:scale-105'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send size={18} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-black border-t border-[#222222] py-8 mt-16">
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

export default Contact; 