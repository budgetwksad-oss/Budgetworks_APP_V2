import { useEffect } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Card } from '../../components/ui/Card';
import { setSEO } from '../../lib/seo';

import { PublicPage } from '../../types/public';

interface Props {
  onNavigate?: (page: PublicPage) => void;
  onLogin?: () => void;
}

export function TermsOfService({ onNavigate, onLogin }: Props) {
  useEffect(() => {
    setSEO({
      title: 'Terms of Service | BudgetWorks',
      description: 'Read the BudgetWorks terms of service. Understand your rights and responsibilities when using our moving, junk removal, and demolition services.',
      canonicalPath: '/terms',
    });
  }, []);

  return (
    <PublicLayout currentPage="terms" onNavigate={onNavigate} onLogin={onLogin}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last updated: February 10, 2026</p>

        <Card className="p-8">
          <div className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-6">
              By accessing or using BudgetWorks's services, you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use our services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Services Provided</h2>
            <p className="text-gray-700 mb-4">
              BudgetWorks provides the following services:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
              <li>Residential and commercial moving services</li>
              <li>Junk removal and disposal</li>
              <li>Light demolition services</li>
              <li>Packing and unpacking assistance</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Quote Requests and Bookings</h2>
            <p className="text-gray-700 mb-6">
              Quote requests submitted through our platform are not binding commitments. We will review
              your request and provide a formal quote. Services are only confirmed upon your acceptance
              of our quote and scheduling of the job.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Pricing and Payment</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
              <li>All prices are in Canadian dollars unless otherwise specified</li>
              <li>Quotes are valid for the period specified in the quote document</li>
              <li>Final prices may vary if the scope of work changes</li>
              <li>Payment is due as specified in your invoice</li>
              <li>We accept cash, check, credit/debit cards, and e-transfer</li>
              <li>Late payments may incur additional fees</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Cancellations and Rescheduling</h2>
            <p className="text-gray-700 mb-4">
              Cancellation and rescheduling policies:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
              <li>Cancellations made more than 48 hours before scheduled service: No fee</li>
              <li>Cancellations made 24-48 hours before scheduled service: 25% of quoted amount</li>
              <li>Cancellations made less than 24 hours before scheduled service: 50% of quoted amount</li>
              <li>Rescheduling is subject to availability and may incur fees</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Customer Responsibilities</h2>
            <p className="text-gray-700 mb-4">Customers are responsible for:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
              <li>Providing accurate information about the scope of work</li>
              <li>Ensuring safe access to the property</li>
              <li>Securing valuable or fragile items</li>
              <li>Obtaining necessary permits or approvals</li>
              <li>Being available or designating a representative during service</li>
              <li>Removing or securing pets during service</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Liability and Insurance</h2>
            <p className="text-gray-700 mb-6">
              BudgetWorks carries appropriate liability insurance. However, we are not responsible
              for damage to items that were improperly packed by the customer, pre-existing damage,
              or items of exceptional value unless specifically declared and insured separately.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Prohibited Items</h2>
            <p className="text-gray-700 mb-4">
              We cannot transport or dispose of:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
              <li>Hazardous materials or chemicals</li>
              <li>Weapons or ammunition</li>
              <li>Illegal substances or items</li>
              <li>Perishable foods</li>
              <li>Plants (in some cases)</li>
              <li>Items prohibited by law</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Claims and Disputes</h2>
            <p className="text-gray-700 mb-6">
              Any claims for damage or loss must be reported within 7 days of service completion.
              We will investigate all claims promptly and work to resolve them fairly. Disputes that
              cannot be resolved through negotiation may be subject to binding arbitration.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. User Accounts</h2>
            <p className="text-gray-700 mb-6">
              You are responsible for maintaining the confidentiality of your account credentials.
              You agree to notify us immediately of any unauthorized access to your account.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Intellectual Property</h2>
            <p className="text-gray-700 mb-6">
              All content on our website, including text, graphics, logos, and software, is the property
              of BudgetWorks and is protected by copyright and other intellectual property laws.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Limitation of Liability</h2>
            <p className="text-gray-700 mb-6">
              To the maximum extent permitted by law, BudgetWorks shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages resulting from your
              use of our services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Modifications to Terms</h2>
            <p className="text-gray-700 mb-6">
              We reserve the right to modify these Terms of Service at any time. Changes will be
              effective immediately upon posting. Your continued use of our services constitutes
              acceptance of the modified terms.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Governing Law</h2>
            <p className="text-gray-700 mb-6">
              This agreement shall be governed by and interpreted in accordance with the laws of the Province of Nova Scotia, Canada.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Information</h2>
            <p className="text-gray-700">
              For questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">
                <strong>BudgetWorks</strong><br />
                Email: legal@budgetworks.ca<br />
                Phone: (844) 404-1240
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}
