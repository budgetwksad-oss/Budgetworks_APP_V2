import { PublicLayout } from '../../components/layout/PublicLayout';
import { Card } from '../../components/ui/Card';

type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote' | 'quote-success' | 'moving' | 'junk-removal' | 'light-demo' | 'terms' | 'privacy';

interface Props {
  onNavigate?: (page: PublicPage) => void;
  onLogin?: () => void;
}

export function PrivacyPolicy({ onNavigate, onLogin }: Props) {
  return (
    <PublicLayout currentPage="privacy" onNavigate={onNavigate} onLogin={onLogin}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: February 10, 2026</p>

        <Card className="p-8">
          <div className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-6">
              BudgetWorks Moving ("we," "our," or "us") is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your information when you use our
              website and services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            <p className="text-gray-700 mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
              <li>Name, email address, phone number, and mailing address</li>
              <li>Service request details and preferences</li>
              <li>Photos you upload related to service requests</li>
              <li>Payment information (processed securely through our payment providers)</li>
              <li>Communications with us</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and complete transactions</li>
              <li>Send you quotes, invoices, and service updates</li>
              <li>Respond to your comments and questions</li>
              <li>Send you technical notices and support messages</li>
              <li>Communicate with you about services, promotions, and events</li>
              <li>Monitor and analyze trends and usage</li>
              <li>Detect, prevent, and address technical issues and fraudulent activity</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
            <p className="text-gray-700 mb-4">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
              <li>With crew members assigned to your job (name, address, phone)</li>
              <li>With service providers who perform services on our behalf</li>
              <li>To comply with legal obligations</li>
              <li>To protect the rights and safety of BudgetWorks and others</li>
              <li>With your consent or at your direction</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 mb-6">
              We implement appropriate technical and organizational measures to protect your personal
              information. However, no method of transmission over the Internet or electronic storage is
              100% secure, and we cannot guarantee absolute security.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 mb-6">
              We retain your personal information for as long as necessary to fulfill the purposes outlined
              in this Privacy Policy, unless a longer retention period is required or permitted by law.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
              <li>Access and receive a copy of your personal information</li>
              <li>Correct inaccurate personal information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to our processing of your personal information</li>
              <li>Withdraw consent where we rely on your consent</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies and Tracking</h2>
            <p className="text-gray-700 mb-6">
              We use cookies and similar tracking technologies to collect information about your browsing
              activities. You can control cookies through your browser settings.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-700 mb-6">
              Our services are not directed to children under 18. We do not knowingly collect personal
              information from children under 18.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-700 mb-6">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">
                <strong>BudgetWorks Moving</strong><br />
                Email: privacy@budgetworks.ca<br />
                Phone: 1-800-BUDGET-MOVE
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}
