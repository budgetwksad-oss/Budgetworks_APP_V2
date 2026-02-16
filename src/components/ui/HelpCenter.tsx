import { useState, useEffect, useRef } from 'react';
import { HelpCircle, X, Search, Book, Keyboard, MessageCircle, FileText, ChevronRight, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HelpArticle {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  role?: string[];
}

const helpArticles: HelpArticle[] = [
  {
    id: 'getting-started',
    category: 'Getting Started',
    title: 'Getting Started with BudgetWorks',
    content: `Welcome to BudgetWorks! This guide will help you get started.

**For Administrators:**
1. Review pending service requests
2. Create and send quotes
3. Convert approved quotes to jobs
4. Assign crew members
5. Track job progress
6. Generate invoices

**For Crew Members:**
1. View assigned jobs
2. Clock in/out for shifts
3. Upload job photos
4. Update job status
5. Track your hours

**For Customers:**
1. Request quotes for services
2. Review and approve quotes
3. Track job progress
4. View and pay invoices
5. Leave feedback`,
    keywords: ['start', 'begin', 'introduction', 'overview'],
    role: ['admin', 'crew', 'customer']
  },
  {
    id: 'service-requests',
    category: 'Service Requests',
    title: 'Managing Service Requests',
    content: `Service requests are the starting point for all jobs.

**Viewing Requests:**
Navigate to Service Requests to see all pending customer inquiries.

**Creating Quotes:**
1. Click "Create Quote" on any request
2. Add line items with descriptions and prices
3. Include notes or special conditions
4. Set expiration date
5. Send to customer

**Status Flow:**
Pending → Quote Sent → Approved → Job Created`,
    keywords: ['request', 'quote', 'inquiry', 'customer request'],
    role: ['admin']
  },
  {
    id: 'managing-jobs',
    category: 'Jobs',
    title: 'Managing Jobs',
    content: `Jobs are active work assignments for your crew.

**Creating Jobs:**
Jobs are automatically created when quotes are approved.

**Scheduling:**
1. Set scheduled date and time
2. Assign crew members
3. Add job notes
4. Set estimated duration

**Tracking Progress:**
- Scheduled: Job is planned
- In Progress: Crew is working
- Completed: Work is done
- Cancelled: Job was cancelled

**Job Calendar:**
Use the calendar view to see all scheduled jobs at a glance.`,
    keywords: ['job', 'schedule', 'crew', 'assignment', 'work'],
    role: ['admin']
  },
  {
    id: 'invoicing',
    category: 'Billing',
    title: 'Creating and Managing Invoices',
    content: `Generate and track invoices for completed work.

**Creating Invoices:**
1. Navigate to Invoices
2. Click "Create Invoice"
3. Select customer
4. Add line items
5. Set due date
6. Generate and send

**Invoice Status:**
- Draft: Not yet sent
- Sent: Sent to customer
- Paid: Payment received
- Overdue: Past due date

**Payment Tracking:**
Record payments as they're received to keep accurate records.

**Payment Reminders:**
Set up automated reminders for overdue invoices.`,
    keywords: ['invoice', 'billing', 'payment', 'money', 'pay'],
    role: ['admin']
  },
  {
    id: 'time-tracking',
    category: 'Time Tracking',
    title: 'Crew Time Tracking',
    content: `Track hours worked by crew members.

**Clocking In/Out:**
1. Go to Time Clock
2. Select the job you're working on
3. Click "Clock In" to start
4. Click "Clock Out" when done

**Viewing Hours:**
Navigate to My Hours to see your time history.

**Notes:**
- You can only be clocked in to one job at a time
- Make sure to clock out at the end of your shift
- Hours are used for payroll and job costing`,
    keywords: ['time', 'clock', 'hours', 'timesheet', 'shift'],
    role: ['crew']
  },
  {
    id: 'crew-management',
    category: 'Team',
    title: 'Managing Crew Members',
    content: `Add and manage your crew team.

**Adding Crew:**
1. Go to Crew Management
2. Click "Add Crew Member"
3. Enter their information
4. They'll receive account credentials

**Tracking Performance:**
View crew performance metrics:
- Jobs completed
- Hours worked
- Average ratings
- Availability

**Job Assignment:**
Assign crew to jobs based on:
- Availability
- Skills
- Location
- Workload`,
    keywords: ['crew', 'team', 'staff', 'employee', 'worker'],
    role: ['admin']
  },
  {
    id: 'customer-portal',
    category: 'Customer Portal',
    title: 'Using the Customer Portal',
    content: `Access your service information and history.

**Requesting Services:**
1. Click "Request Quote"
2. Select service type
3. Provide location and details
4. Submit request

**Viewing Quotes:**
- Review quotes sent to you
- Accept or decline quotes
- Ask questions via messages

**Tracking Jobs:**
See real-time progress of active jobs.

**Invoices and Payments:**
- View all invoices
- Make payments online
- Download receipts

**Leaving Feedback:**
Rate completed jobs and leave reviews.`,
    keywords: ['customer', 'portal', 'quote', 'request', 'service'],
    role: ['customer']
  },
  {
    id: 'reports',
    category: 'Reports',
    title: 'Generating Reports',
    content: `Create detailed reports for business insights.

**Available Reports:**
- Revenue Summary
- Job Performance
- Crew Performance
- Customer Analytics

**Export Options:**
- PDF for printing
- CSV for spreadsheets
- Excel for analysis

**Date Ranges:**
Select custom date ranges to analyze specific periods.

**Scheduling:**
Set up automated report generation and delivery.`,
    keywords: ['report', 'analytics', 'export', 'data', 'statistics'],
    role: ['admin']
  },
  {
    id: 'keyboard-shortcuts',
    category: 'Shortcuts',
    title: 'Keyboard Shortcuts',
    content: `Speed up your workflow with keyboard shortcuts.

**Global Shortcuts:**
- Cmd/Ctrl + K: Open search
- Escape: Close modals/dialogs

**Navigation:**
- Use Tab to move between fields
- Enter to submit forms
- Arrow keys in search results

**Search:**
- Start typing to search
- Use arrow keys to navigate results
- Press Enter to select`,
    keywords: ['keyboard', 'shortcuts', 'hotkeys', 'quick', 'fast'],
    role: ['admin', 'crew', 'customer']
  },
  {
    id: 'notifications',
    category: 'Notifications',
    title: 'Managing Notifications',
    content: `Stay informed with real-time notifications.

**Notification Types:**
- Job updates
- Quote responses
- Invoice reminders
- Payment confirmations
- System alerts

**Managing Notifications:**
- Click the bell icon to view
- Mark as read individually
- Mark all as read
- Delete notifications
- Click to navigate to related item

**Real-time Updates:**
Notifications appear instantly as events occur.`,
    keywords: ['notification', 'alert', 'bell', 'updates', 'messages'],
    role: ['admin', 'crew', 'customer']
  }
];

export function HelpCenter() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredArticles = helpArticles.filter(article => {
    const matchesRole = !article.role || article.role.includes(profile?.role || '');
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesRole && matchesCategory && matchesSearch;
  });

  const categories = ['all', ...Array.from(new Set(helpArticles.map(a => a.category)))];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Help Center"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Book className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Help Center</h2>
                  <p className="text-sm text-gray-600">Find answers and learn how to use BudgetWorks</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSelectedArticle(null);
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {!selectedArticle ? (
                <div className="flex-1 flex flex-col">
                  <div className="p-6 border-b border-gray-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search help articles..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex gap-2 mt-4 flex-wrap">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            selectedCategory === cat
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {cat === 'all' ? 'All' : cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {filteredArticles.length === 0 ? (
                      <div className="text-center py-12">
                        <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No articles found</p>
                        <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredArticles.map(article => (
                          <button
                            key={article.id}
                            onClick={() => setSelectedArticle(article)}
                            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-xs font-semibold text-blue-600 uppercase">
                                {article.category}
                              </span>
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {article.content.split('\n')[0]}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="p-6 border-b border-gray-200">
                    <button
                      onClick={() => setSelectedArticle(null)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2 flex items-center gap-1"
                    >
                      ← Back to articles
                    </button>
                    <span className="text-xs font-semibold text-blue-600 uppercase">
                      {selectedArticle.category}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900 mt-1">
                      {selectedArticle.title}
                    </h2>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="prose prose-blue max-w-none">
                      {selectedArticle.content.split('\n').map((line, i) => {
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return (
                            <h3 key={i} className="text-lg font-semibold text-gray-900 mt-6 mb-3">
                              {line.replace(/\*\*/g, '')}
                            </h3>
                          );
                        } else if (line.startsWith('- ')) {
                          return (
                            <li key={i} className="text-gray-700 ml-4">
                              {line.substring(2)}
                            </li>
                          );
                        } else if (line.match(/^\d+\./)) {
                          return (
                            <li key={i} className="text-gray-700 ml-4">
                              {line.replace(/^\d+\.\s/, '')}
                            </li>
                          );
                        } else if (line.trim()) {
                          return (
                            <p key={i} className="text-gray-700 mb-3">
                              {line}
                            </p>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <a href="mailto:support@budgetworks.com" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  Contact Support
                </a>
                <button className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <Keyboard className="w-4 h-4" />
                  Keyboard Shortcuts
                </button>
              </div>
              <a
                href="#"
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View Full Documentation
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
