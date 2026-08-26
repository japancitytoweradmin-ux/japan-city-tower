import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Search, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Pin, 
  MessageSquare, 
  Send 
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Notice, PriorityLevel } from '../../types';
import { sampleNotices } from '../../data/mockData';
import { useToast } from '../../components/common/Toast';
import { noticeService } from '../../services/noticeService';

interface NoticesPageProps {
  isMemberView?: boolean;
}

export const NoticesPage: React.FC<NoticesPageProps> = ({ isMemberView = false }) => {
  const { showToast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  React.useEffect(() => {
    const unsub = isMemberView
      ? noticeService.subscribeToPublishedNotices((loaded) => setNotices(loaded))
      : noticeService.subscribeToNotices((loaded) => setNotices(loaded));

    return () => unsub();
  }, [isMemberView]);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState<PriorityLevel>('HIGH');
  const [formTargetAudience, setFormTargetAudience] = useState<'ALL' | 'MEMBERS_ONLY' | 'MANAGEMENT_ONLY'>('ALL');

  const handleSaveNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      showToast('নোটিশের শিরোনাম ও বিবরণ প্রদান করুন', 'warning');
      return;
    }

    const newNotice: Notice = {
      id: `not-${Date.now()}`,
      title: formTitle,
      content: formContent,
      publishedDate: new Date().toISOString().split('T')[0],
      priority: formPriority,
      targetAudience: formTargetAudience,
      author: 'ম্যানেজমেন্ট কমিটি',
      isPinned: formPriority === 'URGENT',
    };

    setNotices([newNotice, ...notices]);
    showToast('নতুন নোটিশ সফলভাবে জারি করা হয়েছে', 'success');
    setIsAddModalOpen(false);
    setFormTitle('');
    setFormContent('');
  };

  const handleBroadcastSms = (notice: Notice) => {
    showToast(`"${notice.title}" নোটিশটি সকল সদস্যকে SMS-এ পাঠানো হয়েছে`, 'success');
  };

  const handleBroadcastWhatsApp = (notice: Notice) => {
    showToast(`"${notice.title}" নোটিশটি WhatsApp গ্রুপে ব্রডকাস্ট করা হয়েছে`, 'info');
  };

  return (
    <div className="space-y-6 font-bengali">
      <PageHeader
        title="নোটিশ ও সার্বিক ঘোষণা"
        subtitle="টাওয়ারের নিরাপত্তা, সার্ভিস বিল ও জরুরি ব্যবস্থাপনা সংক্রান্ত অফিসিয়াল নোটিশ বোর্ড"
        actionButton={
          !isMemberView ? (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              + নতুন নোটিশ জারি করুন
            </button>
          ) : undefined
        }
      />

      {/* Notice Cards List */}
      <div className="space-y-4">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className={`bg-white rounded-2xl p-6 border shadow-xs transition-all space-y-3 ${
              notice.isPinned ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {notice.isPinned && (
                  <span className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
                    <Pin className="w-3.5 h-3.5" />
                  </span>
                )}
                <h3 className="text-base font-bold text-slate-900">{notice.title}</h3>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={notice.priority} size="sm" />
                {notice.isDemo && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bengali">
                    ডেমো
                  </span>
                )}
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5" /> {notice.publishedDate}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">{notice.content}</p>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">জারি করেছেন: <span className="font-semibold text-slate-800">{notice.author}</span></span>

              {!isMemberView && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBroadcastSms(notice)}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Send className="w-3 h-3" /> SMS পাঠান
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBroadcastWhatsApp(notice)}
                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" /> WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Notice Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="নতুন নোটিশ প্রকাশ"
        subtitle="টাওয়ারের সকল ফ্ল্যাট সদস্যের জন্য সাধারণ বা জরুরি নোটিশ"
        maxWidth="md"
      >
        <form onSubmit={handleSaveNotice} className="space-y-4 font-bengali">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              নোটিশের শিরোনাম <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="যেমন: জুন ২০২৫ মাসের সার্ভিস বিল পরিশোধের শেষ সময়"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                অগ্রাধিকার (Priority)
              </label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="LOW">সাধারণ (Low)</option>
                <option value="MEDIUM">মাঝারি (Medium)</option>
                <option value="HIGH">গুরুত্বপূর্ণ (High)</option>
                <option value="URGENT">জরুরি (Urgent & Pin)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                প্রাপক
              </label>
              <select
                value={formTargetAudience}
                onChange={(e) => setFormTargetAudience(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="ALL">সকল সদস্য ও বাসিন্দা</option>
                <option value="MEMBERS_ONLY">শুধুমাত্র ফ্ল্যাট মালিক</option>
                <option value="MANAGEMENT_ONLY">ম্যানেজমেন্ট কমিটি</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              নোটিশের বিস্তারিত বিবরণ <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="নোটিশের বিস্তারিত বিবরণ বাংলায় লিখুন..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
            >
              নোটিশ জারি করুন
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
