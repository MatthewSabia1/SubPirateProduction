import React, { useEffect, useCallback } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useFeatureAccess } from '../contexts/FeatureAccessContext';
import { useState } from 'react';

interface RedditConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

export default function RedditConnectModal({ isOpen, onClose, onConnect }: RedditConnectModalProps) {
  const { user } = useAuth();
  const { tier, checkUsageLimit } = useFeatureAccess();
  const [accountCount, setAccountCount] = useState<number>(0);
  const [accountLimit, setAccountLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Memoize checkAccountLimit to ensure stable function reference
  const checkAccountLimit = useCallback((count: number) => {
    return checkUsageLimit('reddit_accounts', count);
  }, [checkUsageLimit]);
  
  // Fetch the user's Reddit account count and limit when modal opens
  useEffect(() => {
    let isMounted = true;
    
    if (isOpen && user) {
      const fetchAccountInfo = async () => {
        try {
          setLoading(true);
          
          // Get current account count
          const { count, error } = await supabase
            .from('reddit_accounts')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id);
            
          if (error) {
            console.error('RedditConnectModal: Error fetching account count:', error);
            return;
          }
          
          if (isMounted) {
            setAccountCount(count || 0);
          }
          
          // Get account limit based on tier - this is a bit of a hacky way to get the limit
          // We try to check if the current count + 100 is within limits, and reduce until we find the limit
          let limit = null;
          for (let i = 1; i <= 100; i++) {
            if (!checkAccountLimit(i)) {
              limit = i - 1;
              break;
            }
          }
          // If we didn't find a limit up to 100, it's probably unlimited
          if (isMounted) {
            setAccountLimit(limit);
          }
        } catch (err) {
          console.error('RedditConnectModal: Error:', err);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };
      
      fetchAccountInfo();
    }
    
    return () => {
      isMounted = false;
    };
  }, [isOpen, user, checkAccountLimit]);

  // Log when this modal is shown or hidden
  useEffect(() => {
    if (isOpen) {
      console.log('RedditConnectModal: Modal is now visible');
    } else {
      console.log('RedditConnectModal: Modal is now hidden');
    }
  }, [isOpen]);
  
  // Determine if the user can add more accounts
  const canAddMoreAccounts = accountLimit === null || accountCount < accountLimit;
  const remainingAccounts = accountLimit === null ? 'unlimited' : accountLimit - accountCount;
  
  // Memoize the connect handler
  const handleConnect = useCallback(() => {
    if (canAddMoreAccounts) {
      onConnect();
    }
  }, [canAddMoreAccounts, onConnect]);
  
  // Memoize the close handler
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose} disableBackdropClick={true}>
      <div className="relative bg-[#111111] rounded-xl max-w-md w-full mx-auto shadow-2xl border border-amber-600/30 overflow-hidden">
        {/* Decorative top accent - make it more noticeable with animation */}
        <div className="h-2 w-full bg-gradient-to-r from-[#FF4500] via-[#FF8C69] to-[#FF4500] bg-size-200 animate-gradient"></div>
        
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all duration-200"
            title="Dismiss (this will reappear on page navigation)"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 pt-14">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-[#FF4500] rounded-full flex items-center justify-center mb-8 shadow-lg transform transition-transform hover:scale-105 duration-300 relative">
              {/* Pulsing ring around the icon */}
              <div className="absolute inset-0 rounded-full border-2 border-[#FF4500] animate-ping opacity-75"></div>
              <svg viewBox="0 0 24 24" width="38" height="38" fill="white">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Connect a Reddit Account</h2>
            
            {!loading && (
              <div className="flex items-center gap-2 bg-amber-500/20 text-amber-400 p-4 rounded-lg mb-4 border border-amber-500/30">
                <AlertTriangle size={18} className="shrink-0" />
                <p className="text-sm text-left">
                  {accountCount === 0 ? (
                    <span className="font-semibold">Required Action: </span>
                  ) : (
                    <span className="font-semibold">Account Limit: </span>
                  )}
                  {accountCount === 0 
                    ? "This message will continue to appear until you connect at least one Reddit account."
                    : `You have ${accountCount} account${accountCount !== 1 ? 's' : ''} connected. Your current plan allows ${accountLimit === null ? 'unlimited' : accountLimit} Reddit account${accountLimit !== 1 ? 's' : ''}.`
                  }
                </p>
              </div>
            )}
            
            <p className="text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
              {accountCount === 0 
                ? "SubPirate requires a connected Reddit account to function. Without it, you won't be able to analyze subreddits, track posts, or view analytics."
                : `You can connect ${remainingAccounts} more Reddit account${remainingAccounts !== 1 && remainingAccounts !== 'unlimited' ? 's' : ''} with your current plan.`
              }
            </p>

            <button
              onClick={handleConnect}
              disabled={!canAddMoreAccounts}
              className={`${
                canAddMoreAccounts 
                  ? "bg-[#FF4500] hover:bg-[#FF5722] text-white pulse-attention" 
                  : "bg-gray-700 text-gray-300 cursor-not-allowed"
              } font-semibold py-4 px-6 rounded-lg transition-all duration-300 w-full justify-center shadow-md hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:ring-opacity-50`}
            >
              {canAddMoreAccounts ? "Connect Reddit Account" : "Account Limit Reached"}
            </button>
            
            {!canAddMoreAccounts && (
              <p className="text-amber-400 text-sm mt-4">
                To connect more Reddit accounts, please upgrade your subscription plan.
              </p>
            )}
            
            <p className="text-gray-500 text-sm mt-4">
              You can temporarily dismiss this message, but it will reappear when you navigate to another page.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
} 